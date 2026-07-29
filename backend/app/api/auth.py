"""
Auth routes — /auth/*
Implements credentials login, token refresh, and Maha-SSO stub.
The SSO stub is behind an AuthProvider interface so the real OAuth/SAML
flow can be dropped in later without touching route code.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.db.session import get_db
from app.models.analytics import AnalyticsEvent
from app.models.user import User
from app.schemas.auth import LoginRequest, MahaSSOCallbackRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


# ── AuthProvider interface ────────────────────────────────────────────────────

class AuthProvider(ABC):
    """
    Pluggable authentication strategy interface.
    Implement a new subclass to add SSO providers without touching route code.
    """
    @abstractmethod
    async def authenticate(self, db: AsyncSession, **kwargs) -> User:
        """Authenticate and return the User ORM object, creating it if needed."""
        ...


class CredentialsProvider(AuthProvider):
    """Email + password authentication."""

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> User:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if user.status == "inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact your administrator.",
            )
        return user


class MahaSSOProvider(AuthProvider):
    """
    ══════════════════════════════════════════════════════════════════
    STUB — Maharashtra Government SSO (OAuth2/SAML placeholder)
    ══════════════════════════════════════════════════════════════════
    This provider simulates a successful SSO login with a demo user.
    Replace the body of `authenticate` with the real token exchange:

      1. Exchange `code` for an access token at MAHA_SSO_ISSUER/token
      2. Fetch user profile from the SSO userinfo endpoint
      3. Upsert the User row (create if first login, update if returning)
      4. Return the User ORM object

    The route code (`POST /auth/maha-sso/callback`) does not need
    to change when the real implementation is swapped in here.
    ══════════════════════════════════════════════════════════════════
    """

    async def authenticate(self, db: AsyncSession, code: str, state: str | None = None) -> User:
        # ── STUB: return or create a demo admin user ──────────────────────────
        demo_email = "demo.admin@hte.gov.in"
        result = await db.execute(select(User).where(User.email == demo_email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=demo_email,
                name="Demo Administrator",
                role="admin",
                department="HTE Headquarters",
                status="active",
                avatar="DA",
            )
            db.add(user)
            await db.flush()
        return user
        # ── END STUB ──────────────────────────────────────────────────────────


# ── Route implementations ─────────────────────────────────────────────────────

def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, user.department),
        refresh_token=create_refresh_token(user.id),
    )


async def _update_last_active(db: AsyncSession, user: User) -> None:
    user.last_active = datetime.now(timezone.utc)
    event = AnalyticsEvent(user_id=user.id, event_type="user_login")
    db.add(event)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Email + password login."""
    provider = CredentialsProvider()
    user = await provider.authenticate(db, email=body.email, password=body.password)
    await _update_last_active(db, user)
    return _issue_tokens(user)


@router.post("/maha-sso/callback", response_model=TokenResponse)
async def maha_sso_callback(
    body: MahaSSOCallbackRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """
    Maha-SSO OAuth callback.
    Currently stubbed — returns a demo admin token.
    Replace MahaSSOProvider.authenticate() when real SSO credentials are available.
    """
    provider = MahaSSOProvider()
    user = await provider.authenticate(db, code=body.code, state=body.state)
    await _update_last_active(db, user)
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Refresh an access token using a valid refresh token."""
    try:
        payload = verify_refresh_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _issue_tokens(user)


@router.get("/me", response_model=UserRead)
async def get_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    # Inline dependency to avoid circular import with deps.py
) -> UserRead:
    """Get current user profile — used by the frontend after login."""
    from app.core.deps import get_current_user
    from fastapi import Request
    # Handled via get_current_user in router; see main.py for how to use
    raise HTTPException(status_code=501, detail="Use GET /auth/me with Authorization header")
