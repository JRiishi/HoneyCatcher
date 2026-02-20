"""
Agora API Routes
Handles token generation and call management for Agora-based live calls
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
import logging
import time

# Import Agora token generation library
try:
    from agora_token_builder import RtcTokenBuilder
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False
    logging.warning("agora-token-builder not installed. Run: pip install agora-token-builder")

from config import settings
from core.auth import get_current_user

router = APIRouter(prefix="/agora", tags=["Agora"])
logger = logging.getLogger("api.agora")

# Agora Configuration (add to your .env file)
AGORA_APP_ID = "e7f6e9aeecf14b2ba10e3f40be9f56e7"
AGORA_APP_CERTIFICATE = ""  # Add your Agora app certificate from console

class TokenRequest(BaseModel):
    channelName: str
    uid: int = 0  # 0 means Agora will auto-assign
    role: Literal["host", "audience"] = "host"
    expirationSeconds: int = 3600  # Token valid for 1 hour

class TokenResponse(BaseModel):
    token: str
    appId: str
    channelName: str
    uid: int
    expiresAt: int

@router.post("/generate-token", response_model=TokenResponse)
async def generate_agora_token(
    request: TokenRequest,
    current_user = Depends(get_current_user)
):
    """
    Generate Agora RTC token for secure channel access
    
    Required environment variables:
    - AGORA_APP_ID: Your Agora App ID
    - AGORA_APP_CERTIFICATE: Your Agora App Certificate (from Agora Console)
    
    For testing without tokens: Use testing mode in Agora Console (no certificate needed)
    For production: Always use token authentication
    """
    
    if not AGORA_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Agora token builder not installed. Install: pip install agora-token-builder"
        )
    
    if not AGORA_APP_CERTIFICATE:
        logger.warning("⚠️ AGORA_APP_CERTIFICATE not set. Using testing mode (insecure)")
        # In testing mode, return a dummy response
        # The frontend should handle null tokens for testing
        raise HTTPException(
            status_code=400,
            detail="Token generation disabled. Enable App Certificate in Agora Console and set AGORA_APP_CERTIFICATE"
        )
    
    try:
        # Calculate expiration timestamp
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + request.expirationSeconds
        
        # Set role privileges
        # Role 1 = Host (can publish and subscribe)
        # Role 2 = Audience (can only subscribe)
        role_privilege = 1 if request.role == "host" else 2
        
        # Generate token
        token = RtcTokenBuilder.buildTokenWithUid(
            appId=AGORA_APP_ID,
            appCertificate=AGORA_APP_CERTIFICATE,
            channelName=request.channelName,
            uid=request.uid,
            role=role_privilege,
            privilegeExpiredTs=privilege_expired_ts
        )
        
        logger.info(f"✅ Generated Agora token for user {current_user.get('email', 'unknown')}")
        logger.info(f"   Channel: {request.channelName}, UID: {request.uid}, Role: {request.role}")
        
        return TokenResponse(
            token=token,
            appId=AGORA_APP_ID,
            channelName=request.channelName,
            uid=request.uid or 0,
            expiresAt=privilege_expired_ts
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to generate Agora token: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        )

@router.get("/config")
async def get_agora_config():
    """Get public Agora configuration (App ID only, never expose certificate)"""
    return {
        "appId": AGORA_APP_ID,
        "tokenRequired": bool(AGORA_APP_CERTIFICATE),
        "maxChannelDuration": 3600,  # 1 hour
    }
