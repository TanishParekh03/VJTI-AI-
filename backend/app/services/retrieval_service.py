"""
Qdrant Retrieval Service (Local Vector DB)
══════════════════════════════════════════
Replaces the old Supermemory SDK.
Uses Qdrant for vector storage and FastEmbed for local embeddings.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny, MatchValue
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Singleton client ──────────────────────────────────────────────────────────
_client: AsyncQdrantClient | None = None
COLLECTION_NAME = "hte_documents"

def _get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        url = getattr(settings, "qdrant_url", "http://localhost:6333")
        api_key = getattr(settings, "qdrant_api_key", None)
        _client = AsyncQdrantClient(url=url, api_key=api_key if api_key else None)
        # Initialize FastEmbed embedding model
        _client.set_model("BAAI/bge-small-en-v1.5")
    return _client

_index_created = False

async def _ensure_index(client: AsyncQdrantClient) -> None:
    global _index_created
    if _index_created:
        return
    try:
        if await client.collection_exists(COLLECTION_NAME):
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="container_tags",
                field_schema="keyword",
            )
            _index_created = True
    except Exception as e:
        logger.warning(f"Failed to create payload index (it may already exist): {e}")

# ── Role → container-tag mapping ─────────────────────────────────────────────
import re

def _sanitize_tag(val: str) -> str:
    cleaned = re.sub(r'\s+', '_', str(val or ''))
    return re.sub(r'[^a-zA-Z0-9_:-]', '', cleaned)

def resolve_allowed_tags(user: Any) -> list[str]:
    """
    Map a user's role and department to Qdrant container_tags.
    This determines which documents are visible to this user.
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
    """Normalised search result from Qdrant, shaped for the RAG pipeline."""
    title: str
    snippet: str
    page: str | None
    section: str | None
    doc_type: str        # "PDF" | "DOCX" | "Circular"
    relevance_score: float
    supermemory_doc_id: str | None
    metadata: dict[str, Any]
    gr_number: str | None = None

# ── Core service functions ────────────────────────────────────────────────────

async def ingest_document(
    doc_id: str,
    file_bytes: bytes,
    filename: str,
    container_tags: list[str],
    metadata: dict[str, Any],
) -> str:
    """
    Chunk and ingest text into Qdrant using FastEmbed.
    Returns the doc_id.
    """
    client = _get_client()
    try:
        content_str = file_bytes.decode("utf-8", errors="ignore") if isinstance(file_bytes, bytes) else str(file_bytes)
        
        # Chunk the document
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = splitter.split_text(content_str)
        
        docs = []
        payloads = []
        ids = []
        
        for chunk in chunks:
            chunk_id = str(uuid.uuid4())
            ids.append(chunk_id)
            docs.append(chunk)
            payloads.append({
                **metadata,
                "document_id": doc_id,
                "filename": filename,
                "container_tags": container_tags,
                "text": chunk,
            })
            
        # Using add() which automatically creates collection and embeddings
        await client.add(
            collection_name=COLLECTION_NAME,
            documents=docs,
            metadata=payloads,
            ids=ids,
        )
        
        await _ensure_index(client)
        
        logger.info(
            "qdrant_ingest_complete",
            extra={"doc_id": doc_id, "filename": filename, "chunks": len(chunks)},
        )
        return doc_id
    except Exception as exc:
        logger.error("qdrant_ingest_failed", extra={"doc_id": doc_id, "error": str(exc)})
        raise


async def search(
    query: str,
    container_tags: list[str],
    filters: dict[str, Any] | None = None,
    limit: int | None = None,
) -> list[SearchResult]:
    """
    Search Qdrant using FastEmbed.
    """
    client = _get_client()
    effective_limit = limit or settings.max_context_results

    try:
        await _ensure_index(client)
        
        # Match ANY of the container tags
        qdrant_filter = Filter(
            must=[
                FieldCondition(
                    key="container_tags",
                    match=MatchAny(any=container_tags)
                )
            ]
        )
        
        if filters:
            for k, v in filters.items():
                if isinstance(v, list):
                    qdrant_filter.must.append(FieldCondition(key=k, match=MatchAny(any=v)))
                else:
                    qdrant_filter.must.append(FieldCondition(key=k, match=MatchValue(value=v)))

        search_results = await client.query(
            collection_name=COLLECTION_NAME,
            query_text=query,
            query_filter=qdrant_filter,
            limit=effective_limit,
        )

        results: list[SearchResult] = []
        for scored_point in search_results:
            meta = scored_point.metadata or {}
            doc_id_val = meta.get("document_id")
            snippet_val = meta.get("text", "")
            
            results.append(
                SearchResult(
                    title=meta.get("title", doc_id_val or "Untitled Document"),
                    snippet=snippet_val,
                    page=str(meta.get("page")) if meta.get("page") else None,
                    section=meta.get("section"),
                    doc_type=meta.get("doc_type", "PDF"),
                    relevance_score=scored_point.score,
                    supermemory_doc_id=doc_id_val,
                    metadata=meta,
                )
            )

        logger.info(
            "qdrant_search_complete",
            extra={
                "query": query[:80],
                "result_count": len(results),
            },
        )
        return results

    except Exception as exc:
        logger.error("qdrant_search_failed", extra={"query": query[:80], "error": str(exc)})
        raise

async def delete_document(doc_id: str) -> bool:
    """
    Delete a document from Qdrant by its document_id.
    """
    client = _get_client()
    try:
        delete_filter = Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=doc_id)
                )
            ]
        )
        await client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=delete_filter,
        )
        logger.info("qdrant_doc_deleted", extra={"doc_id": doc_id})
        return True
    except Exception as exc:
        logger.error("qdrant_delete_failed", extra={"doc_id": doc_id, "error": str(exc)})
        raise

async def get_document_status(doc_id: str) -> str:
    """
    Returns 'indexed' if the document chunks exist in Qdrant, else 'processing'.
    """
    client = _get_client()
    try:
        check_filter = Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
        )
        res = await client.count(
            collection_name=COLLECTION_NAME,
            count_filter=check_filter,
            exact=False
        )
        if res.count > 0:
            return "indexed"
        return "processing"
    except Exception:
        return "processing"

async def list_documents_from_supermemory(
    container_tags: list[str],
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    # Qdrant doesn't group chunks by doc trivially like Supermemory's list API.
    # Since Postgres tracks docs, returning empty here is fine for syncing.
    return []
