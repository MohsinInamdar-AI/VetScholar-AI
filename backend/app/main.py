import json
import uuid
import httpx
import logging
import time

from pathlib import Path

from fastapi import (
    FastAPI,
    Depends,
    UploadFile,
    File,
    HTTPException,
    Request
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy.orm import Session
from sqlalchemy import select, func

from .config import settings
from .database import Base, engine, get_db, SessionLocal
from .models import User, Document, Conversation, Message, DocumentChunk
from .security import read_valid_upload, sha256, stored_name
from .ingestion import ingest
from .ai import ask
from .vector import store
from .auth import (
    hash_password,
    verify_password,
    create_token,
    verify_token
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

logger = logging.getLogger("vetscholar.api")


# Create database tables
Base.metadata.create_all(bind=engine)


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Local-first veterinary scientific literature assistant"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)


# Routes that do not require login
PUBLIC_AUTH_PATHS = {
    "/api/health",
    "/api/health/ollama",
    "/api/auth/status",
    "/api/auth/register",
    "/api/auth/login",
}


# Authentication middleware
@app.middleware("http")
async def authentication_middleware(request: Request, call_next):

    path = request.url.path

    # Allow browser CORS preflight requests
    if request.method == "OPTIONS":
        return await call_next(request)

    # Allow non-API and public authentication routes
    if not path.startswith("/api/") or path in PUBLIC_AUTH_PATHS:
        return await call_next(request)

    # Check authorization header
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Please login to continue."}
        )

    token = authorization.split(" ", 1)[1].strip()

    user_id = verify_token(token)

    if not user_id:
        return JSONResponse(
            status_code=401,
            content={"detail": "Session expired. Please login again."}
        )

    # Verify user exists
    db = SessionLocal()

    try:
        if not db.get(User, user_id):
            return JSONResponse(
                status_code=401,
                content={"detail": "Account not found. Please login again."}
            )
    finally:
        db.close()

    request.state.user_id = user_id

    return await call_next(request)


# Authentication status
@app.get("/api/auth/status")
def auth_status(db: Session = Depends(get_db)):

    exists = (
        db.scalar(select(func.count()).select_from(User)) or 0
    ) > 0

    return {
        "account_exists": exists,
        "registration_allowed": not exists
    }


# First-time registration
@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or "@" not in email or len(email) > 255:
        raise HTTPException(
            422,
            "Enter a valid email address."
        )

    if len(password) < 10:
        raise HTTPException(
            422,
            "Password must contain at least 10 characters."
        )

    account_count = (
        db.scalar(select(func.count()).select_from(User)) or 0
    )

    if account_count > 0:
        raise HTTPException(
            403,
            "Registration is closed. Please login."
        )

    user = User(
        email=email,
        password_hash=hash_password(password)
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()

        raise HTTPException(
            409,
            "Unable to create account. The email may already be registered."
        )

    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "email": user.email
    }


# Login
@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user or not verify_password(
        password,
        user.password_hash
    ):
        raise HTTPException(
            401,
            "Incorrect email or password."
        )

    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "email": user.email
    }


# Document response format
def doc_json(d):

    return {
        "id": d.id,
        "filename": d.filename,
        "size_bytes": d.size_bytes,
        "status": d.status,
        "page_count": d.page_count,
        "chunk_count": d.chunk_count,
        "error": d.error,
        "created_at": (
            d.created_at.isoformat()
            if d.created_at else None
        )
    }


# Basic health check
@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "app": settings.app_name,
        "model": settings.ollama_model
    }


# Ollama health check
@app.get("/api/health/ollama")
def ollama_health():

    try:
        r = httpx.get(
            f"{settings.ollama_base_url}/api/tags",
            timeout=3
        )

        r.raise_for_status()

        models = [
            m.get("name")
            for m in r.json().get("models", [])
        ]

        return {
            "connected": True,
            "model": settings.ollama_model,
            "available_models": models,
            "model_available": any(
                settings.ollama_model in (m or "")
                for m in models
            )
        }

    except Exception as e:

        return {
            "connected": False,
            "model": settings.ollama_model,
            "error": str(e)
        }


# Dashboard statistics
@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):

    return {
        "documents": (
            db.scalar(
                select(func.count()).select_from(Document)
            ) or 0
        ),

        "processed": (
            db.scalar(
                select(func.count())
                .select_from(Document)
                .where(Document.status == "ready")
            ) or 0
        ),

        "conversations": (
            db.scalar(
                select(func.count()).select_from(Conversation)
            ) or 0
        ),

        "chunks": (
            db.scalar(
                select(func.count()).select_from(DocumentChunk)
            ) or 0
        ),

        "recent_documents": [
            doc_json(d)
            for d in db.scalars(
                select(Document)
                .order_by(Document.created_at.desc())
                .limit(5)
            )
        ]
    }


# Upload research paper
@app.post("/api/documents/upload")
async def upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    started = time.perf_counter()

    name, ext, data = await read_valid_upload(file)

    digest = sha256(data)

    existing = db.scalar(
        select(Document).where(Document.sha256 == digest)
    )

    if existing:
        raise HTTPException(
            409,
            f"Duplicate document already exists: {existing.id}"
        )

    stored = stored_name()

    path = settings.uploads_dir / stored

    path.write_bytes(data)

    d = Document(
        filename=name,
        stored_name=stored,
        sha256=digest,
        mime_type=ext,
        size_bytes=len(data),
        status="queued"
    )

    db.add(d)
    db.commit()
    db.refresh(d)

    try:
        ingest(db, d, data, ext)

    except Exception as e:

        d.status = "failed"
        d.error = str(e)[:500]

        db.commit()

        raise HTTPException(
            422,
            f"Document processing failed: {d.error}"
        )

    logger.info(
        "UPLOAD_METRICS filename=%s bytes=%d pages=%d chunks=%d elapsed_ms=%.2f status=%s",
        name,
        len(data),
        d.page_count,
        d.chunk_count,
        (time.perf_counter() - started) * 1000,
        d.status
    )

    return doc_json(d)


# List documents
@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):

    return [
        doc_json(d)
        for d in db.scalars(
            select(Document).order_by(Document.created_at.desc())
        )
    ]


# Delete document helper
def delete_doc(d: Document, db: Session):

    try:
        store().delete(
            where={"document_id": d.id}
        )
    except Exception:
        pass

    path = settings.uploads_dir / d.stored_name

    if path.exists():
        path.unlink()

    db.delete(d)
    db.commit()


# Delete one document
@app.delete("/api/documents/{document_id}")
def remove_document(
    document_id: str,
    db: Session = Depends(get_db)
):

    d = db.get(Document, document_id)

    if not d:
        raise HTTPException(
            404,
            "Document not found"
        )

    delete_doc(d, db)

    return {
        "deleted": True,
        "document_id": document_id
    }


# Delete all documents
@app.delete("/api/documents")
def remove_all_documents(db: Session = Depends(get_db)):

    docs = list(db.scalars(select(Document)))

    for d in docs:
        delete_doc(d, db)

    return {
        "deleted_count": len(docs)
    }


# AI research chat
@app.post("/api/chat")
def chat(payload: dict, db: Session = Depends(get_db)):

    request_started = time.perf_counter()

    question = str(
        payload.get("question", "")
    ).strip()

    if len(question) < 2 or len(question) > 6000:
        raise HTTPException(
            422,
            "Question must be 2–6000 characters."
        )

    conversation_id = payload.get("conversation_id")

    conv = (
        db.get(Conversation, conversation_id)
        if conversation_id else None
    )

    if conversation_id and not conv:
        raise HTTPException(
            404,
            "Conversation not found"
        )

    if not conv:

        conv = Conversation(
            title=question[:70]
        )

        db.add(conv)
        db.commit()
        db.refresh(conv)

    ids = payload.get("document_ids") or []

    if len(ids) > 100:
        raise HTTPException(
            422,
            "Too many selected documents."
        )

    for did in ids:

        if not db.get(Document, did):
            raise HTTPException(
                404,
                f"Unknown document: {did}"
            )

    db.add(
        Message(
            conversation_id=conv.id,
            role="user",
            content=question
        )
    )

    db.commit()

    try:
        answer, citations = ask(
            question,
            ids or None
        )

    except Exception as e:

        raise HTTPException(
            503,
            f"Local AI request failed. Check Ollama and ChromaDB. {str(e)[:200]}"
        )

    db.add(
        Message(
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            citations_json=json.dumps(citations)
        )
    )

    db.commit()

    logger.info(
        "CHAT_REQUEST_METRICS conversation_id=%s elapsed_ms=%.2f citations=%d",
        conv.id,
        (time.perf_counter() - request_started) * 1000,
        len(citations)
    )

    return {
        "conversation_id": conv.id,
        "answer": answer,
        "citations": citations
    }


# List research history
@app.get("/api/history")
def history(db: Session = Depends(get_db)):

    result = []

    for c in db.scalars(
        select(Conversation)
        .order_by(Conversation.created_at.desc())
    ):

        result.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat(),
            "message_count": len(c.messages)
        })

    return result


# Get one conversation
@app.get("/api/history/{conversation_id}")
def conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):

    c = db.get(Conversation, conversation_id)

    if not c:
        raise HTTPException(
            404,
            "Conversation not found"
        )

    return {
        "id": c.id,
        "title": c.title,

        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": json.loads(
                    m.citations_json or "[]"
                )
            }
            for m in c.messages
        ]
    }


# Delete one conversation
@app.delete("/api/history/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):

    c = db.get(Conversation, conversation_id)

    if not c:
        raise HTTPException(
            404,
            "Conversation not found"
        )

    db.delete(c)
    db.commit()

    return {
        "deleted": True
    }


# Clear all history
@app.delete("/api/history")
def clear_history(db: Session = Depends(get_db)):

    count = (
        db.scalar(
            select(func.count()).select_from(Conversation)
        ) or 0
    )

    for c in list(db.scalars(select(Conversation))):
        db.delete(c)

    db.commit()

    return {
        "deleted_conversations": count
    }


# Summarize one research paper
@app.post("/api/research/summarize")
def summarize(
    payload: dict,
    db: Session = Depends(get_db)
):

    ids = payload.get("document_ids") or []

    if len(ids) != 1:
        raise HTTPException(
            422,
            "Select exactly one document."
        )

    answer, citations = ask(
        "Create a structured scientific summary: title, objective, animal species, study population, sample size, methodology, statistical methods, key findings, limitations and conclusion. Mark unavailable fields as not reported.",
        ids
    )

    return {
        "summary": answer,
        "citations": citations
    }


# Compare research papers
@app.post("/api/research/compare")
def compare(
    payload: dict,
    db: Session = Depends(get_db)
):

    ids = payload.get("document_ids") or []

    if len(ids) < 2 or len(ids) > 10:
        raise HTTPException(
            422,
            "Select 2–10 documents."
        )

    answer, citations = ask(
        "Compare these papers by objectives, species, sample sizes, study design, methodology, findings, statistics, limitations and conclusions. Clearly distinguish missing and conflicting evidence.",
        ids
    )

    return {
        "comparison": answer,
        "citations": citations
    }


# Application settings
@app.get("/api/settings")
def settings_api():

    return {
        "model": settings.ollama_model,
        "embedding_model": settings.embedding_model,
        "data_directory": str(settings.data_dir.resolve()),
        "max_upload_mb": settings.max_upload_mb,
        "ollama_url": settings.ollama_base_url
    }


# Erase all application data
@app.delete("/api/data/all")
def erase_all(db: Session = Depends(get_db)):

    for c in list(db.scalars(select(Conversation))):
        db.delete(c)

    db.commit()

    docs = list(db.scalars(select(Document)))

    for d in docs:
        delete_doc(d, db)

    return {
        "erased": True,
        "documents_deleted": len(docs),
        "conversations_deleted": True
    }