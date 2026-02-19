from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.auth import verify_api_key
from db.mongo import db
from db.models import Session, Message
from services.scam_detector import scam_detector
from services.intelligence_extractor import extraction_service
from core.lifecycle import lifecycle_manager
from agents.graph import agent_system

router = APIRouter()
logger = logging.getLogger("api.message")
limiter = Limiter(key_func=get_remote_address)

class InnerMessage(BaseModel):
    sender: str
    text: str
    timestamp: int

class MessageInput(BaseModel):
    sessionId: str
    message: InnerMessage
    conversationHistory: Optional[List[dict]] = []
    metadata: Optional[dict] = {}

class MessageResponse(BaseModel):
    status: str
    reply: Optional[str] = None
    # We hide sessionId and action to match the GUVI required output format perfectly

async def process_background_tasks(session_id: str, message_content: str, history: List[dict] = None):
    """
    Background task: Intelligence Extraction & Lifecycle Management.
    """
    # 1. Extract Intelligence with History Context
    await extraction_service.extract(session_id, message_content, history)
    
    # 2. Check Lifecycle (Termination & Evaluation Callback)
    await lifecycle_manager.check_termination(session_id)

@router.post("/message", response_model=MessageResponse)
@limiter.limit("60/minute")
async def receive_message(
    request: Request,
    payload: MessageInput, 
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """
    Ingests a message, detects scam intent, and returns agent response if active.
    """
    try:
        session_id = payload.sessionId
        incoming_text = payload.message.text
        
        logger.info(f"Received message for session {session_id}: {incoming_text[:50]}...")
        
        # 1. Session Management
        session = None
        session_data = await db.sessions.find_one({"session_id": session_id})
        if not session_data:
            session = Session(session_id=session_id)
            await db.sessions.insert_one(session.model_dump())
            logger.info(f"Created new session: {session_id}")
        else:
            try:
                session = Session(**session_data)
            except Exception as e:
                logger.error(f"Failed to parse session: {e}")
                # Fallback: create fresh session
                session = Session(session_id=session_id)

        if session.status == "terminated":
            return {
                "status": "terminated",
                "action": "none",
                "reply": None,
                "sessionId": session_id
            }

        # Fetch History
        current_history = await db.messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(length=20)
        formatted_history = [{"role": m["sender"], "content": m["content"]} for m in current_history]

        # 2. Persist User Message
        user_msg = Message(
            session_id=session_id,
            sender="scammer",
            content=incoming_text,
            metadata=payload.metadata
        )
        await db.messages.insert_one(user_msg.model_dump())
        
        # 3. Detect Scam
        is_confirmed_scam = session.is_confirmed_scam
        
        if not is_confirmed_scam:
            detection_result = await scam_detector.analyze(incoming_text, formatted_history)
            
            # Update Session
            updates = {
                "scam_score": detection_result["confidence"],
                "last_updated": datetime.utcnow(),
                "message_count": session.message_count + 1
            }
            
            if detection_result["is_scam"]:
                updates["is_confirmed_scam"] = True
                is_confirmed_scam = True
                logger.info(f"🚨 Session {session_id} CONFIRMED SCAM.")
            
            await db.sessions.update_one({"session_id": session_id}, {"$set": updates})
        else:
            await db.sessions.update_one(
                {"session_id": session_id}, 
                {"$inc": {"message_count": 1}, "$set": {"last_updated": datetime.utcnow()}}
            )

        # 4. Agent Engagement
        agent_reply = None
        action_taken = "monitoring"

        if is_confirmed_scam:
            # Add current message to history for the agent
            full_history = formatted_history + [{"role": "scammer", "content": incoming_text}]
            
            # Run Agent Graph (Returns dict now)
            agent_result = await agent_system.run(full_history)
            agent_reply = agent_result["reply"]
            
            # Update Agent State in DB
            await db.sessions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "agent_state.turn_count": session.agent_state.turn_count + 1,
                        "agent_state.sentiment": agent_result.get("emotion", "neutral"),
                        "agent_state.last_action": agent_result.get("strategy", "stall"),
                        "agent_state.notes": agent_result.get("notes", "")
                    }
                }
            )
            
            # Persist Agent Reply
            agent_msg = Message(
                session_id=session_id,
                sender="agent",
                content=agent_reply
            )
            await db.messages.insert_one(agent_msg.model_dump())

        # 5. Background Tasks (Pass current history to extractor)
        background_tasks.add_task(process_background_tasks, session_id, incoming_text, full_history if is_confirmed_scam else formatted_history)

        return {
            "status": "success",
            "reply": agent_reply
        }
    except Exception as e:
        logger.error(f"❌ Message endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
