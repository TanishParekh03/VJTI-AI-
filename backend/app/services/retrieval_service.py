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
import time

from qdrant_client import AsyncQdrantClient

from qdrant_client.http.models import (
    Filter, FieldCondition, MatchAny, MatchValue, 
    Distance, VectorParams, PointStruct, SparseVectorParams, 
    SparseIndexParams, Prefetch, FusionQuery, Fusion, SparseVector
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from fastembed import SparseTextEmbedding

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
        _client = AsyncQdrantClient(url=url, api_key=api_key if api_key else None, timeout=60.0)
    return _client

def _get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        if not settings.maha_ai_api_key:
            raise RuntimeError(f"API key is missing in uvicorn process! Check if .env loaded. Settings: {settings.model_dump(exclude_unset=True)}")
        _genai_client = genai.Client(api_key=settings.maha_ai_api_key)
    return _genai_client

_sparse_embedding_model: SparseTextEmbedding | None = None
def _get_sparse_model() -> SparseTextEmbedding:
    global _sparse_embedding_model
    if _sparse_embedding_model is None:
        _sparse_embedding_model = SparseTextEmbedding(model_name="Qdrant/bm25")
    return _sparse_embedding_model

async def _get_embedding(text: str, retries=3) -> list[float]:
    """Generate a Gemini vector embedding for the given text."""
    client = _get_genai_client()
    for attempt in range(retries):
        try:
            import asyncio
            response = await asyncio.wait_for(
                client.aio.models.embed_content(
                    model='models/gemini-embedding-001',
                    contents=text
                ),
                timeout=30.0
            )
            return response.embeddings[0].values
        except Exception as e:
            if attempt == retries - 1:
                logger.error(f"Failed to get embeddings after {retries} attempts: {e}")
                raise
            logger.warning(f"Embedding error: {e}. Retrying...")
            await asyncio.sleep(2)
    raise Exception("Unexpected embedding failure")

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
                vectors_config={"": VectorParams(size=3072, distance=Distance.COSINE)},
                sparse_vectors_config={
                    "text-sparse": SparseVectorParams(
                        index=SparseIndexParams(on_disk=False)
                    )
                }
            )
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="container_tags",
                field_schema="keyword",
            )
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="department",
                field_schema="keyword",
            )
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="category",
                field_schema="keyword",
            )
            _index_created = True
        else:
            try:
                await client.update_collection(
                    collection_name=COLLECTION_NAME,
                    sparse_vectors_config={
                        "text-sparse": SparseVectorParams(
                            index=SparseIndexParams(on_disk=False)
                        )
                    }
                )
            except Exception as e:
                logger.info(f"Sparse config might already exist or update failed: {e}")
                
            # Also ensure payload indexes exist on an existing collection
            for field in ["department", "category"]:
                try:
                    await client.create_payload_index(
                        collection_name=COLLECTION_NAME,
                        field_name=field,
                        field_schema="keyword",
                    )
                except Exception as e:
                    logger.info(f"Index for {field} might already exist: {e}")
                    
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
        
        # Pre-process OCR text: fix fragmented lines (single newlines) but keep paragraphs (double newlines)
        import re
        content_str = re.sub(r'(?<!\n)\n(?!\n)', ' ', content_str)
        # Clean up multiple spaces
        content_str = re.sub(r' +', ' ', content_str)
        
        # Chunk the document with larger sizes and Marathi-aware separators
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=300,
            separators=["\n\n", "।", ".", "\n", " ", ""]
        )
        chunks = splitter.split_text(content_str)
        
        sparse_model = _get_sparse_model()
        sparse_embeddings = list(sparse_model.embed(chunks))
        
        points = []
        for i, chunk in enumerate(chunks):
            embedding = await _get_embedding(chunk)
            sparse_vector = sparse_embeddings[i]
            
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
                    vector={
                        "": embedding,
                        "text-sparse": SparseVector(
                            indices=sparse_vector.indices.tolist(),
                            values=sparse_vector.values.tolist()
                        )
                    },
                    payload=payload
                )
            )
            
        for batch_idx in range(0, len(points), 50):
            await client.upsert(
                collection_name=COLLECTION_NAME,
                points=points[batch_idx:batch_idx+50]
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

        # Parallelize dense and sparse embedding generation
        sparse_model = _get_sparse_model()
        
        query_vector, sparse_query_list = await asyncio.gather(
            _get_embedding(query),
            asyncio.to_thread(lambda: list(sparse_model.embed([query])))
        )
        sparse_query = sparse_query_list[0]

        prefetch = [
            Prefetch(
                query=query_vector,
                using="",
                limit=effective_limit * 2,
                filter=qdrant_filter,
            ),
            Prefetch(
                query=SparseVector(
                    indices=sparse_query.indices.tolist(),
                    values=sparse_query.values.tolist()
                ),
                using="text-sparse",
                limit=effective_limit * 2,
                filter=qdrant_filter,
            )
        ]

        retrieval_start = time.perf_counter()
        
        search_results = await client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=prefetch,
            query=FusionQuery(fusion=Fusion.RRF),
            limit=effective_limit,
            with_payload=True
        )
        
        retrieval_time = time.perf_counter() - retrieval_start
        logger.info(f"Qdrant retrieval took {retrieval_time:.4f}s for query: {query[:40]}")
        
        search_results = search_results.points

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
