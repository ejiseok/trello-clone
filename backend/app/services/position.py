"""fractional indexing 기반 정렬 위치 계산.

규칙 (프론트엔드 src/lib/position.ts 와 동일):
- 맨 끝에 추가: 마지막 position + GAP
- 맨 앞에 추가: 첫 position - GAP
- 두 항목 사이: (앞 + 뒤) / 2
- 인접 항목 간격이 MIN_GAP 보다 작아지면 전체를 GAP 간격으로 다시 매긴다.
"""

from collections.abc import Sequence
from typing import Protocol

GAP = 1024.0
MIN_GAP = 1e-6


class Positioned(Protocol):
    position: float


def position_after(last: float | None) -> float:
    return GAP if last is None else last + GAP


def needs_rebalance(items: Sequence[Positioned]) -> bool:
    positions = sorted(item.position for item in items)
    return any(b - a < MIN_GAP for a, b in zip(positions, positions[1:], strict=False))


def rebalance(items: Sequence[Positioned]) -> None:
    """현재 순서를 유지하면서 position을 GAP, 2*GAP, ... 로 다시 매긴다."""
    for index, item in enumerate(sorted(items, key=lambda i: i.position), start=1):
        item.position = index * GAP


def rebalance_if_needed(items: Sequence[Positioned]) -> bool:
    if needs_rebalance(items):
        rebalance(items)
        return True
    return False
