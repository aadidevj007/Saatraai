# SAATRAAI repository rules

## Architecture and ownership

- This is an incremental platform: Next.js lives in `apps/web`, FastAPI and SQLAlchemy in `apps/api`, Alembic revisions in `apps/api/alembic`, model adapters in `ml`, and architecture/development records in `docs`.
- PostgreSQL/PostGIS is the transactional source of truth. Local filesystem object storage is the current development implementation; Redis is configured for future jobs. Neo4j and satellite catalog providers are not deployed.
- Preserve the existing modules and contracts. Read the relevant code and tests before changing behavior. A feature marked demo, placeholder, unavailable, or `NOT_IMPLEMENTED` is not a working production capability.
- Keep task ownership explicit in the issue/task description. Do not edit files assigned to another owner. Work on a task branch or isolated worktree; do not commit another task's changes. Coordinate shared API/schema changes before parallel work. Keep unrelated working-tree changes intact.

## Commands and checks

- Web, from `apps/web`: `npm run dev`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- API, from `apps/api`, after installing `requirements.txt` and configuring a reachable test database: `python -m unittest discover -s tests -v`. This suite exercises database-backed flows; use an isolated test database and never point it at production.
- API migration commands, from `apps/api`: `python -m alembic current`, `python -m alembic upgrade head`. Review generated migrations and test both upgrade and downgrade behavior on disposable databases before release.
- Adaptation pipeline dependencies and smoke instructions are documented in `docs/adaptation-pipeline.md`; its dependency set is separate from the API requirements.
- No Python lint/type-check command or repository-wide test runner is currently declared. Do not claim checks passed unless they were run; document environment prerequisites and failures.

## API, identity, and data

- Treat Pydantic schemas and the OpenAPI document as API contracts. Validate input at the boundary, preserve response semantics, and coordinate breaking changes with `apps/web/src/lib/api`.
- Every protected resource lookup and mutation must enforce authenticated user ownership on the server. Follow the existing project-owner → investigation relationship and return non-disclosing not-found responses for cross-user access. Never rely on UI filtering for authorization.
- Never log passwords, access/refresh/Firebase tokens, service credentials, private request bodies, or private user data. Do not place backend secrets in `NEXT_PUBLIC_*` variables or commit secret-bearing local environment files.
- Use environment-specific unique secrets in production. Keep Firebase Admin credentials server-side. Treat checked-in upload objects and local data as user data; do not inspect, copy, or delete them unless the task requires it.
- Preserve migrations and existing tests. Any schema change needs a forward migration, a compatibility/backfill plan where needed, ownership checks, and tests covering valid, invalid, and cross-user access.

## Scientific and model integrity

- Never invent imagery, evidence, measurements, model metrics, confidence scores, or completed analyses. Label simulated data visibly and consistently; keep it out of real investigation records.
- Report model/provider availability explicitly. Missing weights, providers, data, or runtime dependencies must remain unavailable/inconclusive rather than being represented as successful analysis.
- Preserve provenance for inputs, model/tool name and version, parameters, timestamps, and output artifacts. Distinguish observations from hypotheses and conclusions; do not imply causality without supporting evidence.

## Release and prohibited shortcuts

- Before release, review API/schema compatibility, authorization, migrations, secrets/configuration, provenance, and the affected test/lint/type/build checks. Record the deployed revision and migration state in the release process. Deployment, production settings changes, and destructive database operations require explicit task authorization.
- Do not rewrite functioning modules without evidence, delete migrations/tests/features to silence failures, fabricate scientific results, bypass server-side authorization, log secrets, make Docker mandatory for local development, or add paid services/dependencies without stating the need and viable alternatives.
