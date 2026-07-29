"""User model — matches frontend User interface in lib/mock-data.ts."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

ROLE_ENUM = Enum("student", "faculty", "officer", "admin", name="user_role")
STATUS_ENUM = Enum("active", "inactive", "pending", name="user_status")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)  # null for SSO-only users
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(ROLE_ENUM, nullable=False, default="student")
    department: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    status: Mapped[str] = mapped_column(STATUS_ENUM, nullable=False, default="active")
    avatar: Mapped[str] = mapped_column(String(8), nullable=False, default="")  # initials
    queries_this_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_active: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    conversations: Mapped[list["Conversation"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    uploaded_documents: Mapped[list["Document"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="uploader", lazy="select"
    )
    analytics_events: Mapped[list["AnalyticsEvent"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
