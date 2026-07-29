"""Add GR cross-reference columns to documents table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add GR cross-reference metadata columns (were in the model but missing from migration)
    op.add_column("documents", sa.Column("gr_number", sa.String(128), nullable=True))
    op.add_column("documents", sa.Column("supersedes_gr", sa.String(256), nullable=True))
    op.add_column("documents", sa.Column("amends_gr", sa.String(256), nullable=True))

    # Add indexes for GR number lookups
    op.create_index("ix_documents_gr_number", "documents", ["gr_number"])

    # Create the message_feedback enum type first (if it doesn't already exist)
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_feedback') THEN "
        "CREATE TYPE message_feedback AS ENUM ('helpful', 'not_helpful'); "
        "END IF; "
        "END $$;"
    )

    # Add feedback column to messages (also missing)
    op.add_column(
        "messages",
        sa.Column(
            "feedback",
            sa.Enum("helpful", "not_helpful", name="message_feedback", create_type=False),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_index("ix_documents_gr_number", "documents")
    op.drop_column("documents", "gr_number")
    op.drop_column("documents", "supersedes_gr")
    op.drop_column("documents", "amends_gr")
    op.drop_column("messages", "feedback")
    op.execute("DROP TYPE IF EXISTS message_feedback")
