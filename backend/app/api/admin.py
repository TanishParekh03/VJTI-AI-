"""
Admin routes — /admin/*
User management table, role permissions, bulk actions.
All routes require admin role.
"""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AdminUser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": [
        "View all documents",
        "Upload documents",
        "Manage users",
        "View analytics",
        "Delete content",
        "Manage system settings",
    ],
    "officer": [
        "View all documents",
        "Upload documents",
        "View analytics",
        "Export reports",
    ],
    "faculty": [
        "View department documents",
        "Ask questions",
        "Bookmark answers",
        "Export answers",
    ],
    "student": [
        "View public documents",
        "Ask questions",
        "Bookmark answers",
    ],
}


@router.get("/users", response_model=PaginatedResponse[UserRead])
async def list_users(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = None,
    role_filter: str | None = Query(None, alias="role"),
    status_filter: str | None = Query(None, alias="status"),
    sort_by: Literal["name", "role", "status", "last_active", "queries_this_month"] = "name",
    sort_dir: Literal["asc", "desc"] = "asc",
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserRead]:
    """Paginated, sortable, filterable user list. Admin only."""
    query = select(User)

    if search:
        query = query.where(
            User.name.ilike(f"%{search}%")
            | User.email.ilike(f"%{search}%")
            | User.department.ilike(f"%{search}%")
        )
    if role_filter and role_filter != "All":
        query = query.where(User.role == role_filter.lower())
    if status_filter and status_filter != "All":
        query = query.where(User.status == status_filter.lower())

    sort_col = getattr(User, sort_by, User.name)
    query = query.order_by(asc(sort_col) if sort_dir == "asc" else desc(sort_col))

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.limit(page_size).offset(offset)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(users)) < total,
    )


@router.post("/users", response_model=UserRead, status_code=201)
async def create_user(
    body: UserCreate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserRead:
    """Create a new user. Admin only."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    initials = "".join(w[0].upper() for w in body.name.split()[:2])
    new_user = User(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        role=body.role,
        department=body.department,
        avatar=initials,
        status="active",
    )
    db.add(new_user)
    await db.flush()
    return UserRead.model_validate(new_user)


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    body: UserUpdate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserRead:
    """Update a user's role, status, or department. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        target.name = body.name
    if body.role is not None:
        target.role = body.role
    if body.department is not None:
        target.department = body.department
    if body.status is not None:
        target.status = body.status
    await db.flush()
    return UserRead.model_validate(target)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_user(
    user_id: str,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a user. Admin only. Cannot delete yourself."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/roles")
async def get_role_permissions(admin: AdminUser) -> dict:
    """Return the role → permissions matrix for the Admin Panel permissions tab."""
    return {"roles": ROLE_PERMISSIONS}
