from datetime import datetime, timedelta
import logging
from db.mongo import db
from services.callback import callback_service

logger = logging.getLogger("lifecycle")

class LifecycleManager:
    MAX_MESSAGES = 50
    TIMEOUT_HOURS = 24

    async def check_termination(self, session_id: str):
        """
        Checks if the session should be terminated.
        """
        session = await db.sessions.find_one({"session_id": session_id})
        if not session:
            return

        terminated = False
        reason = ""

        # 1. Message Limit (Safety Termination)
        if session.get("message_count", 0) >= self.MAX_MESSAGES:
            terminated = True
            reason = "Max messages reached"

        # 2. Sufficient Engagement Trigger (Mandatory Callback)
        # GUVI Rules: Scam confirmed, sufficient engagement, extraction finished.
        if (session.get("is_confirmed_scam") 
            and session.get("message_count", 0) >= 5 
            and session.get("status") != "reported" 
            and not session.get("is_reported")):
            
            await self._report_and_complete(session)

        if terminated and session.get("status") != "terminated":
            await self._terminate(session, reason)

    async def _report_and_complete(self, session: dict):
        """Reports the intelligence to GUVI and marks session as reported."""
        session_id = session['session_id']
        logger.info(f"Session {session_id} met reporting criteria. Sending intelligence...")
        
        # Mark as reported immediately to prevent race conditions
        await db.sessions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "reported", "is_reported": True}}
        )
        
        # Reload and send
        final_session = await db.sessions.find_one({"session_id": session_id})
        await callback_service.send_report(final_session)

    async def _terminate(self, session: dict, reason: str):
        """Terminates session."""
        logger.info(f"Terminating session {session['session_id']}: {reason}")
        
        await db.sessions.update_one(
            {"session_id": session['session_id']},
            {"$set": {"status": "terminated", "termination_reason": reason}}
        )

lifecycle_manager = LifecycleManager()
