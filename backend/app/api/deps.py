"""공통 의존성: DB 세션, 현재 사용자, 보드 권한 검사.

권한 규칙
- 보드 멤버가 아니면 404 (다른 사람 보드의 존재 여부를 노출하지 않는다)
- 멤버지만 owner 권한이 필요하면 403
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import ROLE_OWNER, BoardList, BoardMember, Card, User

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="로그인이 필요합니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def find_membership(db: Session, board_id: int, user_id: int) -> BoardMember | None:
    return db.scalar(
        select(BoardMember).where(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
    )


def ensure_board_member(db: Session, board_id: int, user: User) -> BoardMember:
    membership = find_membership(db, board_id, user.id)
    if membership is None:
        raise _not_found("보드를 찾을 수 없습니다.")
    return membership


def get_board_membership(board_id: int, db: DbSession, user: CurrentUser) -> BoardMember:
    return ensure_board_member(db, board_id, user)


BoardMembership = Annotated[BoardMember, Depends(get_board_membership)]


def require_board_owner(membership: BoardMembership) -> BoardMember:
    if membership.role != ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="보드 소유자만 할 수 있는 작업입니다."
        )
    return membership


OwnerMembership = Annotated[BoardMember, Depends(require_board_owner)]


def get_list_for_member(list_id: int, db: DbSession, user: CurrentUser) -> BoardList:
    board_list = db.get(BoardList, list_id)
    if board_list is None or find_membership(db, board_list.board_id, user.id) is None:
        raise _not_found("리스트를 찾을 수 없습니다.")
    return board_list


MemberList = Annotated[BoardList, Depends(get_list_for_member)]


def get_card_for_member(card_id: int, db: DbSession, user: CurrentUser) -> Card:
    card = db.get(Card, card_id)
    if card is None or find_membership(db, card.list.board_id, user.id) is None:
        raise _not_found("카드를 찾을 수 없습니다.")
    return card


MemberCard = Annotated[Card, Depends(get_card_for_member)]
