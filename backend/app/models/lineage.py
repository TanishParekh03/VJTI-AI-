import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

RELATIONSHIP_TYPE_ENUM = Enum(
    "supersedes", "amends", "references", "clarifies", name="gr_relationship_type"
)


class GRRelationship(Base):
    __tablename__ = "gr_relationships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # The document that contains the reference (the newer document)
    source_gr_id: Mapped[str] = mapped_column(
        String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # The document being referenced (the older document, if resolved)
    target_gr_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    # If target_gr_id cannot be resolved, store the raw extracted text (e.g., GR No. 2024-ABC-123)
    unresolved_reference: Mapped[str | None] = mapped_column(String(256), nullable=True)
    
    relationship_type: Mapped[str] = mapped_column(RELATIONSHIP_TYPE_ENUM, nullable=False, default="references")
    
    # Confidence score from LLM (0.0 to 1.0)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    
    # The exact sentence/context extracted by LLM as evidence
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships are handled on the Document model side (or explicitly here)
    source_doc = relationship("Document", foreign_keys=[source_gr_id], back_populates="outgoing_lineage_refs")
    target_doc = relationship("Document", foreign_keys=[target_gr_id], back_populates="incoming_lineage_refs")
