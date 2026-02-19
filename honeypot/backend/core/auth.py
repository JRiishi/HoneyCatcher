"""
Authentication module - JWT tokens + legacy API key fallback.
Uses python-jose for JWT, passlib for password hashing.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings
from db.mongo import db

# --- Password hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# --- JWT token creation ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

# --- Security schemes ---
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def verify_api_key(
    api_key: Optional[str] = Security(api_key_header),
    token: Optional[str] = Depends(oauth2_scheme),
):
    """
    Flexible auth: accepts EITHER a JWT Bearer token OR the legacy x-api-key header.
    All existing routes using Depends(verify_api_key) work unchanged.
    """
    # Try JWT first
    if token:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Token missing subject")
        # Optionally verify user still exists
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="User not found")
        return {"username": username, "auth_method": "jwt"}

    # Fallback to legacy API key
    if api_key:
        if api_key != settings.API_SECRET_KEY:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Invalid API Key")
        return {"username": "api_key_user", "auth_method": "api_key"}

    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Missing authentication. Provide Bearer token or x-api-key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_user(auth=Depends(verify_api_key)):
    """Convenience dependency that returns the authenticated user info."""
    return auth
