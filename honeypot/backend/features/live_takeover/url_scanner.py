"""
URL Scanner Module
Multi-source URL safety analysis using free/OSS tools.
Supports VirusTotal (free tier), urlscan.io (free), WHOIS, and pattern analysis.
"""

import asyncio
import hashlib
import json
import logging
import re
import socket
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

from config import settings
from features.live_takeover.session_manager import URLScanResult

logger = logging.getLogger("live_takeover.url_scanner")


class BaseScanner:
    """Abstract base for URL scanners."""
    
    name: str = "base"
    
    async def scan(self, url: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class PatternScanner(BaseScanner):
    """
    Custom pattern-based URL analysis.
    No external API calls — instant, always available.
    """
    
    name = "pattern"
    
    SUSPICIOUS_TLDS = {
        ".tk", ".ml", ".ga", ".cf", ".gq",  # Free TLDs
        ".xyz", ".top", ".buzz", ".club",     # Cheap spam TLDs
        ".work", ".click", ".link", ".fun",
    }
    
    URL_SHORTENERS = {
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd",
        "buff.ly", "ow.ly", "short.io", "rb.gy", "cutt.ly",
        "tiny.cc", "s.id", "clck.ru"
    }
    
    PHISHING_INDICATORS = [
        r"login", r"signin", r"verify", r"secure",
        r"update", r"confirm", r"account", r"banking",
        r"paypal", r"netflix", r"amazon", r"microsoft",
        r"support", r"helpdesk", r"wallet"
    ]
    
    HOMOGRAPH_CHARS = {
        'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p',
        'с': 'c', 'у': 'y', 'х': 'x', 'ː': ':',
    }
    
    async def scan(self, url: str) -> Optional[Dict[str, Any]]:
        parsed = urlparse(url)
        domain = parsed.hostname or ""
        path = parsed.path or ""
        full = url.lower()
        
        findings = []
        risk_score = 0.0
        
        # ── Check suspicious TLD ──────────────────────────────
        for tld in self.SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                findings.append(f"Suspicious TLD: {tld}")
                risk_score += 0.3
                break
        
        # ── URL shortener check ───────────────────────────────
        if domain in self.URL_SHORTENERS:
            findings.append("URL shortener detected — may hide real destination")
            risk_score += 0.4
        
        # ── Phishing path indicators ─────────────────────────
        for pattern in self.PHISHING_INDICATORS:
            if re.search(pattern, full):
                findings.append(f"Phishing keyword in URL: '{pattern}'")
                risk_score += 0.15
        
        # ── Excessive subdomains ──────────────────────────────
        subdomain_count = domain.count(".")
        if subdomain_count > 3:
            findings.append(f"Excessive subdomains ({subdomain_count})")
            risk_score += 0.2
        
        # ── IP address instead of domain ──────────────────────
        try:
            socket.inet_aton(domain)
            findings.append("IP address used instead of domain name")
            risk_score += 0.4
        except (socket.error, OSError):
            pass
        
        # ── Homograph attack detection ────────────────────────
        has_homograph = any(c in domain for c in self.HOMOGRAPH_CHARS)
        if has_homograph:
            findings.append("Possible homograph/IDN attack — Cyrillic characters in domain")
            risk_score += 0.6
        
        # ── Non-HTTPS ─────────────────────────────────────────
        if parsed.scheme == "http":
            findings.append("No HTTPS — unencrypted connection")
            risk_score += 0.1
        
        # ── Long URL (obfuscation) ────────────────────────────
        if len(url) > 150:
            findings.append("Unusually long URL — possible obfuscation")
            risk_score += 0.1
        
        # ── Data URI / javascript ─────────────────────────────
        if parsed.scheme in ("data", "javascript"):
            findings.append(f"Dangerous URI scheme: {parsed.scheme}")
            risk_score += 0.8
        
        return {
            "scanner": self.name,
            "risk_score": min(risk_score, 1.0),
            "is_malicious": risk_score >= 0.5,
            "findings": findings,
            "details": {
                "domain": domain,
                "tld": domain.split(".")[-1] if domain else "",
                "has_https": parsed.scheme == "https",
                "url_length": len(url),
                "subdomain_depth": subdomain_count - 1 if subdomain_count > 0 else 0
            }
        }


class VirusTotalScanner(BaseScanner):
    """
    VirusTotal API v3 — free tier (4 req/min).
    """
    
    name = "virustotal"
    BASE_URL = "https://www.virustotal.com/api/v3"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "VIRUSTOTAL_API_KEY", "")
        self._rate_semaphore = asyncio.Semaphore(4)
        self._last_request = datetime.min
    
    async def scan(self, url: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            logger.debug("VirusTotal API key not configured, skipping")
            return None
        
        # Rate limiting: 4 requests/minute
        async with self._rate_semaphore:
            now = datetime.utcnow()
            elapsed = (now - self._last_request).total_seconds()
            if elapsed < 15:  # ~4/min
                await asyncio.sleep(15 - elapsed)
            
            self._last_request = datetime.utcnow()
            
            try:
                url_id = hashlib.sha256(url.encode()).hexdigest()
                
                async with httpx.AsyncClient(timeout=15.0) as client:
                    # Submit URL for scanning
                    submit_resp = await client.post(
                        f"{self.BASE_URL}/urls",
                        headers={"x-apikey": self.api_key},
                        data={"url": url}
                    )
                    
                    if submit_resp.status_code != 200:
                        logger.warning(f"VT submit failed: {submit_resp.status_code}")
                        return None
                    
                    analysis_id = submit_resp.json().get("data", {}).get("id", "")
                    
                    # Wait briefly then get results
                    await asyncio.sleep(3)
                    
                    result_resp = await client.get(
                        f"{self.BASE_URL}/analyses/{analysis_id}",
                        headers={"x-apikey": self.api_key}
                    )
                    
                    if result_resp.status_code != 200:
                        return None
                    
                    data = result_resp.json().get("data", {}).get("attributes", {})
                    stats = data.get("stats", {})
                    
                    malicious = stats.get("malicious", 0)
                    suspicious = stats.get("suspicious", 0)
                    total = sum(stats.values()) or 1
                    
                    risk_score = (malicious * 2 + suspicious) / (total * 2)
                    
                    return {
                        "scanner": self.name,
                        "risk_score": min(risk_score, 1.0),
                        "is_malicious": malicious > 2,
                        "findings": [
                            f"{malicious} engines flagged as malicious",
                            f"{suspicious} engines flagged as suspicious",
                            f"Status: {data.get('status', 'unknown')}"
                        ],
                        "details": {
                            "stats": stats,
                            "analysis_id": analysis_id
                        }
                    }
                    
            except Exception as e:
                logger.error(f"VirusTotal scan error: {e}")
                return None


class URLScanIOScanner(BaseScanner):
    """
    urlscan.io — free tier (unlimited public scans).
    """
    
    name = "urlscan_io"
    BASE_URL = "https://urlscan.io/api/v1"
    
    async def scan(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Submit scan
                submit_resp = await client.post(
                    f"{self.BASE_URL}/scan/",
                    json={"url": url, "visibility": "public"},
                    headers={"Content-Type": "application/json"}
                )
                
                if submit_resp.status_code not in (200, 201):
                    logger.warning(f"urlscan.io submit failed: {submit_resp.status_code}")
                    return None
                
                result_url = submit_resp.json().get("api", "")
                
                if not result_url:
                    return None
                
                # Poll for results (takes 10-30s)
                for _ in range(6):
                    await asyncio.sleep(5)
                    
                    result_resp = await client.get(result_url)
                    
                    if result_resp.status_code == 200:
                        data = result_resp.json()
                        verdicts = data.get("verdicts", {}).get("overall", {})
                        page = data.get("page", {})
                        
                        is_malicious = verdicts.get("malicious", False)
                        score = verdicts.get("score", 0)
                        
                        findings = []
                        if is_malicious:
                            findings.append("Flagged as malicious by urlscan.io")
                        
                        categories = verdicts.get("categories", [])
                        if categories:
                            findings.append(f"Categories: {', '.join(categories)}")
                        
                        brands = verdicts.get("brands", [])
                        if brands:
                            findings.append(f"Impersonated brands: {', '.join(brands)}")
                        
                        return {
                            "scanner": self.name,
                            "risk_score": min(score / 100, 1.0) if score else (0.9 if is_malicious else 0.1),
                            "is_malicious": is_malicious,
                            "findings": findings,
                            "details": {
                                "page_title": page.get("title", ""),
                                "server": page.get("server", ""),
                                "ip": page.get("ip", ""),
                                "country": page.get("country", ""),
                                "result_url": result_url
                            }
                        }
                
                logger.warning("urlscan.io scan timed out")
                return None
                
        except Exception as e:
            logger.error(f"urlscan.io scan error: {e}")
            return None


class WHOISScanner(BaseScanner):
    """
    WHOIS-based domain age check. Young domains are suspicious.
    Uses python-whois (free, no API key needed).
    """
    
    name = "whois"
    
    async def scan(self, url: str) -> Optional[Dict[str, Any]]:
        try:
            import whois
        except ImportError:
            logger.debug("python-whois not installed, skipping WHOIS scan")
            return None
        
        try:
            parsed = urlparse(url)
            domain = parsed.hostname or ""
            
            if not domain:
                return None
            
            # Run WHOIS in thread pool (blocking I/O)
            loop = asyncio.get_event_loop()
            w = await loop.run_in_executor(None, whois.whois, domain)
            
            findings = []
            risk_score = 0.0
            
            # Domain age analysis
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            
            if creation_date:
                age_days = (datetime.utcnow() - creation_date).days
                
                if age_days < 30:
                    findings.append(f"Very new domain: {age_days} days old")
                    risk_score += 0.6
                elif age_days < 90:
                    findings.append(f"Recent domain: {age_days} days old")
                    risk_score += 0.3
                elif age_days < 365:
                    findings.append(f"Domain age: {age_days} days")
                    risk_score += 0.1
                else:
                    findings.append(f"Established domain: {age_days // 365} years old")
            
            # Registrar info
            registrar = w.registrar
            if registrar:
                findings.append(f"Registrar: {registrar}")
            
            # Privacy protection check
            if w.org and "privacy" in str(w.org).lower():
                findings.append("WHOIS privacy protection enabled")
                risk_score += 0.1
            
            return {
                "scanner": self.name,
                "risk_score": min(risk_score, 1.0),
                "is_malicious": risk_score >= 0.5,
                "findings": findings,
                "details": {
                    "domain": domain,
                    "registrar": registrar,
                    "creation_date": str(creation_date) if creation_date else None,
                    "country": w.country
                }
            }
            
        except Exception as e:
            logger.error(f"WHOIS scan error: {e}")
            return None


class MultiScanner:
    """
    Aggregator that runs all available scanners in parallel
    and produces a combined safety verdict.
    """
    
    def __init__(self):
        self.scanners: List[BaseScanner] = [
            PatternScanner(),
            VirusTotalScanner(),
            URLScanIOScanner(),
            WHOISScanner(),
        ]
        self._cache: Dict[str, URLScanResult] = {}
        self._cache_ttl = timedelta(hours=1)
    
    async def scan_url(self, url: str) -> URLScanResult:
        """
        Scan a URL with all available scanners.
        Returns aggregated URLScanResult.
        """
        # ── Cache check ───────────────────────────────────────
        cache_key = hashlib.md5(url.encode()).hexdigest()
        
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if (datetime.utcnow() - cached.scanned_at) < self._cache_ttl:
                logger.debug(f"URL scan cache hit: {url[:60]}")
                return cached
        
        # ── Run all scanners in parallel ──────────────────────
        tasks = [scanner.scan(url) for scanner in self.scanners]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # ── Aggregate results ─────────────────────────────────
        all_findings = []
        risk_scores = []
        malicious_votes = 0
        scanner_results = {}
        
        for i, result in enumerate(results):
            # Skip errors and None results
            if isinstance(result, Exception):
                logger.error(f"Scanner {self.scanners[i].name} error: {result}")
                continue
            
            if result is None or not isinstance(result, dict):
                continue
            
            # Now we know result is a dict
            scanner_name = result.get("scanner", "unknown")
            scanner_results[scanner_name] = result
            risk_scores.append(result.get("risk_score", 0.0))
            all_findings.extend(result.get("findings", []))
            
            if result.get("is_malicious"):
                malicious_votes += 1
        
        # ── Compute final verdict ─────────────────────────────
        if risk_scores:
            # Weighted average — pattern scanner has lower weight
            final_score = sum(risk_scores) / len(risk_scores)
        else:
            final_score = 0.5  # Unknown
        
        # If multiple scanners flag it, increase confidence
        if malicious_votes >= 2:
            final_score = max(final_score, 0.8)
        
        is_safe = final_score < 0.4
        
        scan_result = URLScanResult(
            url=url,
            is_safe=is_safe,
            risk_score=final_score,
            findings=list(set(all_findings)),
            scanner_results=scanner_results,
            scanned_at=datetime.utcnow()
        )
        
        # ── Cache result ──────────────────────────────────────
        self._cache[cache_key] = scan_result
        
        # ── Clean old cache entries ───────────────────────────
        now = datetime.utcnow()
        expired = [k for k, v in self._cache.items() if (now - v.scanned_at) > self._cache_ttl]
        for k in expired:
            del self._cache[k]
        
        return scan_result
    
    async def scan_urls(self, urls: List[str]) -> List[URLScanResult]:
        """Scan multiple URLs in parallel."""
        tasks = [self.scan_url(url) for url in urls]
        return await asyncio.gather(*tasks)


# Module-level singleton
url_scanner = MultiScanner()
