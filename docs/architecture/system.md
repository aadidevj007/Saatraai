# System architecture (Phase 1)

SAATRAAI is an investigation platform, not a chatbot. PostgreSQL/PostGIS is the transactional source of truth. Redis is reserved for asynchronous jobs. Neo4j is deferred to Phase 6 and must never replace PostgreSQL.

## Current runtime

- Next.js (`apps/web`) at `http://localhost:3000` — connectivity page only.
- FastAPI (`apps/api`) at `http://localhost:8000`.
- PostgreSQL 16 + PostGIS 3.4 via Docker Compose.
- Redis 7 via Docker Compose.

## Request path (Phase 1)

Frontend → FastAPI `/api/v1` → JWT authentication → ownership checks → SQLAlchemy services → PostgreSQL.

## Ownership

`User` owns `Project`. `Project` contains `Investigation`. All project and investigation reads/writes filter by `Project.owner_id`. Cross-user access returns HTTP 404, not 403, to avoid leaking existence.

## Out of scope until later phases

ML adapters, agent routing, Neo4j, investigation workspace UI, admin UI, reports, benchmark evaluation, and the premium landing page.
