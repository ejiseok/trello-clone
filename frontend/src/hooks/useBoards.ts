import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { boardsApi } from '@/api/boards'
import type { BoardDetail, BoardSummary } from '@/api/types'
import { queryKeys } from '@/hooks/queryKeys'

export function useBoards() {
  return useQuery({ queryKey: queryKeys.boards, queryFn: boardsApi.list })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => boardsApi.create(title),
    onSuccess: (board) => {
      qc.setQueryData<BoardSummary[]>(queryKeys.boards, (prev) => [board, ...(prev ?? [])])
    },
  })
}

export function useRenameBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, title }: { boardId: number; title: string }) =>
      boardsApi.rename(boardId, title),
    onSuccess: (board) => {
      qc.setQueryData<BoardSummary[]>(queryKeys.boards, (prev) =>
        prev?.map((b) => (b.id === board.id ? { ...b, ...board } : b)),
      )
      qc.setQueryData<BoardDetail>(queryKeys.board(board.id), (prev) =>
        prev ? { ...prev, title: board.title, updated_at: board.updated_at } : prev,
      )
    },
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (boardId: number) => boardsApi.remove(boardId),
    onSuccess: (_data, boardId) => {
      qc.setQueryData<BoardSummary[]>(queryKeys.boards, (prev) =>
        prev?.filter((b) => b.id !== boardId),
      )
      qc.removeQueries({ queryKey: queryKeys.board(boardId) })
    },
  })
}
