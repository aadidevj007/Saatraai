# Database (Phase 1)

## Responsibilities

PostgreSQL stores users, projects, investigations, queries, image metadata (not rasters), tasks, model runs, hypotheses, evidence, conclusions, and reports.

PostGIS stores normalized EPSG:4326 geometries on `image_metadata` (`footprint_geometry`, `bounding_geometry`, `centroid_geometry`). Original CRS text is retained on the same row.

Redis is configured (`redis://localhost:6379/0`) for later job execution. It is not a source of truth.

Neo4j is not deployed in Phase 1.

## Identity and investigation graph

`users` → `projects` → `investigations` → `queries` / `uploaded_images` / `tasks` / `hypotheses` / `evidence` / `conclusions` / `reports`.

Externally exposed IDs are UUIDs. Timestamps are timezone-aware UTC (`created_at`, `updated_at`).

## Migrations

Alembic lives in `apps/api/alembic`. Do not reinitialize. `env.py` loads SQLAlchemy metadata from `app.models` and ignores reflected PostGIS support tables during autogenerate.

Current head: `2f63ab0f6a5c`.

## Storage

Raster bytes are not stored in PostgreSQL. `uploaded_images` and `image_metadata.storage_location` hold references only.
