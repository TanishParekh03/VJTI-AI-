"""Message model — individual chat turns (user or assistant)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

ROLE_ENUM = Enum("user", "assistant", name="message_role")
CONFIDENCE_ENUM = Enum("high", "medium", "none", name="confidence_level")
FEEDBACK_ENUM = Enum("helpful", "not_helpful", name="message_feedback")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(ROLE_ENUM, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str | None] = mapped_column(CONFIDENCE_ENUM, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # raw 0.0–1.0 from Supermemory
    bookmarked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    feedback: Mapped[str | None] = mapped_column(FEEDBACK_ENUM, nullable=True)  # thumbs up/down rating
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(back_populates="messages", lazy="select")  # type: ignore[name-defined]  # noqa: F821
    sources: Mapped[list["Source"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="Source.relevance_score.desc()",
        lazy="select",
    )
