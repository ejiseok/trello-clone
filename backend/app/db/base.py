from datetime import UTC, datetime

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """DB에는 timezone 정보 없이 UTC 시각을 저장한다."""
    return datetime.now(UTC).replace(tzinfo=None)
