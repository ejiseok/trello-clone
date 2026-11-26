// 백엔드 응답 스키마 (backend/app/schemas)와 맞춘 타입

export type Role = 'owner' | 'member'

export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface BoardSummary {
  id: number
  title: string
  owner_id: number
  role: Role
  created_at: string
  updated_at: string
}

export interface Member {
  user_id: number
  email: string
  name: string
  role: Role
  joined_at: string
}

export interface Card {
  id: number
  list_id: number
  title: string
  description: string | null
  /** YYYY-MM-DD */
  due_date: string | null
  assignee_id: number | null
  position: number
  created_at: string
  updated_at: string
}

export interface BoardList {
  id: number
  board_id: number
  title: string
  position: number
  cards: Card[]
}

export interface BoardDetail extends BoardSummary {
  lists: BoardList[]
  members: Member[]
}

export interface CardPatch {
  title?: string
  description?: string | null
  due_date?: string | null
  assignee_id?: number | null
}
