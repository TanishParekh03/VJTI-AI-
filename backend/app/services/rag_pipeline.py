"""
RAG Pipeline — 8-Step Orchestrator
════════════════════════════════════
Implements the exact pipeline order specified in the build prompt:

1. Resolve role → allowed container_tags
2. Prepend recent conversation history for follow-up context
3. Call retrieval_service.search(query, container_tags)
4. Branch: zero/low-confidence results → emit not_found, stop (NO LLM call)
5. Assemble strict grounded system prompt
6. Stream llm_service.generate() tokens
7. Emit sources SSE event (confidence from Supermemory score, never hardcoded)
8. Persist Message + Source rows, log AnalyticsEvent

Grounding rule (see rag-grounding-policy skill):
  If retrieval returns nothing above threshold → NEVER call the LLM.
  A wrong-but-confident answer is worse than an honest "not found."
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.analytics import AnalyticsEvent
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.source import Source
from app.services import llm_service, retrieval_service
from app.services.retrieval_service import SearchResult

logger = logging.getLogger(__name__)

# ── Confidence-level derivation ────────────────────────────────────────────────
# Converts Supermemory's 0.0–1.0 float relevance score to the UI badge enum.
# Must come from retrieval scores — never invented or hardcoded.

def _score_to_confidence(score: float) -> str:
    if score >= 0.70:
        return "high"
    if score >= settings.relevance_threshold:
        return "medium"
    return "none"


# ── System prompt assembly ─────────────────────────────────────────────────────

def _build_system_prompt(results: list[SearchResult]) -> str:
    context_blocks = "\n\n".join(
        f"[Source {i + 1}]\n"
        f"Title: {r.title}\n"
        f"{'GR No.: ' + r.gr_number + ' | ' if r.gr_number else ''}"
        f"{'Page: ' + r.page + ' | ' if r.page else ''}"
        f"{'Section: ' + r.section + ' | ' if r.section else ''}"
        f"Type: {r.doc_type}\n"
        f"Excerpt:\n{r.snippet}"
        for i, r in enumerate(results)
    )

    return (
        "You are the HTE AI Assistant for the Higher & Technical Education Department, "
        "Government of Maharashtra. Your sole purpose is to answer questions about HTE "
        "policies, circulars, scholarships, and guidelines using ONLY the official documents "
        "provided below.\n\n"
        "RULES — follow without exception:\n"
        "1. Answer ONLY using the provided document context. Every factual claim must be "
        "traceable to a source below.\n"
        "2. If the context only partially covers the question, say so explicitly. "
        "Do NOT fill gaps with general knowledge.\n"
        "3. Use precise figures, circular numbers, and section references as they appear "
        "in the documents.\n"
        "4. FORMATTING: Format your answer in elegant, executive Markdown. Never start with conversational intros like 'Based on the provided document...' or 'Here is what I found:'. Start immediately with a clean <h3> title (e.g., ### State Merit Scholarship — Income Criteria).\n"
        "5. TABLES & VISUAL STRUCTURE: Whenever presenting criteria, percentages, dates, weightages, or income limits, ALWAYS use clean Markdown Tables (| Category | Value / Weightage |).\n"
        "6. BULLETS & CALLOUTS: Use clean bullet points with **bold lead-ins** for key conditions. Use blockquotes (> **Note:** ...) for important caveats or circular references.\n"
        "7. BILINGUAL LANGUAGE MATCHING: Detect the language of the user's question. If the user asks in Marathi (मराठी), provide your complete answer in clear, natural Marathi while keeping exact circular numbers and figures accurate. If the user asks in English, answer in English.\n"
        "8. Do NOT speculate about policies not present in the provided documents.\n\n"

        "GR CONFLICT & SUPERSESSION DETECTION — CRITICAL:\n"
        "9. SCAN every source excerpt for supersession/amendment language such as:\n"
        "   - 'This GR supersedes...', 'The previous circular dated...is hereby cancelled'\n"
        "   - 'As amended by GR No...', 'This order modifies...', 'शासन निर्णय रद्द', 'मागील परिपत्रक रद्द'\n"
        "   If found, you MUST include a prominent callout:\n"
        "   > ⚠️ **Supersession Alert**: [Source N] supersedes/amends [GR/Circular reference]. "
        "The earlier order may no longer be in effect. Always refer to the latest dated circular.\n"
        "10. DATE CONFLICT: If two sources provide CONTRADICTORY information on the same topic "
        "(e.g. different income limits, different dates), highlight the conflict explicitly:\n"
        "   > 🔄 **Conflict Detected**: [Source A] states X while [Source B] states Y. "
        "The more recent document (dated [DATE]) takes precedence per standard GR protocol.\n"
        "11. ALWAYS cite the GR/circular number and date when available. Format as:\n"
        "   **GR No.** `[number]` dated `[DD Month YYYY]`\n\n"

        f"OFFICIAL DOCUMENT CONTEXT:\n{context_blocks}"
    )


# ── SSE event formatters ───────────────────────────────────────────────────────

def _sse(event: str, data: Any) -> str:
    """Format a Server-Sent Event chunk."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Main pipeline ──────────────────────────────────────────────────────────────

async def run_rag_pipeline(
    *,
    user: Any,
    message_text: str,
    conversation_id: str | None,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """
    Full RAG pipeline as an async SSE generator.

    Yields SSE-formatted strings:
      - event: token  → {"content": "..."}
      - event: sources → {"sources": [...], "confidence": 0.87}
      - event: not_found → {"message": "..."}
      - event: error  → {"message": "..."}

    The generator MUST always yield a terminal event so the frontend loading
    state clears even on error.
    """
    pipeline_start = time.monotonic()
    sm_latency_ms: float | None = None
    llm_latency_ms: float | None = None

    try:
        # ── Step 1: Resolve access-scoped container tags ───────────────────────
        container_tags = retrieval_service.resolve_allowed_tags(user)

        # ── Step 2: Build message list with conversation history ───────────────
        if conversation_id and conversation_id.startswith("c-"):
            conversation_id = None

        history_messages: list[dict[str, str]] = []
        if conversation_id:
            result = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(settings.conversation_history_turns * 2)
            )
            prior_messages = list(reversed(result.scalars().all()))
            for m in prior_messages:
                role = "assistant" if m.role == "assistant" else "user"
                history_messages.append({"role": role, "content": m.content})

        # ── Step 3: Supermemory search ─────────────────────────────────────────
        sm_start = time.monotonic()
        search_results = await retrieval_service.search(
            query=message_text,
            container_tags=container_tags,
        )
        sm_latency_ms = (time.monotonic() - sm_start) * 1000

        # ── Step 4: No-results branch (HARD RULE — no LLM call here) ──────────
        above_threshold = [
            r for r in search_results if r.relevance_score >= settings.relevance_threshold
        ]
        if not above_threshold:
            logger.info(
                "rag_not_found",
                extra={
                    "user_id": user.id,
                    "query": message_text[:80],
                    "result_count": len(search_results),
                    "sm_latency_ms": sm_latency_ms,
                },
            )
            # Log to analytics — useful for spotting document gaps
            await _log_event(
                db, user.id, "rag_not_found",
                payload={"query": message_text[:256]},
                duration_ms=(time.monotonic() - pipeline_start) * 1000,
                sm_latency_ms=sm_latency_ms,
            )
            # Persist user message only (no assistant message — nothing to save)
            if conversation_id:
                conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                if not conv_res.scalar_one_or_none():
                    conv = Conversation(
                        id=conversation_id,
                        user_id=user.id,
                        title=message_text[:60] + ("…" if len(message_text) > 60 else ""),
                        preview=message_text[:160],
                        message_count=0,
                    )
                    db.add(conv)
                    await db.flush()
                await _persist_user_message(db, conversation_id, message_text)
            yield _sse(
                "not_found",
                {"message": "No supporting information found in official HTE documents for this question. "
                            "Please try rephrasing, or ask about a different HTE policy area."}
            )
            if conversation_id:
                await db.commit()
            yield _sse("done", {})
            return

        # ── Step 5: Assemble strict grounded system prompt ────────────────────
        system_prompt = _build_system_prompt(above_threshold)
        llm_messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            *history_messages,
            {"role": "user", "content": message_text},
        ]

        # ── Step 6 & 7: Stream LLM tokens ─────────────────────────────────────
        full_answer = ""
        llm_start = time.monotonic()
        async for chunk in llm_service.generate(llm_messages, stream=True):
            full_answer += chunk
            yield _sse("token", {"content": chunk})
        llm_latency_ms = (time.monotonic() - llm_start) * 1000

        # ── Compute confidence from top Supermemory relevance score ────────────
        top_score = above_threshold[0].relevance_score
        confidence_label = _score_to_confidence(top_score)

        # ── Build sources payload matching frontend Source interface ───────────
        sources_payload = [
            {
                "id": str(uuid.uuid4()),
                "title": r.title,
                "type": r.doc_type,
                "page": r.page,
                "section": r.section,
                "snippet": r.snippet[:300],  # truncate for SSE payload size
            }
            for r in above_threshold[:settings.max_context_results]
        ]

        # Emit final sources event
        yield _sse("sources", {
            "sources": sources_payload,
            "confidence": top_score,
            "confidence_label": confidence_label,
        })

        # ── Step 8: Persist conversation + log analytics ───────────────────────
        existing_conv = None
        if conversation_id:
            conv_res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
            existing_conv = conv_res.scalar_one_or_none()

        if not existing_conv:
            conv_id = conversation_id or str(uuid.uuid4())
            conv = Conversation(
                id=conv_id,
                user_id=user.id,
                title=message_text[:60] + ("…" if len(message_text) > 60 else ""),
                preview=message_text[:160],
                message_count=0,
            )
            db.add(conv)
            await db.flush()
        else:
            conv_id = existing_conv.id

        user_msg_id = await _persist_user_message(db, conv_id, message_text)

        # Persist assistant message + sources
        asst_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=full_answer,
            confidence=confidence_label,
            confidence_score=top_score,
        )
        db.add(asst_msg)
        await db.flush()

        for r in above_threshold[:settings.max_context_results]:
            src = Source(
                message_id=asst_msg.id,
                title=r.title,
                doc_type=r.doc_type,
                page=r.page,
                section=r.section,
                snippet=r.snippet,
                relevance_score=r.relevance_score,
            )
            db.add(src)

        # Update conversation stats
        await db.execute(
            __import__("sqlalchemy", fromlist=["update"]).update(Conversation)
            .where(Conversation.id == conv_id)
            .values(
                message_count=Conversation.message_count + 2,
                preview=message_text[:160],
                updated_at=datetime.now(timezone.utc),
            )
        )

        await _log_event(
            db, user.id, "chat_query",
            payload={
                "query": message_text[:256],
                "conversation_id": conv_id,
                "result_count": len(above_threshold),
                "confidence": top_score,
            },
            duration_ms=(time.monotonic() - pipeline_start) * 1000,
            sm_latency_ms=sm_latency_ms,
            llm_latency_ms=llm_latency_ms,
        )

        # Increment user query count
        await db.execute(
            __import__("sqlalchemy", fromlist=["update"]).update(
                __import__("app.models.user", fromlist=["User"]).User
            )
            .where(__import__("app.models.user", fromlist=["User"]).User.id == user.id)
            .values(
                queries_this_month=__import__("app.models.user", fromlist=["User"]).User.queries_this_month + 1,
                last_active=datetime.now(timezone.utc),
            )
        )

        await db.commit()
        yield _sse("done", {"conversation_id": conv_id})

    except Exception as exc:
        err_str = str(exc)
        logger.exception("rag_pipeline_error", extra={"error": err_str[:400]})
        # Gemini/OpenAI rate-limit or quota exceeded — check for explicit 429/RESOURCE_EXHAUSTED
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            yield _sse("error", {
                "message": "⏳ The AI service is temporarily rate-limited. Please wait 30 seconds and try again."
            })
        elif "NOT_FOUND" in err_str or "no longer available" in err_str.lower():
            yield _sse("error", {
                "message": f"⚠️ Gemini model not found. Contact support. Details: {err_str[:200]}"
            })
        else:
            yield _sse("error", {"message": f"⚠️ Error: {err_str[:300]}"})


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _persist_user_message(db: AsyncSession, conversation_id: str, content: str) -> str:
    msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=content,
    )
    db.add(msg)
    await db.flush()
    return msg.id


async def _log_event(
    db: AsyncSession,
    user_id: str,
    event_type: str,
    payload: dict | None = None,
    duration_ms: float | None = None,
    sm_latency_ms: float | None = None,
    llm_latency_ms: float | None = None,
) -> None:
    event = AnalyticsEvent(
        user_id=user_id,
        event_type=event_type,
        payload=json.dumps(payload) if payload else None,
        duration_ms=duration_ms,
        supermemory_latency_ms=sm_latency_ms,
        llm_latency_ms=llm_latency_ms,
    )
    db.add(event)
