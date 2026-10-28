# SAATRAAI Browser QA Report

Date: 2026-10-23 (repeat run)
Role: independent, read-only browser QA
Targets: production `https://saatraai.vercel.app/`; local integrated build `http://127.0.0.1:3101/`

## Summary

Production navigation was retried and remains blocked by the QA network policy (`net::ERR_NETWORK_ACCESS_DENIED` before an HTTP response). The local Next.js build was restarted on port 3101 and rechecked. Home returned HTTP 200; refresh, sign-in navigation, protected-route redirect, and narrow viewport layout worked. The local health request to `http://localhost:8000/health` is refused, and sign-in explicitly reports that Google sign-in is not configured. No authenticated or data-mutating workflow could be tested.

A local accessibility defect remains confirmed: six anchor elements contain nested buttons. No credentials were used and no persistent or production data was changed. The local server used for QA has been stopped after inspection. Screenshots are under [`screenshots/`](screenshots/).

## Test matrix

| Area | Production | Local integrated build | Evidence / notes |
|---|---|---|---|
| Initial load | BLOCKED | PASS | Production denied before response. Local home HTTP 200; title `SAATRAAI · Earth Intelligence Platform`. |
| Refresh and navigation | BLOCKED | PASS | Local home refreshed; Sign in reached `/auth/sign-in`; `/investigations/new` redirected to `/auth/sign-in`. |
| Responsive layouts | BLOCKED | PASS | Local home/sign-in checked at 390×844; viewport and document widths both 390px. |
| Console errors, requests, CORS, API host | BLOCKED | FAIL | Local `GET http://localhost:8000/health` → `ERR_CONNECTION_REFUSED`; Google Fonts → `ERR_NETWORK_ACCESS_DENIED`; a Three.js deprecated `THREE.Clock` warning. Production requests/CORS/host not observable. |
| Sign-in and sign-out | BLOCKED | BLOCKED | Local sign-in explicitly says Google sign-in is not configured and API unavailable. No account supplied; sign-out not reachable. |
| Protected routes, expired sessions, user isolation | BLOCKED | PARTIAL | Unauthenticated local `/investigations/new` redirected to sign-in. Expiry and user isolation need authenticated test users/backend. |
| Project creation and selection | BLOCKED | BLOCKED | Auth/backend unavailable; no persistent mutation attempted. |
| Investigation creation | BLOCKED | BLOCKED | Auth/backend unavailable; no persistent mutation attempted. |
| Query submission and investigation status | BLOCKED | BLOCKED | No authenticated investigation available. |
| Geographic area and date selection | NOT TESTED | BLOCKED | Investigation workspace is gated by sign-in. |
| Map render, pan/zoom, layers, selection | NOT TESTED | BLOCKED | Investigation workspace is gated; map interactions not reached. |
| Loading, empty, error, partial, unavailable, insufficient-evidence states | NOT TESTED | PARTIAL | Local API-offline state is visible. Analysis result states need backend responses and were not exercised. |
| Evidence details, dates, sources, claim fidelity | NOT TESTED | BLOCKED | No API-backed result available. |
| Keyboard, focus, labels, contrast, small screens | BLOCKED | FAIL | Visible solid focus outline observed; 390px width fits. Six nested `<a><button>` structures found. Contrast not comprehensively measured. |
| Refresh/API behavior with backend unavailable | BLOCKED | PARTIAL | Local sign-in refresh works; health probe fails and sign-in shows unavailable configuration. Production behavior unknown. |

## Findings

### QA-ENV-01 — Production host unreachable from QA environment

- **Severity:** P1 QA blocker; product impact unknown
- **Environment:** Production inspection environment
- **Status:** BLOCKED
- **Reproduction:** Navigate to `https://saatraai.vercel.app/` in Chromium.
- **Expected:** Receive the deployed page so UI, requests, and runtime states can be tested.
- **Actual:** Navigation fails before an HTTP response with `net::ERR_NETWORK_ACCESS_DENIED`. No production DOM, screenshot, response headers, console, API host, or CORS behavior was observable. Repeated in this run.
- **Network/console reference:** Browser navigation error `net::ERR_NETWORK_ACCESS_DENIED`; no HTTP status received.
- **Screenshot:** None; page did not load.
- **Suggested owner:** QA environment/network administrator and deployment owner.

### QA-ENV-02 — Local API and authentication dependencies unavailable

- **Severity:** P1 QA blocker for authenticated workflows
- **Environment:** Local integrated build
- **Status:** BLOCKED
- **Reproduction:** Open `http://127.0.0.1:3101/`, follow Sign in, inspect API/auth availability; inspect the browser network log.
- **Expected:** Configured backend and identity provider allow the agreed sign-in and protected workflows.
- **Actual:** Home reports `API OFFLINE`; health probe to `http://localhost:8000/health` is refused. Sign-in says `API UNAVAILABLE` and “Google sign-in is not configured.” These are local configuration observations, not claims about production.
- **Network/console reference:** `GET http://localhost:8000/health` → `net::ERR_CONNECTION_REFUSED`; Google Fonts request → `net::ERR_NETWORK_ACCESS_DENIED`; browser warning `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`
- **Screenshot:** [`local-home-desktop-2026-10-23.png`](screenshots/local-home-desktop-2026-10-23.png), [`local-sign-in-mobile-2026-10-23.png`](screenshots/local-sign-in-mobile-2026-10-23.png)
- **Suggested owner:** Backend/auth integration and local environment owners; frontend owner for handling the deprecation warning if still present in source/dependencies.

### QA-WEB-01 — Nested buttons inside links create duplicate interactive semantics

- **Severity:** P2 accessibility defect
- **Environment:** Local integrated build
- **Status:** FAIL
- **Reproduction:** Open local home and inspect the accessibility tree/DOM or tab through primary calls to action.
- **Expected:** Each action exposes one interactive element and receives one logical keyboard focus stop.
- **Actual:** Six `<a><button>…</button></a>` structures were observed. Nested interactive semantics can create redundant or invalid controls and keyboard navigation.
- **Network/console reference:** DOM inspection; no request involved.
- **Screenshot:** [`local-home-viewport-2026-10-23.png`](screenshots/local-home-viewport-2026-10-23.png); DOM is the authoritative evidence.
- **Suggested owner:** Frontend.

### QA-ENV-03 — Local QA server startup and port availability

- **Severity:** Informational
- **Environment:** Local workspace
- **Status:** PASS
- **Reproduction:** Start the existing Next.js production build on `127.0.0.1:3101` using the installed Node 24 binary. Port 3000 was checked and is free.
- **Expected:** Serve the existing build without changing global Node configuration or stopping an unrelated process.
- **Actual:** Next.js 16.3.4 started successfully; local routes responded. No process needed to be killed. QA server stopped after checks.
- **Screenshot:** Home and sign-in screenshots linked above.
- **Suggested owner:** None.

## Five highest-priority defects and blockers

1. **P1 blocker — Production cannot be inspected:** deployment unreachable from this QA network; production behavior remains unknown.
2. **P1 blocker — Local API unavailable:** localhost:8000 health request is refused; project and investigation flows cannot be exercised.
3. **P1 blocker — Local identity provider unconfigured:** sign-in is unavailable, preventing authenticated route and ownership checks.
4. **P2 confirmed defect — Nested link/button controls:** six instances on local home create invalid/redundant interactive semantics.
5. **P1 verification gap — Investigation/map/evidence path:** query, geography/date, map, execution status, evidence provenance, model-unavailable and insufficient-evidence states remain untested behind authentication/backend.

## Release recommendation

**Do not record browser QA as passed.** Production is unreachable and the local backend/auth setup prevents all core authenticated investigation testing. A P2 accessibility defect is confirmed locally. Repeat production checks from a permitted network and run the core workflows on an isolated test backend with approved test accounts before making a release QA decision.

## Scope and changes

Read-only browser QA. No product source was modified; no production data was accessed or changed. Only this QA report and screenshot artifacts are maintained. The local QA server was stopped after testing.
