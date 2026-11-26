import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useState, type HTMLAttributes, type ReactNode } from 'react'

import type { BoardList, Card, Member } from '@/api/types'
import { cardDndId, listDndId } from '@/components/board/dnd'
import { AddCardForm } from '@/components/card/AddCardForm'
import { CardFront } from '@/components/card/CardFront'
import { SortableCard } from '@/components/card/SortableCard'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EditableText } from '@/components/common/EditableText'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ColumnShellProps {
  title: ReactNode
  actions?: ReactNode
  count: number
  handleProps?: HTMLAttributes<HTMLButtonElement>
  children: ReactNode
  footer?: ReactNode
  className?: string
  style?: React.CSSProperties
  ref?: React.Ref<HTMLDivElement>
}

/** 리스트 컬럼의 겉모양 (정렬 가능한 컬럼과 드래그 미리보기에서 함께 사용) */
function ColumnShell({
  title,
  actions,
  count,
  handleProps,
  children,
  footer,
  className,
  style,
  ref,
}: ColumnShellProps) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'flex max-h-[calc(100svh-8.5rem)] w-72 shrink-0 flex-col rounded-xl bg-muted ring-1 ring-foreground/5',
        className,
      )}
    >
      <div className="flex items-center gap-1 p-2 pb-1">
        <button
          type="button"
          className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          {...handleProps}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center">{title}</div>
        <Badge variant="outline" className="shrink-0 text-muted-foreground" aria-label={`카드 ${count}개`}>
          {count}
        </Badge>
        {actions}
      </div>
      <div className="min-h-2 flex-1 overflow-y-auto px-2 pt-2">{children}</div>
      <div className="p-2 pt-1">{footer}</div>
    </div>
  )
}

interface ListColumnProps {
  list: BoardList
  cards: Card[]
  membersById: Map<number, Member>
  onRename: (title: string) => void
  onDelete: () => void
  onAddCard: (title: string) => void
  onOpenCard: (cardId: number) => void
}

export function SortableListColumn({
  list,
  cards,
  membersById,
  onRename,
  onDelete,
  onAddCard,
  onOpenCard,
}: ListColumnProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: listDndId(list.id), data: { type: 'list', listId: list.id } })

  return (
    <>
      <ColumnShell
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cn(isDragging && 'opacity-40')}
        count={cards.length}
        handleProps={{
          ...attributes,
          ...listeners,
          ref: setActivatorNodeRef,
          'aria-label': `${list.title} 리스트 이동`,
          'aria-roledescription': '드래그 가능한 리스트',
        } as HTMLAttributes<HTMLButtonElement>}
        title={<EditableText value={list.title} onSave={onRename} ariaLabel="리스트 이름" />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${list.title} 리스트 메뉴`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                <Trash2Icon />
                리스트 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        footer={<AddCardForm onAdd={onAddCard} />}
      >
        <SortableContext items={cards.map((c) => cardDndId(c.id))} strategy={verticalListSortingStrategy}>
          <ul className="flex min-h-2 flex-col gap-2 pb-1" aria-label={`${list.title} 카드 목록`}>
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                listId={list.id}
                assignee={card.assignee_id ? membersById.get(card.assignee_id) : undefined}
                onOpen={onOpenCard}
              />
            ))}
          </ul>
        </SortableContext>
      </ColumnShell>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="리스트를 삭제할까요?"
        description={
          cards.length > 0
            ? `'${list.title}' 리스트와 그 안의 카드 ${cards.length}개가 모두 삭제됩니다.`
            : `'${list.title}' 리스트가 삭제됩니다.`
        }
        onConfirm={onDelete}
      />
    </>
  )
}

/** 리스트를 드래그하는 동안 커서를 따라다니는 미리보기 */
export function ListColumnOverlay({
  list,
  cards,
  membersById,
}: Pick<ListColumnProps, 'list' | 'cards' | 'membersById'>) {
  return (
    <ColumnShell
      className="rotate-1 cursor-grabbing shadow-xl"
      count={cards.length}
      title={<span className="truncate px-2 py-1 font-semibold">{list.title}</span>}
    >
      <ul className="flex flex-col gap-2 pb-1">
        {cards.map((card) => (
          <li key={card.id} className="list-none">
            <CardFront
              card={card}
              assignee={card.assignee_id ? membersById.get(card.assignee_id) : undefined}
            />
          </li>
        ))}
      </ul>
    </ColumnShell>
  )
}
