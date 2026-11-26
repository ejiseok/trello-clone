from fastapi.testclient import TestClient


def signup(client: TestClient, email: str = "user@example.com", password: str = "password123"):
    return client.post(
        "/api/auth/signup", json={"email": email, "name": "사용자", "password": password}
    )


def test_health(client: TestClient) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "ok"}


def test_signup_and_login_and_me(client: TestClient) -> None:
    res = signup(client, "User@Example.com")
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "user@example.com"  # 소문자로 정규화
    assert body["name"] == "사용자"
    assert "password_hash" not in body and "password" not in body

    res = client.post(
        "/api/auth/login", json={"email": "USER@example.com", "password": "password123"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert res.json()["token_type"] == "bearer"

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "user@example.com"
    assert "password_hash" not in res.json()


def test_signup_duplicate_email(client: TestClient) -> None:
    assert signup(client, "dup@example.com").status_code == 201
    res = signup(client, "DUP@example.com")
    assert res.status_code == 409
    assert res.json()["detail"] == "이미 가입된 이메일입니다."


def test_signup_validation(client: TestClient) -> None:
    assert signup(client, password="short").status_code == 422
    assert signup(client, email="not-an-email").status_code == 422
    res = client.post(
        "/api/auth/signup",
        json={"email": "a@example.com", "name": "   ", "password": "password123"},
    )
    assert res.status_code == 422


def test_login_failures(client: TestClient) -> None:
    signup(client)
    res = client.post("/api/auth/login", json={"email": "user@example.com", "password": "wrong-pw"})
    assert res.status_code == 401
    res = client.post("/api/auth/login", json={"email": "none@example.com", "password": "x"})
    assert res.status_code == 401


def test_me_requires_valid_token(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res.status_code == 401
