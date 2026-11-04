import io, re
import fitz
from PIL import Image, ImageOps
import pytesseract
from langchain_core.documents import Document as LCDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session
from .config import settings
from .models import DocumentChunk
from .vector import store

def extract_pages(data: bytes, ext: str):
    pages = []
    if ext == ".pdf":
        with fitz.open(stream=data, filetype="pdf") as pdf:
            if pdf.page_count > 500: raise ValueError("PDF exceeds 500-page limit.")
            for i, page in enumerate(pdf):
                txt = page.get_text("text").strip()
                if len(txt) < 40:
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    txt = pytesseract.image_to_string(Image.open(io.BytesIO(pix.tobytes("png"))))
                if txt.strip(): pages.append((i + 1, txt))
    else:
        im = Image.open(io.BytesIO(data))
        if im.width * im.height > 25_000_000: raise ValueError("Image dimensions exceed limit.")
        im.verify()
        im = ImageOps.autocontrast(Image.open(io.BytesIO(data)).convert("L"))
        pages.append((1, pytesseract.image_to_string(im)))
    return pages

def ingest(db: Session, document, data: bytes, ext: str):
    document.status = "processing"; db.commit()
    pages = extract_pages(data, ext)
    splitter = RecursiveCharacterTextSplitter(chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap, separators=["\n\n", "\n", ". ", " ", ""])
    docs, rows = [], []
    for page_no, raw in pages:
        cleaned = re.sub(r"[ \t]+", " ", raw).strip()
        for idx, chunk in enumerate(splitter.split_text(cleaned)):
            if len(chunk.strip()) < 30: continue
            cid = f"{document.id}:{page_no}:{idx}"
            docs.append(LCDocument(page_content=chunk, metadata={
                "document_id": document.id, "filename": document.filename,
                "page": page_no, "chunk_id": cid}))
            rows.append(DocumentChunk(document_id=document.id, page_number=page_no,
                chunk_index=idx, text_preview=chunk[:1000]))
    if not docs: raise ValueError("No readable text found. Check document quality and OCR installation.")
    store().add_documents(docs, ids=[d.metadata["chunk_id"] for d in docs])
    db.add_all(rows)
    document.page_count = len(pages); document.chunk_count = len(docs)
    document.status = "ready"; document.error = None
    db.commit()
