"""Chat request/response schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.source import SourceRead


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None  # null = new conversation
    language: str | None = None
    mode: Literal["grounded", "general"] = "grounded"
    report_prompt: str | None = None
    attached_file_text: str | None = None


class MessageRead(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    confidence: str | None        # "high" | "medium" | "none"
    confidence_score: float | None
    bookmarked: bool
    feedback: str | None = None   # "helpful" | "not_helpful" | None
    created_at: datetime
    sources: list[SourceRead] = []

    model_config = {"from_attributes": True}


class ConversationRead(BaseModel):
    id: str
    title: str
    preview: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead] = []

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: str
    title: str
    preview: str
    message_count: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookmarkRequest(BaseModel):
    bookmarked: bool


class FeedbackRequest(BaseModel):
    feedback: Literal["helpful", "not_helpful"] | None  # None to clear feedback
