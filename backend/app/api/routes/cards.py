from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select

from app.api.deps import DbSession, MemberCard, MemberList, find_membership
from app.models import BoardList, Card
from app.schemas.board import CardCreate, CardMove, CardOut, CardUpdate
from app.services.position import position_after, rebalance_if_needed

router = APIRouter(tags=["cards"])


@router.post("/lists/{list_id}/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED)
def create_card(list_id: int, data: CardCreate, db: DbSession, board_list: MemberList) -> Card:
    last = db.scalar(select(func.max(Card.position)).where(Card.list_id == board_list.id))
    card = Card(list_id=board_list.id, title=data.title, position=position_after(last))
    db.add(card)
    db.commit()
    return card


@router.patch("/cards/{card_id}", response_model=CardOut)
def update_card(card_id: int, data: CardUpdate, db: DbSession, card: MemberCard) -> Card:
    fields = data.model_fields_set
    if "title" in fields:
        if data.title is None:
            raise HTTPException(status_code=400, detail="카드 제목은 비워둘 수 없습니다.")
        card.title = data.title
    if "description" in fields:
        # 빈 문자열은 설명 없음으로 저장
        card.description = data.description or None
    if "due_date" in fields:
        card.due_date = data.due_date
    if "assignee_id" in fields:
        if data.assignee_id is not None and (
            find_membership(db, card.list.board_id, data.assignee_id) is None
        ):
            raise HTTPException(status_code=400, detail="담당자는 보드 멤버여야 합니다.")
        card.assignee_id = data.assignee_id
    db.commit()
    return card


@router.patch("/cards/{card_id}/move", response_model=CardOut)
def move_card(card_id: int, data: CardMove, db: DbSession, card: MemberCard) -> Card:
    target = db.get(BoardList, data.list_id)
    # 다른 보드의 리스트로는 옮길 수 없다 (존재 여부도 노출하지 않음)
    if target is None or target.board_id != card.list.board_id:
        raise HTTPException(status_code=404, detail="리스트를 찾을 수 없습니다.")

    card.list = target
    card.position = data.position
    db.flush()
    siblings = db.scalars(select(Card).where(Card.list_id == target.id)).all()
    rebalance_if_needed(siblings)
    db.commit()
    return card


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, db: DbSession, card: MemberCard) -> Response:
    db.delete(card)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
