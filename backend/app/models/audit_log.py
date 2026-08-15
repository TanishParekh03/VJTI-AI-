from datetime import datetime, timezone
import uuid
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.base import Base

class AuditLog(Base):
    """
    Detailed Explainability & Audit Log for RAG queries.
    Stores exactly what the LLM was prompted with and what it returned,
    along with retrieved context, for government accountability.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=True)
    
    query = Column(String, nullable=False)
    # The actual context chunks provided to the model
    retrieved_context = Column(JSON, nullable=True)
    
    # Exact prompt and response
    llm_prompt = Column(String, nullable=True)
    llm_response = Column(String, nullable=True)
    
    # RAG metrics
    relevance_score = Column(Float, nullable=True)
    confidence_badge = Column(String(20), nullable=True) # high, medium, low
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", lazy="selectin")
    conversation = relationship("Conversation", lazy="selectin")
