import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path

from fastapi import HTTPException, Request
from .config import settings

# A per-installation signing key is generated once and kept in the local data folder.
# For a network deployment, configure a dedicated secret via environment variables.
def _secret_key() -> bytes:
    import os
    configured = os.getenv("VETSCHOLAR_SECRET_KEY")
    if configured:
        if len(configured) < 32:
            raise RuntimeError("VETSCHOLAR_SECRET_KEY must be at least 32 characters.")
        return configured.encode("utf-8")
    path = settings.data_dir / "auth.secret"
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip().encode("utf-8")

TOKEN_LIFETIME_SECONDS = 8 * 60 * 60

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(derived).decode()

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_text, hash_text = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_text)
        expected = base64.b64decode(hash_text)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def create_token(user_id: str) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + TOKEN_LIFETIME_SECONDS}, separators=(",", ":")).encode())
    message = f"{header}.{payload}".encode()
    signature = hmac.new(_secret_key(), message, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64(signature)}"

def verify_token(token: str) -> str | None:
    try:
        header, payload, signature = token.split(".")
        message = f"{header}.{payload}".encode()
        expected = hmac.new(_secret_key(), message, hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data.get("exp", 0)) <= int(time.time()):
            return None
        subject = data.get("sub")
        return subject if isinstance(subject, str) else None
    except Exception:
        return None
