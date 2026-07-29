"""Document model — tracks metadata and Supermemory ingestion status."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

STATUS_ENUM = Enum("uploaded", "processing", "indexed", "failed", name="doc_status")
FILE_TYPE_ENUM = Enum("PDF", "DOCX", "XLSX", name="doc_file_type")
VISIBILITY_ENUM = Enum("public", "internal", "restricted", name="doc_visibility")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(256), nullable=False, default="hte")
    file_type: Mapped[str] = mapped_column(FILE_TYPE_ENUM, nullable=False)
    file_size: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    pages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[str] = mapped_column(Text, nullable=False, default="")  # JSON array stored as text
    versions: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    visibility: Mapped[str] = mapped_column(VISIBILITY_ENUM, nullable=False, default="public")

    # Status tracking for Supermemory async ingestion
    status: Mapped[str] = mapped_column(STATUS_ENUM, nullable=False, default="uploaded")
    supermemory_document_id: Mapped[str | None] = mapped_column(String(512), nullable=True, index=True)
    ingestion_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # GR cross-reference metadata for conflict / supersession detection
    gr_number: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)  # e.g. "GR-HTE-2024-123"
    supersedes_gr: Mapped[str | None] = mapped_column(String(256), nullable=True)   # GR number(s) this doc supersedes
    amends_gr: Mapped[str | None] = mapped_column(String(256), nullable=True)       # GR number(s) this doc amends

    upload_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    uploaded_by: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    uploader: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="uploaded_documents", lazy="select"
    )
