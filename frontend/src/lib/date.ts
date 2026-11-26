import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

/** 'YYYY-MM-DD' (로컬 기준 오늘) */
export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** 'YYYY-MM-DD' 를 로컬 자정 Date로 */
export function fromDateString(value: string): Date {
  return parseISO(value)
}

export type DueStatus = 'overdue' | 'today' | 'upcoming'

export function dueStatus(due: string): DueStatus {
  const today = todayString()
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return 'upcoming'
}

export function formatDue(due: string): string {
  const date = parseISO(due)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return format(date, sameYear ? 'M월 d일' : 'yyyy년 M월 d일', { locale: ko })
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'yyyy년 M월 d일 HH:mm', { locale: ko })
}
