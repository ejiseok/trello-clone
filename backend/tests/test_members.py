from fastapi.testclient import TestClient

from tests.conftest import AuthHeaders
from tests.test_boards import add_member, create_board


def user_id(client: TestClient, headers: AuthHeaders) -> int:
    return client.get("/api/auth/me", headers=headers).json()["id"]


def test_invite_and_list_members(client: TestClient, alice: AuthHeaders, bob: AuthHeaders) -> None:
    board = create_board(client, alice)
    member = add_member(client, alice, board["id"], "BOB@example.com")
    assert member["email"] == "bob@example.com"
    assert member["role"] == "member"

    res = client.get(f"/api/boards/{board['id']}/members", headers=bob)
    assert res.status_code == 200
    assert [m["email"] for m in res.json()] == ["alice@example.com", "bob@example.com"]

    # 초대된 사용자의 보드 목록에도 나타난다
    boards = client.get("/api/boards", headers=bob).json()
    assert [(b["id"], b["role"]) for b in boards] == [(board["id"], "member")]


def test_invite_errors(
    client: TestClient, alice: AuthHeaders, bob: AuthHeaders, carol: AuthHeaders
) -> None:
    board = create_board(client, alice)
    url = f"/api/boards/{board['id']}/members"

    res = client.post(url, json={"email": "nobody@example.com"}, headers=alice)
    assert res.status_code == 404
    assert res.json()["detail"] == "해당 이메일로 가입된 사용자가 없습니다."

    add_member(client, alice, board["id"], "bob@example.com")
    assert client.post(url, json={"email": "bob@example.com"}, headers=alice).status_code == 409
    assert client.post(url, json={"email": "alice@example.com"}, headers=alice).status_code == 409

    # 일반 멤버는 초대 불가(403), 비멤버는 404
    assert client.post(url, json={"email": "carol@example.com"}, headers=bob).status_code == 403
    assert client.post(url, json={"email": "carol@example.com"}, headers=carol).status_code == 404


def test_remove_member(
    client: TestClient, alice: AuthHeaders, bob: AuthHeaders, carol: AuthHeaders
) -> None:
    board = create_board(client, alice)
    add_member(client, alice, board["id"], "bob@example.com")
    add_member(client, alice, board["id"], "carol@example.com")
    bob_id, carol_id, alice_id = (user_id(client, h) for h in (bob, carol, alice))
    url = f"/api/boards/{board['id']}/members"

    # 일반 멤버는 제거 불가
    assert client.delete(f"{url}/{carol_id}", headers=bob).status_code == 403
    # owner 자신은 제거 불가
    assert client.delete(f"{url}/{alice_id}", headers=alice).status_code == 400
    # 멤버가 아닌 사용자
    assert client.delete(f"{url}/999999", headers=alice).status_code == 404

    # bob이 담당자인 카드
    lst = client.post(f"/api/boards/{board['id']}/lists", json={"title": "L"}, headers=alice)
    card = client.post(f"/api/lists/{lst.json()['id']}/cards", json={"title": "C"}, headers=alice)
    card_id = card.json()["id"]
    res = client.patch(f"/api/cards/{card_id}", json={"assignee_id": bob_id}, headers=alice)
    assert res.json()["assignee_id"] == bob_id

    assert client.delete(f"{url}/{bob_id}", headers=alice).status_code == 204
    # 제거된 멤버는 보드에 접근할 수 없고, 담당자 지정도 해제된다
    assert client.get(f"/api/boards/{board['id']}", headers=bob).status_code == 404
    detail = client.get(f"/api/boards/{board['id']}", headers=alice).json()
    assert detail["lists"][0]["cards"][0]["assignee_id"] is None
    assert [m["email"] for m in detail["members"]] == ["alice@example.com", "carol@example.com"]
