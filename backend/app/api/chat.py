"""
Chat routes — /chat/*
Implements the SSE streaming endpoint that replaces simulateStream() in ChatScreen.tsx.
SSE event format follows sse-streaming skill exactly:
  event: token     → {"content": "chunk..."}
  event: sources   → {"sources": [...], "confidence": 0.87, "confidence_label": "high"}
  event: not_found → {"message": "..."}
  event: error     → {"message": "..."}
  event: done      → {"conversation_id": "..."}
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import (
    BookmarkRequest,
    ChatRequest,
    ConversationListItem,
    ConversationRead,
    FeedbackRequest,
    MessageRead,
)
from app.services.rag_pipeline import run_rag_pipeline

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    request: Request,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    SSE streaming chat endpoint.
    Replaces simulateStream() in ChatScreen.tsx.
    Rate limiting is applied via slowapi in main.py.
    """
    async def event_generator():
        async for chunk in run_rag_pipeline(
            user=user,
            message_text=body.message,
            conversation_id=body.conversation_id,
            db=db,
        ):
            # If client disconnected, stop generating
            if await request.is_disconnected():
                break
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # important for nginx proxying
            "Connection": "keep-alive",
        },
    )


@router.get("/sessions", response_model=list[ConversationListItem])
async def list_sessions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> list[ConversationListItem]:
    """List the current user's chat conversations, most recent first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
    )
    conversations = result.scalars().all()
    return [ConversationListItem.model_validate(c) for c in conversations]


@router.get("/history/{conversation_id}", response_model=ConversationRead)
async def get_conversation_history(
    conversation_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationRead:
    """Return a full conversation thread with messages and source citations."""
    from datetime import datetime, timezone

    if conversation_id.startswith("c-"):
        return ConversationRead(
            id=conversation_id,
            user_id=user.id,
            title="New conversation",
            preview="",
            message_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            messages=[],
        )

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        return ConversationRead(
            id=conversation_id,
            user_id=user.id,
            title="New conversation",
            preview="",
            message_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            messages=[],
        )

    # Eagerly load messages with sources
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    # Load sources for assistant messages
    from sqlalchemy.orm import selectinload
    msg_result2 = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .options(selectinload(Message.sources))
        .order_by(Message.created_at)
    )
    messages_with_sources = msg_result2.scalars().all()

    conv_data = ConversationRead.model_validate(conv)
    conv_data.messages = [MessageRead.model_validate(m) for m in messages_with_sources]
    return conv_data


@router.delete("/sessions/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_conversation(
    conversation_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await db.delete(conv)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/messages/{message_id}/bookmark", response_model=MessageRead)
async def toggle_bookmark(
    message_id: str,
    body: BookmarkRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageRead:
    """Toggle bookmark state on a message."""
    result = await db.execute(
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Message.id == message_id, Conversation.user_id == user.id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    msg.bookmarked = body.bookmarked
    await db.flush()
    return MessageRead.model_validate(msg)


@router.post("/messages/{message_id}/feedback", response_model=MessageRead)
async def submit_feedback(
    message_id: str,
    body: FeedbackRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageRead:
    """Submit thumbs-up (helpful) or thumbs-down (not_helpful) feedback on an assistant message."""
    result = await db.execute(
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Message.id == message_id, Conversation.user_id == user.id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.role != "assistant":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback can only be submitted on assistant messages")
    msg.feedback = body.feedback
    await db.flush()
    await db.commit()
    return MessageRead.model_validate(msg)
