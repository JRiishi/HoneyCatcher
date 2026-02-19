"""
Live Takeover Session Manager
Manages real-time session state for live AI takeover mode.
Thread-safe audio buffering, mode switching, and session lifecycle.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from db.mongo import db

logger = logging.getLogger("live_takeover.session")


class TakeoverMode(str, Enum):
    AI_TAKEOVER = "ai_takeover"      # AI speaks with cloned voice
    AI_COACHED = "ai_coached"        # AI provides scripts, user speaks


class SessionStatus(str, Enum):
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


@dataclass
class ExtractedEntity:
    entity_type: str          # "phone", "bank_account", "upi_id", "url", "keyword"
    value: str
    confidence: float = 1.0
    context: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    extracted_at: datetime = field(default_factory=datetime.utcnow)  # Alias for timestamp


@dataclass 
class URLScanResult:
    url: str
    risk_score: float = 0.0   # 0-1.0
    is_safe: bool = True
    findings: List[str] = field(default_factory=list)
    scanner_results: Dict[str, Any] = field(default_factory=dict)
    verdicts: List[str] = field(default_factory=list)
    redirect_chain: List[str] = field(default_factory=list)
    domain_age_days: Optional[int] = None
    ssl_valid: Optional[bool] = None
    screenshot_url: Optional[str] = None
    scanned_at: datetime = field(default_factory=datetime.utcnow)
    scanner_source: str = "unknown"


@dataclass
class LiveSessionState:
    """In-memory state for an active live takeover session."""
    
    session_id: str
    original_session_id: Optional[str] = None  # Reference to parent session if any
    mode: TakeoverMode = TakeoverMode.AI_TAKEOVER
    current_mode: TakeoverMode = TakeoverMode.AI_TAKEOVER  # Alias for mode
    status: SessionStatus = SessionStatus.INITIALIZING
    
    # Voice cloning
    voice_clone_id: Optional[str] = None
    detected_language: str = "en"
    
    # Audio buffering
    audio_buffer: bytearray = field(default_factory=bytearray)
    buffer_duration_ms: float = 0.0
    chunk_sequence: int = 0
    
    # Conversation
    transcript: List[Dict[str, Any]] = field(default_factory=list)
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    turn_count: int = 0
    
    # Intelligence
    extracted_entities: List[ExtractedEntity] = field(default_factory=list)
    url_scan_results: List[URLScanResult] = field(default_factory=list)
    threat_level: float = 0.0            # 0.0 - 1.0
    scam_tactics_detected: List[str] = field(default_factory=list)
    seen_entity_values: set = field(default_factory=set)
    
    # Timing
    started_at: datetime = field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    last_activity: datetime = field(default_factory=datetime.utcnow)
    total_audio_duration_s: float = 0.0
    
    # Mode switch history
    mode_switches: List[Dict[str, Any]] = field(default_factory=list)
    mode_history: List[Dict[str, Any]] = field(default_factory=list)  # Alias for mode_switches
    detected_tactics: List[str] = field(default_factory=list)  # Alias for scam_tactics_detected
    
    # Pending AI response (for coached mode)
    pending_scripts: List[Dict[str, str]] = field(default_factory=list)
    
    def add_audio_chunk(self, chunk: bytes, duration_ms: float):
        """Append audio chunk to buffer."""
        self.audio_buffer.extend(chunk)
        self.buffer_duration_ms += duration_ms
        self.total_audio_duration_s += duration_ms / 1000.0
        self.last_activity = datetime.utcnow()
    
    def flush_audio_buffer(self) -> bytes:
        """Extract and clear the audio buffer."""
        data = bytes(self.audio_buffer)
        self.audio_buffer = bytearray()
        self.buffer_duration_ms = 0.0
        self.chunk_sequence += 1
        return data
    
    def has_enough_audio(self, threshold_ms: float = 2000.0) -> bool:
        """Check if buffer has enough audio for processing."""
        return self.buffer_duration_ms >= threshold_ms
    
    def add_transcript_entry(self, speaker: str, text: str, confidence: float = 1.0):
        """Add a new transcript entry."""
        entry = {
            "speaker": speaker,      # "scammer", "ai", "user"
            "text": text,
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat(),
            "turn": self.turn_count
        }
        self.transcript.append(entry)
        self.conversation_history.append({
            "role": "scammer" if speaker == "scammer" else "agent",
            "content": text
        })
        if speaker == "scammer":
            self.turn_count += 1
        self.last_activity = datetime.utcnow()
    
    def add_entity(self, entity: ExtractedEntity) -> bool:
        """Add entity if not already seen. Returns True if new."""
        key = f"{entity.entity_type}:{entity.value}"
        if key in self.seen_entity_values:
            return False
        self.seen_entity_values.add(key)
        self.extracted_entities.append(entity)
        return True
    
    def switch_mode(self, new_mode: TakeoverMode):
        """Switch engagement mode."""
        old_mode = self.mode
        self.mode = new_mode
        self.current_mode = new_mode  # Keep alias in sync
        
        switch_record = {
            "from": old_mode.value,
            "to": new_mode.value,
            "at": datetime.utcnow().isoformat(),
            "turn": self.turn_count
        }
        self.mode_switches.append(switch_record)
        self.mode_history.append(switch_record)  # Keep alias in sync
        self.last_activity = datetime.utcnow()
        logger.info(f"Session {self.session_id}: Mode switch {old_mode.value} → {new_mode.value}")
    
    def to_report_dict(self) -> Dict[str, Any]:
        """Serialize session state for report generation."""
        return {
            "session_id": self.session_id,
            "mode": self.mode.value,
            "status": self.status.value,
            "voice_clone_id": self.voice_clone_id,
            "detected_language": self.detected_language,
            "turn_count": self.turn_count,
            "transcript": self.transcript,
            "extracted_entities": [
                {
                    "type": e.entity_type,
                    "value": e.value,
                    "confidence": e.confidence,
                    "context": e.context,
                    "timestamp": e.timestamp.isoformat()
                }
                for e in self.extracted_entities
            ],
            "url_scan_results": [
                {
                    "url": r.url,
                    "risk_score": r.risk_score,
                    "verdicts": r.verdicts,
                    "redirect_chain": r.redirect_chain,
                    "domain_age_days": r.domain_age_days,
                    "ssl_valid": r.ssl_valid,
                    "scanner_source": r.scanner_source,
                    "scanned_at": r.scanned_at.isoformat()
                }
                for r in self.url_scan_results
            ],
            "threat_level": self.threat_level,
            "scam_tactics_detected": self.scam_tactics_detected,
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "total_audio_duration_s": round(self.total_audio_duration_s, 2),
            "mode_switches": self.mode_switches
        }


class LiveSessionManager:
    """
    Manages all active live takeover sessions.
    Thread-safe operations with asyncio locks.
    """
    
    def __init__(self):
        self._sessions: Dict[str, LiveSessionState] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
    
    def _get_lock(self, session_id: str) -> asyncio.Lock:
        if session_id not in self._locks:
            self._locks[session_id] = asyncio.Lock()
        return self._locks[session_id]
    
    async def create_session(
        self,
        original_session_id: Optional[str] = None,
        voice_clone_id: Optional[str] = None,
        mode: TakeoverMode = TakeoverMode.AI_TAKEOVER,
        language: str = "en"
    ) -> LiveSessionState:
        """Create a new live takeover session."""
        session_id = f"live-{uuid.uuid4().hex[:10]}"
        
        session = LiveSessionState(
            session_id=session_id,
            original_session_id=original_session_id,
            mode=mode,
            current_mode=mode,
            voice_clone_id=voice_clone_id,
            detected_language=language,
            status=SessionStatus.ACTIVE
        )
        
        # Initialize aliases
        session.mode_history = []
        session.detected_tactics = []
        
        self._sessions[session_id] = session
        
        # Persist to MongoDB
        try:
            await db.sessions.insert_one({
                "session_id": session_id,
                "start_time": session.started_at,
                "last_updated": session.started_at,
                "status": "active",
                "message_count": 0,
                "scam_score": 0.0,
                "is_confirmed_scam": False,
                "extracted_intelligence": {
                    "bank_accounts": [],
                    "upi_ids": [],
                    "phone_numbers": [],
                    "urls": [],
                    "scam_keywords": [],
                    "behavioral_tactics": []
                },
                "agent_state": {
                    "turn_count": 0,
                    "sentiment": "neutral",
                    "last_action": "listen",
                    "notes": ""
                },
                "language": language,
                "voice_enabled": True,
                "detected_language": language,
                "voice_mode": mode.value,
                "audio_chunk_count": 0,
                "total_audio_duration": 0.0,
                # Live takeover specific
                "live_takeover_enabled": True,
                "takeover_mode": mode.value,
                "voice_clone_id": voice_clone_id,
                "takeover_started_at": session.started_at
            })
            logger.info(f"Created live session: {session_id}")
        except Exception as e:
            logger.error(f"Failed to persist session {session_id}: {e}")
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[LiveSessionState]:
        """Get an active session by ID."""
        return self._sessions.get(session_id)
    
    async def switch_mode(self, session_id: str, new_mode: TakeoverMode) -> bool:
        """Switch session mode (ai_takeover ↔ ai_coached)."""
        lock = self._get_lock(session_id)
        async with lock:
            session = self._sessions.get(session_id)
            if not session or session.status != SessionStatus.ACTIVE:
                return False
            
            session.switch_mode(new_mode)
            
            # Persist mode change
            try:
                await db.sessions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "takeover_mode": new_mode.value,
                        "voice_mode": new_mode.value,
                        "last_updated": datetime.utcnow()
                    }}
                )
            except Exception as e:
                logger.error(f"Failed to persist mode switch: {e}")
            
            return True
    
    async def end_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """End session and return final report data."""
        lock = self._get_lock(session_id)
        async with lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            
            session.status = SessionStatus.ENDED
            report_data = session.to_report_dict()
            
            # Persist final state
            try:
                intel_update = {}
                for entity in session.extracted_entities:
                    key_map = {
                        "phone": "phone_numbers",
                        "bank_account": "bank_accounts",
                        "upi_id": "upi_ids",
                        "url": "urls",
                        "keyword": "scam_keywords",
                        "tactic": "behavioral_tactics"
                    }
                    db_key = key_map.get(entity.entity_type)
                    if db_key:
                        if db_key not in intel_update:
                            intel_update[db_key] = []
                        intel_update[db_key].append(entity.value)
                
                update_fields = {
                    "status": "terminated",
                    "last_updated": datetime.utcnow(),
                    "scam_score": session.threat_level,
                    "message_count": session.turn_count,
                    "total_audio_duration": session.total_audio_duration_s,
                    "audio_chunk_count": session.chunk_sequence
                }
                
                for key, values in intel_update.items():
                    update_fields[f"extracted_intelligence.{key}"] = list(set(values))
                
                await db.sessions.update_one(
                    {"session_id": session_id},
                    {"$set": update_fields}
                )
            except Exception as e:
                logger.error(f"Failed to persist session end: {e}")
            
            # Remove from active sessions
            del self._sessions[session_id]
            if session_id in self._locks:
                del self._locks[session_id]
            
            logger.info(f"Ended live session: {session_id}")
            return report_data
    
    async def update_intelligence(
        self, 
        session_id: str, 
        entities: List[ExtractedEntity],
        threat_level: Optional[float] = None,
        tactics: Optional[List[str]] = None
    ) -> List[ExtractedEntity]:
        """Update intelligence for session. Returns only NEW entities."""
        lock = self._get_lock(session_id)
        async with lock:
            session = self._sessions.get(session_id)
            if not session:
                return []
            
            new_entities = []
            for entity in entities:
                if session.add_entity(entity):
                    new_entities.append(entity)
            
            if threat_level is not None:
                session.threat_level = max(session.threat_level, threat_level)
            
            if tactics:
                for t in tactics:
                    if t not in session.scam_tactics_detected:
                        session.scam_tactics_detected.append(t)
            
            return new_entities
    
    def get_active_count(self) -> int:
        return len(self._sessions)
    
    def list_active_sessions(self) -> List[str]:
        return list(self._sessions.keys())


# Module-level singleton
live_session_manager = LiveSessionManager()
