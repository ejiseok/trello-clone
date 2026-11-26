# CLAUDE.md — trello-clone

이 파일은 이 저장소에서 작업하는 Claude Code를 위한 프로젝트 지침이다. 작업을 시작하기 전에 반드시 읽고, 여기 적힌 범위·구조·규칙을 따른다.

---

## 1. 프로젝트 개요

- **무엇**: Trello 형식의 팀 협업 칸반 보드 웹 애플리케이션
- **배경**: 한성대학교 클라우드 컴퓨팅(2026-2) 학기 프로젝트. 웹 앱을 개발하고 **AWS EC2**에 배포하는 과제다. 배포할 때는 직접 만든 VPC를 사용한다.
- **일정**
  - 12/1(화): 발표 및 시연 (도메인 또는 IP로 접속해서 시연)
  - 12/15(화): e-class 제출 (zip 파일, `node_modules`/가상환경 제외, report 포함)
- **평가**: 앱의 난이도·완성도 50%(동료 평가) + 배포 방법 50%
- **원칙**: 기간이 짧다. **기능 수보다 완성도**가 중요하다. 아래 MVP를 끝까지 매끄럽게 동작시키는 것이 최우선이고, 확장 기능은 MVP가 끝난 뒤에만 손댄다.

---

## 2. 기술 스택

| 영역 | 선택 |
|---|---|
| Frontend | React + TypeScript + Vite |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query |
| UI / 디자인 시스템 | **shadcn/ui** + Tailwind CSS + lucide-react (아이콘) |
| 폼 | react-hook-form + zod (shadcn `Form` 컴포넌트와 함께 사용) |
| 알림 | shadcn `sonner` (토스트) |
| 드래그 앤 드롭 | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| HTTP | fetch 래퍼 또는 axios. 하나로 통일하고 `src/api/`에만 둔다 |
| Backend | Python 3.12 + FastAPI |
| DB | **MySQL 8** (개발·테스트·배포 모두) |
| ORM / 마이그레이션 | SQLAlchemy 2.0 (typed `Mapped[]` 스타일) + Alembic, 드라이버는 PyMySQL (`mysql+pymysql://`) |
| 검증 / 설정 | Pydantic v2 + pydantic-settings |
| 인증 | JWT (PyJWT) + 비밀번호 해싱 (pwdlib[argon2] 또는 bcrypt) |
| 패키지 관리 | Backend: `uv` / Frontend: `npm` |
| 품질 | Backend: ruff, pytest / Frontend: ESLint, TypeScript strict |

### 환경 결정 사항
- **로컬 DB**: 사용자 PC에 이미 설치된 MySQL을 사용한다. DB와 계정은 **사용자가 10절의 SQL로 직접 만든다.** Claude는 로컬 MySQL에 DB/계정을 만들거나 지우는 명령을 실행하지 않고, 10절 상태가 이미 갖춰져 있다고 가정한다. 접속이 안 되면 사용자에게 알리고 확인을 요청한다.
- **배포**: EC2 인스턴스 한 대에 **Nginx + MySQL을 직접 설치**한다. RDS와 Elastic Beanstalk는 쓰지 않는다. 자세한 구성은 12절에 있다.
- **아직 미정**: 도메인 연결과 HTTPS 적용 여부. 필요해지면 사용자에게 묻는다.

---

## 3. 기능 범위

### MVP (반드시 구현)

**인증**
- 회원가입: 이메일, 이름, 비밀번호. 이메일 중복 검사, 비밀번호 최소 길이 검사
- 로그인 / 로그아웃
- 내 정보 조회 (`/me`)
- 로그인하지 않은 사용자는 보호된 페이지에 접근할 수 없다 (로그인 페이지로 리다이렉트)

**보드 (Board)**
- 내가 속한 보드 목록 보기
- 보드 생성 / 이름 변경 / 삭제 (삭제는 owner만)
- 멤버 초대: 가입된 사용자의 이메일로 추가 (owner만)
- 보드 멤버 목록 보기, 멤버 제거 (owner만)

**리스트 (List)**: 보드 안의 컬럼
- 생성 / 이름 변경 / 삭제
- 드래그 앤 드롭으로 순서 변경

**카드 (Card)**
- 생성 (리스트 하단에 제목만 빠르게 추가)
- 상세 모달: 제목, 설명, 마감일, 담당자(보드 멤버 중 1명) 편집
- 삭제
- 드래그 앤 드롭: 같은 리스트 안에서 순서 변경, **다른 리스트로 이동**
- 카드 앞면에 마감일과 담당자 표시. 마감일이 지나면 시각적으로 구분

### 확장 (MVP 완료 후, 시간이 남으면 이 순서로)
1. 라벨 (색상 + 이름, 보드 단위)
2. 카드 댓글
3. 체크리스트 (진행률 표시)
4. 보드 내 카드 검색 / 필터 (담당자, 라벨, 마감일)
5. 활동 로그

### 범위 밖 (하지 않음)
실시간 동기화(WebSocket), 파일 첨부, 소셜 로그인, 이메일 발송/알림, 비밀번호 찾기, 다국어

---

## 4. 디렉터리 구조

```
trello-clone/
├── CLAUDE.md
├── README.md
├── report/                  # 제출용 보고서 (what, 유용성, 느낀점)
├── deploy/                  # nginx 설정, systemd 유닛, 배포용 SQL, 배포 절차서 (12절)
├── backend/
│   ├── pyproject.toml
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── main.py          # FastAPI app 생성, 라우터 등록, CORS
│   │   ├── core/            # config.py(Settings), security.py(JWT, 해싱)
│   │   ├── db/              # engine, session, Base
│   │   ├── models/          # SQLAlchemy 모델
│   │   ├── schemas/         # Pydantic 요청/응답 스키마
│   │   ├── api/
│   │   │   ├── deps.py      # get_db, get_current_user, 권한 체크 의존성
│   │   │   └── routes/      # auth.py, boards.py, lists.py, cards.py, members.py
│   │   └── services/        # 정렬 위치 계산 등, 라우터에 넣기 무거운 로직
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts       # dev 서버에서 /api → backend 프록시
    ├── .env.example
    └── src/
        ├── api/             # API 클라이언트 + 리소스별 함수 + 타입
        ├── hooks/           # TanStack Query 훅 (useBoards, useCards ...)
        ├── pages/           # LoginPage, SignupPage, BoardsPage, BoardPage
        ├── components/
        │   ├── ui/          # shadcn CLI가 생성한 컴포넌트
        │   └── board/, list/, card/, common/
        ├── lib/utils.ts     # shadcn cn() 유틸
        ├── auth/            # AuthContext, ProtectedRoute
        └── main.tsx, App.tsx
```

---

## 5. 데이터 모델

```
User        id, email(unique), name, password_hash, created_at
Board       id, title, owner_id → User, created_at, updated_at
BoardMember board_id → Board, user_id → User, role('owner'|'member'), joined_at
            (board_id, user_id) unique
List        id, board_id → Board, title, position(float), created_at
Card        id, list_id → List, title, description(nullable), due_date(nullable),
            assignee_id → User(nullable), position(float), created_at, updated_at
```

- 보드를 만든 사람은 `BoardMember`에 `role='owner'`로 함께 등록한다.
- 삭제는 연쇄 삭제다: Board → List → Card (`ondelete="CASCADE"` 및 relationship cascade 설정).
- **정렬은 `position: float`로 한다** (fractional indexing).
  - 맨 끝에 추가: `마지막 position + 1024`
  - 두 항목 사이로 이동: `(앞 + 뒤) / 2`
  - 간격이 너무 작아지면 (예: `< 1e-6`) 해당 리스트/보드의 position을 다시 매긴다 (`services/`에서 처리)
### MySQL 관련 주의사항
- 데이터베이스와 테이블은 문자셋 `utf8mb4`, collation `utf8mb4_unicode_ci`로 만든다. 한글과 이모지를 지원하기 위해서다. 접속 URL에도 `?charset=utf8mb4`를 붙인다.
- `String`에는 반드시 길이를 지정한다. MySQL의 VARCHAR는 길이가 필수다 (예: email `String(255)`, title `String(200)`). 긴 텍스트(카드 설명)는 `Text`를 쓴다.
- **`position`은 `Double`(배정밀도)로 선언한다.** MySQL의 `FLOAT`는 단정밀도라서, 중간값을 반복해서 계산하면 금방 정밀도가 부족해진다.
- 시간은 UTC 기준으로 저장한다. 표시용 시간대 변환은 프론트에서 한다.
- 엔진에 `pool_pre_ping=True`와 적절한 `pool_recycle`(예: 3600)을 설정한다. MySQL의 `wait_timeout` 때문에 끊긴 연결을 재사용하는 문제를 막기 위해서다.
- 외래키 연쇄 삭제는 DB 레벨(`ondelete="CASCADE"`)과 ORM 레벨 둘 다 설정한다.

---

## 6. API 설계

모든 엔드포인트는 **`/api` 접두사**를 붙인다. 배포할 때 Nginx 하나로 프론트 정적 파일과 `/api`를 함께 서빙하기 위해서다.

```
POST   /api/auth/signup
POST   /api/auth/login                     → { access_token, token_type }
GET    /api/auth/me

GET    /api/boards                         # 내가 멤버인 보드
POST   /api/boards
GET    /api/boards/{board_id}              # 리스트 + 카드를 position 순으로 포함
PATCH  /api/boards/{board_id}
DELETE /api/boards/{board_id}              # owner만

GET    /api/boards/{board_id}/members
POST   /api/boards/{board_id}/members      # { email }, owner만
DELETE /api/boards/{board_id}/members/{user_id}   # owner만, owner 자신은 제거 불가

POST   /api/boards/{board_id}/lists
PATCH  /api/lists/{list_id}                # title, position
DELETE /api/lists/{list_id}

POST   /api/lists/{list_id}/cards
PATCH  /api/cards/{card_id}                # title, description, due_date, assignee_id
PATCH  /api/cards/{card_id}/move           # { list_id, position }
DELETE /api/cards/{card_id}

GET    /api/health                         # 배포 헬스체크용, DB 연결 확인 포함
```

### 규칙
- **권한 검사는 필수다.** list/card 엔드포인트도 상위 board를 거슬러 올라가서 현재 사용자가 멤버인지 확인한다. 이 검사는 `api/deps.py`의 의존성으로 만들어 재사용한다.
  - 멤버가 아니면 `404`를 반환한다. 다른 사람 보드의 존재 여부를 노출하지 않기 위해서다.
  - 멤버지만 owner 권한이 필요한 작업이면 `403`을 반환한다.
- 담당자(`assignee_id`)는 해당 보드의 멤버여야 한다.
- 에러 응답은 FastAPI 기본 형식(`{"detail": ...}`)을 유지한다.
- 응답 스키마에 `password_hash`는 절대 포함하지 않는다.

---

## 7. 인증 방식

- 로그인 성공 시 JWT access token을 발급한다 (만료 시간은 설정값, 기본 1일). refresh token은 MVP 범위 밖이다.
- 클라이언트는 토큰을 `localStorage`에 저장하고 `Authorization: Bearer <token>` 헤더로 보낸다.
- 서버 응답이 `401`이면 클라이언트는 토큰을 지우고 로그인 페이지로 이동한다.
- JWT 비밀키와 만료 시간은 환경변수에서 읽는다. **코드에 하드코딩하지 않는다.**

---

## 8. 프론트엔드 규칙

- 서버 데이터는 TanStack Query로만 관리한다. 같은 데이터를 별도 전역 상태에 복제하지 않는다.
- **드래그 앤 드롭은 낙관적 업데이트(optimistic update)를 적용한다.** 드롭 즉시 UI를 갱신하고, API가 실패하면 롤백한 뒤 에러를 표시한다. 시연할 때 체감 품질을 좌우하는 부분이다.
- 새 position 계산은 클라이언트가 해서 보내고, 서버는 받은 값을 검증해 저장한다. 계산 로직은 프론트와 백엔드가 같은 규칙(5절)을 따른다.
- API base URL은 상대 경로 `/api`를 쓴다. 개발 중에는 Vite 프록시로 백엔드에 연결한다. `localhost:8000` 같은 주소를 코드에 하드코딩하지 않는다.
- 로딩, 빈 상태(보드나 카드가 없을 때), 에러 상태를 모든 화면에서 처리한다.
- 폼에는 클라이언트 검증을 넣고, 서버 에러 메시지도 사용자에게 보여준다.

### shadcn/ui 사용 규칙
- 컴포넌트는 shadcn CLI로 추가한다 (`npx shadcn@latest add button card dialog ...`). 생성된 파일은 `src/components/ui/`에 둔다.
- `src/components/ui/`의 파일은 shadcn이 생성한 원본으로 취급한다. 고칠 필요가 있으면 최소한으로만 고치고, 앱 전용 컴포넌트는 그 밖(`components/board/`, `components/card/` 등)에서 ui 컴포넌트를 조합해 만든다.
- 직접 마크업을 만들기 전에 먼저 shadcn 컴포넌트로 해결할 수 있는지 확인한다. 화면별로 쓸 컴포넌트는 대략 다음과 같다.
  - 로그인/회원가입: `Card`, `Form`, `Input`, `Label`, `Button`
  - 보드 목록: `Card`, `Dialog`(새 보드), `DropdownMenu`(이름 변경/삭제)
  - 보드 화면: `ScrollArea`(가로 스크롤), `Card`(카드 앞면), `Badge`(마감일), `Avatar`(담당자)
  - 카드 상세: `Dialog`, `Textarea`, `Popover` + `Calendar`(마감일), `Select`(담당자)
  - 멤버 관리: `Sheet` 또는 `Dialog`, `Avatar`
  - 삭제 확인: `AlertDialog` / 결과 알림: `sonner`
  - 로딩: `Skeleton`
- 색상은 shadcn 테마의 CSS 변수(`bg-background`, `text-muted-foreground`, `bg-primary` 등)를 쓴다. 하드코딩한 색상값(`#xxxxxx`, `bg-blue-500` 등)은 피한다. 예외는 라벨 색상처럼 데이터 자체가 색인 경우뿐이다.
- 클래스 병합에는 shadcn이 제공하는 `cn()` 유틸(`src/lib/utils.ts`)을 쓴다.
- 경로 별칭 `@/`를 사용한다 (`@/components/ui/button`). `tsconfig`와 `vite.config.ts`에 모두 설정한다.

---

## 9. 배포를 고려한 코드 규칙

나중에 EC2(12절)에 올릴 때 코드를 고치지 않도록 처음부터 다음을 지킨다.

- 모든 환경 의존 값(DB URL, JWT 비밀키, CORS 허용 origin 등)은 `pydantic-settings`를 통해 환경변수/`.env`에서 읽는다. `.env.example`을 항상 최신으로 유지한다.
- `.env`, `node_modules/`, `.venv/`, `dist/`, `__pycache__/`는 `.gitignore`에 넣는다.
- DB 접속 정보는 `DATABASE_URL` 하나로 받는다. 예: `mysql+pymysql://user:password@host:3306/trello?charset=utf8mb4`. 개발 환경과 배포 환경은 이 값만 다르다.
- CORS 허용 origin은 설정값으로 둔다. 배포 환경에서는 Nginx가 프론트와 `/api`를 같은 origin으로 서빙하므로 비워둘 수 있어야 한다.
- 프론트는 `npm run build` 결과물(`dist/`)을 Nginx가 정적 파일로 서빙한다. SPA 라우팅 때문에 Nginx에서 `try_files ... /index.html` fallback이 필요하다.
- 백엔드는 `uvicorn app.main:app --host 127.0.0.1 --port 8000`으로 실행할 수 있어야 한다. 외부에는 Nginx만 노출한다.
- Nginx 뒤에서 동작하므로 uvicorn에 `--proxy-headers`를 사용한다. 클라이언트 IP나 scheme이 필요하면 `X-Forwarded-*` 헤더를 기준으로 한다.
- 스키마 변경은 반드시 Alembic 마이그레이션으로 한다. `Base.metadata.create_all`에 의존하지 않는다.

---

## 10. 로컬 MySQL 세팅 (사용자가 직접 실행)

사용자가 로컬 MySQL에 root(또는 관리자 계정)로 접속해서 아래 SQL을 실행한다. Claude는 이 SQL을 실행하지 않는다. 비밀번호는 사용자가 정하고, `backend/.env`에만 적는다 (커밋 금지).

```sql
-- 1) 개발용 DB와 테스트용 DB
CREATE DATABASE IF NOT EXISTS trello
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS trello_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) 앱 전용 계정 (로컬 접속만 허용)
CREATE USER IF NOT EXISTS 'trello'@'localhost' IDENTIFIED BY '<비밀번호>';
CREATE USER IF NOT EXISTS 'trello'@'127.0.0.1' IDENTIFIED BY '<비밀번호>';

-- 3) 두 DB에만 권한 부여 (테스트는 테이블 생성/삭제가 필요하므로 ALL)
GRANT ALL PRIVILEGES ON trello.*      TO 'trello'@'localhost', 'trello'@'127.0.0.1';
GRANT ALL PRIVILEGES ON trello_test.* TO 'trello'@'localhost', 'trello'@'127.0.0.1';
FLUSH PRIVILEGES;

-- 4) 확인
SHOW DATABASES LIKE 'trello%';
SHOW GRANTS FOR 'trello'@'localhost';
```

`backend/.env` 예시 (`.env.example`에는 비밀번호 자리만 비워서 둔다):

```
DATABASE_URL=mysql+pymysql://trello:<비밀번호>@127.0.0.1:3306/trello?charset=utf8mb4
TEST_DATABASE_URL=mysql+pymysql://trello:<비밀번호>@127.0.0.1:3306/trello_test?charset=utf8mb4
JWT_SECRET_KEY=<임의의 긴 문자열>
JWT_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

---

## 11. 개발 명령어

```bash
# backend (사전 조건: 10절 세팅 완료, backend/.env 작성 — .env.example 참고)
cd backend
uv sync
uv run alembic upgrade head                       # 개발 DB(trello)에 스키마 적용
uv run uvicorn app.main:app --reload --port 8000  # API 문서: http://localhost:8000/api/docs
uv run pytest                                     # TEST_DATABASE_URL(trello_test)만 사용
uv run ruff check . && uv run ruff format .

# frontend
cd frontend
npm install
npm run dev        # http://localhost:5173, /api → :8000 프록시
npm run build      # tsc -b && vite build → dist/
npm run lint       # ESLint
npx shadcn@latest add <component>   # shadcn 컴포넌트 추가
```

### 구현 메모 (초기 세팅 때 정한 것)
- shadcn 스타일은 `radix-nova`. 이 버전의 `form`은 빈 레지스트리 항목이라 **`Field` 컴포넌트 + react-hook-form `Controller`** 조합으로 폼을 만든다 (`components/common/FormTextField.tsx`).
- `cn()`은 shadcn의 `cn` 패키지(clsx + tailwind-merge 대체)를 `src/lib/utils.ts`에서 다시 export 한다. 앱 코드는 `@/lib/utils`에서 import 한다.
- TypeScript는 6.0으로 고정했다. typescript-eslint가 아직 TS 7을 지원하지 않기 때문이다.
- 카드 마감일(`due_date`)은 시간 없는 `DATE`다. 마감 지남 판정은 브라우저 로컬 날짜 기준이다.
- 리스트 모델 클래스 이름은 `BoardList`(테이블 `lists`)다. `List`는 typing과 겹친다.
- 맨 앞에 넣을 때 position은 `첫 position - 1024`이다 (5절 규칙 보완).

---

## 12. 배포 구성 (EC2 + Nginx + MySQL)

### 네트워크 (과제 조건)
- 직접 만든 VPC `10.10.0.0/16`을 사용한다.
- 퍼블릭 서브넷 하나 (예: `10.10.1.0/24`) + 인터넷 게이트웨이 + 라우팅 테이블 (`0.0.0.0/0 → IGW`)
- EC2 한 대를 퍼블릭 서브넷에 두고 탄력적 IP(Elastic IP)를 연결한다. 시연은 이 IP(또는 도메인)로 한다.
- 보안 그룹 인바운드 규칙
  - 22: 내 IP만 허용
  - 80 (HTTPS를 쓰면 443도): `0.0.0.0/0`
  - **3306은 열지 않는다.** MySQL은 같은 인스턴스 안에서 `127.0.0.1`로만 접속한다.

### 인스턴스 내부 구성
```
브라우저 ──80──▶ Nginx ─┬─ /        → /var/www/trello (frontend dist/, SPA fallback)
                        └─ /api/... → 127.0.0.1:8000 (uvicorn, systemd 서비스)
                                         └─▶ MySQL 127.0.0.1:3306 (bind-address=127.0.0.1)
```

- **MySQL**: EC2에 직접 설치한다. `bind-address = 127.0.0.1`로 외부 접속을 막는다. 10절과 같은 방식으로 `trello` DB와 `trello`@`localhost` 계정을 만든다. 배포 서버에는 `trello_test`가 필요 없다. 비밀번호는 로컬과 다르게 한다.
- **백엔드**: 서버에서 `uv sync` → `.env` 작성 → `alembic upgrade head` 순서로 준비한다. uvicorn은 **systemd 서비스**로 등록해서 재부팅이나 장애 후에도 자동으로 다시 실행되게 한다.
- **프론트**: `npm run build`로 만든 `dist/`를 `/var/www/trello`에 둔다. 인스턴스 사양이 작으면 로컬에서 빌드한 뒤 결과물만 업로드한다.
- **Nginx**: 정적 파일 서빙 + `/api` 리버스 프록시 + `try_files $uri /index.html` SPA fallback

### 저장소에 둘 배포 파일 (`deploy/` 디렉터리)
- `deploy/nginx/trello.conf`: Nginx 사이트 설정
- `deploy/systemd/trello-backend.service`: uvicorn 서비스 유닛
- `deploy/mysql/init.sql`: 배포용 DB/계정 생성 SQL (비밀번호는 placeholder로)
- `deploy/README.md`: VPC 생성부터 접속 확인까지 순서대로 정리한 배포 절차서. 발표와 보고서에도 사용한다.

### Claude의 역할
- 위 설정 파일과 절차서는 작성한다. 하지만 **AWS 리소스 생성, EC2 접속, 서버 명령 실행은 사용자가 요청할 때만** 한다.
- 비밀번호, JWT 비밀키, 키 페어(.pem) 같은 비밀 정보는 저장소에 넣지 않는다.

---

## 13. 작업 방식

- **MVP 순서대로** 진행한다: 프로젝트 골격 → 인증(백+프론트) → 보드 → 리스트 → 카드 → 드래그 앤 드롭 → 멤버 초대 → 마감 다듬기
- 기능 하나를 끝낼 때마다 백엔드 테스트(pytest)로 정상 케이스와 **권한 실패 케이스**를 함께 검증하고, 브라우저에서 실제 흐름을 확인한다.
- **테스트도 MySQL로 돌린다** (SQLite 사용 금지). 개발 DB와 분리된 테스트 전용 DB(예: `trello_test`)를 `TEST_DATABASE_URL`로 지정한다.
  - 테스트 세션 시작 시 Alembic 마이그레이션(또는 스키마 생성)을 적용하고, 테스트마다 트랜잭션을 롤백하거나 테이블을 비워서 테스트끼리 서로 영향을 주지 않게 한다.
  - 테스트 코드는 개발 DB(`DATABASE_URL`)에 절대 접속하지 않는다. 실수를 막기 위해 테스트 DB 이름에 `test`가 들어있지 않으면 테스트를 중단하는 안전장치를 conftest에 둔다.
- 3절의 범위 밖 기능은 사용자 요청 없이 추가하지 않는다.
- 2절의 미정 항목(도메인, HTTPS)은 임의로 결정하지 않는다. 결정이 필요해지면 사용자에게 선택지를 제시하고 묻는다.
- 커밋은 기능 단위로 작게 나누고, 메시지는 한국어나 영어 중 하나로 통일한다 (예: `feat: 카드 드래그 앤 드롭 이동`).
- 코드 주석과 사용자에게 보이는 UI 문구는 한국어로 작성한다.
