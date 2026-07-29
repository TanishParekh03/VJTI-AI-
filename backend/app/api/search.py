"""
Search route — /search?q=
Powers the CommandPalette.tsx ⌘K global search.
Fans out to:
  1. Supermemory for document/content hits (role-scoped via resolve_allowed_tags)
  2. Postgres ILIKE for past conversation title hits
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.conversation import Conversation
from app.schemas.search import SearchResponse, SearchResultItem
from app.services import retrieval_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def global_search(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query("", min_length=0),
    limit: int = Query(8, le=20),
) -> SearchResponse:
    """
    Global command palette search.
    Returns navigation, document, and conversation results in a unified response.
    Document hits use role-scoped Supermemory search.
    """
    results: list[SearchResultItem] = []

    if not q.strip():
        return SearchResponse(query=q, results=results, total=0)

    # ── 1. Supermemory document search (role-scoped) ────────────────────────
    container_tags = retrieval_service.resolve_allowed_tags(user)
    try:
        sm_results = await retrieval_service.search(
            query=q,
            container_tags=container_tags,
            limit=limit,
        )
        for r in sm_results:
            results.append(
                SearchResultItem(
                    id=r.supermemory_doc_id or r.title,
                    label=r.title,
                    description=r.snippet[:120] if r.snippet else r.section,
                    category="Documents",
                    doc_type=r.doc_type,
                    score=r.relevance_score,
                )
            )
    except Exception:
        pass  # Don't break the whole search if Supermemory is unavailable

    # ── 2. Postgres conversation title search ───────────────────────────────
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.user_id == user.id,
            Conversation.title.ilike(f"%{q}%"),
        )
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
    )
    conversations = conv_result.scalars().all()
    for conv in conversations:
        results.append(
            SearchResultItem(
                id=conv.id,
                label=conv.title,
                description=conv.preview[:120] if conv.preview else None,
                category="Conversations",
            )
        )

    # Sort: docs by score (desc), then conversations
    doc_results = sorted(
        [r for r in results if r.category == "Documents"],
        key=lambda x: x.score or 0.0,
        reverse=True,
    )
    conv_results = [r for r in results if r.category == "Conversations"]
    final = doc_results + conv_results

    return SearchResponse(query=q, results=final, total=len(final))
