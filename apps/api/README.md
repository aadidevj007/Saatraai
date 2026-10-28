# SAATRAAI API operations

## Local setup without Docker

Install PostgreSQL 16 with PostGIS 3.4 (including the `postgis` extension) and Redis 7 using the operating system packages or managed local services available for your platform. Start both services and create an empty `saatraai` database. Then, from the repository root:

```powershell
Copy-Item .env.example apps/api/.env
Set-Location apps/api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Replace the development JWT placeholder in the private `apps/api/.env` with a locally generated random value. From `apps/api`, apply the checked-in migrations and start the service:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The local defaults expect PostgreSQL at `localhost:5432` and Redis at `localhost:6379`. For different service addresses, set `DATABASE_URL` and `REDIS_URL` in the private `.env`. `GET /health` is a liveness check; it does not verify database, Redis, model, or storage readiness. `GET /api/v1/status` requires a user access token.

## Production configuration

Set these server-side variables in the API hosting environment. Do not put credentials in source control, browser-visible `NEXT_PUBLIC_*` variables, logs, or support output.

| Variable | Requirement |
|---|---|
| `ENVIRONMENT` | Set to `production`. |
| `DATABASE_URL` | Explicit PostgreSQL connection URL; the development localhost URL is rejected in production. |
| `JWT_SECRET_KEY` | Unique per environment, at least 32 characters, and not the checked-in development placeholder. Generate and store it in the hosting provider's secret manager. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact HTTPS frontend origins, with no paths, wildcard, or localhost. Example shape: `https://saatraai.example,https://preview.example`. Use only origins actually assigned to the frontend. |
| `REDIS_URL` | Set when Redis is used; the current API checks connectivity, but there is no background worker. |
| `LOCAL_STORAGE_PATH` | Writable persistent volume for uploaded rasters and output artifacts when using local object storage. The current implementation has no remote object-storage adapter. |

The frontend API client currently reads **`NEXT_PUBLIC_API_URL`** and appends `/api/v1`; set it to the API origin, for example `https://api.example`, without an `/api/v1` suffix. The frontend team owns that setting. Configure that frontend origin in `CORS_ALLOWED_ORIGINS` on the API. Local development defaults to `http://localhost:3000` when no CORS list is supplied outside production.

Optional integrations: `FIREBASE_PROJECT_ID` and either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` enable server-side Firebase token verification. Keep service credentials private. `GEOCHAT_MODEL_PATH`, `GEOCHAT_MODEL_BASE`, `GEOCHAT_DEVICE`, and `GEOCHAT_MAX_NEW_TOKENS` configure local inference; model weights and the upstream runtime are not bundled. Missing or unloadable tools remain unavailable and must not be represented as completed analysis.

## Routes and ownership

All `/api/v1` project, investigation, image, execution, tool registry, status, and evidence/hypothesis/conclusion routes require a bearer access token. Project-scoped operations verify the authenticated user owns the project. Investigation descendants are resolved through that ownership chain; image IDs are additionally required to belong to the requested investigation before execution. Cross-user lookups return not-found responses to avoid disclosing resource existence. `/health` and `/` are public liveness/information endpoints; registration, login, refresh, and Firebase token exchange are public authentication operations.

Errors use the existing `{ "error": { "code", "message", "details" } }` envelope. Pydantic validation failures and route validation errors return controlled 422 responses. Execution traces retain status, selected tool/version, parameters, input IDs, start/completion timestamps, output references, and an evidence ID. Provenance is read from the linked evidence endpoint. An unimplemented adapter is recorded as failed with an explicit `NOT_IMPLEMENTED` reason and insufficient evidence, never as a successful analysis.

## Migrations and tests

The existing Alembic chain is unchanged; this integration work does not alter database schemas and requires no migration. Check a local database before applying migrations:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Run the API suite only against an isolated, disposable PostgreSQL/PostGIS database configured through `DATABASE_URL` and a reachable Redis service:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Never run migration or test commands against production. Review migration upgrade and downgrade behavior on a disposable database before any release that introduces a schema revision.

## Integration decisions still needed

- Confirm the canonical production frontend origin(s), API hostname, hosting owner, and environment scopes before setting production CORS and `NEXT_PUBLIC_API_URL`.
- Define safe Firebase-to-password-account linking. The current Firebase flow locates an existing account by verified email and issues tokens for it; the schema has no provider-subject linkage, so safe linking requires a contract and likely a migration. This implementation leaves that behavior unchanged pending the identity policy decision.
- Decide whether production local filesystem storage is an acceptable persistent volume or whether a separately reviewed storage adapter is required.
