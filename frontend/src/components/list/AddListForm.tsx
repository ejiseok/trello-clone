import { PlusIcon, XIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AddListForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const close = () => {
    setOpen(false)
    setTitle('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = title.trim()
    if (!value) return
    onAdd(value)
    setTitle('')
  }

  return (
    <div className="w-72 shrink-0">
      {open ? (
        <form onSubmit={submit} className="space-y-2 rounded-xl bg-muted p-2">
          <Input
            autoFocus
            maxLength={200}
            value={title}
            placeholder="리스트 이름을 입력하세요"
            aria-label="새 리스트 이름"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && close()}
            onBlur={() => !title.trim() && close()}
            className="bg-background"
          />
          <div className="flex items-center gap-1">
            <Button type="submit" size="sm" disabled={!title.trim()}>
              리스트 추가
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="취소" onClick={close}>
              <XIcon />
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="h-10 w-full justify-start border-dashed bg-background/60"
          onClick={() => setOpen(true)}
        >
          <PlusIcon />
          리스트 추가
        </Button>
      )}
    </div>
  )
}
