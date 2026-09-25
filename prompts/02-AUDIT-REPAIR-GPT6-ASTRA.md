# SAATRAAI — GPT-6 Astra Audit and Repair

Audit the existing repository as a senior full-stack, geospatial and ML engineer. Do NOT rebuild from scratch.

Inspect and run:
- frontend
- backend
- database/migrations
- APIs
- map/GIS
- investigation orchestration
- hypotheses/evidence/falsification
- missing evidence
- provenance/evidence graph
- authentication/uploads
- responsive UI
- tests/build

Required workflow:
Question → interpretation → region/time → competing hypotheses → evidence plan → evidence acquisition → analysis → hypothesis testing → contradiction search → missing evidence → uncertainty → evidence graph → explanation.

Fix the highest-impact issues while preserving working code.

Never invent satellite data, metrics, sources or model results. Never claim unsupported integrations. Never silently swallow exceptions. Keep providers behind interfaces and secrets out of source control.

Run lint, typecheck, backend tests, frontend tests, production build and an end-to-end smoke test.

Finish with:
## Fixed
## Still incomplete
## Known limitations
## Tests run
## Build status
## Next steps

Then commit the fixes with a clear commit message.
