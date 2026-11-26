import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useMemo, useRef, useState } from 'react'

import type { BoardDetail, Card, Member } from '@/api/types'
import { listDndId, type DndItemData } from '@/components/board/dnd'
import { CardFront } from '@/components/card/CardFront'
import { AddListForm } from '@/components/list/AddListForm'
import { ListColumnOverlay, SortableListColumn } from '@/components/list/ListColumn'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  useCreateCard,
  useCreateList,
  useDeleteList,
  useMoveCard,
  useUpdateList,
} from '@/hooks/useBoard'
import { positionBetween } from '@/lib/position'

/**
 * 드래그 중에만 쓰는 임시 순서.
 * - 드래그하는 동안 카드가 리스트 사이를 오가는 모습을 보여 주기 위해 id 순서만 따로 들고 있는다.
 * - 드롭 후에는 낙관적 업데이트로 캐시(board)가 바뀌는 순간 자동으로 무시된다 (droppedOn 비교).
 */
interface DragState {
  active: DndItemData
  /** listId → cardId[] */
  columns: Record<number, number[]>
  listOrder: number[]
  /** 드롭한 시점의 board 객체. board가 바뀌면 임시 순서를 버린다. */
  droppedOn?: BoardDetail
}

function dataOf(item: { data: { current?: unknown } } | null | undefined): DndItemData | undefined {
  return item?.data.current as DndItemData | undefined
}

function findListOf(columns: Record<number, number[]>, cardId: number): number | undefined {
  for (const [listId, ids] of Object.entries(columns)) {
    if (ids.includes(cardId)) return Number(listId)
  }
  return undefined
}

interface BoardCanvasProps {
  board: BoardDetail
  onOpenCard: (cardId: number) => void
}

export function BoardCanvas({ board, onOpenCard }: BoardCanvasProps) {
  const createList = useCreateList(board.id)
  const updateList = useUpdateList(board.id)
  const deleteList = useDeleteList(board.id)
  const createCard = useCreateCard(board.id)
  const moveCard = useMoveCard(board.id)

  const [drag, setDrag] = useState<DragState | null>(null)
  const lastOverId = useRef<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    // 5px 이상 움직여야 드래그 시작 → 짧은 클릭은 카드 상세 열기
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter는 카드 열기에 쓰고, Space로 집기/놓기
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const cardsById = useMemo(() => {
    const map = new Map<number, Card>()
    for (const list of board.lists) for (const card of list.cards) map.set(card.id, card)
    return map
  }, [board])

  const membersById = useMemo(
    () => new Map<number, Member>(board.members.map((m) => [m.user_id, m])),
    [board.members],
  )

  // 화면에 그릴 순서: 드래그 중(또는 드롭 직후 캐시 반영 전)이면 임시 순서, 아니면 서버 데이터
  const override = drag && (!drag.droppedOn || drag.droppedOn === board) ? drag : null
  const lists = useMemo(() => {
    const listsById = new Map(board.lists.map((l) => [l.id, l]))
    const ordered = override
      ? override.listOrder.flatMap((id) => listsById.get(id) ?? [])
      : board.lists
    return ordered.map((list) => ({
      list,
      cards: override?.columns[list.id]
        ? override.columns[list.id].flatMap((id) => cardsById.get(id) ?? [])
        : list.cards,
    }))
  }, [board, override, cardsById])

  const snapshot = (active: DndItemData): DragState => ({
    active,
    columns: Object.fromEntries(board.lists.map((l) => [l.id, l.cards.map((c) => c.id)])),
    listOrder: board.lists.map((l) => l.id),
  })

  /**
   * 충돌 판정
   * - 리스트를 끌 때: 리스트끼리만 비교
   * - 카드를 끌 때: 포인터 아래 요소 → 리스트 위라면 그 리스트 안에서 가장 가까운 카드
   */
  const collisionDetection: CollisionDetection = (args) => {
    const activeData = dataOf(args.active)
    if (activeData?.type === 'list') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => dataOf(c)?.type === 'list'),
      })
    }

    const pointerHits = pointerWithin(args)
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
    let overId = getFirstCollision(hits, 'id')

    if (overId != null) {
      const overData = dataOf(args.droppableContainers.find((c) => c.id === overId))
      if (overData?.type === 'list') {
        const cardsInList = args.droppableContainers.filter((c) => {
          const d = dataOf(c)
          return d?.type === 'card' && d.listId === overData.listId && c.id !== args.active.id
        })
        if (cardsInList.length > 0) {
          overId = closestCenter({ ...args, droppableContainers: cardsInList })[0]?.id ?? overId
        }
      }
      lastOverId.current = overId
      return [{ id: overId }]
    }
    return lastOverId.current != null ? [{ id: lastOverId.current }] : []
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    const data = dataOf(active)
    if (data) setDrag(snapshot(data))
  }

  // 카드가 다른 리스트 위로 넘어가면 임시 순서에서 그 리스트로 옮긴다
  const onDragOver = ({ active, over }: DragOverEvent) => {
    const activeData = dataOf(active)
    const overData = dataOf(over)
    if (!over || activeData?.type !== 'card' || !overData) return

    setDrag((prev) => {
      if (!prev || prev.droppedOn) return prev
      const from = findListOf(prev.columns, activeData.cardId)
      const to = overData.type === 'list' ? overData.listId : findListOf(prev.columns, overData.cardId)
      if (from === undefined || to === undefined || from === to) return prev

      const target = prev.columns[to].filter((id) => id !== activeData.cardId)
      let index = target.length
      if (overData.type === 'card') {
        const overIndex = target.indexOf(overData.cardId)
        const activeRect = active.rect.current.translated
        const below = activeRect ? activeRect.top > over.rect.top + over.rect.height / 2 : false
        index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length
      }
      target.splice(index, 0, activeData.cardId)

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [from]: prev.columns[from].filter((id) => id !== activeData.cardId),
          [to]: target,
        },
      }
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    lastOverId.current = null
    const activeData = dataOf(active)
    const overData = dataOf(over)
    if (!drag || !activeData || !over) {
      setDrag(null)
      return
    }

    if (activeData.type === 'list') {
      const from = drag.listOrder.indexOf(activeData.listId)
      const to = overData?.type === 'list' ? drag.listOrder.indexOf(overData.listId) : -1
      if (from < 0 || to < 0 || from === to) {
        setDrag(null)
        return
      }
      const listOrder = arrayMove(drag.listOrder, from, to)
      const others = board.lists.filter((l) => l.id !== activeData.listId)
      const position = positionBetween(others[to - 1]?.position, others[to]?.position)
      setDrag({ ...drag, listOrder, droppedOn: board })
      updateList.mutate({ listId: activeData.listId, position })
      return
    }

    // 카드
    const cardId = activeData.cardId
    const listId = findListOf(drag.columns, cardId)
    const original = cardsById.get(cardId)
    if (listId === undefined || !original) {
      setDrag(null)
      return
    }
    let ids = drag.columns[listId]
    if (overData?.type === 'card' && overData.cardId !== cardId && ids.includes(overData.cardId)) {
      ids = arrayMove(ids, ids.indexOf(cardId), ids.indexOf(overData.cardId))
    }
    const index = ids.indexOf(cardId)
    const originalIndex = board.lists
      .find((l) => l.id === original.list_id)
      ?.cards.findIndex((c) => c.id === cardId)

    if (listId === original.list_id && index === originalIndex) {
      setDrag(null) // 제자리
      return
    }

    // 자기 자신을 뺀 이웃 카드의 position으로 새 위치 계산
    const neighbors = ids.filter((id) => id !== cardId).flatMap((id) => cardsById.get(id) ?? [])
    const position = positionBetween(neighbors[index - 1]?.position, neighbors[index]?.position)
    setDrag({ ...drag, columns: { ...drag.columns, [listId]: ids }, droppedOn: board })
    moveCard.mutate({ cardId, listId, position })
  }

  const activeList =
    drag?.active.type === 'list' && !drag.droppedOn
      ? lists.find((l) => l.list.id === drag.active.listId)
      : undefined
  const activeCard =
    drag?.active.type === 'card' && !drag.droppedOn ? cardsById.get(drag.active.cardId) : undefined

  const listTitle = (id: number) => board.lists.find((l) => l.id === id)?.title ?? ''
  const cardTitle = (id: number) => cardsById.get(id)?.title ?? ''
  const describe = (id: UniqueIdentifier) => {
    const [type, raw] = String(id).split('-')
    return type === 'list' ? `리스트 '${listTitle(Number(raw))}'` : `카드 '${cardTitle(Number(raw))}'`
  }
  // 스크린리더 안내 문구
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${describe(active.id)}을(를) 집었습니다.`,
    onDragOver: ({ active, over }) =>
      over ? `${describe(active.id)}이(가) ${describe(over.id)} 위에 있습니다.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${describe(active.id)}을(를) 놓았습니다.` : `${describe(active.id)} 이동을 취소했습니다.`,
    onDragCancel: ({ active }) => `${describe(active.id)} 이동을 취소했습니다.`,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Space 키로 집고, 방향키로 옮긴 뒤 Space 키로 놓습니다. Esc 키로 취소합니다.',
        },
      }}
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex items-start gap-3 p-4">
          <SortableContext
            items={lists.map(({ list }) => listDndId(list.id))}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map(({ list, cards }) => (
              <SortableListColumn
                key={list.id}
                list={list}
                cards={cards}
                membersById={membersById}
                onRename={(title) => updateList.mutate({ listId: list.id, title })}
                onDelete={() => deleteList.mutate(list.id)}
                onAddCard={(title) => createCard.mutate({ listId: list.id, title })}
                onOpenCard={onOpenCard}
              />
            ))}
          </SortableContext>
          <AddListForm onAdd={(title) => createList.mutate(title)} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeCard ? (
          <CardFront
            card={activeCard}
            assignee={activeCard.assignee_id ? membersById.get(activeCard.assignee_id) : undefined}
            isOverlay
          />
        ) : activeList ? (
          <ListColumnOverlay list={activeList.list} cards={activeList.cards} membersById={membersById} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

