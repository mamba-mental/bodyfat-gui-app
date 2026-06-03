"""create cycles table + cycle_id on entries and reports

Revision ID: ed3cda93ad18
Revises: f3c461796ba2
Create Date: 2026-06-03 05:54:26.907492

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed3cda93ad18'
down_revision: Union[str, Sequence[str], None] = 'f3c461796ba2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _insp():
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    """Create the cycles table + nullable cycle_id on entries/reports.

    ADDITIVE ONLY (Codex #6): no existing row is rewritten. cycle_id is nullable so
    old data stays valid until the build-session backfill assigns cycles by
    program_id-then-date. The partial unique index enforces at-most-one active
    cycle per user at the DB level (Codex #2). Idempotent; batch mode = SQLite-safe.
    """
    if "cycles" not in _insp().get_table_names():
        op.create_table(
            "cycles",
            sa.Column("id", sa.Text(), primary_key=True),
            sa.Column("user_id", sa.Text(), nullable=False),
            sa.Column("name", sa.Text()),
            sa.Column("start_date", sa.Text(), nullable=False),
            sa.Column("end_date", sa.Text()),
            sa.Column("status", sa.Text(), nullable=False, server_default="active"),
            sa.Column("start_weight", sa.Float()),
            sa.Column("start_bf", sa.Float()),
            sa.Column("goal_weight", sa.Float()),
            sa.Column("goal_bf", sa.Float()),
            sa.Column("timeline_weeks", sa.Integer()),
            sa.Column("weighin_days", sa.Text()),       # JSON array of 0..6 (Sun..Sat)
            sa.Column("weighin_per_week", sa.Integer()),
            sa.Column("legacy_program_id", sa.Text()),  # maps old entries.program_id boundary
            sa.Column("created_at", sa.Text()),
            sa.Column("updated_at", sa.Text()),
        )
    if "uq_cycles_one_active" not in {i["name"] for i in _insp().get_indexes("cycles")}:
        op.create_index(
            "uq_cycles_one_active", "cycles", ["user_id"],
            unique=True, sqlite_where=sa.text("status = 'active'"),
        )
    if "cycle_id" not in {c["name"] for c in _insp().get_columns("entries")}:
        with op.batch_alter_table("entries") as b:
            b.add_column(sa.Column("cycle_id", sa.Text(), nullable=True))
    if "cycle_id" not in {c["name"] for c in _insp().get_columns("reports")}:
        with op.batch_alter_table("reports") as b:
            b.add_column(sa.Column("cycle_id", sa.Text(), nullable=True))


def downgrade() -> None:
    """Reverse: drop cycle_id columns then the cycles table (idempotent)."""
    if "cycle_id" in {c["name"] for c in _insp().get_columns("reports")}:
        with op.batch_alter_table("reports") as b:
            b.drop_column("cycle_id")
    if "cycle_id" in {c["name"] for c in _insp().get_columns("entries")}:
        with op.batch_alter_table("entries") as b:
            b.drop_column("cycle_id")
    if "cycles" in _insp().get_table_names():
        op.drop_table("cycles")
