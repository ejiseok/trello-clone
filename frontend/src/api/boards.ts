import { apiFetch } from '@/api/client'
import type {
  BoardDetail,
  BoardList,
  BoardSummary,
  Card,
  CardPatch,
  Member,
} from '@/api/types'

export const boardsApi = {
  list: () => apiFetch<BoardSummary[]>('/boards'),
  get: (boardId: number, signal?: AbortSignal) =>
    apiFetch<BoardDetail>(`/boards/${boardId}`, { signal }),
  create: (title: string) => apiFetch<BoardSummary>('/boards', { method: 'POST', body: { title } }),
  rename: (boardId: number, title: string) =>
    apiFetch<BoardSummary>(`/boards/${boardId}`, { method: 'PATCH', body: { title } }),
  remove: (boardId: number) => apiFetch<void>(`/boards/${boardId}`, { method: 'DELETE' }),
}

export const membersApi = {
  list: (boardId: number) => apiFetch<Member[]>(`/boards/${boardId}/members`),
  add: (boardId: number, email: string) =>
    apiFetch<Member>(`/boards/${boardId}/members`, { method: 'POST', body: { email } }),
  remove: (boardId: number, userId: number) =>
    apiFetch<void>(`/boards/${boardId}/members/${userId}`, { method: 'DELETE' }),
}

export const listsApi = {
  create: (boardId: number, title: string) =>
    apiFetch<BoardList>(`/boards/${boardId}/lists`, { method: 'POST', body: { title } }),
  update: (listId: number, patch: { title?: string; position?: number }) =>
    apiFetch<BoardList>(`/lists/${listId}`, { method: 'PATCH', body: patch }),
  remove: (listId: number) => apiFetch<void>(`/lists/${listId}`, { method: 'DELETE' }),
}

export const cardsApi = {
  create: (listId: number, title: string) =>
    apiFetch<Card>(`/lists/${listId}/cards`, { method: 'POST', body: { title } }),
  update: (cardId: number, patch: CardPatch) =>
    apiFetch<Card>(`/cards/${cardId}`, { method: 'PATCH', body: patch }),
  move: (cardId: number, listId: number, position: number) =>
    apiFetch<Card>(`/cards/${cardId}/move`, {
      method: 'PATCH',
      body: { list_id: listId, position },
    }),
  remove: (cardId: number) => apiFetch<void>(`/cards/${cardId}`, { method: 'DELETE' }),
}
