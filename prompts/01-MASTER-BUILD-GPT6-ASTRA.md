# SAATRAAI — Complete GPT-6 Astra Website Build Prompt

You are the lead architect, senior full-stack engineer, geospatial/remote-sensing ML engineer, UI/UX engineer, QA engineer and DevOps engineer for this repository.

PROJECT
- Name: SAATRAAI
- Expansion: Satellite AI for Autonomous Temporal Reasoning and Analysis of Intelligence
- Technical description: An Autonomous Evidence-Driven Earth Observation Investigator for Hypothesis-Based Spatio-Temporal Analysis
- Tagline: Observe. Investigate. Verify. Explain.
- SIH alignment: SIH26167 — SatQuery AI: An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries
- Category: Software
- Domain: AI / Remote Sensing / Geospatial Technology

PRIMARY GOAL

Build the actual working website/application, not a landing-page mockup and not a generic ChatGPT clone.

Core workflow:
Natural-language question → query interpretation → region/time identification → competing hypotheses → evidence planning → multimodal evidence acquisition → optical/SAR/temporal/geospatial analysis → hypothesis testing → contradiction/falsification search → missing-evidence detection → confidence/uncertainty → evidence provenance/graph → explainable conclusion.

Core sentence:
“Traditional systems answer a question. SAATRAAI investigates it.”

IMPORTANT RULES

1. Inspect the entire repository before coding.
2. Preserve useful existing work.
3. Do not rebuild working code unnecessarily.
4. Run the application and tests regularly.
5. Fix real errors; never hide errors.
6. Never fabricate satellite observations, model outputs, measurements, sources, confidence values or research results.
7. Never claim a model/provider is integrated unless it actually is.
8. Use environment variables for secrets; never commit keys.
9. If a live provider is unavailable, create a clean provider interface and a clearly labelled deterministic/demo fallback.
10. Distinguish prototype/demo functionality from live scientific processing.
11. Prefer working vertical slices over unfinished abstractions.
12. Make reasonable engineering decisions without repeatedly asking for approval.
13. Before declaring completion, run lint/type checks/tests/build and exercise the main user journey.

PRODUCT

SAATRAAI is an Earth Observation investigation platform for questions such as:
- Why has flooding increased in this region between 2022 and 2026?
- Has urban expansion reduced vegetation around this city?
- What changed after the 2024 flood?
- Is an apparent land-cover change supported by satellite evidence?
- Which hypotheses could explain an observed change?
- What evidence is missing before a stronger conclusion can be made?

Separate:
observation, interpretation, hypothesis, evidence, contradiction, uncertainty, conclusion.

Use cautious scientific language:
“The evidence supports…”
“This hypothesis is strengthened by…”
“This hypothesis is weakened because…”
“Available evidence is insufficient to determine…”

Never turn correlation into definitive causation.

STACK

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or equivalent
- MapLibre GL JS or Leaflet
- Recharts or equivalent
- Lucide

Backend:
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

Data:
- PostgreSQL + PostGIS
- Redis for jobs/status
- Neo4j behind an abstraction for evidence graph

Scientific/GIS:
- GeoPandas
- Rasterio
- GDAL where available
- Shapely
- PyTorch/Hugging Face/model adapters as appropriate

Keep providers and ML models behind replaceable interfaces.

FRONTEND

Create a premium research-grade Earth Observation workstation, not a generic AI-chat UI.

Landing page:
Hero: “Investigate Earth. Don’t Just Ask It.”
Subheading: “SAATRAAI turns natural-language Earth observation questions into evidence-driven spatio-temporal investigations.”
Buttons: Start Investigation, Explore Demo.

Sections:
1. Problem
2. Investigation workflow
3. Multimodal evidence
4. Competing hypotheses
5. Falsification
6. Evidence graph
7. Interactive map
8. Example investigations
9. Research foundation
10. Technology
11. Scientific limitations
12. Team
13. Contact
14. Footer

Do not make unsupported marketing claims.

WORKSPACE

Left:
- SAATRAAI identity
- New Investigation
- history
- current question
- status
- hypotheses
- progress

Center:
- large interactive Earth map
- ROI
- imagery
- evidence layers
- change layers
- selected evidence
- temporal comparison

Right:
- hypotheses
- status
- confidence/uncertainty
- evidence count
- supporting evidence
- contradicting evidence
- missing evidence
- sources/timestamps
- expandable “Why?”

Bottom:
- temporal timeline, e.g. 2022 → 2023 → 2024 → 2025 → 2026

Mobile:
- evidence drawer/bottom sheet
- horizontal timeline
- usable map
- no horizontal overflow
- touch-friendly controls
- accessible focus states
- reduced motion

MAP

Implement:
- pan/zoom
- location search
- polygon/rectangle drawing
- clear ROI
- layer toggle
- opacity
- legend
- scale
- coordinates
- selected evidence
- before/after comparison
- optional swipe comparison

Possible layers:
- base map
- optical
- SAR
- flood extent
- built-up
- vegetation
- change detection
- DEM/slope
- evidence markers

Use proper GIS operations for spatial calculations.

BACKEND SERVICES

Implement clean modules/services:
- QueryInterpreter
- InvestigationPlanner
- HypothesisGenerator
- EvidencePlanner
- EvidenceAcquisitionService
- OpticalAnalysisService
- SARAnalysisService
- TemporalAnalysisService
- ChangeDetectionService
- GISAnalysisService
- HypothesisTestingService
- FalsificationService
- MissingEvidenceService
- ConfidenceService
- EvidenceGraphService
- InvestigationOrchestrator

Suggested:
backend/app/
  main.py
  api/
  core/
  models/
  schemas/
  services/
  repositories/
  agents/
  evidence/
  geospatial/
  ml/
  providers/
  graph/
  workers/
  tests/

QUERY INTERPRETER

Convert natural language into validated structured data:
- question
- geographic entity
- coordinates/polygon/bbox
- time range
- phenomenon
- analysis type
- requested evidence

Example:
{
  "question": "Why has flooding increased here between 2022 and 2026?",
  "region": {"type": "bbox", "coordinates": []},
  "time_range": {"start": "2022-01-01", "end": "2026-01-01"},
  "phenomenon": "flooding",
  "analysis_type": "causal_hypothesis_investigation"
}

Validate dates and geometry.

HYPOTHESES

Generate multiple competing explanations.

Flood example:
1. increased rainfall
2. urban/built-up expansion
3. vegetation loss
4. terrain susceptibility
5. drainage/infrastructure change
6. combinations/interactions

Each hypothesis needs:
- ID
- statement
- expected evidence
- weakening evidence
- required data
- status

Do not force a single explanation.

EVIDENCE PLANNER

For each hypothesis define:
- evidence required
- source type
- spatial requirement
- temporal requirement
- analysis method
- expected output
- possible contradiction

EVIDENCE ACQUISITION

Create provider abstractions for:
- optical satellite imagery
- SAR
- DEM/topography
- rainfall/weather
- land-cover
- vector/GIS
- optional contextual sources
- user-uploaded data

Prefer open/public/free-tier sources where practical.

Potential sources:
- Sentinel-1
- Sentinel-2
- Copernicus/open geospatial services
- public DEM/weather sources
- user-uploaded imagery

Never hardcode credentials.

MULTIMODAL ANALYSIS

Support modular adapters for:
- classification
- object detection
- segmentation
- land-cover analysis
- flood extent
- vegetation
- change detection
- VQA
- grounding
- temporal comparison
- SAR analysis
- GIS statistics

Separate:
- deterministic GIS computation
- ML inference
- LLM reasoning

MODEL REGISTRY

Create metadata:
- id
- name
- type
- input types
- output types
- provider
- version
- availability

Potential research foundations:
RSVQA, SeCo, SatMAE, BIT, SpectralGPT, SatlasPretrain, SSL4EO-S12, RemoteCLIP, GEO-Bench, CROMA, Prithvi-EO, GeoChat, EarthGPT, SkyEyeGPT, LHRS-Bot, TEOChat, AnySat, TerraMind, Change-LISA, Earth-Agent.

Do not claim integration unless actually integrated.

HYPOTHESIS TESTING

Statuses:
- SUPPORTED
- WEAKENED
- CONTRADICTED
- INSUFFICIENT_EVIDENCE
- PENDING

Store:
- evidence IDs
- supporting evidence
- contradicting evidence
- missing evidence
- confidence
- provenance

Do not invent arbitrary percentages.

FALSIFICATION

For every hypothesis actively search for evidence that could weaken it.

Example:
“Urban expansion caused increased flooding.”
Supporting: built-up area increased.
Weakening: little/no built-up change in affected floodplain, flooding outside developed areas, or rainfall anomaly better matches timing.

MISSING EVIDENCE

Explicitly report:
- unavailable rainfall
- cloud-covered optical scenes
- insufficient temporal observations
- missing drainage/infrastructure data
- inadequate resolution
- uncertain geolocation
- insufficient SAR coverage

Never fabricate missing evidence.

CONFIDENCE

Represent uncertainty at:
- data level
- model level
- hypothesis level
- investigation level

Consider when supported:
- evidence quality
- spatial/temporal coverage
- cross-modal agreement
- contradictions
- missing evidence
- model confidence

If heuristic, label it heuristic. Avoid false precision.

EVIDENCE GRAPH

Represent:
Question → Hypothesis → Evidence Requirement → Data Source → Acquisition → Timestamp → Region → Analysis → Model Output → Supporting/Contradicting Evidence → Confidence → Conclusion.

Use Neo4j if configured, but keep a service/repository abstraction and local development fallback.

DATABASE

Use PostgreSQL/PostGIS.

Entities:
users
investigations
investigation_queries
regions
hypotheses
evidence_items
evidence_sources
data_assets
analysis_runs
model_runs
hypothesis_evaluations
contradictions
missing_evidence
confidence_records
timeline_events
graph_nodes
graph_edges

Every derived result should be traceable to source, timestamp, region, processing step, model/tool and version where possible.

JOBS

Long-running work must not block HTTP requests.

Use Redis-backed tasks or equivalent for:
- imagery processing
- ML inference
- evidence acquisition
- graph updates

Expose job ID, progress, status, retry/failure state and cancellation where practical. Use polling/SSE/WebSocket.

AUTH

If authentication is present/needed:
- secure OAuth or email authentication
- user-specific investigations
- protected routes
- authorization
- logout
- secure sessions/JWT as appropriate

Never expose another user's data.

UPLOADS

Support appropriate:
- GeoTIFF
- PNG/JPEG
- CSV
- GeoJSON
- JSON
- safe ZIP where needed

Validate file type, size, CRS, geometry and raster dimensions. Process large files asynchronously.

SECURITY

Implement:
- .env.example
- input validation
- upload limits
- MIME validation
- path traversal protection
- CORS
- authentication/authorization
- safe error messages
- no secrets in logs
- no secrets in frontend
- no API keys committed

DEMO

Create a deterministic SIH demo:
“Why has flooding increased in this region between 2022 and 2026?”

Show:
- ROI
- timeline
- competing hypotheses
- change layers
- supporting evidence
- contradiction
- missing evidence
- final explanation

If precomputed, label DEMO/SAMPLE. It must be reproducible and should not rely on a fragile live API during presentation.

RESULT

Show:
1. question
2. region
3. time range
4. executive conclusion
5. hypotheses
6. supporting evidence
7. contradicting evidence
8. missing evidence
9. confidence/uncertainty
10. map
11. timeline
12. sources
13. methodology
14. limitations
15. evidence graph/provenance

Use qualified scientific language and never generate fake numbers.

PROGRESS

Display actual states:
✓ Investigation initiated
✓ Location identified
✓ Time range identified
✓ Hypotheses generated
✓ Evidence plan created
→ Satellite evidence collected
→ Temporal change analyzed
→ Rainfall checked
→ Contradictory evidence searched
→ Missing evidence identified
→ Confidence estimated
→ Conclusion prepared

Only mark a step complete after the backend confirms it.

EVALUATION

Create evaluation for:
- query parsing
- region extraction
- temporal extraction
- hypothesis quality
- evidence retrieval
- change detection
- segmentation
- contradiction detection
- missing-evidence detection
- confidence calibration
- factuality
- provenance completeness
- latency
- failure rate

Use appropriate metrics such as IoU, F1, precision, recall, MAE/RMSE and calibration error where relevant.

TESTING

Implement unit, API, DB, GIS, model/provider, orchestration and evidence-graph tests plus frontend tests where practical.

Critical E2E:
Question → parse → hypotheses → evidence plan → tool execution → evaluation → final response.

Test:
- invalid geometry
- invalid dates
- provider unavailable
- API timeout
- model failure
- no imagery
- missing evidence
- contradictory evidence

OBSERVABILITY

Structured logs:
- investigation_id
- request_id
- step
- tool
- model
- start/end
- status
- error

Never log secrets.

DESIGN

Visual direction:
- research-grade
- futuristic
- geospatial
- premium
- dark scientific UI
- blue/teal accents
- subtle neon
- restrained glass
- strong typography
- map-first composition
- meaningful motion

Avoid:
- excessive glow
- generic AI sparkle graphics
- huge gradients
- random 3D objects
- meaningless animation
- fake satellite imagery
- fake dashboard numbers

PERFORMANCE

Optimize map rendering, raster handling, API payloads, spatial indexes, caching, async jobs, lazy loading and bundle size. Do not load huge imagery into the browser unnecessarily.

DOCUMENTATION

Create/update:
README.md
ARCHITECTURE.md
DEVELOPMENT.md
API.md
DATA_SOURCES.md
MODELS.md
RESEARCH.md
EVALUATION.md
SECURITY.md
DEMO.md
.env.example

Include installation, environment, database, frontend/backend/workers, tests, demo, deployment and limitations.

DEPLOYMENT

Prepare for Vercel frontend, Render/Railway/Fly.io/equivalent backend, managed PostgreSQL/PostGIS and managed Redis. Do not force Docker if the existing project intentionally does not use it.

IMPLEMENTATION ORDER

Phase 1: audit, frontend shell, backend health/API, DB, configuration.
Phase 2: investigation, query interpreter, hypotheses, evidence planner.
Phase 3: map, ROI, timeline, evidence panel.
Phase 4: deterministic demo, optical/SAR interfaces, change detection adapter, GIS.
Phase 5: orchestration, progress, hypothesis testing, contradiction, missing evidence.
Phase 6: provenance, graph, confidence.
Phase 7: auth, uploads, user isolation, security.
Phase 8: evaluation, tests, performance, accessibility, deployment.

DEFINITION OF DONE

The application is done only when:
1. frontend starts
2. backend starts
3. database connects
4. investigation can be created
5. query can be parsed
6. hypotheses generated
7. evidence plan generated
8. progress visible
9. ROI displayed
10. temporal state works
11. evidence attaches to hypotheses
12. support/contradiction works
13. missing evidence works
14. final answer is traceable
15. demo works end-to-end
16. tests pass
17. no secrets committed
18. docs work
19. production build succeeds
20. mobile layout works

FINAL VERIFICATION

Run dependencies, lint, typecheck, backend tests, frontend tests, production build, frontend/backend startup, demo, browser smoke test, desktop/mobile checks, database migration checks, environment checks and git diff review.

Then report:
- completed
- partially completed
- deferred
- known limitations
- commands
- tests/build results
- next steps

START NOW.

Audit the repository first. Build real functionality in vertical slices. Run it. Test it. Fix it. Document it. Do not merely create a design concept.
