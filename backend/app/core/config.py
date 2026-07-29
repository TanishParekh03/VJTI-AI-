"""
HTE AI Assistant — Application Settings
All configuration is loaded from environment variables (via .env file in development).
"""
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://hte:hte_secret@localhost:5432/hte_ai"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # ── Supermemory ───────────────────────────────────────────────────────────
    supermemory_api_key: str = ""

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider: Literal["gemini", "openai"] = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-flash-latest"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # ── Maha-SSO (stub) ───────────────────────────────────────────────────────
    maha_sso_client_id: str = ""
    maha_sso_client_secret: str = ""
    maha_sso_redirect_uri: str = "http://localhost:3000/auth/sso/callback"
    maha_sso_issuer: str = "https://sso.maharashtra.gov.in"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── RAG Pipeline ──────────────────────────────────────────────────────────
    relevance_threshold: float = 0.40
    max_context_results: int = 5
    conversation_history_turns: int = 5

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_chat_per_minute: int = 20

    @field_validator("relevance_threshold")
    @classmethod
    def validate_threshold(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("relevance_threshold must be between 0.0 and 1.0")
        return v


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
