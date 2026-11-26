"""initial schema: users, boards, board_members, lists, cards

Revision ID: 0001
Revises:
Create Date: 2026-11-25
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_KW = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        **TABLE_KW,
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "boards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "owner_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        **TABLE_KW,
    )
    op.create_index("ix_boards_owner_id", "boards", ["owner_id"])

    op.create_table(
        "board_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "board_id",
            sa.Integer(),
            sa.ForeignKey("boards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.Enum("owner", "member", name="board_role"), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("board_id", "user_id", name="uq_board_member"),
        **TABLE_KW,
    )
    op.create_index("ix_board_members_user_id", "board_members", ["user_id"])

    op.create_table(
        "lists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "board_id",
            sa.Integer(),
            sa.ForeignKey("boards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Double(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        **TABLE_KW,
    )
    op.create_index("ix_lists_board_id", "lists", ["board_id"])

    op.create_table(
        "cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "list_id",
            sa.Integer(),
            sa.ForeignKey("lists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column(
            "assignee_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("position", sa.Double(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        **TABLE_KW,
    )
    op.create_index("ix_cards_list_id", "cards", ["list_id"])
    op.create_index("ix_cards_assignee_id", "cards", ["assignee_id"])


def downgrade() -> None:
    op.drop_table("cards")
    op.drop_table("lists")
    op.drop_table("board_members")
    op.drop_table("boards")
    op.drop_table("users")
