# Local development and API setup

This guide brings up the SAATRAAI API and web app locally. GeoChat model inference is optional and needs a separate GPU/runtime setup.

## 1. Start the infrastructure

Install and start Docker Desktop, then run from the repository root:

```powershell
docker compose up -d
docker compose ps
```

PostgreSQL/PostGIS is exposed on port `5432`; Redis is exposed on port `6379`. Both must be reachable from the API process.

Docker is optional. You can instead install PostgreSQL 16 with PostGIS 3.4 and Redis 7 directly or use compatible local managed services. Create an empty `saatraai` database, start both services, and set `DATABASE_URL` and `REDIS_URL` in `apps/api/.env` to their addresses. Continue with the API setup below. See [API operations](../apps/api/README.md) for the non-Docker workflow and production configuration.

## 2. Configure and start the API

From the repository root, copy the development template into the API working directory. `Settings` reads `.env` from the current working directory, so start the API from `apps/api`:

```powershell
Copy-Item .env.example apps/api/.env
Set-Location apps/api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Generate a unique local JWT secret and replace the development placeholder in `apps/api/.env`:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

The local template already identifies the Firebase project as `saatraai`. For Google sign-in, enable Google in Firebase Authentication, download an Admin SDK service-account JSON from Firebase Console → Project settings → Service accounts, and save it as `apps/api/secrets/firebase-service-account.json`. The configured path is ignored by Git. Keep this private key on the API server only.

Apply the database migrations and run the API:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Confirm `http://localhost:8000/health` returns `{"status":"ok", ...}`. The interactive API reference is at `http://localhost:8000/docs`.

## 3. Configure and start the web app

In another terminal, copy `apps/web/.env.example` to `apps/web/.env.local`. Keep the supplied `NEXT_PUBLIC_FIREBASE_*` values for the `saatraai` web app. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the OAuth 2.0 Web client ID enabled for Google Identity Services in Firebase Authentication. If using the fallback Google bridge route, also set `GOOGLE_CLIENT_ID` and a unique `GOOGLE_BRIDGE_SECRET` in `apps/web/.env.local`; those values are read by Next.js, not FastAPI. Add `http://localhost:3000` as an authorized JavaScript origin in Google Cloud Console.

```powershell
Set-Location apps/web
npm install
npm run dev
```

In local development, the API allows `http://localhost:3000` by default. For other origins, set `CORS_ALLOWED_ORIGINS` in the API environment to a comma-separated list of exact origins. Production requires configured HTTPS origins without wildcards. The frontend reads `NEXT_PUBLIC_API_URL`, set to the API origin without an `/api/v1` suffix; details are in [API operations](../apps/api/README.md).

## 4. Optional GeoChat inference

This repository calls a local `MBZUAI/geochat-7B` adapter; there is no GeoChat API key variable or remote inference API in this code. Obtain the compatible checkpoint and install its upstream runtime, then set `GEOCHAT_MODEL_PATH` in `apps/api/.env` to the checkpoint directory. `GEOCHAT_MODEL_BASE` is only needed for adapter checkpoints, and `GEOCHAT_DEVICE` is typically `cuda`. The GeoChat dependencies are intentionally not included in the general API requirements because the upstream stack has hardware-specific PyTorch and FlashAttention requirements. See [remote-sensing workflows](remote-sensing-workflows.md) before installing model weights.

## 5. What is and is not live

- Investigation questions, regions, dates, selected evidence source types, the deterministic suggested evidence protocol, image uploads, and execution traces are persisted by the API.
- The demo investigation view is explicitly simulated. It is useful for exercising the interface but does not represent a real scientific result.
- Real VQA and grounding require GeoChat weights. Other unintegrated tool adapters return an explicit unavailable status instead of synthetic model output.
- The evidence protocol is a deterministic planning aid, not a model generated hypothesis set or scientific result. It records recommended checks but does not fetch imagery.
- The current project does not generate research hypotheses automatically.
- Satellite catalog providers, rainfall feeds, Neo4j, and production background jobs are not configured by the local Docker Compose stack.
