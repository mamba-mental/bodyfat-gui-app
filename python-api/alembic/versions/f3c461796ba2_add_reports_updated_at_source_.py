"""add reports.updated_at + source_fingerprint

Revision ID: f3c461796ba2
Revises: 
Create Date: 2026-06-03 05:51:35.463828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c461796ba2'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _report_cols(bind) -> set:
    return {c["name"] for c in sa.inspect(bind).get_columns("reports")}


def upgrade() -> None:
    """Add nullable reports.updated_at + reports.source_fingerprint.

    Additive + idempotent. These let reports participate in newest-wins /
    fingerprint conflict resolution (Codex #5) without rewriting existing rows.
    Batch mode = SQLite-safe.
    """
    cols = _report_cols(op.get_bind())
    with op.batch_alter_table("reports") as batch:
        if "updated_at" not in cols:
            batch.add_column(sa.Column("updated_at", sa.Text(), nullable=True))
        if "source_fingerprint" not in cols:
            batch.add_column(sa.Column("source_fingerprint", sa.Text(), nullable=True))


def downgrade() -> None:
    """Drop the two added columns (idempotent)."""
    cols = _report_cols(op.get_bind())
    with op.batch_alter_table("reports") as batch:
        if "source_fingerprint" in cols:
            batch.drop_column("source_fingerprint")
        if "updated_at" in cols:
            batch.drop_column("updated_at")
