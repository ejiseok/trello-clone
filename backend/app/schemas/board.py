from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel, Title, UTCDateTime

Role = Literal["owner", "member"]


# ---- 보드 ----
class BoardCreate(BaseModel):
    title: Title


class BoardUpdate(BaseModel):
    title: Title


class BoardSummary(ORMModel):
    id: int
    title: str
    owner_id: int
    role: Role
    created_at: UTCDateTime
    updated_at: UTCDateTime


# ---- 멤버 ----
class MemberAdd(BaseModel):
    email: EmailStr


class MemberOut(BaseModel):
    user_id: int
    email: str
    name: str
    role: Role
    joined_at: UTCDateTime


# ---- 카드 ----
class CardCreate(BaseModel):
    title: Title


class CardUpdate(BaseModel):
    """보낸 필드만 수정한다. description/due_date/assignee_id는 null로 비울 수 있다."""

    title: Title | None = None
    description: str | None = Field(default=None, max_length=10000)
    due_date: date | None = None
    assignee_id: int | None = None


class CardMove(BaseModel):
    list_id: int
    # 위치 값은 유한한 실수여야 한다 (NaN/inf 거부)
    position: float = Field(allow_inf_nan=False)


class CardOut(ORMModel):
    id: int
    list_id: int
    title: str
    description: str | None
    due_date: date | None
    assignee_id: int | None
    position: float
    created_at: UTCDateTime
    updated_at: UTCDateTime


# ---- 리스트 ----
class ListCreate(BaseModel):
    title: Title


class ListUpdate(BaseModel):
    title: Title | None = None
    position: float | None = Field(default=None, allow_inf_nan=False)


class ListOut(ORMModel):
    id: int
    board_id: int
    title: str
    position: float
    cards: list[CardOut] = []


class BoardDetail(BoardSummary):
    lists: list[ListOut]
    members: list[MemberOut]
