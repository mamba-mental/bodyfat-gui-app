## 1. Reproduce and capture evidence
- [ ] 1.1 Start or restart the local development servers for the frontend (Next.js) and backend (Python API and Redis or equivalent) using the documented scripts, ensuring a clean state.
- [ ] 1.2 Spin up the frontend in a browser session attached to the Chrome DevTools MCP server and confirm the dashboard route (`/`) exhibits the empty widgets and slow load behavior.
- [ ] 1.3 Collect browser console output and network traces (via Chrome DevTools MCP) demonstrating empty widgets, missing profile data, and the reported `ChunkLoadError`.
- [ ] 1.4 Capture application logs from the frontend dev server, Python API, and Redis (if used) and note any request failures or build-asset mismatches.

## 2. Diagnose data hydration failures
- [ ] 2.1 Trace the server/client data flow in `src/contexts/app-context.tsx`, `src/app/api/data/*`, and related hooks to confirm profile and calculation payloads reach the dashboard.
- [ ] 2.2 Verify Redis/local storage mechanisms for persisted profile data and ensure keys are populated after setup.
- [ ] 2.3 Add targeted instrumentation or temporary diagnostics (to be removed post-fix) to understand why widgets have zeroed metrics.

## 3. Resolve frontend asset issues
- [ ] 3.1 Inspect the build artifacts mounted in the `apex-fit-dev` container to confirm `_next/static/chunks` contents match the running build.
- [ ] 3.2 Address the `ChunkLoadError` root cause (e.g., rebuild frontend, adjust deployment volume mapping, or update Next.js config) and prove the fix through successive reloads.
- [ ] 3.3 Ensure lazy chart modules and other dynamic imports load without runtime errors.

## 4. Restore profile persistence and widget rendering
- [ ] 4.1 Implement fixes so profile data hydrates without re-running the setup flow.
- [ ] 4.2 Correct calculation/report fetching so dashboard widgets show the latest metrics on first render.
- [ ] 4.3 Add or update automated tests covering profile hydration and widget population flows.

## 5. Improve load performance
- [ ] 5.1 Profile page load (TTFB, hydration, script execution) via Chrome DevTools to isolate bottlenecks.
- [ ] 5.2 Apply optimizations (e.g., caching, code splitting verification, API latency fixes) to achieve ≤10 second time-to-interactive.
- [ ] 5.3 Document before/after metrics and confirm improvements by restarting the local development servers and reloading the dashboard.

## 6. Validation and sign-off
- [ ] 6.1 Run relevant unit/integration tests (`npm run test:integration`) and Playwright smoke tests that exercise the dashboard.
- [ ] 6.2 Execute `openspec validate diagnose-dashboard-loading-regressions --strict` and resolve findings.
- [ ] 6.3 Prepare change summary and attach evidence (logs, metrics) before requesting approval.
