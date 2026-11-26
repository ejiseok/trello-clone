from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders
from tests.test_boards import add_member, create_board
from tests.test_members import user_id


def create_list(client: TestClient, headers: AuthHeaders, board_id: int, title: str) -> dict:
    res = client.post(f"/api/boards/{board_id}/lists", json={"title": title}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def create_card(client: TestClient, headers: AuthHeaders, list_id: int, title: str) -> dict:
    res = client.post(f"/api/lists/{list_id}/cards", json={"title": title}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def board_detail(client: TestClient, headers: AuthHeaders, board_id: int) -> dict:
    res = client.get(f"/api/boards/{board_id}", headers=headers)
    assert res.status_code == 200
    return res.json()


def list_titles(detail: dict) -> list[str]:
    return [lst["title"] for lst in detail["lists"]]


def card_titles(detail: dict) -> list[list[str]]:
    return [[c["title"] for c in lst["cards"]] for lst in detail["lists"]]


# ---------------- 리스트 ----------------


def test_list_crud_and_reorder(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    a = create_list(client, alice, board["id"], "할 일")
    b = create_list(client, alice, board["id"], "진행 중")
    c = create_list(client, alice, board["id"], "완료")
    assert [a["position"], b["position"], c["position"]] == [1024.0, 2048.0, 3072.0]
    assert a["cards"] == []

    res = client.patch(f"/api/lists/{a['id']}", json={"title": "백로그"}, headers=alice)
    assert res.status_code == 200 and res.json()["title"] == "백로그"

    # '완료'를 맨 앞으로, '백로그'를 진행 중과 완료 사이로
    client.patch(f"/api/lists/{c['id']}", json={"position": 512.0}, headers=alice)
    client.patch(f"/api/lists/{a['id']}", json={"position": 2560.0}, headers=alice)
    assert list_titles(board_detail(client, alice, board["id"])) == ["완료", "진행 중", "백로그"]

    assert client.delete(f"/api/lists/{b['id']}", headers=alice).status_code == 204
    assert list_titles(board_detail(client, alice, board["id"])) == ["완료", "백로그"]


def test_list_validation(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = create_list(client, alice, board["id"], "L")
    url = f"/api/lists/{lst['id']}"
    assert client.patch(url, json={"title": None}, headers=alice).status_code == 400
    assert client.patch(url, json={"title": ""}, headers=alice).status_code == 422
    assert client.patch(url, json={"position": "abc"}, headers=alice).status_code == 422


def test_list_rebalance_when_gap_too_small(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    a = create_list(client, alice, board["id"], "A")
    b = create_list(client, alice, board["id"], "B")
    # B를 A 바로 뒤(간격 < 1e-6)로 이동 → 전체 position 재배치
    client.patch(f"/api/lists/{b['id']}", json={"position": a["position"] + 1e-9}, headers=alice)
    detail = board_detail(client, alice, board["id"])
    assert list_titles(detail) == ["A", "B"]
    assert [lst["position"] for lst in detail["lists"]] == [1024.0, 2048.0]


def test_list_permissions(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = create_list(client, alice, board["id"], "L")
    res = client.post(f"/api/boards/{board['id']}/lists", json={"title": "x"}, headers=bob)
    assert res.status_code == 404
    assert (
        client.patch(f"/api/lists/{lst['id']}", json={"title": "x"}, headers=bob).status_code == 404
    )
    assert client.delete(f"/api/lists/{lst['id']}", headers=bob).status_code == 404

    # 멤버가 되면 가능
    add_member(client, alice, board["id"], "bob@example.com")
    assert (
        client.patch(f"/api/lists/{lst['id']}", json={"title": "y"}, headers=bob).status_code == 200
    )


# ---------------- 카드 ----------------


def test_card_create_and_update(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice)
    add_member(client, alice, board["id"], "bob@example.com")
    lst = create_list(client, alice, board["id"], "L")
    card = create_card(client, alice, lst["id"], "  첫 카드 ")
    assert card["title"] == "첫 카드"
    assert card["position"] == 1024.0
    assert card["description"] is None and card["due_date"] is None
    assert create_card(client, alice, lst["id"], "둘째")["position"] == 2048.0

    bob_id = user_id(client, bob)
    url = f"/api/cards/{card['id']}"
    res = client.patch(
        url,
        json={"description": "설명 ✍️", "due_date": "2026-12-01", "assignee_id": bob_id},
        headers=alice,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["description"] == "설명 ✍️"
    assert body["due_date"] == "2026-12-01"
    assert body["assignee_id"] == bob_id
    assert body["title"] == "첫 카드"  # 보내지 않은 필드는 유지

    # null로 비우기
    res = client.patch(url, json={"due_date": None, "assignee_id": None}, headers=alice)
    assert res.json()["due_date"] is None and res.json()["assignee_id"] is None
    assert res.json()["description"] == "설명 ✍️"


def test_card_validation(client: TestClient, alice: AuthHeaders, carol: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = create_list(client, alice, board["id"], "L")
    card = create_card(client, alice, lst["id"], "C")
    url = f"/api/cards/{card['id']}"

    # 보드 멤버가 아닌 사용자를 담당자로 지정할 수 없다
    res = client.patch(url, json={"assignee_id": user_id(client, carol)}, headers=alice)
    assert res.status_code == 400
    assert res.json()["detail"] == "담당자는 보드 멤버여야 합니다."
    assert client.patch(url, json={"title": None}, headers=alice).status_code == 400
    assert client.patch(url, json={"due_date": "not-a-date"}, headers=alice).status_code == 422
    res = client.post(f"/api/lists/{lst['id']}/cards", json={"title": ""}, headers=alice)
    assert res.status_code == 422


def test_card_move_within_and_across_lists(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    todo = create_list(client, alice, board["id"], "할 일")
    done = create_list(client, alice, board["id"], "완료")
    c1 = create_card(client, alice, todo["id"], "c1")
    create_card(client, alice, todo["id"], "c2")
    c3 = create_card(client, alice, todo["id"], "c3")
    d1 = create_card(client, alice, done["id"], "d1")

    # 같은 리스트: c3를 맨 앞으로
    res = client.patch(
        f"/api/cards/{c3['id']}/move",
        json={"list_id": todo["id"], "position": c1["position"] - 1024},
        headers=alice,
    )
    assert res.status_code == 200
    assert card_titles(board_detail(client, alice, board["id"])) == [["c3", "c1", "c2"], ["d1"]]

    # 다른 리스트: c1을 d1 앞으로
    res = client.patch(
        f"/api/cards/{c1['id']}/move",
        json={"list_id": done["id"], "position": d1["position"] / 2},
        headers=alice,
    )
    assert res.status_code == 200
    assert res.json()["list_id"] == done["id"]
    assert card_titles(board_detail(client, alice, board["id"])) == [["c3", "c2"], ["c1", "d1"]]


def test_card_move_rebalance(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = create_list(client, alice, board["id"], "L")
    a = create_card(client, alice, lst["id"], "a")
    create_card(client, alice, lst["id"], "b")
    c = create_card(client, alice, lst["id"], "c")
    client.patch(
        f"/api/cards/{c['id']}/move",
        json={"list_id": lst["id"], "position": a["position"] + 1e-9},
        headers=alice,
    )
    cards = board_detail(client, alice, board["id"])["lists"][0]["cards"]
    assert [x["title"] for x in cards] == ["a", "c", "b"]
    assert [x["position"] for x in cards] == [1024.0, 2048.0, 3072.0]


def test_card_cannot_move_to_other_board(client: TestClient, alice: AuthHeaders) -> None:
    board1 = create_board(client, alice, "B1")
    board2 = create_board(client, alice, "B2")
    l1 = create_list(client, alice, board1["id"], "L1")
    l2 = create_list(client, alice, board2["id"], "L2")
    card = create_card(client, alice, l1["id"], "c")
    res = client.patch(
        f"/api/cards/{card['id']}/move", json={"list_id": l2["id"], "position": 1}, headers=alice
    )
    assert res.status_code == 404
    res = client.patch(
        f"/api/cards/{card['id']}/move", json={"list_id": 999999, "position": 1}, headers=alice
    )
    assert res.status_code == 404


def test_card_permissions(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = create_list(client, alice, board["id"], "L")
    card = create_card(client, alice, lst["id"], "c")
    url = f"/api/cards/{card['id']}"

    assert (
        client.post(f"/api/lists/{lst['id']}/cards", json={"title": "x"}, headers=bob).status_code
        == 404
    )
    assert client.patch(url, json={"title": "x"}, headers=bob).status_code == 404
    res = client.patch(f"{url}/move", json={"list_id": lst["id"], "position": 1}, headers=bob)
    assert res.status_code == 404
    assert client.delete(url, headers=bob).status_code == 404

    assert client.delete(url, headers=alice).status_code == 204
    assert board_detail(client, alice, board["id"])["lists"][0]["cards"] == []
