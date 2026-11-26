from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

from app.schemas.common import ORMModel, UTCDateTime

PASSWORD_MIN_LENGTH = 8


class UserOut(ORMModel):
    id: int
    email: str
    name: str
    created_at: UTCDateTime


class SignupRequest(BaseModel):
    email: EmailStr
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
    password: Annotated[str, StringConstraints(min_length=PASSWORD_MIN_LENGTH, max_length=128)]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
