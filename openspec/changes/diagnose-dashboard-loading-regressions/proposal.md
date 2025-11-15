## Summary
The dashboard experience in the Apex Fit application (`bodyfat-gui-app`) has regressed: widget statistics render empty, the persisted profile is not restored on startup, and the Next.js frontend can take a very long time to become interactive when served from the current development environment. The most recent browser failure surfaced a `ChunkLoadError` while loading `webpack.js`, indicating a possible deployment artifact or bundling integrity issue. This proposal covers a structured debugging and remediation plan for these blocking problems.

## Current Symptoms
- **Dashboard widgets show no data**: Cards rendered by `src/components/dashboard.tsx` and lazy chart modules (`src/components/charts/lazy-chart-components.ts`) never populate metrics despite existing entries in the Python API / Redis stack.
- **Profile initialization fails**: User profile data expected from `src/contexts/app-context.tsx` and `src/contexts/theme-context.tsx` is missing on first load, forcing a manual setup flow each session.
- **Severely degraded load time**: Frontend bundle requires several minutes to hydrate when served by the Docker stack (`apex-fit-dev`, `apex-fit-python-api-dev`, `apex-fit-redis-dev`) on Docker Desktop.
- **Webpack chunk loading error**: Browser console logs show `ChunkLoadError` while resolving `_next/static/chunks/webpack.js?v=1762247725137`, suggesting mismatched build assets or caching invalidation issues.

## Scope & Guardrails
- Do not modify or remove historical body composition entries stored in `data/bodyfat.db`.
- Favor the documented local development workflow (for example `start-dev.sh` or `START_WINDOWS.bat`) for reproduction and fixes; when possible, avoid introducing changes that break existing Docker compose definitions under `docker-compose.web-dev.yml` and `docker-compose.dev.yml`.
- Preserve current API contracts defined in `python-api/data_endpoints.py` and associated Next.js route handlers; this proposal focuses on diagnosing and fixing regressions without introducing breaking schema changes.
- Keep bundle size optimizations within Next.js best practices; no experimental build tooling migrations without separate authorization.

## Investigation Plan
1. **Reproduce locally**: Start the local frontend (Next.js dev server) and backend services (Python API and Redis or equivalent) using the documented scripts, then capture network traces, console errors, and server logs to confirm the failure modes.
2. **Instrument data flow**:
   - Trace initial data hydration path in `src/app/page.tsx`, `src/app/api/data/*`, and `src/contexts/app-context.tsx` to ensure requests to `apex-fit-python-api-dev` succeed and populate state.
   - Verify Redis-backed caches and local storage hydration logic for profile persistence.
3. **Analyze build artifacts**:
   - Compare `_next/static/chunks` timestamps against the running container image to detect mismatched builds or partial deploys on volume mounts.
   - Inspect Next.js server logs for dynamic import failures affecting lazy chart components.
4. **Performance profiling**:
   - Measure TTFB, first render, and hydration timings via Chrome DevTools, isolating backend API latency versus frontend bundle issues.
   - Monitor container resource utilization (CPU/RAM) using the `portainer-windows` MCP server.
5. **Identify root causes**: Determine whether issues originate from stale assets, state hydration bugs, API timeouts, or Redis misconfiguration, and document required fixes across frontend/backend layers.

## Deliverables / Remediation Actions
- Restore dashboard widget metrics by ensuring initial state contains current calculation data and charts hydrate without runtime import failures.
- Guarantee profile persistence across reloads via reliable storage (Redis/local storage/API) and align with existing `AppProvider` initialization semantics.
- Resolve chunk loading errors by repairing asset integrity (e.g., re-running Next.js build, adjusting outputFileTracing, clearing stale volumes) and implementing cache-busting safeguards if necessary.
- Improve load performance to an acceptable threshold (target: interactive within 10 seconds when served from Docker on a typical developer machine) by addressing the identified bottlenecks.
- Document findings and updated runbooks in change artifacts without modifying user-facing README files.

## Impacted Areas
- **Frontend**: `src/app/page.tsx`, `src/components/dashboard.tsx`, chart lazy loaders, API route handlers under `src/app/api/**`.
- **State Management**: `src/contexts/app-context.tsx`, `src/contexts/theme-context.tsx`, client-side persistence utilities in `src/lib/server-storage*.ts`.
- **Backend Services**: Python API endpoints in `python-api/`, Redis caching layer, Docker stack configuration and mounted volumes controlling Next.js build artifacts.

## Acceptance Criteria
- Dashboard widgets and charts display populated statistics using existing demo data immediately after the first page load with no manual refresh.
- Previously saved profile information auto-loads for the same user session without navigating through setup.
- Page becomes interactive within **≤10 seconds** after requesting the dashboard route from the current local development environment (for example `http://localhost:3000/` or the configured port), verified across at least two consecutive reloads.
- No `ChunkLoadError` or asset integrity warnings appear in the browser console or server logs during load.
- Automated regression coverage: update or create tests (unit/integration/E2E) that fail on the current build and pass after remediation for each issue category.

## Validation Strategy
- Run targeted integration tests (`python-api` and Next.js API routes) plus Playwright smoke tests covering dashboard rendering once fixes are implemented.
- Capture Chrome DevTools performance recordings pre/post fix and attach summaries to the change.
- Execute `openspec validate diagnose-dashboard-loading-regressions --strict` before requesting proposal approval.

## Risks & Mitigations
- **Risk**: Fix requires rebuild of container images disrupting other developers. **Mitigation**: Provide reproducible build steps and document any required environment resets.
- **Risk**: Latency originates from upstream data sources outside current stack. **Mitigation**: Add instrumentation to isolate Docker networking versus application regressions.
- **Risk**: Restoring profile persistence could expose stale or corrupt local storage entries. **Mitigation**: Implement versioned storage keys and migration logic.

## Dependencies
- Coordination with Docker stack orchestration via `portainer-windows` MCP server for log inspection and container restarts.
- Access to Redis instance (`apex-fit-redis-dev`) and SQLite dataset to verify state alignment.
- Collaboration with QA resources to run high-latency diagnostics on comparable hardware, ensuring the 10-second target is realistic.
