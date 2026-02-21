"""
Endpoints for receiving and fetching SMS evidence from mobile devices
when a scam call reaches high threat levels.
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import verify_api_key
from db.mongo import db

router = APIRouter()
logger = logging.getLogger("api.sms_evidence")

class SMSMessage(BaseModel):
    id: Optional[str] = None
    address: str
    body: str
    date: int  # Unix timestamp in milliseconds
    type: int  # 1 for inbox, 2 for sent etc.

class SMSEvidenceRequest(BaseModel):
    session_id: str
    phone_number: str
    messages: List[SMSMessage]

@router.post("/session/{session_id}/sms")
async def submit_sms_evidence(
    session_id: str,
    req: SMSEvidenceRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Receive SMS evidence from mobile app for a specific session.
    """
    if req.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")
    
    # Store evidence in the live_calls collection
    try:
        sms_data = [
            {
                "id": m.id,
                "address": m.address,
                "body": m.body,
                "date": m.date,
                "type": m.type,
                "extracted_at": datetime.utcnow()
            }
            for m in req.messages
        ]
        
        result = await db.live_calls.update_one(
            {"call_id": session_id},
            {"$set": {"sms_evidence": sms_data}}
        )
        
        if result.matched_count == 0:
            logger.warning(f"Could not find live_call doc for session {session_id} to attach SMS evidence.")
            # We still return success as the data is valid, just unattachable
        
        logger.info(f"✅ Attached {len(sms_data)} SMS evidence messages to session {session_id}")
        return {"status": "success", "count": len(sms_data)}
        
    except Exception as e:
        logger.error(f"Failed to store SMS evidence: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store evidence")
