"""
Qdrant Retrieval Service (Local Vector DB & Gemini Embeddings)
════════════════════════════════════════════════════════════
Uses Qdrant for local vector storage and Google Gemini for embeddings.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
import re
from dataclasses import dataclass
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchAny, MatchValue, Distance, VectorParams, PointStruct
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Singleton clients ──────────────────────────────────────────────────────────
_client: AsyncQdrantClient | None = None
_genai_client: genai.Client | None = None
COLLECTION_NAME = "hte_documents_v2"

def _get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        url = getattr(settings, "qdrant_url", "http://localhost:6333")
        api_key = getattr(settings, "qdrant_api_key", None)
        _client = AsyncQdrantClient(url=url, api_key=api_key if api_key else None)
    return _client

def _get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=settings.gemini_api_key)
    return _genai_client

async def _get_embedding(text: str) -> list[float]:
    """Generate a Gemini vector embedding for the given text."""
    client = _get_genai_client()
    try:
        import asyncio
        response = await asyncio.wait_for(
            client.aio.models.embed_content(
                model='models/gemini-embedding-001',
                contents=text
            ),
            timeout=15.0
        )
        return response.embeddings[0].values
    except asyncio.TimeoutError:
        logger.error("Gemini API timed out during embedding generation.")
        raise
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise

_index_created = False

async def _ensure_index(client: AsyncQdrantClient) -> None:
    global _index_created
    if _index_created:
        return
    try:
        exists = await client.collection_exists(collection_name=COLLECTION_NAME)
        if not exists:
            await client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
            )
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="container_tags",
                field_schema="keyword",
            )
            _index_created = True
        else:
            _index_created = True
    except Exception as e:
        logger.warning(f"Failed to create collection or index: {e}")

# ── Role → container-tag mapping ─────────────────────────────────────────────

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
    Chunk and ingest text into local Qdrant using Gemini embeddings.
    Returns the doc_id.
    """
    client = _get_client()
    try:
        await _ensure_index(client)
        content_str = file_bytes.decode("utf-8", errors="ignore") if isinstance(file_bytes, bytes) else str(file_bytes)
        
        # Chunk the document
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = splitter.split_text(content_str)
        
        points = []
        for chunk in chunks:
            embedding = await _get_embedding(chunk)
            payload = {
                **metadata,
                "document_id": doc_id,
                "filename": filename,
                "container_tags": container_tags,
                "text": chunk,
            }
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload=payload
                )
            )
            
        await client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
        logger.info(
            "qdrant_ingest_complete",
            extra={"doc_id": doc_id, "doc_filename": filename, "chunks": len(chunks)},
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
    Search local Qdrant using Gemini embeddings.
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

        query_vector = await _get_embedding(query)

        search_results = await client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=qdrant_filter,
            limit=effective_limit,
            with_payload=True
        )

        results: list[SearchResult] = []
        for scored_point in search_results:
            meta = scored_point.payload or {}
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
