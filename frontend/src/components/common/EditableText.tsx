import { useState, type KeyboardEvent } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface EditableTextProps {
  value: string
  onSave: (value: string) => void
  ariaLabel: string
  maxLength?: number
  className?: string
  inputClassName?: string
}

/** 클릭하면 입력창으로 바뀌는 제목. Enter/포커스 해제 시 저장, Esc 시 취소. */
export function EditableText({
  value,
  onSave,
  ariaLabel,
  maxLength = 200,
  className,
  inputClassName,
}: EditableTextProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const next = draft.trim()
    if (next && next !== value) onSave(next)
    setDraft(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setDraft(null)
    }
  }

  if (draft !== null) {
    return (
      <Input
        autoFocus
        aria-label={ariaLabel}
        value={draft}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className={cn('h-8 font-semibold', inputClassName)}
      />
    )
  }

  return (
    <button
      type="button"
      title="클릭해서 이름 변경"
      aria-label={`${ariaLabel}: ${value}`}
      onClick={() => setDraft(value)}
      className={cn(
        'min-w-0 truncate rounded-md px-2 py-1 text-left font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      {value}
    </button>
  )
}
