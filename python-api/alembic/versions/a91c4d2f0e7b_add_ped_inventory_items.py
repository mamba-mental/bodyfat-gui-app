"""add PED inventory items

Revision ID: a91c4d2f0e7b
Revises: ed3cda93ad18
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a91c4d2f0e7b"
down_revision: Union[str, Sequence[str], None] = "ed3cda93ad18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "ped_inventory_items" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "ped_inventory_items",
            sa.Column("id", sa.Text(), primary_key=True),
            sa.Column("user_id", sa.Text(), nullable=False, server_default="default"),
            sa.Column("label_name", sa.Text(), nullable=False),
            sa.Column("canonical_compound", sa.Text(), nullable=False),
            sa.Column("formulation", sa.Text(), nullable=False),
            sa.Column("strength_value", sa.Text(), nullable=False),
            sa.Column("strength_unit", sa.Text(), nullable=False),
            sa.Column("available_units", sa.Text(), nullable=False),
            sa.Column("inventory_unit", sa.Text(), nullable=False),
            sa.Column("expiration_date", sa.Text(), nullable=False),
            sa.Column("lot_reference", sa.Text()),
            sa.Column("source_note", sa.Text()),
            sa.Column("confirmed", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.Text(), nullable=False, server_default="active"),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
    indexes = {row["name"] for row in sa.inspect(bind).get_indexes("ped_inventory_items")}
    if "idx_ped_inventory_user_compound" not in indexes:
        op.create_index(
            "idx_ped_inventory_user_compound",
            "ped_inventory_items",
            ["user_id", "canonical_compound", "status", "expiration_date"],
        )


def downgrade() -> None:
    if "ped_inventory_items" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("ped_inventory_items")
