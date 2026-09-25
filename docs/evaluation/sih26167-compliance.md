# SIH26167 compliance matrix

Statuses: `IMPLEMENTED AND VERIFIED` | `IMPLEMENTED BUT NOT VERIFIED` | `PARTIAL` | `MOCK/PROTOTYPE` | `MISSING`

| Requirement | Implementation | Test | Evidence | Status |
| --- | --- | --- | --- | --- |
| PostgreSQL/PostGIS transactional store | Docker Compose PostGIS 16-3.4, SQLAlchemy models, Alembic | `tests/test_database.py`, `tests/test_geospatial.py`, `tests/test_models.py` | Alembic head `2f63ab0f6a5c`; PostGIS 3.4 | IMPLEMENTED AND VERIFIED |
| Redis available for later jobs | Compose Redis 7, `redis_url` setting | `tests/test_database.py::test_redis_accepts_ping` | Local PING | IMPLEMENTED AND VERIFIED |
| JWT auth + password hashing | `/api/v1/auth/register\|login\|refresh`, argon2 via pwdlib | `tests/test_authentication.py` | Register hashes; tokens issued | IMPLEMENTED AND VERIFIED |
| Project + investigation ownership | `/api/v1/projects`, `/api/v1/investigations` | `tests/test_investigation_api.py`, cross-user cases | 201 create; 404 cross-user | IMPLEMENTED AND VERIFIED |
| Current user | `GET /api/v1/users/me` | `tests/test_authentication.py` | 200 self; 401 anonymous | IMPLEMENTED AND VERIFIED |
| Single optical/SAR/pair inputs | Ingestion APIs exist beyond Phase 1 | `tests/test_image_ingestion.py` | Phase 2+ | PARTIAL |
| Single-image VQA | Registry/adapters exist | ML tests | Not Phase 1 | PARTIAL |
| Grounding / captioning | Adapters exist | ML tests | Not Phase 1 | PARTIAL |
| Bi-temporal change | Workflows exist | remote-sensing tests | Not Phase 1 | PARTIAL |
| Optical+SAR fusion | Workflows exist | remote-sensing tests | Not Phase 1 | PARTIAL |
| Remote-sensing adaptation | `ml/adaptation` | adaptation tests | Not Phase 1 | PARTIAL |
| Agentic orchestration | Tool registry/executions | orchestration tests | Not Phase 1 | PARTIAL |
| Evidence/hypothesis engines | Tables exist; engines not complete | model persist test | Schema only | PARTIAL |
| Neo4j evidence graph | — | — | Deferred Phase 6 | MISSING |
| Investigation workspace UI | Temporary Next.js connectivity page | — | Not Phase 7 | MISSING |
| Admin/research UI | — | — | Phase 8 | MISSING |
| Reports | Report table only | — | Phase 9 | PARTIAL |
| Benchmark evaluation | Planned adapters | — | Phase 10 | MISSING |
| Premium landing / 3D Earth | Temporary page only | — | Phase 11 | MISSING |
