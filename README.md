## SAATRAAI

SAATRAAI is an evidence-driven Earth observation investigation platform. It
turns a question into hypotheses, an evidence plan, multimodal analysis, and
an explainable conclusion without presenting unsupported causal claims as
facts.

### Current implementation

The repository is being built incrementally. Phase 1 currently includes:

- A Next.js workspace with a responsive landing page and investigation workspace.
- A visibly labeled DEMO MODE with a query editor, interpreted-query preview,
	hypothesis review, evidence completeness state, timeline control, and map
	canvas.
- A FastAPI service with JWT authentication, user-owned projects and
	investigations, image ingestion, tool registry, and observable orchestration
	traces.
- PostgreSQL/PostGIS and Redis Docker services with Alembic migrations.

The web demo does not claim satellite findings. Real-mode analysis requires a
configured provider, available imagery, and a processing/model pipeline. The
current API architecture leaves those integrations behind provider and model
interfaces so they can replace demo adapters without changing the UI contract.

### Run locally

Start infrastructure with `docker compose up -d`, then run the API from
`apps/api` using the project requirements and run the web app from `apps/web`:

```text
npm install
npm run dev
```

The web app is available at `http://localhost:3000`; the API health endpoint is
`http://localhost:8000/health`. API authentication and database setup are
required before user-owned investigation data can be loaded into the web UI.

### Roadmap

Next slices are authenticated web flows, persisted query interpretation and
hypothesis planning, background job status, then real satellite/geospatial
providers and evidence reasoning. Neo4j evidence graph integration and report
export remain later phases.
