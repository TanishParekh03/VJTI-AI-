# HTE AI Assistant — Backend Setup Guide

## Prerequisites
- Python 3.12+
- Docker Desktop (for PostgreSQL)
- API Keys: `SUPERMEMORY_API_KEY`, `GEMINI_API_KEY`

---

## 1. Start PostgreSQL via Docker

```bash
cd backend
docker compose up -d postgres
```

pgAdmin is available at http://localhost:5050 (admin@hte.gov.in / admin)

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and fill in:
#   SUPERMEMORY_API_KEY=your-key-here
#   GEMINI_API_KEY=your-key-here
#   JWT_SECRET=<run: openssl rand -hex 32>
```

---

## 3. Create Python Virtual Environment & Install Dependencies

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate

# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

---

## 4. Run Database Migrations

```bash
# Ensure PostgreSQL is running, then:
alembic upgrade head
```

---

## 5. Start the FastAPI Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

---

## 6. Start the Frontend

```bash
# In the repo root (hte-ai-assistant/):
pnpm dev
```

Frontend: http://localhost:3000

---

## Endpoint Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Credentials login → JWT |
| POST | `/api/v1/auth/maha-sso/callback` | — | Gov SSO callback (stubbed) |
| POST | `/api/v1/auth/refresh` | — | Refresh access token |
| POST | `/api/v1/chat/stream` | Bearer | **SSE** — streams AI answer tokens |
| GET | `/api/v1/chat/sessions` | Bearer | List conversations |
| GET | `/api/v1/chat/history/{id}` | Bearer | Full conversation with sources |
| POST | `/api/v1/documents/upload` | Officer/Admin | Upload + index document |
| GET | `/api/v1/documents` | Bearer | List documents (role-scoped) |
| GET | `/api/v1/documents/{id}/status` | Bearer | Poll ingestion status |
| DELETE | `/api/v1/documents/{id}` | Officer/Admin | Delete from Postgres + Supermemory |
| GET | `/api/v1/analytics/overview` | Bearer | KPI cards |
| GET | `/api/v1/analytics/queries` | Bearer | Query trend data |
| GET | `/api/v1/analytics/documents` | Bearer | Document analytics |
| GET | `/api/v1/admin/users` | Admin | Paginated user list |
| POST | `/api/v1/admin/users` | Admin | Create user |
| PATCH | `/api/v1/admin/users/{id}` | Admin | Update user |
| DELETE | `/api/v1/admin/users/{id}` | Admin | Delete user |
| GET | `/api/v1/admin/roles` | Admin | Role permissions matrix |
| GET | `/api/v1/search?q=` | Bearer | Command palette search |
| GET | `/health` | — | Health check |

---

## Logging & Debugging

- Structured JSON logs via `structlog` — grep for `event_type` to trace pipeline steps
- Every request gets an `X-Request-ID` header
- Analytics events logged per chat query for debugging retrieval gaps

---

## Maha-SSO Integration (Future)

The stub is in `backend/app/api/auth.py` → `MahaSSOProvider.authenticate()`.
Replace the stub body with the real OAuth2/SAML token exchange.
Route code does not need to change.
