from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints


def _as_utc(value: datetime) -> datetime:
    # DB에는 naive UTC로 저장되므로, 응답에서는 UTC임을 명시한다 (…Z / +00:00)
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]

# 앞뒤 공백을 제거한 1~200자 제목
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
