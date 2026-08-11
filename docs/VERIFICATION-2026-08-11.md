# Apex Fit UI, Cycle Flow, and Two-Week Cut Verification

Verified on August 11, 2026 against the local Windows-supervised application and the live SQLite database.

## Release gates

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 57 static pages were generated. The existing ESLint circular-configuration warning remains.
- `python -m pytest python-api/tests/unit -q`: 28 passed in the latest flow-repair run.
- Focused TypeScript regression coverage: 22 passed across nine files, including program/profile preservation, cycle/report scoping, challenge contracts, palette/nutrition behavior, report parity, and theme behavior.
- Playwright modern-workspace suite: 11 passed with one Chromium worker. Earlier feature verification also exercised the seven Settings palettes, responsive sidebar navigation, dashboard challenge discovery, Plan Studio, and the fourteen-day Template Editor.
- 22 checked application routes returned HTTP 200.
- `openspec validate add-two-week-cut-challenge --strict`: passed.
- `openspec validate update-interface-palettes-and-feature-lab --strict`: passed.
- `openspec validate add-ai-ped-inventory-scheduler --strict`: passed.
- `git diff --check`: passed.

## Live runtime and data

- Dashboard: `http://localhost:3010`
- FastAPI root/status: `http://localhost:8313`
- FastAPI health: `http://localhost:8313/health`
- The FastAPI root JSON status is expected; the dashboard is on port `3010`.
- SQLite is the application source of truth. `PRAGMA quick_check` returned `ok` during the verified repair/release work.
- Cloud sync remains disabled with status `provider_required`.
- WSL Docker is not serving the Apex frontend or FastAPI application. The only expected Apex component in Docker is Redis on host port `6385`.
- The pre-repair/migration database backup is stored under `data/backups/`.

## Desktop-shortcut finding

- `ApexFit Tracker.lnk` and `Stop ApexFit.lnk` on the OneDrive Desktop point to the removed path `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app`.
- Their target `.cmd` files therefore do not exist at the shortcut destination.
- The current repository's `Launch-ApexFit.cmd` and `Stop-ApexFit.cmd` also contain that stale `cd` path internally.
- The verified safe commands are currently `python .\_ops\apex_lifecycle.py start` and `python .\_ops\apex_lifecycle.py stop` from the real project root.
- No shortcut was modified during this documentation-only pass.

## Standard-cycle/profile repair verification

- The live profile remains present after beginning a new program.
- The active standard cycle is `cyc-20260811-live-repair`, starts on `2026-08-11`, and ends on `2026-12-01`.
- Its baseline is 270.5 lb and 38.5% body fat; its recorded goals are 220 lb and 13% body fat.
- Exactly one cycle is active. Prior cycles were stopped, not deleted.
- The active cycle has no weigh-in days selected yet, so n8n send/test correctly requires schedule setup before delivery.
- The older report associated with the June 3 stopped cycle was preserved. Report Center no longer treats that stopped cycle as current.
- New Program copies the current profile into an editable review, creates a real standard cycle and baseline, and uses client compensation if the later profile write fails.
- Entry save confirms persistence before navigation and no longer waits for a report job.
- Dashboard generation enters Report Center; Living Report inputs are selected-cycle scoped and use floor-based week math.
- Report artifact ingestion and display deduplicate equivalent backed files without deleting historical database rows.

## Two-week report readiness

- The editable Two-Week Emergency Cut template is imported and has revision history.
- No 14-day cycle was activated during verification. Activation mutates live state and requires the user to select a start date, two consecutive source-protocol weeks, exact confirmed inventory, review evidence, and acknowledgements.
- After activation, Reports can generate `progress`, `final`, or `stopped_early` output from the immutable plan snapshot.
- The two-week report includes plan/template/protocol revisions, source fingerprint, calorie/protein targets and actuals, exact source-backed PED schedule, inventory coverage/review, training/cardio instructions and completion, recovery/measurement logs, amendments, safety state, and completion totals when those records exist.
- The deterministic report reflects the frozen PED schedule/inventory snapshot without requiring AI. AI explanation remains roadmap work and may not mutate the report or schedule.
- Existing standard-cycle and Living Report history remains preserved.

## Navigation performance

The supervised frontend currently runs `next dev`. A route can take several seconds the first time it compiles after a restart. Checked warmed primary routes returned HTTP 200. Explicit sidebar routing and prefetch behavior were covered by Playwright.

A future move to production runtime must use a verified standalone build/copy/start lifecycle. It was not attempted here because the supervisor has independent user-owned edits and was intentionally excluded from this documentation-only work.

## Remaining verified gaps

- Standard-program creation is compensated across separate requests, not atomic in one backend transaction.
- Modern challenge/dashboard surfaces still contain hard-coded colors that do not all consume the selected palette.
- Some Settings values can show local success before/without confirmed server consumption.
- Unit/date/notification/privacy preferences are not fully enforced.
- n8n is unsigned/browser-side, has no app retry ledger, and relies on downstream idempotency enforcement.
- Test routes remain in the production route manifest.
- Firefox/WebKit verification was not run because their local browser binaries were unavailable.
- Older broad contract/integration suites still contain assertions for retired endpoints, historical ports, an older theme schema, and a Vitest structured-clone failure.

See [`ADVERSARIAL-FLOW-REVIEW-2026-08-11.md`](ADVERSARIAL-FLOW-REVIEW-2026-08-11.md) for evidence and dispositions.
