from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Double, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.board import Board
    from app.models.card import Card


class BoardList(Base):
    """보드 안의 컬럼. (`List`는 typing과 이름이 겹쳐서 BoardList로 명명)"""

    __tablename__ = "lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    # MySQL FLOAT는 단정밀도라서 Double 사용
    position: Mapped[float] = mapped_column(Double)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    board: Mapped[Board] = relationship(back_populates="lists")
    cards: Mapped[list[Card]] = relationship(
        back_populates="list",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Card.position",
    )
