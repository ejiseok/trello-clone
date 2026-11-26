from dataclasses import dataclass

from app.services.position import GAP, needs_rebalance, position_after, rebalance_if_needed


@dataclass
class Item:
    position: float


def test_position_after() -> None:
    assert position_after(None) == GAP
    assert position_after(2048.0) == 2048.0 + GAP


def test_rebalance_keeps_order_when_gap_too_small() -> None:
    items = [Item(1.0), Item(1.0 + 1e-9), Item(5.0)]
    assert needs_rebalance(items)
    assert rebalance_if_needed(items)
    assert [i.position for i in items] == [GAP, 2 * GAP, 3 * GAP]


def test_no_rebalance_when_gaps_are_fine() -> None:
    items = [Item(1024.0), Item(1536.0), Item(2048.0)]
    assert not rebalance_if_needed(items)
    assert [i.position for i in items] == [1024.0, 1536.0, 2048.0]
