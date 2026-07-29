"""AnalyticsEvent model — append-only event log for analytics and debugging."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

EVENT_TYPE_ENUM = Enum(
    "chat_query",
    "document_upload",
    "document_search",
    "user_login",
    "rag_not_found",
    name="analytics_event_type",
)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(EVENT_TYPE_ENUM, nullable=False, index=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    supermemory_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    llm_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    # Relationship
    user: Mapped["User"] = relationship(back_populates="analytics_events", lazy="select")  # type: ignore[name-defined]  # noqa: F821
