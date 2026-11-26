from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders


def create_board(client: TestClient, headers: AuthHeaders, title: str = "프로젝트") -> dict:
    res = client.post("/api/boards", json={"title": title}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def add_member(client: TestClient, owner: AuthHeaders, board_id: int, email: str) -> dict:
    res = client.post(f"/api/boards/{board_id}/members", json={"email": email}, headers=owner)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_and_list_boards(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice, "  알파 보드 🚀 ")
    assert board["title"] == "알파 보드 🚀"  # 공백 제거, 이모지 저장
    assert board["role"] == "owner"
    assert board["created_at"].endswith(("Z", "+00:00"))  # UTC 명시
    create_board(client, bob, "밥의 보드")

    res = client.get("/api/boards", headers=alice)
    assert res.status_code == 200
    assert [b["title"] for b in res.json()] == ["알파 보드 🚀"]


def test_boards_require_login(client: TestClient) -> None:
    assert client.get("/api/boards").status_code == 401
    assert client.post("/api/boards", json={"title": "x"}).status_code == 401


def test_create_board_validation(client: TestClient, alice: AuthHeaders) -> None:
    assert client.post("/api/boards", json={"title": "  "}, headers=alice).status_code == 422
    assert client.post("/api/boards", json={"title": "x" * 201}, headers=alice).status_code == 422


def test_board_detail_contains_owner_member(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    res = client.get(f"/api/boards/{board['id']}", headers=alice)
    assert res.status_code == 200
    detail = res.json()
    assert detail["lists"] == []
    assert [(m["email"], m["role"]) for m in detail["members"]] == [("alice@example.com", "owner")]


def test_non_member_gets_404(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice)
    url = f"/api/boards/{board['id']}"
    assert client.get(url, headers=bob).status_code == 404
    assert client.patch(url, json={"title": "해킹"}, headers=bob).status_code == 404
    assert client.delete(url, headers=bob).status_code == 404
    assert client.get(f"{url}/members", headers=bob).status_code == 404
    # 존재하지 않는 보드도 같은 응답
    assert client.get("/api/boards/999999", headers=bob).status_code == 404


def test_member_can_rename_but_not_delete(
    client: TestClient, alice: AuthHeaders, bob: AuthHeaders
) -> None:
    board = create_board(client, alice)
    add_member(client, alice, board["id"], "bob@example.com")
    url = f"/api/boards/{board['id']}"

    res = client.patch(url, json={"title": "새 이름"}, headers=bob)
    assert res.status_code == 200
    assert res.json()["title"] == "새 이름"
    assert res.json()["role"] == "member"

    assert client.delete(url, headers=bob).status_code == 403
    assert client.get(url, headers=bob).status_code == 200


def test_owner_deletes_board_with_cascade(client: TestClient, alice: AuthHeaders) -> None:
    board = create_board(client, alice)
    lst = client.post(
        f"/api/boards/{board['id']}/lists", json={"title": "할 일"}, headers=alice
    ).json()
    card = client.post(f"/api/lists/{lst['id']}/cards", json={"title": "카드"}, headers=alice)
    assert card.status_code == 201

    assert client.delete(f"/api/boards/{board['id']}", headers=alice).status_code == 204
    assert client.get(f"/api/boards/{board['id']}", headers=alice).status_code == 404
    assert client.get("/api/boards", headers=alice).json() == []
    # 하위 리스트/카드도 삭제됨
    patch = client.patch(f"/api/lists/{lst['id']}", json={"title": "x"}, headers=alice)
    assert patch.status_code == 404
    res = client.patch(f"/api/cards/{card.json()['id']}", json={"title": "x"}, headers=alice)
    assert res.status_code == 404
