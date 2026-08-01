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
import asyncio
import re
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any

try:
    from sentence_transformers import CrossEncoder
except ImportError:
    CrossEncoder = None

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

_cross_encoder = None
def _get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None and CrossEncoder is not None:
        logger.info("Loading CrossEncoder model...")
        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _cross_encoder

# ── Confidence-level derivation ────────────────────────────────────────────────
# Converts Supermemory's 0.0–1.0 float relevance score to the UI badge enum.
# Must come from retrieval scores — never invented or hardcoded.

def _score_to_confidence(score: float) -> str:
    # Handle Reciprocal Rank Fusion (RRF) scores which are max ~0.016
    if score > 0.015:
        return "high"
    if score > 0.010:
        return "medium"
        
    # Handle standard cosine similarity scores
    if score >= 0.70:
        return "high"
    if score >= settings.relevance_threshold:
        return "medium"
    return "none"


# ── System prompt assembly ─────────────────────────────────────────────────────

def _build_system_prompt(results: list[SearchResult], language: str | None = None) -> str:
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

    lang_map = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
    target_lang = lang_map.get(language, "English") if language else "English"

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
        "5. TABLES & VISUAL STRUCTURE: Whenever presenting criteria, percentages, dates, weightages, or income limits, ALWAYS use clean Markdown Tables. CRUCIAL: Do NOT paste huge raw paragraphs of text inside table cells. Summarize points concisely in the table cells, and use `<br>` to break lines. If a description is very long, use bullet points OUTSIDE the table instead.\n"
        "6. BULLETS & CALLOUTS: Use clean bullet points with **bold lead-ins** for key conditions. Use blockquotes (> **Note:** ...) for important caveats or circular references.\n"
        f"7. BILINGUAL LANGUAGE MATCHING: You MUST formulate your entire response in **{target_lang}**. This is a strict requirement. All explanations, headings, and tables must be in {target_lang}. **CRITICAL:** You must preserve official Government terminology (e.g., specific names of schemes, legal phrases, department names) in their original form while translating responses.\n"
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
    language: str | None = None,
    mode: str = "grounded",
    report_prompt: str | None = None,
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
    logger.info(f"STARTING RAG PIPELINE. Message: {message_text!r} | Report Prompt: {report_prompt!r}")

    try:
        # ── Step 1: Resolve access-scoped container tags ───────────────────────
        container_tags = retrieval_service.resolve_allowed_tags(user)

        # ── Step 2: Build message list with conversation history ───────────────
        if conversation_id and conversation_id.startswith("c-"):
            conversation_id = None

        # Grounded Mode with HyDE
        async def fetch_history() -> list[dict[str, str]]:
            hist = []
            if conversation_id:
                res = await db.execute(
                    select(Message)
                    .where(Message.conversation_id == conversation_id)
                    .order_by(Message.created_at.desc())
                    .limit(settings.conversation_history_turns * 2)
                )
                prior = list(reversed(res.scalars().all()))
                for m in prior:
                    r = "assistant" if m.role == "assistant" else "user"
                    hist.append({"role": r, "content": m.content})
            return hist

        history_messages = await fetch_history()
            
        # ── Step 3a: Extract Filters and decide on simple vs complex flow ──────────────
        filters = await llm_service.extract_search_filters(message_text)
        
        # Heuristic for simple queries: short or contains specific exact match markers
        is_short = len(message_text.split()) < 6
        has_exact_marker = bool(re.search(r'\b(gr|date|20\d\d)\b', message_text, re.IGNORECASE))
        
        all_results = []
        seen_snippets = set()
        sm_start = time.monotonic()
        
        if is_short or has_exact_marker:
            # Skip HyDE & Decomposition for exact matches / short queries
            logger.info(f"Using direct hybrid search for simple query: '{message_text}'")
            sub_results = await retrieval_service.search(
                query=message_text,
                container_tags=container_tags,
                filters=filters,
                limit=20,
            )
            for res in sub_results:
                if res.snippet not in seen_snippets:
                    seen_snippets.add(res.snippet)
                    all_results.append(res)
        else:
            # Full Decomp + HyDE pipeline
            logger.info("Using full decomp + HyDE pipeline")
            subqueries = await llm_service.decompose_query(message_text)
            
            for subquery in subqueries:
                hyde_doc = await llm_service.generate_hypothetical_answer(subquery)
                enriched_query = f"{subquery}\n\n{hyde_doc}"
                
                sub_results = await retrieval_service.search(
                    query=enriched_query,
                    container_tags=container_tags,
                    filters=filters,
                    limit=10,
                )
                
                for res in sub_results:
                    if res.snippet not in seen_snippets:
                        seen_snippets.add(res.snippet)
                        all_results.append(res)
                        
        # ── Cross-Encoder Reranking ───────────────────────────────────────────
        # Cap candidates to 15-20 max for reranking speed
        candidates = all_results[:20]
        
        if candidates and CrossEncoder is not None:
            reranker = _get_cross_encoder()
            if reranker:
                # Build pairs and run one batched prediction
                pairs = [[message_text, c.snippet] for c in candidates]
                
                rerank_start = time.perf_counter()
                # predict() accepts a list of pairs and runs in C++/CUDA batched mode
                scores = await asyncio.to_thread(reranker.predict, pairs)
                rerank_time = time.perf_counter() - rerank_start
                logger.info(f"Cross-encoder reranked {len(candidates)} pairs in {rerank_time:.4f}s")
                
                # Assign new scores
                for c, s in zip(candidates, scores):
                    c.relevance_score = float(s)
                    
                # Re-sort by cross-encoder score
                candidates.sort(key=lambda x: x.relevance_score, reverse=True)
        else:
            # Fallback to pure RRF sorting if no reranker available
            candidates.sort(key=lambda x: x.relevance_score, reverse=True)

        search_results = candidates[:settings.max_context_results]
        
        sm_latency_ms = (time.monotonic() - sm_start) * 1000

        # ── Step 4: No-results branch (HARD RULE — no LLM call here) ──────────
        # Check if we are using RRF scores (which are tiny, max ~0.016)
        is_rrf = search_results and search_results[0].relevance_score < 0.1
        threshold = 0.01 if is_rrf else settings.relevance_threshold
        
        above_threshold = [
            r for r in search_results if r.relevance_score >= threshold
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
                        title=message_text.replace('\x00', '')[:60] + ("…" if len(message_text) > 60 else ""),
                        preview=message_text.replace('\x00', '')[:160],
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
        system_prompt = _build_system_prompt(above_threshold, language)
        user_content = report_prompt if report_prompt else message_text
        llm_messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            *history_messages,
            {"role": "user", "content": user_content},
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
                "document_id": r.supermemory_doc_id,
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
                title=message_text.replace('\x00', '')[:60] + ("…" if len(message_text) > 60 else ""),
                preview=message_text.replace('\x00', '')[:160],
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
            content=full_answer.replace('\x00', ''),
            confidence=confidence_label,
            confidence_score=top_score,
        )
        db.add(asst_msg)
        await db.flush()

        for r in above_threshold[:settings.max_context_results]:
            src = Source(
                message_id=asst_msg.id,
                title=r.title.replace('\x00', '') if r.title else None,
                doc_type=r.doc_type,
                page=r.page,
                section=r.section,
                snippet=r.snippet.replace('\x00', '') if r.snippet else None,
                relevance_score=r.relevance_score,
                document_id=r.supermemory_doc_id,
            )
            db.add(src)

        # Log detailed audit for explainability
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            user_id=user.id,
            conversation_id=conv_id,
            query=message_text.replace('\x00', ''),
            retrieved_context=[{
                "title": r.title.replace('\x00', '') if r.title else None,
                "snippet": r.snippet.replace('\x00', '')[:1000] if r.snippet else None, # truncated to avoid massive logs
                "relevance_score": r.relevance_score,
                "document_id": r.supermemory_doc_id
            } for r in above_threshold[:settings.max_context_results]],
            llm_prompt=json.dumps(llm_messages, ensure_ascii=False),
            llm_response=full_answer,
            relevance_score=top_score,
            confidence_badge=confidence_label,
        )
        db.add(audit)

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
        content=content.replace('\x00', ''),
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
