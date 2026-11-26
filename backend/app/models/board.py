from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.board_list import BoardList
    from app.models.user import User

ROLE_OWNER = "owner"
ROLE_MEMBER = "member"


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    members: Mapped[list[BoardMember]] = relationship(
        back_populates="board", cascade="all, delete-orphan", passive_deletes=True
    )
    lists: Mapped[list[BoardList]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="BoardList.position",
    )


class BoardMember(Base):
    __tablename__ = "board_members"
    __table_args__ = (UniqueConstraint("board_id", "user_id", name="uq_board_member"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(
        Enum(ROLE_OWNER, ROLE_MEMBER, name="board_role"), default=ROLE_MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    board: Mapped[Board] = relationship(back_populates="members")
    user: Mapped[User] = relationship(lazy="joined")
