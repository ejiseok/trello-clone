import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cardsApi, listsApi, membersApi } from '@/api/boards'
import { boardsApi } from '@/api/boards'
import { getErrorMessage } from '@/api/client'
import type { BoardDetail, BoardList, Card, CardPatch } from '@/api/types'
import { queryKeys } from '@/hooks/queryKeys'
import { byPosition } from '@/lib/position'

export function useBoard(boardId: number) {
  return useQuery({
    queryKey: queryKeys.board(boardId),
    queryFn: ({ signal }) => boardsApi.get(boardId, signal),
    enabled: Number.isFinite(boardId),
  })
}

// ---------- 캐시 갱신 유틸 ----------

function mapLists(board: BoardDetail, fn: (list: BoardList) => BoardList): BoardDetail {
  return { ...board, lists: board.lists.map(fn) }
}

function mapCard(board: BoardDetail, cardId: number, fn: (card: Card) => Card): BoardDetail {
  return mapLists(board, (list) =>
    list.cards.some((c) => c.id === cardId)
      ? { ...list, cards: list.cards.map((c) => (c.id === cardId ? fn(c) : c)) }
      : list,
  )
}

/**
 * 보드 상세 캐시를 낙관적으로 갱신하는 mutation.
 * - onMutate: 진행 중인 조회 취소 → 스냅샷 저장 → 캐시 즉시 갱신
 * - onError: 스냅샷으로 롤백 + 에러 토스트
 * - onSettled: 같은 보드의 다른 mutation이 없을 때만 서버 데이터로 다시 맞춘다
 *   (연속 드래그 중 중간 결과로 화면이 되돌아가는 깜빡임 방지)
 */
function useOptimisticBoardMutation<TVars, TData>(
  boardId: number,
  options: {
    mutationFn: (vars: TVars) => Promise<TData>
    optimistic?: (board: BoardDetail, vars: TVars) => BoardDetail
    onSuccess?: (board: BoardDetail, data: TData, vars: TVars) => BoardDetail
    errorMessage: string
  },
) {
  const qc = useQueryClient()
  const key = queryKeys.board(boardId)
  const mutationKey = ['board-mutation', boardId]

  return useMutation({
    mutationKey,
    mutationFn: options.mutationFn,
    onMutate: async (vars: TVars) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<BoardDetail>(key)
      if (previous && options.optimistic) {
        qc.setQueryData<BoardDetail>(key, options.optimistic(previous, vars))
      }
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
      toast.error(options.errorMessage, { description: getErrorMessage(err) })
    },
    onSuccess: (data, vars) => {
      if (options.onSuccess) {
        qc.setQueryData<BoardDetail>(key, (board) =>
          board ? options.onSuccess!(board, data, vars) : board,
        )
      }
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey }) === 1) {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}

// ---------- 리스트 ----------

export function useCreateList(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: (title: string) => listsApi.create(boardId, title),
    onSuccess: (board, list) => ({ ...board, lists: [...board.lists, list].sort(byPosition) }),
    errorMessage: '리스트를 추가하지 못했습니다.',
  })
}

export function useUpdateList(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: ({ listId, ...patch }: { listId: number; title?: string; position?: number }) =>
      listsApi.update(listId, patch),
    optimistic: (board, { listId, ...patch }) => ({
      ...board,
      lists: board.lists
        .map((l) => (l.id === listId ? { ...l, ...patch } : l))
        .sort(byPosition),
    }),
    errorMessage: '리스트를 수정하지 못했습니다.',
  })
}

export function useDeleteList(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: (listId: number) => listsApi.remove(listId),
    optimistic: (board, listId) => ({
      ...board,
      lists: board.lists.filter((l) => l.id !== listId),
    }),
    errorMessage: '리스트를 삭제하지 못했습니다.',
  })
}

// ---------- 카드 ----------

export function useCreateCard(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: ({ listId, title }: { listId: number; title: string }) =>
      cardsApi.create(listId, title),
    onSuccess: (board, card) =>
      mapLists(board, (list) =>
        list.id === card.list_id ? { ...list, cards: [...list.cards, card] } : list,
      ),
    errorMessage: '카드를 추가하지 못했습니다.',
  })
}

export function useUpdateCard(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: ({ cardId, patch }: { cardId: number; patch: CardPatch }) =>
      cardsApi.update(cardId, patch),
    optimistic: (board, { cardId, patch }) => mapCard(board, cardId, (c) => ({ ...c, ...patch })),
    onSuccess: (board, card) => mapCard(board, card.id, () => card),
    errorMessage: '카드를 수정하지 못했습니다.',
  })
}

export function useMoveCard(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: ({ cardId, listId, position }: { cardId: number; listId: number; position: number }) =>
      cardsApi.move(cardId, listId, position),
    optimistic: (board, { cardId, listId, position }) => {
      const card = board.lists.flatMap((l) => l.cards).find((c) => c.id === cardId)
      if (!card) return board
      const moved = { ...card, list_id: listId, position }
      return mapLists(board, (list) => {
        const cards = list.cards.filter((c) => c.id !== cardId)
        if (list.id === listId) cards.push(moved)
        return { ...list, cards: cards.sort(byPosition) }
      })
    },
    errorMessage: '카드를 옮기지 못했습니다.',
  })
}

export function useDeleteCard(boardId: number) {
  return useOptimisticBoardMutation(boardId, {
    mutationFn: (cardId: number) => cardsApi.remove(cardId),
    optimistic: (board, cardId) =>
      mapLists(board, (list) => ({ ...list, cards: list.cards.filter((c) => c.id !== cardId) })),
    errorMessage: '카드를 삭제하지 못했습니다.',
  })
}

// ---------- 멤버 ----------

export function useAddMember(boardId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => membersApi.add(boardId, email),
    onSuccess: (member) => {
      qc.setQueryData<BoardDetail>(queryKeys.board(boardId), (board) =>
        board ? { ...board, members: [...board.members, member] } : board,
      )
    },
  })
}

export function useRemoveMember(boardId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => membersApi.remove(boardId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.board(boardId) }),
    onError: (err) => toast.error('멤버를 제거하지 못했습니다.', { description: getErrorMessage(err) }),
  })
}
