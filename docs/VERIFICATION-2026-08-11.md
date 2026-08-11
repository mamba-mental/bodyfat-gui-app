# Apex Fit UI and Two-Week Cut Verification

Verified on August 11, 2026 against the local Windows-supervised application and the live SQLite database.

## Release gates

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 57 static pages were generated and the challenge, nutrition, plan, report, settings, and AI routes were included in the production route manifest.
- `python -m pytest python-api/tests/unit -q`: 21 passed.
- Focused TypeScript unit coverage passed for the shared challenge contract, palette registry, nutrition import/aggregation, report parity, and non-blocking theme behavior.
- Playwright release suite: 15 passed with one Chromium worker. Coverage includes all modernized workspace destinations, the seven Settings palettes, responsive sidebar navigation, dashboard challenge discovery, Plan Studio, and the fourteen-day Template Editor.
- `openspec validate add-two-week-cut-challenge --strict`: passed.
- `openspec validate update-interface-palettes-and-feature-lab --strict`: passed.
- `git diff --check`: passed.

## Live runtime and data

- User dashboard: `http://localhost:3010`
- FastAPI health/root: `http://localhost:8313`
- SQLite is the application source of truth. `PRAGMA quick_check` returned `ok`.
- Cloud sync remains deliberately disabled with status `provider_required`; the local store is SQLite.
- WSL Docker is not serving the Apex frontend or FastAPI application. The only Apex application component in Docker is the healthy `apex-fit-redis` container on host port `6385`.
- The pre-migration database backup is stored under `data/backups/`.

## Two-week report readiness

- The editable Two-Week Emergency Cut template is imported and has revision history.
- No 14-day cycle has been activated in the live database yet. This is intentional: activation requires the user to select a start date, select two consecutive source-protocol weeks, and acknowledge the safety/source constraints.
- After activation, Reports can generate `progress`, `final`, or `stopped_early` output from the immutable plan snapshot.
- The two-week report contains plan/template/protocol revisions, source fingerprint, calorie and protein targets and actuals, the exact source-backed PED schedule, daily training/cardio instructions and completion, recovery/measurement logs, amendments, safety state, and completion totals.
- Existing standard-cycle and Living Report records remain unchanged.

## Navigation performance

The supervised frontend currently runs `next dev --turbopack`. A route can therefore take several seconds the first time it compiles after a restart. After warm-up, every checked primary route returned HTTP 200 in approximately 0.46–1.88 seconds. Explicit sidebar routing and prefetch behavior were fixed and covered by Playwright. A future operational change from the development server to `next start` should be assessed separately because the supervisor script has independent local edits and was intentionally not modified in this work.

## Known baseline-test debt

Older broad contract/integration suites still contain assertions for retired endpoint paths, historical port assumptions, an older theme schema, and a Vitest structured-clone failure. Those baseline failures predate this feature and were not treated as evidence against the focused release gates above. They should be modernized in a separate test-harness cleanup so the broad suites once again represent the current application contract.
