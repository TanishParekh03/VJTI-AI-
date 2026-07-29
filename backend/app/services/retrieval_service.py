"""
Supermemory Retrieval Service
═════════════════════════════
ALL Supermemory SDK calls live here and ONLY here.
No other module in this project imports the supermemory SDK directly.

Role-scoped access control:
  resolve_allowed_tags(user) → list[str]
  Every search call MUST derive container_tags from this function.
  Never hand-roll tag lists inline in route handlers.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import supermemory
from supermemory import Supermemory

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Singleton client ──────────────────────────────────────────────────────────
_client: Supermemory | None = None


def _get_client() -> Supermemory:
    global _client
    if _client is None:
        if not settings.supermemory_api_key:
            raise RuntimeError(
                "SUPERMEMORY_API_KEY is not set. "
                "Add it to your .env file before using retrieval features."
            )
        _client = Supermemory(api_key=settings.supermemory_api_key)
    return _client


# ── Role → container-tag mapping ─────────────────────────────────────────────
# This is the SINGLE source of truth for access scoping.
# Every retrieval call must go through this function.
# See role-scoped-retrieval skill for the rationale.

import re

def _sanitize_tag(val: str) -> str:
    cleaned = re.sub(r'\s+', '_', str(val or ''))
    return re.sub(r'[^a-zA-Z0-9_:-]', '', cleaned)

def resolve_allowed_tags(user: Any) -> list[str]:
    """
    Map a user's role and department to Supermemory container_tags.
    This determines which documents are visible to this user.
    Tags are sanitized to match Supermemory regex: /^[a-zA-Z0-9_:-]+$/
    """
    dept_slug = _sanitize_tag(user.department) if getattr(user, 'department', None) else "default"
    tags: list[str] = [
        f"dept:{dept_slug}",
        "dept:hte",          # HTE-wide docs are accessible to everyone
        "visibility:public",
    ]
    if getattr(user, 'role', 'student') in ("faculty", "officer", "admin"):
        tags.append("visibility:internal")
    if getattr(user, 'role', 'student') in ("officer", "admin"):
        tags.append("visibility:restricted")
    return [t for t in tags if t]


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class SearchResult:
    """Normalised search result from Supermemory, shaped for the RAG pipeline."""
    title: str
    snippet: str
    page: str | None
    section: str | None
    doc_type: str        # "PDF" | "DOCX" | "Circular"
    relevance_score: float
    supermemory_doc_id: str | None
    metadata: dict[str, Any]
    gr_number: str | None = None   # Official GR/Circular number for conflict detection


# ── Core service functions ────────────────────────────────────────────────────

async def ingest_document(
    doc_id: str,
    file_bytes: bytes,
    filename: str,
    container_tags: list[str],
    metadata: dict[str, Any],
) -> str:
    """
    Ingest a file into Supermemory.
    Uses Supermemory's native file-ingestion path — no PyPDF2/OCR on our side.
    custom_id = postgres document_id makes re-uploads idempotent.

    Returns the Supermemory document ID (same as custom_id we set).
    """
    client = _get_client()
    try:
        # Supermemory SDK expects string content
        content_str = file_bytes.decode("utf-8", errors="ignore") if isinstance(file_bytes, bytes) else str(file_bytes)
        
        result = await asyncio.to_thread(
            client.add,
            content=content_str,
            container_tags=container_tags,
            metadata={
                **metadata,
                "filename": filename,
            },
            custom_id=doc_id,
        )
        logger.info(
            "supermemory_ingest_queued",
            extra={"doc_id": doc_id, "doc_filename": filename, "result": str(result)},
        )
        return doc_id  # custom_id == postgres doc_id — 1:1 mapping
    except Exception as exc:
        logger.error("supermemory_ingest_failed", extra={"doc_id": doc_id, "error": str(exc)})
        raise


async def search(
    query: str,
    container_tags: list[str],
    filters: dict[str, Any] | None = None,
    limit: int | None = None,
) -> list[SearchResult]:
    """
    Hybrid search via Supermemory (embedding + BM25 + reranking — all handled by Supermemory).
    Returns results in relevance order with scores.
    container_tags MUST come from resolve_allowed_tags(user) — never hard-coded here.
    """
    client = _get_client()
    effective_limit = limit or settings.max_context_results

    try:
        kwargs: dict[str, Any] = {
            "q": query,
            "container_tags": container_tags,
            "limit": effective_limit,
        }
        if filters:
            kwargs["filters"] = filters

        response = await asyncio.to_thread(
            client.search.documents,
            **kwargs,
        )

        results: list[SearchResult] = []
        for item in (response.results or []):
            meta = getattr(item, "metadata", {}) or {}
            doc_id_val = getattr(item, "document_id", None) or getattr(item, "id", None) or getattr(item, "custom_id", None)
            
            # Supermemory v3 stores document text chunks inside item.chunks
            snippet_parts = []
            if hasattr(item, "chunks") and item.chunks:
                for c in item.chunks:
                    c_text = getattr(c, "content", None) or getattr(c, "text", None) or ""
                    if c_text and c_text.strip():
                        snippet_parts.append(c_text.strip())
            
            snippet_val = "\n\n".join(snippet_parts) if snippet_parts else (getattr(item, "content", "") or getattr(item, "snippet", "") or "")
            score_val = float(getattr(item, "score", 0.0) or getattr(item, "relevance_score", 0.0) or 0.0)

            results.append(
                SearchResult(
                    title=meta.get("title", doc_id_val or "Untitled Document"),
                    snippet=snippet_val,
                    page=str(meta.get("page")) if meta.get("page") else None,
                    section=meta.get("section"),
                    doc_type=meta.get("doc_type", "PDF"),
                    relevance_score=score_val,
                    supermemory_doc_id=doc_id_val,
                    metadata=meta,
                )
            )

        logger.info(
            "supermemory_search_complete",
            extra={
                "query": query[:80],
                "result_count": len(results),
                "top_score": results[0].relevance_score if results else 0.0,
            },
        )
        return results

    except supermemory.APIError as exc:
        logger.error("supermemory_search_failed", extra={"query": query[:80], "error": str(exc)})
        raise


async def delete_document(doc_id: str) -> bool:
    """
    Delete a document from Supermemory by its custom_id (= postgres document id).
    Returns True on success.
    """
    client = _get_client()
    try:
        await asyncio.to_thread(client.documents.delete, doc_id=doc_id)
        logger.info("supermemory_doc_deleted", extra={"doc_id": doc_id})
        return True
    except supermemory.APIError as exc:
        logger.error("supermemory_delete_failed", extra={"doc_id": doc_id, "error": str(exc)})
        raise


async def get_document_status(doc_id: str) -> str:
    """
    Poll Supermemory for the ingestion status of a document.
    Returns one of: "processing" | "indexed" | "failed"
    """
    client = _get_client()
    try:
        doc = await asyncio.to_thread(client.documents.get, doc_id=doc_id)
        raw_status = getattr(doc, "status", "processing") or "processing"
        # Normalise Supermemory status strings to our internal enum values
        status_map = {
            "completed": "indexed",
            "indexed": "indexed",
            "failed": "failed",
            "error": "failed",
            "processing": "processing",
            "pending": "processing",
        }
        return status_map.get(raw_status.lower(), "processing")
    except supermemory.APIError:
        return "processing"  # treat transient errors as still-processing


async def list_documents_from_supermemory(
    container_tags: list[str],
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List document metadata from Supermemory (for syncing with Postgres)."""
    client = _get_client()
    try:
        response = await asyncio.to_thread(
            client.documents.list,
            container_tags=container_tags,
            limit=limit,
        )
        return [
            {
                "id": doc.id,
                "metadata": doc.metadata or {},
                "status": getattr(doc, "status", "unknown"),
            }
            for doc in (response.documents or [])
        ]
    except supermemory.APIError as exc:
        logger.error("supermemory_list_failed", extra={"error": str(exc)})
        return []
