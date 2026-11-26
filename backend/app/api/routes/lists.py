from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select

from app.api.deps import BoardMembership, DbSession, MemberList
from app.models import BoardList
from app.schemas.board import ListCreate, ListOut, ListUpdate
from app.services.position import position_after, rebalance_if_needed

router = APIRouter(tags=["lists"])


@router.post(
    "/boards/{board_id}/lists", response_model=ListOut, status_code=status.HTTP_201_CREATED
)
def create_list(
    board_id: int, data: ListCreate, db: DbSession, membership: BoardMembership
) -> BoardList:
    last = db.scalar(select(func.max(BoardList.position)).where(BoardList.board_id == board_id))
    board_list = BoardList(board_id=board_id, title=data.title, position=position_after(last))
    db.add(board_list)
    db.commit()
    return board_list


@router.patch("/lists/{list_id}", response_model=ListOut)
def update_list(list_id: int, data: ListUpdate, db: DbSession, board_list: MemberList) -> BoardList:
    fields = data.model_fields_set
    if "title" in fields:
        if data.title is None:
            raise HTTPException(status_code=400, detail="리스트 이름은 비워둘 수 없습니다.")
        board_list.title = data.title
    if "position" in fields:
        if data.position is None:
            raise HTTPException(status_code=400, detail="position 값이 필요합니다.")
        board_list.position = data.position
        db.flush()
        siblings = db.scalars(
            select(BoardList).where(BoardList.board_id == board_list.board_id)
        ).all()
        rebalance_if_needed(siblings)
    db.commit()
    return board_list


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(list_id: int, db: DbSession, board_list: MemberList) -> Response:
    db.delete(board_list)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
