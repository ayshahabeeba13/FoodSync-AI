import os
import hmac
import hashlib
import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from jose import jwt, JWTError
from backend.app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

# =========================================================================
# Safeguard 2: Secure 6-Digit NGO Collection OTP
# =========================================================================

def hash_otp_with_salt(otp: str, salt: str) -> str:
    return hmac.new(salt.encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()

def generate_collection_otp(expiry_minutes: int = 30) -> Tuple[str, str, str, datetime]:
    """
    Generates a cryptographically random 6-digit OTP.
    Returns: (plain_otp, hashed_otp, salt, expires_at)
    The plain_otp is sent ONCE to the NGO/volunteer, while hashed_otp is safely stored.
    """
    # 6-digit numeric OTP between 100000 and 999999
    plain_otp = str(secrets.randbelow(900000) + 100000)
    salt = secrets.token_hex(16)
    hashed_otp = hash_otp_with_salt(plain_otp, salt)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
    
    return plain_otp, hashed_otp, salt, expires_at

def verify_collection_otp(
    submitted_otp: str,
    stored_hash: str,
    salt: str,
    expires_at: datetime,
    attempt_count: int,
    max_attempts: int = 3
) -> Tuple[bool, str, int]:
    """
    Verifies OTP with expiration, attempt limits, and constant-time comparison.
    Returns: (is_valid, error_code, remaining_attempts)
    """
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        return False, "OTP_EXPIRED", 0

    if attempt_count >= max_attempts:
        return False, "MAX_ATTEMPTS_EXCEEDED", 0

    attempt_count += 1
    remaining = max(0, max_attempts - attempt_count)

    computed_hash = hash_otp_with_salt(submitted_otp.strip(), salt)
    
    # Constant-time comparison prevents timing attacks
    if not hmac.compare_digest(computed_hash, stored_hash):
        if remaining == 0:
            return False, "MAX_ATTEMPTS_EXCEEDED", 0
        return False, "INVALID_OTP", remaining

    return True, "SUCCESS", remaining
