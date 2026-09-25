# SAATRAAI — GPT-6 Astra UI, Mobile and Deployment QA

Audit the completed SAATRAAI application without changing its scientific architecture.

Make the UI feel like a premium Earth Observation investigation workstation: research-grade, map-first, information-dense, restrained futuristic, accessible and responsive.

Desktop: test landing page, investigation workspace, map, ROI, hypotheses, evidence, timeline, progress, provenance and final result.

Mobile:
- evidence panel as drawer/bottom sheet
- horizontally scrollable timeline
- touch-friendly map
- no horizontal overflow
- readable typography
- keyboard/focus accessibility
- reduced motion

Performance:
- bundle size
- map rendering
- unnecessary rerenders
- duplicate API requests
- image loading
- loading/error states

Deployment:
- environment variables
- production build
- backend start
- CORS
- API URL
- database
- health endpoint
- no secrets

Run lint, typecheck, tests, production build and browser smoke tests. Fix issues found. Do not add decoration unless it improves the investigation workflow.
