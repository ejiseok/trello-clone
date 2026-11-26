import { ko } from 'react-day-picker/locale'
import { CalendarIcon, ListIcon, Loader2Icon, Trash2Icon, UserIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import type { BoardDetail, Card } from '@/api/types'
import { DueBadge } from '@/components/card/CardFront'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteCard, useUpdateCard } from '@/hooks/useBoard'
import { formatDateTime, formatDue, fromDateString, toDateString } from '@/lib/date'

const NO_ASSIGNEE = 'none'

interface CardDetailDialogProps {
  board: BoardDetail
  cardId: number | null
  onClose: () => void
}

export function CardDetailDialog({ board, cardId, onClose }: CardDetailDialogProps) {
  const list = board.lists.find((l) => l.cards.some((c) => c.id === cardId))
  const card = list?.cards.find((c) => c.id === cardId)

  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {card && list && (
          // key: 다른 카드를 열면 편집 중인 입력값을 초기화
          <CardDetailBody
            key={card.id}
            board={board}
            card={card}
            listTitle={list.title}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface BodyProps {
  board: BoardDetail
  card: Card
  listTitle: string
  onClose: () => void
}

function CardDetailBody({ board, card, listTitle, onClose }: BodyProps) {
  const updateCard = useUpdateCard(board.id)
  const deleteCard = useDeleteCard(board.id)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dateOpen, setDateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = (patch: Parameters<typeof updateCard.mutate>[0]['patch']) =>
    updateCard.mutate({ cardId: card.id, patch })

  const saveTitle = () => {
    const next = title.trim()
    if (!next) setTitle(card.title)
    else if (next !== card.title) update({ title: next })
  }

  const descriptionDirty = description !== (card.description ?? '')
  const assignee = board.members.find((m) => m.user_id === card.assignee_id)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="sr-only">카드 상세: {card.title}</DialogTitle>
        <Textarea
          aria-label="카드 제목"
          value={title}
          maxLength={200}
          rows={1}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          className="min-h-0 resize-none border-transparent px-2 text-lg font-semibold shadow-none hover:border-input focus-visible:border-input"
        />
        <DialogDescription className="flex items-center gap-1 px-2">
          <ListIcon className="size-3.5" />
          <span>
            <strong className="font-medium text-foreground">{listTitle}</strong> 리스트
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="card-assignee">
            <UserIcon className="size-4" />
            담당자
          </FieldLabel>
          <Select
            value={card.assignee_id ? String(card.assignee_id) : NO_ASSIGNEE}
            onValueChange={(v) => update({ assignee_id: v === NO_ASSIGNEE ? null : Number(v) })}
          >
            <SelectTrigger id="card-assignee" className="w-full">
              <SelectValue>
                {assignee ? (
                  <span className="flex items-center gap-2">
                    <UserAvatar name={assignee.name} size="sm" />
                    {assignee.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">담당자 없음</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ASSIGNEE}>담당자 없음</SelectItem>
              {board.members.map((m) => (
                <SelectItem key={m.user_id} value={String(m.user_id)}>
                  <UserAvatar name={m.name} size="sm" />
                  {m.name}
                  <span className="text-xs text-muted-foreground">{m.email}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="card-due">
            <CalendarIcon className="size-4" />
            마감일
          </FieldLabel>
          <div className="flex items-center gap-1">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button id="card-due" variant="outline" className="flex-1 justify-start font-normal">
                  {card.due_date ? (
                    <DueBadge due={card.due_date} />
                  ) : (
                    <span className="text-muted-foreground">마감일 없음</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ko}
                  selected={card.due_date ? fromDateString(card.due_date) : undefined}
                  defaultMonth={card.due_date ? fromDateString(card.due_date) : undefined}
                  onSelect={(date) => {
                    update({ due_date: date ? toDateString(date) : null })
                    setDateOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            {card.due_date && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`마감일 ${formatDue(card.due_date)} 제거`}
                onClick={() => update({ due_date: null })}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="card-description">설명</FieldLabel>
        <Textarea
          id="card-description"
          value={description}
          maxLength={10000}
          placeholder="카드에 대한 자세한 설명을 입력하세요"
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-28"
        />
        {descriptionDirty && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const blank = !description.trim()
                if (blank) setDescription('')
                update({ description: blank ? null : description })
              }}
            >
              {updateCard.isPending && <Loader2Icon className="animate-spin" />}
              설명 저장
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDescription(card.description ?? '')}>
              취소
            </Button>
          </div>
        )}
      </Field>

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {formatDateTime(card.created_at)} 생성 · {formatDateTime(card.updated_at)} 수정
        </p>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2Icon />
          카드 삭제
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="카드를 삭제할까요?"
        description={`'${card.title}' 카드가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={() => {
          onClose()
          deleteCard.mutate(card.id)
        }}
      />
    </>
  )
}
