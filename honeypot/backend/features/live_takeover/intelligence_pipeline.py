"""
Real-Time Intelligence Pipeline
Continuous background extraction from live conversation transcripts.
Wraps existing IntelligenceExtractor + ScamDetector for streaming use.
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from features.live_takeover.session_manager import (
    ExtractedEntity,
    LiveSessionState,
    live_session_manager,
)

logger = logging.getLogger("live_takeover.intelligence")


class IntelligencePipeline:
    """
    Async pipeline that processes transcript chunks in real-time
    and pushes intelligence updates to client via callback.
    """

    # ── Regex Patterns ────────────────────────────────────────────

    PATTERNS = {
        "phone": r"\b[6-9]\d{9}\b",
        "bank_account": r"\b\d{11,18}\b",
        "upi_id": r"[\w\.\-_]+@(?:oksbi|okaxis|okhdfc|okhdfcbank|okicici|ybl|paytm|ibl|upi|apl|axisb|sbi|icici|hdfcbank)\b",
        "url": r"https?://[^\s<>\"']+",
        "ifsc": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "email": r"\b[\w\.\-]+@[\w\.\-]+\.\w{2,}\b",
        "aadhaar": r"\b\d{4}\s?\d{4}\s?\d{4}\b",
        "pan": r"\b[A-Z]{5}\d{4}[A-Z]\b",
    }

    SCAM_KEYWORDS = {
        "high": [
            "blocked", "suspended", "seized", "arrested", "warrant",
            "money laundering", "narcotics", "cyber crime", "aadhaar linked",
            "transfer immediately", "send money", "pay now", "last chance"
        ],
        "medium": [
            "verify", "kyc", "update", "expired", "pending",
            "refund", "cashback", "prize", "lottery", "selected",
            "offer", "limited time", "deadline", "urgent"
        ],
        "low": [
            "bank", "account", "otp", "password", "pin",
            "debit card", "credit card", "net banking", "upi"
        ]
    }

    TACTIC_PATTERNS = {
        "fear": ["blocked", "arrested", "warrant", "seized", "police", "legal action", "jail"],
        "authority": ["rbi", "reserve bank", "police", "cyber cell", "government", "court order", "official"],
        "urgency": ["immediately", "now", "hurry", "last chance", "within", "minutes", "deadline"],
        "sympathy": ["help", "please", "understand", "problem", "issue", "difficulty"],
        "greed": ["prize", "lottery", "winner", "cashback", "reward", "bonus", "free"],
        "impersonation": ["officer", "executive", "manager", "department", "headquarters"],
        "isolation": ["don't tell", "secret", "confidential", "between us", "no one should know"],
    }

    def __init__(self):
        self._processing = False
        self._queue: asyncio.Queue = asyncio.Queue()
    
    async def process_transcript(
        self,
        session_id: str,
        text: str,
        speaker: str = "scammer",
        notify_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Process a transcript chunk and extract intelligence.
        
        Args:
            session_id: Live session ID
            text: Transcript text to analyze
            speaker: Who said it ("scammer" or "agent")
            notify_callback: Async callback for real-time updates
            
        Returns:
            {
                "new_entities": [...],
                "threat_level": float,
                "tactics": [...],
                "urls_to_scan": [...]
            }
        """
        if not text or not text.strip():
            return {"new_entities": [], "threat_level": 0.0, "tactics": [], "urls_to_scan": []}
        
        text_lower = text.lower()
        
        # ── Phase 1: Regex extraction (instant) ───────────────
        entities = self._regex_extract(text)
        
        # ── Phase 2: Keyword detection ────────────────────────
        keywords = self._detect_keywords(text_lower)
        for kw in keywords:
            entities.append(ExtractedEntity(
                entity_type="keyword",
                value=kw["keyword"],
                confidence=kw["severity_score"],
                context=text[:100]
            ))
        
        # ── Phase 3: Tactic classification ────────────────────
        tactics = self._classify_tactics(text_lower)
        for tactic in tactics:
            entities.append(ExtractedEntity(
                entity_type="tactic",
                value=tactic,
                confidence=0.8,
                context=text[:100]
            ))
        
        # ── Phase 4: Threat level computation ─────────────────
        threat_level = self._compute_threat_level(entities, tactics, keywords)
        
        # ── Phase 5: Extract URLs for scanning ────────────────
        urls_to_scan = [e.value for e in entities if e.entity_type == "url"]
        
        # ── Phase 6: Update session ───────────────────────────
        new_entities = await live_session_manager.update_intelligence(
            session_id=session_id,
            entities=entities,
            threat_level=threat_level,
            tactics=tactics
        )
        
        result = {
            "new_entities": [
                {"type": e.entity_type, "value": e.value, "confidence": e.confidence}
                for e in new_entities
            ],
            "threat_level": threat_level,
            "tactics": tactics,
            "urls_to_scan": urls_to_scan
        }
        
        # ── Phase 7: Notify client ────────────────────────────
        if notify_callback and new_entities:
            try:
                await notify_callback(result)
            except Exception as e:
                logger.error(f"Intelligence notification failed: {e}")
        
        return result
    
    def _regex_extract(self, text: str) -> List[ExtractedEntity]:
        """Extract entities using regex patterns."""
        entities = []
        
        for entity_type, pattern in self.PATTERNS.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Skip if the match is part of a larger URL or email context
                entities.append(ExtractedEntity(
                    entity_type=entity_type,
                    value=match.strip(),
                    confidence=0.9,
                    context=text[:80]
                ))
        
        return entities
    
    def _detect_keywords(self, text_lower: str) -> List[Dict[str, Any]]:
        """Detect scam keywords with severity levels."""
        detected = []
        
        severity_map = {"high": 0.9, "medium": 0.6, "low": 0.3}
        
        for severity, keywords in self.SCAM_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    detected.append({
                        "keyword": kw,
                        "severity": severity,
                        "severity_score": severity_map[severity]
                    })
        
        return detected
    
    def _classify_tactics(self, text_lower: str) -> List[str]:
        """Classify manipulation tactics used by scammer."""
        tactics = []
        
        for tactic, indicators in self.TACTIC_PATTERNS.items():
            matches = sum(1 for ind in indicators if ind in text_lower)
            if matches >= 1:
                tactics.append(tactic)
        
        return tactics
    
    def _compute_threat_level(
        self,
        entities: List[ExtractedEntity],
        tactics: List[str],
        keywords: List[Dict]
    ) -> float:
        """Compute overall threat level (0.0 - 1.0)."""
        score = 0.0
        
        # Entity-based scoring
        entity_weights = {
            "bank_account": 0.2,
            "upi_id": 0.2,
            "phone": 0.1,
            "url": 0.15,
            "ifsc": 0.15,
            "aadhaar": 0.25,
            "pan": 0.2,
        }
        
        for entity in entities:
            score += entity_weights.get(entity.entity_type, 0.05)
        
        # Keyword scoring
        for kw in keywords:
            score += kw["severity_score"] * 0.1
        
        # Tactic scoring
        high_threat_tactics = {"fear", "authority", "isolation"}
        for tactic in tactics:
            if tactic in high_threat_tactics:
                score += 0.15
            else:
                score += 0.05
        
        return min(score, 1.0)
    
    async def process_agent_extracted(
        self,
        session_id: str,
        extracted_data: Dict[str, Any],
        notify_callback: Optional[Callable] = None
    ) -> List[ExtractedEntity]:
        """
        Process intelligence data extracted by the AI agent.
        This supplements the regex-based pipeline.
        """
        entities = []
        
        type_map = {
            "phone_numbers": "phone",
            "bank_accounts": "bank_account",
            "upi_ids": "upi_id",
            "urls": "url",
            "names": "name",
            "organizations": "organization",
            "amounts": "amount"
        }
        
        for key, entity_type in type_map.items():
            values = extracted_data.get(key, [])
            if isinstance(values, list):
                for val in values:
                    if val:
                        entities.append(ExtractedEntity(
                            entity_type=entity_type,
                            value=str(val),
                            confidence=0.85,
                            context="Extracted by AI agent"
                        ))
        
        if entities:
            new_entities = await live_session_manager.update_intelligence(
                session_id=session_id,
                entities=entities
            )
            
            if notify_callback and new_entities:
                try:
                    await notify_callback({
                        "new_entities": [
                            {"type": e.entity_type, "value": e.value, "confidence": e.confidence}
                            for e in new_entities
                        ],
                        "source": "ai_agent"
                    })
                except Exception as e:
                    logger.error(f"Agent intelligence notification failed: {e}")
            
            return new_entities
        
        return []


# Module-level singleton
intelligence_pipeline = IntelligencePipeline()
