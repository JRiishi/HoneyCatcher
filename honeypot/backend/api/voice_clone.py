"""
Voice Clone API Router
Endpoints for voice sample management and cloning via ElevenLabs.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core.auth import verify_api_key
from features.live_takeover.voice_clone_service import voice_clone_service

router = APIRouter()
logger = logging.getLogger("api.voice_clone")


class VoiceCloneResponse(BaseModel):
    voice_id: str
    name: str
    status: str

class VoiceListItem(BaseModel):
    voice_id: str
    name: str
    category: Optional[str] = None

class QuotaResponse(BaseModel):
    character_count: int
    character_limit: int
    remaining: int


@router.post("/voice-clone/create", response_model=VoiceCloneResponse)
async def create_voice_clone(
    name: str = Form(...),
    description: str = Form("HoneyBadger cloned voice"),
    audio_files: List[UploadFile] = File(...),
    api_key: str = Depends(verify_api_key)
):
    """
    Upload audio samples and create a cloned voice.
    Accepts 1-25 audio files (WAV, MP3, M4A).
    At least 1 minute of clear speech recommended.
    """
    if not audio_files:
        raise HTTPException(400, "At least one audio file required")
    
    if len(audio_files) > 25:
        raise HTTPException(400, "Maximum 25 audio files allowed")
    
    # Read all files
    files_data = []
    for f in audio_files:
        content = await f.read()
        
        if len(content) > 50 * 1024 * 1024:  # 50MB limit per file
            raise HTTPException(400, f"File {f.filename} exceeds 50MB limit")
        
        files_data.append({
            "filename": f.filename or "sample.wav",
            "content": content,
            "content_type": f.content_type or "audio/wav"
        })
    
    try:
        result = await voice_clone_service.create_voice_clone(
            name=name,
            description=description,
            audio_samples=[f["content"] for f in files_data]
        )
        
        if not result:
            raise HTTPException(503, "Voice cloning service unavailable")
        
        logger.info(f"Voice clone created: {result['voice_id']} ({name})")
        
        return VoiceCloneResponse(
            voice_id=result["voice_id"],
            name=name,
            status="created"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice clone creation failed: {e}")
        raise HTTPException(500, f"Voice clone failed: {str(e)}")


@router.get("/voice-clone/list", response_model=List[VoiceListItem])
async def list_voices(
    api_key: str = Depends(verify_api_key)
):
    """List all available cloned voices."""
    try:
        voices = await voice_clone_service.list_voices()
        return [
            VoiceListItem(
                voice_id=v["voice_id"],
                name=v["name"],
                category=v.get("category")
            )
            for v in voices
        ]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/voice-clone/preview")
async def preview_voice(
    voice_id: str = Form(...),
    text: str = Form("Hello, this is a test of my cloned voice."),
    api_key: str = Depends(verify_api_key)
):
    """Preview a cloned voice with sample text."""
    try:
        audio_data = await voice_clone_service.preview_voice(
            voice_id=voice_id,
            text=text
        )
        
        if not audio_data:
            raise HTTPException(500, "Voice preview generation failed")
        
        import base64
        return {
            "status": "ok",
            "voice_id": voice_id,
            "audio": base64.b64encode(audio_data).decode(),
            "format": "mp3"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/voice-clone/{voice_id}")
async def delete_voice(
    voice_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Delete a cloned voice."""
    try:
        success = await voice_clone_service.delete_voice(voice_id)
        
        if not success:
            raise HTTPException(404, "Voice not found or deletion failed")
        
        return {"status": "deleted", "voice_id": voice_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/voice-clone/quota", response_model=QuotaResponse)
async def get_quota(
    api_key: str = Depends(verify_api_key)
):
    """Get ElevenLabs API quota/usage."""
    try:
        quota = await voice_clone_service.get_quota()
        if not quota:
            raise HTTPException(503, "ElevenLabs service unavailable")
        
        return QuotaResponse(
            character_count=quota.get("character_count", 0),
            character_limit=quota.get("character_limit", 0),
            remaining=quota.get("remaining", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
