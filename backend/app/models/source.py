"""Source model — citation records attached to assistant messages."""
import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

DOC_TYPE_ENUM = __import__("sqlalchemy", fromlist=["Enum"]).Enum("PDF", "DOCX", "Circular", name="source_doc_type")


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(
        String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    doc_type: Mapped[str] = mapped_column(DOC_TYPE_ENUM, nullable=False, default="PDF")
    page: Mapped[str | None] = mapped_column(String(32), nullable=True)
    section: Mapped[str | None] = mapped_column(String(256), nullable=True)
    snippet: Mapped[str] = mapped_column(Text, nullable=False, default="")
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Relationship
    message: Mapped["Message"] = relationship(back_populates="sources", lazy="select")  # type: ignore[name-defined]  # noqa: F821
