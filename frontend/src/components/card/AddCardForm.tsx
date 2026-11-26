import { PlusIcon, XIcon } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface AddCardFormProps {
  onAdd: (title: string) => void
}

/** 리스트 하단에서 제목만 입력해 카드를 빠르게 추가한다. 연속 입력 가능. */
export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const close = () => {
    setOpen(false)
    setTitle('')
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const value = title.trim()
    if (!value) return
    onAdd(value.slice(0, 200))
    setTitle('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        카드 추가
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        autoFocus
        rows={2}
        maxLength={200}
        value={title}
        placeholder="카드 제목을 입력하세요"
        aria-label="새 카드 제목"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => !title.trim() && close()}
        className="min-h-16 resize-none bg-background"
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" disabled={!title.trim()}>
          추가
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="취소" onClick={close}>
          <XIcon />
        </Button>
      </div>
    </form>
  )
}
