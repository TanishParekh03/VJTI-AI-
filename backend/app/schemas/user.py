"""User request/response schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class UserRead(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: str
    status: str
    avatar: str
    queries_this_month: int
    last_active: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Literal["student", "faculty", "officer", "admin"] = "student"
    department: str = ""
    visibility: str = "public"


class UserUpdate(BaseModel):
    name: str | None = None
    role: Literal["student", "faculty", "officer", "admin"] | None = None
    department: str | None = None
    status: Literal["active", "inactive", "pending"] | None = None
