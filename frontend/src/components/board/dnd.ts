// dnd-kit에서 리스트와 카드의 id가 겹치지 않도록 접두사를 붙인다
export type DndItemData =
  | { type: 'list'; listId: number }
  | { type: 'card'; cardId: number; listId: number }

export const listDndId = (id: number) => `list-${id}`
export const cardDndId = (id: number) => `card-${id}`
