# Frontend investigation workspace

## Run and verify

From `apps/web`:

```powershell
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
npx playwright install chromium
```

`npm run test:e2e` builds the app, starts the production Next.js server on `127.0.0.1:3100`, and mocks the FastAPI contract at `127.0.0.1:8000`; it does not write to a database or claim that its fixtures are real imagery or analysis. The browser binary is installed separately from the test package.

## Backend contract used

- `GET /api/v1/users/me` restores the authenticated user; the existing Google Identity Services flow exchanges identity through the configured Firebase or Google bridge integration. The frontend does not add a new auth endpoint or password sign-in flow.
- `GET/POST /api/v1/projects` list and create projects. Investigation creation requires a user-selected project ID.
- `POST /api/v1/investigations` accepts `project_id`, `title`, and optional `configuration`; the configuration persists the analyst's question, region polygon/source, dates, evidence source types, and deterministic planning checklist.
- `POST /api/v1/investigations/{id}/queries` records the first query. `GET` for the investigation and its queries returns the stored records and status.
- `POST /api/v1/investigations/{id}/images` accepts one image or a validated pair. The backend currently returns image metadata only; the frontend does not expose local storage URIs as public image URLs.
- `POST /api/v1/investigations/{id}/executions` requires a query, one or two ingested image IDs, parameters, and an `Idempotency-Key`. `GET` execution list returns `{items: ExecutionTrace[]}`. A failed or `NOT_IMPLEMENTED` trace is shown as a failed/unavailable run.
- Read endpoints for images, executions, evidence, hypotheses, and conclusions feed the workspace. Evidence and analysis panels display only API records; an empty list remains empty.

The source of truth is the backend schema under `apps/api/app/schemas` and route/service code under `apps/api/app`. Protected-resource authorization remains server-side.

## Map and data limits

The map is MapLibre GL JS (`maplibre-gl` and `react-map-gl` were already installed). The region editor supports pan/zoom, preset selection, coordinate and place lookup, rectangle/polygon drawing, GeoJSON, and vertex edits. Tile styles currently include Esri World Imagery, CARTO Dark Matter/Voyager, and OpenTopoMap. Their attribution controls remain visible. These are contextual basemaps; they are not SAATRAAI analysis imagery and no provider catalog acquisition endpoint exists in the current API.

An investigation can be created without imagery. Uploading a scene and running it uses the real API contract; model/provider absence is surfaced from the returned execution trace. Current GeoChat requires server-installed model weights, while other registered tools may return `NOT_IMPLEMENTED`. Investigation status reflects the API response; the frontend does not animate a synthetic progress sequence.

If `NEXT_PUBLIC_API_URL` is missing, API calls fail with a setup message and API health probes report unavailable. No production request falls back to a visitor's `localhost`.
