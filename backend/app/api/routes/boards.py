from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import BoardMembership, CurrentUser, DbSession, OwnerMembership
from app.models import ROLE_OWNER, Board, BoardList, BoardMember
from app.schemas.board import (
    BoardCreate,
    BoardDetail,
    BoardSummary,
    BoardUpdate,
    ListOut,
    MemberOut,
)

router = APIRouter(prefix="/boards", tags=["boards"])


def to_summary(board: Board, role: str) -> BoardSummary:
    return BoardSummary(
        id=board.id,
        title=board.title,
        owner_id=board.owner_id,
        role=role,  # type: ignore[arg-type]
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


def to_member_out(member: BoardMember) -> MemberOut:
    return MemberOut(
        user_id=member.user_id,
        email=member.user.email,
        name=member.user.name,
        role=member.role,  # type: ignore[arg-type]
        joined_at=member.joined_at,
    )


def sorted_members(members: list[BoardMember]) -> list[BoardMember]:
    # owner 먼저, 그 다음 참여 순서
    return sorted(members, key=lambda m: (m.role != ROLE_OWNER, m.joined_at, m.id))


@router.get("", response_model=list[BoardSummary])
def list_boards(db: DbSession, user: CurrentUser) -> list[BoardSummary]:
    rows = db.execute(
        select(Board, BoardMember.role)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .where(BoardMember.user_id == user.id)
        .order_by(Board.created_at.desc(), Board.id.desc())
    ).all()
    return [to_summary(board, role) for board, role in rows]


@router.post("", response_model=BoardSummary, status_code=status.HTTP_201_CREATED)
def create_board(data: BoardCreate, db: DbSession, user: CurrentUser) -> BoardSummary:
    board = Board(title=data.title, owner_id=user.id)
    board.members.append(BoardMember(user_id=user.id, role=ROLE_OWNER))
    db.add(board)
    db.commit()
    return to_summary(board, ROLE_OWNER)


@router.get("/{board_id}", response_model=BoardDetail)
def get_board(board_id: int, db: DbSession, membership: BoardMembership) -> BoardDetail:
    board = db.scalar(
        select(Board)
        .where(Board.id == board_id)
        .options(
            selectinload(Board.lists).selectinload(BoardList.cards),
            selectinload(Board.members),
        )
        .execution_options(populate_existing=True)
    )
    assert board is not None  # 멤버십 검사를 통과했으므로 존재한다
    summary = to_summary(board, membership.role)
    return BoardDetail(
        **summary.model_dump(),
        lists=[ListOut.model_validate(board_list) for board_list in board.lists],
        members=[to_member_out(m) for m in sorted_members(board.members)],
    )


@router.patch("/{board_id}", response_model=BoardSummary)
def update_board(
    board_id: int, data: BoardUpdate, db: DbSession, membership: BoardMembership
) -> BoardSummary:
    board = membership.board
    board.title = data.title
    db.commit()
    return to_summary(board, membership.role)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_id: int, db: DbSession, membership: OwnerMembership) -> Response:
    db.delete(membership.board)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
