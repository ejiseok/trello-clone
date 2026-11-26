from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.deps import DbSession
from app.api.routes import auth, boards, cards, lists, members
from app.core.config import get_settings

app = FastAPI(
    title="Trello Clone API",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

origins = get_settings().cors_origin_list
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

api = APIRouter(prefix="/api")


@api.get("/health", tags=["health"])
def health(db: DbSession) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="데이터베이스에 연결할 수 없습니다.") from exc
    return {"status": "ok", "database": "ok"}


for module in (auth, boards, members, lists, cards):
    api.include_router(module.router)

app.include_router(api)
