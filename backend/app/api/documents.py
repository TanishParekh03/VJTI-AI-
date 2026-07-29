"""
Document routes — /documents/*
Handles file upload, status polling, listing, and deletion.
Upload kicks off async Supermemory ingestion.
Role guard: upload/delete requires officer or admin.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, OfficerOrAdmin, get_current_user
from app.db.session import get_db
from app.models.analytics import AnalyticsEvent
from app.models.document import Document
from app.schemas.document import (
    CompareRequest,
    CompareResponse,
    DocumentRead,
    DocumentStatusResponse,
    DocumentUpdate,
    UploadResponse,
)
from app.services import retrieval_service

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx"}
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def _ext_to_file_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return {"pdf": "PDF", ".pdf": "PDF", ".docx": "DOCX", ".xlsx": "XLSX"}.get(ext, "PDF")


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def _extract_text_from_file_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract readable text automatically from PDF or text documents."""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext == "pdf":
        try:
            import io
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_pages.append(t)
            extracted = "\n\n".join(text_pages)
            if extracted.strip():
                return extracted
        except Exception:
            pass

    return file_bytes.decode("utf-8", errors="ignore")


async def _ingest_in_background(
    doc_id: str,
    file_bytes: bytes,
    filename: str,
    container_tags: list[str],
    metadata: dict,
    db_session_factory,
) -> None:
    """
    Background task: automatically parse PDF/text content, translate if Marathi,
    ingest into Supermemory vector store, and update Postgres status to indexed.
    """
    from app.db.session import AsyncSessionLocal
    from app.services import llm_service

    async with AsyncSessionLocal() as db:
        try:
            # 1. Extract readable text from uploaded file bytes (PDF / text)
            raw_text = _extract_text_from_file_bytes(file_bytes, filename)
            
            # 2. Check for Devanagari/Marathi characters
            has_marathi = any('\u0900' <= char <= '\u097f' for char in (raw_text + metadata.get("title", "") + filename))
            ingest_metadata = {**metadata, "filename": filename}

            final_text_content = raw_text

            if has_marathi:
                ingest_metadata["original_language"] = "mr"
                ingest_metadata["translated"] = True
                # Translate Marathi text to English for vector index grounding
                try:
                    translated_english = await llm_service.translate_text(raw_text, target_lang="English")
                    final_text_content = translated_english + "\n\n=== ORIGINAL MARATHI ===\n\n" + raw_text
                except Exception:
                    final_text_content = raw_text

            # 3. Send parsed text content to Supermemory
            await retrieval_service.ingest_document(
                doc_id=doc_id,
                file_bytes=final_text_content.encode("utf-8"),
                filename=filename,
                container_tags=container_tags,
                metadata=ingest_metadata,
            )

            # 4. Generate executive AI summary and relevant tags using Gemini
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            
            ai_summary, ai_tags = await llm_service.generate_summary_and_tags(raw_text, title=doc.title if doc else filename)

            if doc:
                doc.status = "indexed"
                doc.summary = ai_summary
                doc.tags = json.dumps(ai_tags)
                doc.supermemory_document_id = doc_id  # custom_id = postgres id
            await db.commit()
        except Exception as exc:
            async with AsyncSessionLocal() as err_db:
                result = await err_db.execute(select(Document).where(Document.id == doc_id))
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "failed"
                    doc.ingestion_error = str(exc)
                await err_db.commit()


@router.post("/compare", response_model=CompareResponse)
@router.post("/compare/", response_model=CompareResponse)
async def compare_documents(
    body: CompareRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CompareResponse:
    """
    Generate an AI-powered side-by-side comparison of two documents.
    Uses the documents' AI summaries as context to keep token usage low.
    """
    # Fetch both documents, enforce access (public docs accessible to all authenticated users)
    result_a = await db.execute(select(Document).where(Document.id == body.doc_id_a))
    doc_a = result_a.scalar_one_or_none()
    result_b = await db.execute(select(Document).where(Document.id == body.doc_id_b))
    doc_b = result_b.scalar_one_or_none()

    if not doc_a or not doc_b:
        raise HTTPException(status_code=404, detail="One or both documents not found")
    if doc_a.id == doc_b.id:
        raise HTTPException(status_code=400, detail="Cannot compare a document with itself")

    # Build comparison prompt using summaries + metadata
    prompt = f"""You are an expert policy analyst for the Higher & Technical Education Department, Government of Maharashtra.

Compare these two official government documents and produce a structured comparison report in Markdown.

## Document A
**Title:** {doc_a.title}
**Category:** {doc_a.category}
**GR Number:** {doc_a.gr_number or 'Not specified'}
**Upload Date:** {doc_a.upload_date.strftime('%d %B %Y') if doc_a.upload_date else 'Unknown'}
**Summary:** {doc_a.summary or 'No summary available.'}

## Document B
**Title:** {doc_b.title}
**Category:** {doc_b.category}
**GR Number:** {doc_b.gr_number or 'Not specified'}
**Upload Date:** {doc_b.upload_date.strftime('%d %B %Y') if doc_b.upload_date else 'Unknown'}
**Summary:** {doc_b.summary or 'No summary available.'}

---

Produce a comparison covering these sections:
1. **Purpose & Scope** — What each document aims to achieve
2. **Key Differences** — A Markdown table with columns: | Aspect | Document A | Document B |
3. **Supersession / Amendment** — Does one document supersede or amend the other? Flag clearly with ⚠️ if so.
4. **Common Ground** — Shared policies, eligibility criteria, or dates
5. **Recommendation** — Which document takes precedence and why

Start directly with a ### heading. Be concise and precise."""

    from app.services import llm_service
    messages = [{"role": "user", "content": prompt}]

    comparison_text = ""
    async for chunk in llm_service.generate(messages, stream=False):
        comparison_text += chunk

    if not comparison_text.strip():
        comparison_text = "Unable to generate comparison. Please try again."

    return CompareResponse(
        comparison=comparison_text,
        doc_a_title=doc_a.title,
        doc_b_title=doc_b.title,
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    user: OfficerOrAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    title: str | None = Form(None),
    category: str = Form("General"),
    visibility: str = Form("public"),
    department: str | None = Form(None),
    tags: str = Form("[]"),  # JSON array string
) -> UploadResponse:
    """
    Upload a document for Supermemory ingestion.
    Returns immediately with status='processing'; poll GET /documents/{id}/status.
    Supports PDF, DOCX, XLSX up to 50 MB.
    Role required: officer or admin.
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="File has no name")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit")

    # Parse tags
    try:
        tags_list: list[str] = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        tags_list = []

    # Determine metadata
    doc_department = department or user.department or "hte"
    doc_title = title or file.filename
    file_type = _ext_to_file_type(file.filename)

    # Create Postgres record immediately
    doc_id = str(uuid.uuid4())
    doc = Document(
        id=doc_id,
        title=doc_title,
        category=category,
        department=doc_department,
        file_type=file_type,
        file_size=_format_size(len(file_bytes)),
        summary="",  # Will be updated when AI summary is generated
        tags=json.dumps(tags_list),
        visibility=visibility,
        status="uploaded",
        uploaded_by=user.id,
    )
    db.add(doc)

    # Log analytics event
    event = AnalyticsEvent(
        user_id=user.id,
        event_type="document_upload",
        payload=json.dumps({"doc_id": doc_id, "filename": file.filename, "category": category}),
    )
    db.add(event)
    await db.flush()

    # Build Supermemory container tags for this document
    container_tags = [
        f"dept:{retrieval_service._sanitize_tag(doc_department)}",
        "dept:hte",
        f"visibility:{retrieval_service._sanitize_tag(visibility)}",
    ]

    metadata = {
        "title": doc_title,
        "doc_type": file_type,
        "category": category,
        "uploaded_by": user.id,
        "department": doc_department,
        "visibility": visibility,
        "tags": tags_list,
    }

    # Kick off ingestion in background (non-blocking)
    asyncio.create_task(
        _ingest_in_background(
            doc_id=doc_id,
            file_bytes=file_bytes,
            filename=file.filename,
            container_tags=container_tags,
            metadata=metadata,
            db_session_factory=None,
        )
    )

    return UploadResponse(document_id=doc_id)


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = None,
    category: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[DocumentRead]:
    """List documents with optional search, category, and status filters."""
    query = select(Document)

    if search:
        query = query.where(
            Document.title.ilike(f"%{search}%")
            | Document.summary.ilike(f"%{search}%")
            | Document.category.ilike(f"%{search}%")
        )
    if category and category != "All":
        query = query.where(Document.category == category)
    if status_filter and status_filter != "All":
        query = query.where(Document.status == status_filter.lower())

    # Role-based visibility filter
    if user.role == "student":
        query = query.where(Document.visibility == "public")
    elif user.role == "faculty":
        query = query.where(Document.visibility.in_(["public", "internal"]))
    # officer and admin see all

    query = query.order_by(Document.upload_date.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    docs = result.scalars().all()

    out: list[DocumentRead] = []
    for doc in docs:
        d_dict = {k: v for k, v in doc.__dict__.items() if k not in ("_sa_instance_state", "tags")}
        parsed_tags = json.loads(doc.tags) if doc.tags else []
        out.append(DocumentRead(**d_dict, tags=parsed_tags))
    return out


@router.get("/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentStatusResponse:
    """
    Poll the ingestion status of a document.
    Syncs with Supermemory and updates Postgres if status has changed.
    """
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # If still processing, check Supermemory for updated status
    if doc.status == "processing" and doc.supermemory_document_id:
        try:
            sm_status = await retrieval_service.get_document_status(doc.supermemory_document_id)
            if sm_status != doc.status:
                doc.status = sm_status
                await db.flush()
        except Exception:
            pass  # Keep current status on poll error

    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        supermemory_document_id=doc.supermemory_document_id,
        ingestion_error=doc.ingestion_error,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_document(
    doc_id: str,
    user: OfficerOrAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a document from Postgres and Supermemory. Role: officer or admin."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from Supermemory first (best-effort)
    if doc.supermemory_document_id:
        try:
            await retrieval_service.delete_document(doc.supermemory_document_id)
        except Exception:
            pass  # Don't block Postgres delete on Supermemory failure

    await db.delete(doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{doc_id}", response_model=DocumentRead)
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    user: OfficerOrAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentRead:
    """Update document metadata. Role: officer or admin."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if body.title is not None:
        doc.title = body.title
    if body.category is not None:
        doc.category = body.category
    if body.visibility is not None:
        doc.visibility = body.visibility
    if body.summary is not None:
        doc.summary = body.summary
    if body.tags is not None:
        doc.tags = json.dumps(body.tags)

    await db.flush()
    return DocumentRead(
        **{k: v for k, v in doc.__dict__.items() if k != "_sa_instance_state"},
        tags=json.loads(doc.tags) if doc.tags else [],
    )




