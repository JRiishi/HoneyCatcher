"""
Auth API routes - Registration, Login, Token Refresh.
Uses MongoDB for user storage, bcrypt for password hashing, JWT for tokens.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from db.mongo import db

logger = logging.getLogger("auth")

router = APIRouter(prefix="/auth", tags=["Auth"])

# Rate limiter (reuses the same limiter from main.py)
limiter = Limiter(key_func=get_remote_address)


# --- Request / Response schemas ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    display_name: str = Field(default="")


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# --- Endpoints ---

@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, req: RegisterRequest):
    """Register a new operator account."""
    existing = await db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Username already taken")

    user_doc = {
        "username": req.username,
        "password_hash": hash_password(req.password),
        "display_name": req.display_name or req.username,
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    await db.users.insert_one(user_doc)
    logger.info(f"New user registered: {req.username}")

    # Issue tokens
    token_data = {"sub": req.username}
    access = create_access_token(token_data)
    refresh = create_refresh_token(token_data)

    # Store refresh token hash for rotation validation
    await db.refresh_tokens.insert_one({
        "username": req.username,
        "token": refresh,
        "created_at": datetime.utcnow(),
        "revoked": False,
    })

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest):
    """Authenticate and receive JWT tokens."""
    user = await db.users.find_one({"username": req.username})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.get("is_active", True):
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Account disabled")

    token_data = {"sub": req.username}
    access = create_access_token(token_data)
    refresh = create_refresh_token(token_data)

    # Store refresh token (rotation: old ones auto-expire via TTL)
    await db.refresh_tokens.insert_one({
        "username": req.username,
        "token": refresh,
        "created_at": datetime.utcnow(),
        "revoked": False,
    })

    logger.info(f"User logged in: {req.username}")
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh_token(request: Request, req: RefreshRequest):
    """
    Refresh token rotation: validates the refresh token, issues new pair,
    revokes the old refresh token to prevent reuse.
    """
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    # Check token is not revoked
    stored = await db.refresh_tokens.find_one({
        "token": req.refresh_token,
        "revoked": False,
    })
    if not stored:
        # Possible token reuse attack - revoke ALL tokens for this user
        await db.refresh_tokens.update_many(
            {"username": username},
            {"$set": {"revoked": True}},
        )
        logger.warning(f"Refresh token reuse detected for user: {username}")
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Token revoked or reused")

    # Revoke old token
    await db.refresh_tokens.update_one(
        {"_id": stored["_id"]},
        {"$set": {"revoked": True}},
    )

    # Issue new pair
    token_data = {"sub": username}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    await db.refresh_tokens.insert_one({
        "username": username,
        "token": new_refresh,
        "created_at": datetime.utcnow(),
        "revoked": False,
    })

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(req: RefreshRequest):
    """Revoke refresh token on logout."""
    await db.refresh_tokens.update_one(
        {"token": req.refresh_token},
        {"$set": {"revoked": True}},
    )
    return {"detail": "Logged out"}


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Return current authenticated user info."""
    user_doc = await db.users.find_one({"username": user["username"]})
    if not user_doc:
        return {"username": user["username"], "auth_method": user["auth_method"]}
    return {
        "username": user_doc["username"],
        "display_name": user_doc.get("display_name", ""),
        "created_at": str(user_doc.get("created_at", "")),
        "auth_method": user["auth_method"],
    }
