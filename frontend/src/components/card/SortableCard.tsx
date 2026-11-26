import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Card, Member } from '@/api/types'
import { CardFront } from '@/components/card/CardFront'
import { cardDndId } from '@/components/board/dnd'

interface SortableCardProps {
  card: Card
  listId: number
  assignee?: Member
  onOpen: (cardId: number) => void
}

export function SortableCard({ card, listId, assignee, onOpen }: SortableCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: cardDndId(card.id),
    data: { type: 'card', cardId: card.id, listId },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="list-none"
    >
      <CardFront
        card={card}
        assignee={assignee}
        isDragging={isDragging}
        {...attributes}
        {...listeners}
        aria-roledescription="드래그 가능한 카드"
        aria-label={card.title}
        onClick={() => onOpen(card.id)}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e)
          if (e.key === 'Enter' && !e.defaultPrevented) onOpen(card.id)
        }}
      />
    </li>
  )
}
