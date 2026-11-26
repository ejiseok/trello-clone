import { AlignLeftIcon, CalendarIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import type { Card as CardData, Member } from '@/api/types'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { dueStatus, formatDue } from '@/lib/date'
import { cn } from '@/lib/utils'

const DUE_LABEL = { overdue: '마감 지남', today: '오늘 마감', upcoming: '마감일' } as const

export function DueBadge({ due, className }: { due: string; className?: string }) {
  const status = dueStatus(due)
  return (
    <Badge
      variant={status === 'overdue' ? 'destructive' : status === 'today' ? 'default' : 'secondary'}
      className={className}
      title={`${DUE_LABEL[status]}: ${formatDue(due)}`}
    >
      <CalendarIcon />
      {formatDue(due)}
      {status === 'overdue' && <span className="sr-only">(마감 지남)</span>}
    </Badge>
  )
}

interface CardFrontProps extends ComponentProps<typeof Card> {
  card: CardData
  assignee?: Member
  isDragging?: boolean
  isOverlay?: boolean
}

/** 리스트 안에 보이는 카드 앞면 */
export function CardFront({
  card,
  assignee,
  isDragging,
  isOverlay,
  className,
  ...props
}: CardFrontProps) {
  const hasMeta = card.due_date || card.description || assignee
  const overdue = card.due_date ? dueStatus(card.due_date) === 'overdue' : false

  return (
    <Card
      size="sm"
      data-overdue={overdue || undefined}
      className={cn(
        'cursor-pointer gap-2 px-3 py-2.5 shadow-xs transition-colors select-none hover:ring-primary/40',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        overdue && 'ring-destructive/40',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-2 cursor-grabbing shadow-lg ring-primary/40',
        className,
      )}
      {...props}
    >
      <p className="text-sm break-words whitespace-pre-wrap">{card.title}</p>
      {hasMeta && (
        <div className="flex items-center gap-2">
          {card.due_date && <DueBadge due={card.due_date} />}
          {card.description && (
            <AlignLeftIcon className="size-3.5 text-muted-foreground" aria-label="설명 있음" />
          )}
          {assignee && <UserAvatar name={assignee.name} size="sm" className="ml-auto" />}
        </div>
      )}
    </Card>
  )
}
