// fractional indexing 위치 계산 (backend/app/services/position.py 와 같은 규칙)
export const GAP = 1024

/** prev와 next 사이에 들어갈 position. 둘 다 없으면 첫 항목. */
export function positionBetween(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return GAP
  if (prev === undefined) return (next as number) - GAP // 맨 앞
  if (next === undefined) return prev + GAP // 맨 끝
  return (prev + next) / 2
}

/** 정렬된 배열에서 index 위치에 놓일 항목의 position (자기 자신은 제외된 배열 기준) */
export function positionAt<T extends { position: number }>(others: T[], index: number): number {
  return positionBetween(others[index - 1]?.position, others[index]?.position)
}

export function byPosition<T extends { position: number }>(a: T, b: T): number {
  return a.position - b.position
}
