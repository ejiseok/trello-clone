from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select, update

from app.api.deps import BoardMembership, DbSession, OwnerMembership, find_membership
from app.api.routes.boards import sorted_members, to_member_out
from app.models import ROLE_MEMBER, ROLE_OWNER, BoardList, BoardMember, Card, User
from app.schemas.board import MemberAdd, MemberOut

router = APIRouter(prefix="/boards/{board_id}/members", tags=["members"])


@router.get("", response_model=list[MemberOut])
def list_members(board_id: int, db: DbSession, membership: BoardMembership) -> list[MemberOut]:
    members = db.scalars(select(BoardMember).where(BoardMember.board_id == board_id)).all()
    return [to_member_out(m) for m in sorted_members(list(members))]


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    board_id: int, data: MemberAdd, db: DbSession, membership: OwnerMembership
) -> MemberOut:
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="해당 이메일로 가입된 사용자가 없습니다."
        )
    if find_membership(db, board_id, user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 보드 멤버입니다.")

    member = BoardMember(board_id=board_id, user_id=user.id, role=ROLE_MEMBER, user=user)
    db.add(member)
    db.commit()
    return to_member_out(member)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    board_id: int, user_id: int, db: DbSession, membership: OwnerMembership
) -> Response:
    target = find_membership(db, board_id, user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="멤버를 찾을 수 없습니다."
        )
    if target.role == ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="보드 소유자는 제거할 수 없습니다."
        )

    # 제거되는 멤버가 담당자인 카드는 담당자를 비운다
    db.execute(
        update(Card)
        .where(
            Card.assignee_id == user_id,
            Card.list_id.in_(select(BoardList.id).where(BoardList.board_id == board_id)),
        )
        .values(assignee_id=None)
        .execution_options(synchronize_session=False)
    )
    db.delete(target)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
