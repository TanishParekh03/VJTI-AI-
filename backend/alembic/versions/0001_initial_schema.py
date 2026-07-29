"""Initial schema — all tables.

Revision ID: 0001
Revises: 
Create Date: 2026-07-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('student', 'faculty', 'officer', 'admin'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status') THEN CREATE TYPE doc_status AS ENUM ('uploaded', 'processing', 'indexed', 'failed'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_file_type') THEN CREATE TYPE doc_file_type AS ENUM ('PDF', 'DOCX', 'XLSX'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_visibility') THEN CREATE TYPE doc_visibility AS ENUM ('public', 'internal', 'restricted'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_role') THEN CREATE TYPE message_role AS ENUM ('user', 'assistant'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confidence_level') THEN CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'none'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_doc_type') THEN CREATE TYPE source_doc_type AS ENUM ('PDF', 'DOCX', 'Circular'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_event_type') THEN CREATE TYPE analytics_event_type AS ENUM ('chat_query', 'document_upload', 'document_search', 'user_login', 'rag_not_found'); END IF; END $$;")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("role", postgresql.ENUM("student", "faculty", "officer", "admin", name="user_role", create_type=False), nullable=False, server_default="student"),
        sa.Column("department", sa.String(256), nullable=False, server_default=""),
        sa.Column("status", postgresql.ENUM("active", "inactive", "pending", name="user_status", create_type=False), nullable=False, server_default="active"),
        sa.Column("avatar", sa.String(8), nullable=False, server_default=""),
        sa.Column("queries_this_month", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── documents ─────────────────────────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("category", sa.String(128), nullable=False),
        sa.Column("department", sa.String(256), nullable=False, server_default="hte"),
        sa.Column("file_type", postgresql.ENUM("PDF", "DOCX", "XLSX", name="doc_file_type", create_type=False), nullable=False),
        sa.Column("file_size", sa.String(32), nullable=False, server_default=""),
        sa.Column("pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("tags", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("versions", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("visibility", postgresql.ENUM("public", "internal", "restricted", name="doc_visibility", create_type=False), nullable=False, server_default="public"),
        sa.Column("status", postgresql.ENUM("uploaded", "processing", "indexed", "failed", name="doc_status", create_type=False), nullable=False, server_default="uploaded"),
        sa.Column("supermemory_document_id", sa.String(512), nullable=True),
        sa.Column("ingestion_error", sa.Text(), nullable=True),
        sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("uploaded_by", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_documents_category", "documents", ["category"])
    op.create_index("ix_documents_supermemory_document_id", "documents", ["supermemory_document_id"])

    # ── conversations ─────────────────────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False, server_default="New conversation"),
        sa.Column("preview", sa.Text(), nullable=False, server_default=""),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])

    # ── messages ──────────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("conversation_id", sa.String(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", postgresql.ENUM("user", "assistant", name="message_role", create_type=False), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("confidence", postgresql.ENUM("high", "medium", "none", name="confidence_level", create_type=False), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("bookmarked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])

    # ── sources ───────────────────────────────────────────────────────────────
    op.create_table(
        "sources",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("message_id", sa.String(), sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("doc_type", postgresql.ENUM("PDF", "DOCX", "Circular", name="source_doc_type", create_type=False), nullable=False, server_default="PDF"),
        sa.Column("page", sa.String(32), nullable=True),
        sa.Column("section", sa.String(256), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=False, server_default=""),
        sa.Column("relevance_score", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.create_index("ix_sources_message_id", "sources", ["message_id"])

    # ── analytics_events ──────────────────────────────────────────────────────
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", postgresql.ENUM(
            "chat_query", "document_upload", "document_search", "user_login", "rag_not_found",
            name="analytics_event_type", create_type=False
        ), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("supermemory_latency_ms", sa.Float(), nullable=True),
        sa.Column("llm_latency_ms", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_analytics_events_user_id", "analytics_events", ["user_id"])
    op.create_index("ix_analytics_events_event_type", "analytics_events", ["event_type"])
    op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("analytics_events")
    op.drop_table("sources")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("documents")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS analytics_event_type")
    op.execute("DROP TYPE IF EXISTS source_doc_type")
    op.execute("DROP TYPE IF EXISTS confidence_level")
    op.execute("DROP TYPE IF EXISTS message_role")
    op.execute("DROP TYPE IF EXISTS doc_visibility")
    op.execute("DROP TYPE IF EXISTS doc_file_type")
    op.execute("DROP TYPE IF EXISTS doc_status")
    op.execute("DROP TYPE IF EXISTS user_status")
    op.execute("DROP TYPE IF EXISTS user_role")
