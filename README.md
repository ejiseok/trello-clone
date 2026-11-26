# Trello Clone

Trello처럼 생긴 팀 협업 칸반 보드 웹 앱이다. 한성대학교 클라우드 컴퓨팅(2026-2) 학기 프로젝트로 만들었다.

- **Frontend**: React + TypeScript + Vite, TanStack Query, shadcn/ui, dnd-kit
- **Backend**: Python 3.12 + FastAPI, SQLAlchemy 2.0 + Alembic
- **DB**: MySQL 8

이 문서는 **로컬 개발 환경에서 실행하는 방법**을 다룬다. EC2 배포 절차는 `deploy/README.md`에 정리할 예정이다.

---

## 1. 사전 준비

| 도구 | 버전 | 확인 명령 |
|---|---|---|
| Python | 3.12 이상 | `python3 --version` |
| [uv](https://docs.astral.sh/uv/) | 최신 | `uv --version` |
| Node.js / npm | Node 20 이상 권장 | `node --version` |
| MySQL | 8.x (로컬 실행 중) | `mysql --version` |

---

## 2. MySQL 데이터베이스 준비 (최초 1회)

MySQL에 root(또는 관리자 계정)로 접속해서 아래 SQL을 실행한다. `<비밀번호>`는 직접 정한다.

```sql
CREATE DATABASE IF NOT EXISTS trello
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS trello_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'trello'@'localhost' IDENTIFIED BY '<비밀번호>';
CREATE USER IF NOT EXISTS 'trello'@'127.0.0.1' IDENTIFIED BY '<비밀번호>';

GRANT ALL PRIVILEGES ON trello.*      TO 'trello'@'localhost', 'trello'@'127.0.0.1';
GRANT ALL PRIVILEGES ON trello_test.* TO 'trello'@'localhost', 'trello'@'127.0.0.1';
FLUSH PRIVILEGES;
```

- `trello`: 개발용 DB
- `trello_test`: 테스트 전용 DB (pytest만 사용)

---

## 3. 백엔드 실행

### 3-1. 환경변수 파일 작성 (최초 1회)

```bash
cd backend
cp .env.example .env
```

`backend/.env`를 열어서 값을 채운다.

```dotenv
DATABASE_URL=mysql+pymysql://trello:<비밀번호>@127.0.0.1:3306/trello?charset=utf8mb4
TEST_DATABASE_URL=mysql+pymysql://trello:<비밀번호>@127.0.0.1:3306/trello_test?charset=utf8mb4
JWT_SECRET_KEY=<임의의 긴 문자열>
JWT_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

`JWT_SECRET_KEY`는 다음 명령으로 만들 수 있다.

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

> `.env`는 `.gitignore`에 들어 있다. 커밋하지 않는다.

### 3-2. 의존성 설치 및 DB 마이그레이션

```bash
cd backend
uv sync                      # .venv 생성 + 패키지 설치
uv run alembic upgrade head  # 개발 DB(trello)에 테이블 생성
```

### 3-3. 개발 서버 실행

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

- API 문서 (Swagger UI): <http://localhost:8000/api/docs>
- 헬스체크: <http://localhost:8000/api/health> → `{"status":"ok","database":"ok"}`

---

## 4. 프론트엔드 실행

새 터미널을 열고 실행한다. 백엔드가 먼저 켜져 있어야 한다.

```bash
cd frontend
npm install   # 최초 1회
npm run dev
```

- 접속: <http://localhost:5173>
- 개발 서버가 `/api` 요청을 `http://127.0.0.1:8000`으로 프록시한다.
  백엔드 주소를 바꾸려면 `frontend/.env`에 `VITE_API_PROXY_TARGET`을 지정한다 (`frontend/.env.example` 참고).

회원가입 → 로그인 → 보드 만들기 순서로 사용해 보면 된다.

---

## 5. 테스트 · 린트 · 빌드

### 백엔드

```bash
cd backend
uv run pytest                                # trello_test DB만 사용
uv run ruff check . && uv run ruff format .  # 린트 + 포맷
```

- 테스트는 시작할 때 `trello_test`에 Alembic 마이그레이션을 적용하고, 테스트마다 테이블을 비운다.
- `TEST_DATABASE_URL`의 DB 이름에 `test`가 없으면 개발 DB를 보호하기 위해 테스트가 바로 중단된다.

### 프론트엔드

```bash
cd frontend
npm run lint    # ESLint
npm run build   # 타입 체크(tsc -b) + 프로덕션 빌드 → dist/
npm run preview # 빌드 결과 미리보기
```

---

## 6. 자주 겪는 문제

| 증상 | 확인할 것 |
|---|---|
| `uvicorn` 시작 시 `database_url` / `jwt_secret_key` 관련 검증 에러 | `backend/.env`가 있고 값이 채워져 있는지 |
| `/api/health`가 503 | MySQL이 실행 중인지, `.env`의 계정·비밀번호·DB 이름이 맞는지 |
| `Access denied for user 'trello'` | 2절 SQL의 `GRANT`가 적용됐는지 (`SHOW GRANTS FOR 'trello'@'localhost';`) |
| `Table ... doesn't exist` | `uv run alembic upgrade head`를 실행했는지 |
| 프론트에서 API 호출이 실패 (502 / 연결 거부) | 백엔드가 8000번 포트에서 실행 중인지 |
| `pytest`가 바로 종료됨 | `TEST_DATABASE_URL`이 설정돼 있고 DB 이름에 `test`가 들어 있는지 |

---

## 7. 디렉터리 구조

```
trello-clone/
├── backend/    # FastAPI 앱 (app/), Alembic 마이그레이션 (alembic/), 테스트 (tests/)
├── frontend/   # React + Vite 앱 (src/)
├── deploy/     # Nginx · systemd · MySQL 배포 설정 (작성 예정)
└── report/     # 제출용 보고서
```

더 자세한 설계(데이터 모델, API 목록, 규칙)는 `CLAUDE.md`를 참고한다.
