"""
Streaming Speech-to-Text Service
Chunk-based audio buffering with real-time transcription.
Wraps existing STT service for live streaming use.
"""

import asyncio
import io
import logging
import tempfile
import os
from typing import Dict, List, Optional, Callable, Any

logger = logging.getLogger("live_takeover.streaming_stt")

# Suppress pydub ffmpeg warnings for streaming chunks
# (partial WebM chunks generate expected decode errors)
logging.getLogger('pydub.converter').setLevel(logging.ERROR)


class StreamingTranscriber:
    """
    Real-time streaming STT that accumulates audio chunks
    and transcribes when enough audio is buffered.
    
    Uses existing faster-whisper engine from services.stt_service.
    """
    
    def __init__(
        self,
        buffer_threshold_ms: float = 2500.0,
        language: Optional[str] = None,
        beam_size: int = 1  # Use beam_size=1 for speed
    ):
        # Lazy import to avoid circular deps and keep module optional
        from services.stt_service import stt_service
        
        self.stt = stt_service
        self.buffer_threshold_ms = buffer_threshold_ms
        # Restrict to English/Hindi only (Hinglish = code-switching between en/hi)
        self.language = language          # None = auto-detect on first chunk
        self.allowed_languages = ['en', 'hi']  # English and Hindi only
        self.beam_size = beam_size
        self._language_locked = False
        
        # Audio buffer
        self._chunks: List[bytes] = []
        self._buffer_duration_ms: float = 0.0
        self._chunk_count: int = 0
        
        # Transcript accumulation
        self._full_transcript: List[Dict[str, Any]] = []
        self._partial_text: str = ""
        
        # Ensure STT model is loaded
        if not self.stt._initialized:
            self.stt.initialize()
    
    def add_chunk(self, audio_bytes: bytes, duration_ms: float = 0.0) -> bool:
        """
        Add an audio chunk to the buffer.
        
        Args:
            audio_bytes: Raw audio data (WAV/PCM format)
            duration_ms: Duration of this chunk. If 0, estimated from byte length.
            
        Returns:
            True if buffer is ready for transcription
        """
        if not audio_bytes:
            return False
        
        self._chunks.append(audio_bytes)
        self._chunk_count += 1
        
        # Estimate duration if not provided (16kHz mono 16-bit PCM)
        if duration_ms <= 0:
            # bytes / (sample_rate * channels * bytes_per_sample) * 1000
            duration_ms = (len(audio_bytes) / (16000 * 1 * 2)) * 1000
        
        self._buffer_duration_ms += duration_ms
        
        return self._buffer_duration_ms >= self.buffer_threshold_ms
    
    async def transcribe_buffer(self) -> Optional[Dict[str, Any]]:
        """
        Transcribe the accumulated audio buffer.
        Returns transcription result or None if buffer is empty.
        """
        if not self._chunks:
            return None
        
        # Merge all chunks
        merged = self._merge_chunks()
        
        # Clear buffer
        self._chunks = []
        self._buffer_duration_ms = 0.0
        
        # Run transcription in thread pool (Whisper is synchronous)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._do_transcribe,
            merged
        )
        
        if result and result.get("text"):
            # Lock language after first successful detection (only English/Hindi allowed)
            if not self._language_locked and result.get("language"):
                detected_lang = result["language"]
                # Force English/Hindi only - reject other languages
                if detected_lang in self.allowed_languages:
                    self.language = detected_lang
                    self._language_locked = True
                    logger.info(f"✅ Language locked to: {self.language} ({detected_lang})")
                else:
                    # Force to English if other language detected
                    self.language = 'en'
                    self._language_locked = True
                    logger.warning(f"⚠️ Non-English/Hindi language detected ({detected_lang}), forcing to English")
            
            # Build segment result
            segment = {
                "text": result["text"],
                "language": result.get("language", self.language or "en"),
                "confidence": result.get("confidence", 0.0),
                "duration": result.get("duration", 0.0),
                "segment_index": len(self._full_transcript),
                "is_partial": False
            }
            self._full_transcript.append(segment)
            
            return segment
        
        return None
    
    async def flush(self) -> Optional[Dict[str, Any]]:
        """Force transcription of remaining audio buffer."""
        if not self._chunks:
            return None
        return await self.transcribe_buffer()
    
    def _merge_chunks(self) -> bytes:
        """Merge all buffered audio chunks into a single byte sequence."""
        if len(self._chunks) == 1:
            return self._chunks[0]
        
        merged = bytearray()
        for chunk in self._chunks:
            merged.extend(chunk)
        
        return bytes(merged)
    
    def _do_transcribe(self, audio_data: bytes) -> Dict[str, Any]:
        """Synchronous transcription (runs in thread pool)."""
        try:
            result = self.stt.transcribe_bytes(
                audio_data,
                format="wav",
                language=self.language  # Use locked language if available
            )
            return result
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            return {
                "text": "",
                "language": self.language or "en",
                "confidence": 0.0,
                "duration": 0.0
            }
    
    def get_full_transcript(self) -> str:
        """Get the full accumulated transcript text."""
        return " ".join(seg["text"] for seg in self._full_transcript if seg.get("text"))
    
    def get_transcript_segments(self) -> List[Dict[str, Any]]:
        """Get all transcript segments."""
        return self._full_transcript.copy()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get transcriber statistics."""
        return {
            "total_chunks_processed": self._chunk_count,
            "total_segments": len(self._full_transcript),
            "language": self.language,
            "language_locked": self._language_locked,
            "buffer_duration_ms": self._buffer_duration_ms,
            "pending_chunks": len(self._chunks)
        }
    
    def reset(self):
        """Reset transcriber state."""
        self._chunks = []
        self._buffer_duration_ms = 0.0
        self._chunk_count = 0
        self._full_transcript = []
        self._partial_text = ""
        self._language_locked = False
        self.language = None


class AudioNormalizer:
    """
    Quick audio normalization for streaming chunks.
    Converts various formats to 16kHz mono WAV for Whisper.
    """
    
    @staticmethod
    def normalize_chunk(
        audio_data: bytes,
        source_format: str = "webm"
    ) -> Optional[bytes]:
        """
        Normalize an audio chunk to 16kHz mono WAV.
        
        Args:
            audio_data: Raw audio bytes
            source_format: Source format (webm, opus, wav, mp3)
            
        Returns:
            Normalized WAV bytes, or None if normalization fails
        """
        try:
            from pydub import AudioSegment
            
            # For streaming WebM chunks, decoding may fail due to incomplete container
            # ffmpeg warnings are suppressed at logger level
            audio = AudioSegment.from_file(
                io.BytesIO(audio_data),
                format=source_format
            )
            
            # Normalize to Whisper requirements (16kHz mono 16-bit)
            audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            
            # Export as WAV
            output = io.BytesIO()
            audio.export(output, format="wav")
            return output.getvalue()
            
        except Exception:
            # Expected for incomplete streaming chunks
            return None
    
    @staticmethod
    def estimate_duration_ms(audio_data: bytes, format: str = "wav") -> float:
        """Estimate audio duration in milliseconds."""
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(io.BytesIO(audio_data), format=format)
            return len(audio)  # pydub returns duration in ms
        except Exception:
            # Fallback: estimate from raw PCM (16kHz mono 16-bit)
            return (len(audio_data) / (16000 * 1 * 2)) * 1000
    
    @staticmethod
    def validate_chunk(audio_data: bytes, max_size_bytes: int = 5 * 1024 * 1024) -> bool:
        """Quick validation without file I/O."""
        if not audio_data:
            return False
        if len(audio_data) > max_size_bytes:
            return False
        return True
