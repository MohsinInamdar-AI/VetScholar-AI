import hashlib, re, uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from .config import settings

def safe_display_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._ -]", "_", Path(name).name).strip(" .")[:200] or "upload"

async def read_valid_upload(upload: UploadFile):
    name = safe_display_name(upload.filename or "upload")
    ext = Path(name).suffix.lower()
    signatures = {".pdf": b"%PDF-", ".png": b"\x89PNG\r\n\x1a\n",
                  ".jpg": b"\xff\xd8\xff", ".jpeg": b"\xff\xd8\xff"}
    if ext not in signatures:
        raise HTTPException(415, "Supported files: PDF, PNG, JPG and JPEG.")
    data = await upload.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not data: raise HTTPException(400, "Empty file.")
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Maximum upload size is {settings.max_upload_mb} MB.")
    if not data.startswith(signatures[ext]):
        raise HTTPException(415, "File extension does not match its content.")
    return name, ext, data

def sha256(data: bytes): return hashlib.sha256(data).hexdigest()
def stored_name(): return uuid.uuid4().hex + ".bin"
