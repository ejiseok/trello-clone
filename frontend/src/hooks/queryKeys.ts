export const queryKeys = {
  me: ['me'] as const,
  boards: ['boards'] as const,
  board: (boardId: number) => ['board', boardId] as const,
}
