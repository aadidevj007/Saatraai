# ADR-001: PostgreSQL as source of truth; Neo4j later for provenance graph

## Status

Accepted (Phase 1).

## Context

The system needs transactional ownership, geospatial metadata, and later an evidence graph.

## Decision

Use a single PostgreSQL/PostGIS database for all transactional entities. Do not create one database per user. Defer Neo4j until Phase 6. Graph sync will be idempotent and keyed by PostgreSQL UUIDs.

## Consequences

Phase 1 APIs and tests talk only to PostgreSQL. Evidence relationships exist as foreign keys today. Graph visualization waits for Phase 6.
