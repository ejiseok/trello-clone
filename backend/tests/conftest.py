"""테스트 공통 설정.

- 반드시 TEST_DATABASE_URL(MySQL)로만 접속한다. 개발 DB(DATABASE_URL)에는 접속하지 않는다.
- DB 이름에 'test'가 없으면 테스트를 즉시 중단한다 (개발 DB를 지우는 사고 방지).
- 세션 시작 시 Alembic 마이그레이션을 적용하고, 테스트마다 모든 테이블을 비운다.
"""

import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

from app.core.config import Settings

_test_url = Settings().test_database_url  # type: ignore[call-arg]
if not _test_url:
    pytest.exit("TEST_DATABASE_URL이 설정되지 않았습니다. backend/.env를 확인하세요.", returncode=1)
_test_db_name = make_url(_test_url).database or ""
if "test" not in _test_db_name:
    pytest.exit(
        f"테스트 DB 이름에 'test'가 없습니다: {_test_db_name!r}. 개발 DB 보호를 위해 중단합니다.",
        returncode=1,
    )

# 앱 코드(engine 생성 포함)를 import 하기 전에 DATABASE_URL을 테스트 DB로 바꿔치기한다
os.environ["DATABASE_URL"] = _test_url

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from alembic import command  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

assert engine.url.database == _test_db_name, "테스트 엔진이 테스트 DB를 가리키지 않습니다."

BACKEND_DIR = Path(__file__).resolve().parents[1]
# 자식 → 부모 순서
TABLES = ["cards", "lists", "board_members", "boards", "users"]


@pytest.fixture(scope="session", autouse=True)
def _migrate() -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.attributes["configure_logger"] = False
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def _clean_tables() -> Iterator[None]:
    yield
    with engine.begin() as conn:
        for table in TABLES:
            conn.execute(text(f"DELETE FROM {table}"))


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


AuthHeaders = dict[str, str]


@pytest.fixture
def make_user(client: TestClient) -> Callable[..., AuthHeaders]:
    """회원가입 + 로그인 후 Authorization 헤더를 돌려준다."""

    def _make(email: str, name: str | None = None, password: str = "password123") -> AuthHeaders:
        res = client.post(
            "/api/auth/signup",
            json={"email": email, "name": name or email.split("@")[0], "password": password},
        )
        assert res.status_code == 201, res.text
        res = client.post("/api/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, res.text
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    return _make


@pytest.fixture
def alice(make_user: Callable[..., AuthHeaders]) -> AuthHeaders:
    return make_user("alice@example.com", "앨리스")


@pytest.fixture
def bob(make_user: Callable[..., AuthHeaders]) -> AuthHeaders:
    return make_user("bob@example.com", "밥")


@pytest.fixture
def carol(make_user: Callable[..., AuthHeaders]) -> AuthHeaders:
    return make_user("carol@example.com", "캐럴")
