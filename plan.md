# Stabilize Reporting Pipeline, AI Settings, Theming, Banner Standards, and Persistent History

> **Historical proposed plan.** Several items were implemented or superseded, while its JSON-persistence assumptions are no longer current. Use [`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md), active OpenSpec changes, and [`CURRENT_STATUS.md`](CURRENT_STATUS.md) for current status.

Status: Proposed
Owner: Kilo Code
Scope: Targeted fixes across reporting, AI Settings route, changelog hygiene, last-known-data fallback, theming, banner standards, and persistent history.

## Context

You generated a “Prime” report PDF via the terminal standalone app and want the web app to:

- Use the meticulously structured Python code in [new_prime_python_code](new_prime_python_code) for all calculations and reporting.
- Match the look/structure of the reference report at Z:\2024.0917 - Bf-estimator-v2\122924_bf-estimator-terminal\results\Master_Journey_Prime_Prime_20250916_164621.pdf.
- Use updated HTML templates in [templates](templates).

Other issues:

- The AI Settings page returns 404.
- [CHANGELOG.md](CHANGELOG.md) is out of date.
- New report generation should reuse the last entered data by default.
- Theme preference changes don’t persist/behave correctly.
- Banner images stretch; need standard size/aspect handling.
- Previous all-time entry history is missing and must persist across sessions.

## Goals

- Wire all report generation to the PRIME Python code path and the new templates.
- Fix and verify /settings/ai route in dev and production.
- Keep CHANGELOG current.
- Implement last-known-data fallback for report runs (server-side, durable).
- Make theme preference reliable and persistent.
- Standardize banner image sizing/aspect, removing warping.
- Restore and persist all-time entry history with a visible UI.

## Non-Goals

- Redesigning report content beyond updated templates (visual parity with reference).
- Changing the internal math/semantics of the PRIME Python code in [new_prime_python_code](new_prime_python_code).
- Introducing a new database (unless necessary and explicitly approved).

## Constraints & Assumptions

- Data persistence should leverage the project’s established data directory and constants used by API routes (ref: pattern in [src/app/api/ai/settings/route.ts](src/app/api/ai/settings/route.ts) and DATA_DIR usage).
- Python execution is done via the existing python-api service or direct spawn—reusing project patterns in [python-api](python-api) and [scripts](scripts).
- API keys remain on the server (no client-side storage), aligning with [src/app/api/ai/settings/route.ts](src/app/api/ai/settings/route.ts).
- Changes are incremental and include tests.

---

## Work Breakdown

### 1) Reporting: unify on PRIME Python and updated templates

Deliver a single backend orchestrator that:
- Validates incoming payload (schema, required fields).
- If no new payload, fetches last-known data from a persistent store (Task 4).
- Invokes PRIME Python deterministically (sync/async job).
- Renders HTML via updated templates in [templates](templates), produces PDF, saves to `exports/` and records audit metadata (inputs, versions, timestamps).

Key targets (likely):
- New API route: `src/app/api/reports/generate/route.ts`
- Integration with Python layer in [python-api](python-api) or `child_process` spawn wrapper (Windows/Linux compatible).
- HTML/PDF pipeline reads from [templates](templates).

Security & Quality:
- Validate inputs, sanitize template parameters, avoid untrusted HTML injection.
- Strip secrets from logs; provide correlation IDs in logs.

Acceptance tests:
- Happy path: New submission generates PDF matching updated templates; numbers match PRIME output.
- Fallback: Trigger without new data; output uses last-known data (see Task 4).
- Error path: Invalid inputs -> clear error JSON payload, no secrets leaked.

### 2) Fix AI Settings page 404

- Verify route at [src/app/settings/ai/page.tsx](src/app/settings/ai/page.tsx) exports a default component and does not throw during server render (Next’s soft 404 can occur if component throws).
- Ensure navigation path from [src/app/settings/page.tsx](src/app/settings/page.tsx) links to `/settings/ai` (client side) using `next/link` or `useRouter().push('/settings/ai')`.
- Build-time and run-time checks:
  - `next dev`: click navigation + direct URL entry `/settings/ai`
  - `next build` + `next start`: direct URL entry and refresh at `/settings/ai`
- Confirm API backing is stable: [src/app/api/ai/settings/route.ts](src/app/api/ai/settings/route.ts), [src/lib/ai-settings-service.ts](src/lib/ai-settings-service.ts), [src/hooks/use-ai-settings.ts](src/hooks/use-ai-settings.ts).

Acceptance tests:
- From settings hub to `/settings/ai` works.
- Direct URL `/settings/ai` works in dev and production, no hydration or 404.

### 3) Update CHANGELOG

- Review recent changes and document them in [CHANGELOG.md](CHANGELOG.md) (date, scope, user-visible changes).
- Add entries incrementally as each fix lands (this plan, AI Settings, reporting join, theme, banner, history).

Acceptance:
- CHANGELOG contains accurate entries with dates and categories (Added, Changed, Fixed).

### 4) “Use last entered data if no new data”

- Persist “last-known” payload (per user/session) on each successful submit.
- Fallback in the reporting orchestrator (Task 1) when payload is absent.
- Storage layer: durable JSON in [data](data) keyed by user (or global if single-user), using the same DATA_DIR strategy (ref pattern in `ai-settings` route).

Key artifacts:
- `src/app/api/reports/last-used/route.ts` CRUD
- Helper in `src/lib/reports-persistence.ts` for atomic read/write.

Acceptance:
- Submit once, then run without entering new data; output uses persisted last-known data.

### 5) Theme preference not working

- Inspect [src/app/layout.tsx](src/app/layout.tsx) and theme provider code in `src/contexts/theme-context.tsx`:
  - Persist theme in localStorage.
  - SSR-safe: apply theme class to `<html>` or `<body>` before paint (inline script or `suppressHydrationWarning` pattern).
  - Respect “system” mode via media query and listen for changes.
- Verify Settings UI writes/reads: [src/app/settings/page.tsx](src/app/settings/page.tsx).

Acceptance:
- Switching theme reflects immediately, persists across reloads, follows system when selected, and doesn’t flicker.

### 6) Standard banner size (no warping)

- Create a shared banner wrapper (component or utility class) with fixed aspect ratio (e.g., 16:9), enforce `object-fit: cover`, responsive sizing.
- Replace legacy direct `<img>` usage where needed.

Key artifacts:
- `src/components/ui/banner.tsx` (new)
- CSS utility (e.g., `.banner-16x9`) in [src/app/globals.css](src/app/globals.css) or in the component.

Acceptance:
- All banners render without stretching on multiple pages/devices, no CLS regressions.

### 7) Persist previous all-time entry history

- Implement a persistent ledger:
  - Append entries to server-side JSON in [data](data) per user (or reuse an existing schema if present).
  - Read endpoint returns full history for UI.
- UI: history view (tab/panel) in `settings` or `dashboard`.

Key artifacts:
- `src/app/api/entries/route.ts` (index or segmented routes for list/create)
- `src/app/settings/page.tsx` additions for an “All-time History” panel or link to a dedicated page.

Acceptance:
- Add entries across sessions; history shows the full list.
- Restart the server and confirm data persists.

---

## Testing Plan

- Unit tests:
  - Input validation for report payloads.
  - Theme utilities (persist, system mode detection).
  - Persistence helpers (atomic write/read, schema validation).
- API tests:
  - Reports pipeline orchestration (with and without payload).
  - Entries persistence endpoints.
  - AI settings API read/write happy/failure paths.
- E2E tests (playwright/cypress):
  - Navigate to `/settings/ai` (dev/prod), verify no 404.
  - Generate a report with new data; then generate again using fallback.
  - Toggle themes, reload, verify persistence.
  - Verify banner visuals via screenshot comparisons (optional).
  - Add entries; verify all-time list after server restart.

---

## Risks & Mitigations

- Python integration differences (web vs. terminal env):
  - Add a contract test between the web API and [new_prime_python_code](new_prime_python_code); assert deterministic outputs for a fixed fixture.
- File-backed persistence concurrency:
  - Use atomic writes (write temp + rename), lock-less single-process assumption, and input schema validation.
- Next.js hydration edge cases for theme:
  - Apply theme class at document root via inline script prior to hydration.

---

## Acceptance Criteria (Condensed)

- Reporting:
  - All web report generation uses PRIME Python and updated templates in [templates](templates).
- AI Settings:
  - `/settings/ai` is reachable via UI link and direct URL; works in dev and prod.
- CHANGELOG:
  - [CHANGELOG.md](CHANGELOG.md) updated with accurate entries for each fix.
- Fallback data:
  - Report generation without new inputs uses last-known persisted data.
- Theme:
  - Theme selection persists, follows system, avoids flicker.
- Banner:
  - Standard aspect ratio across pages; no stretching/warping.
- History:
  - All-time entries persist across restarts and are viewable in UI.

---

## Execution Order (Proposed)

1. AI Settings 404 hotfix + basic route validation tests.
2. Reporting orchestrator + PRIME Python integration + templates + PDF path (with tests).
3. Last-known-data persistence + API + integration into orchestrator.
4. Theme persistence and SSR-prepaint fix.
5. Banner standardization component and roll-out.
6. All-time entry history persistence (API + UI).
7. CHANGELOG updates as we land each piece.

---

## Artifacts to Create/Modify (Likely)

- `src/app/api/reports/generate/route.ts` (new)
- `src/app/api/reports/last-used/route.ts` (new)
- `src/lib/reports-persistence.ts` (new)
- `src/components/ui/banner.tsx` (new)
- `styles/globals.css` (utility or CSS vars for banners)
- Tests under `tests/` (API + E2E)
- Updates to `src/app/settings/page.tsx`
- Validation that `src/app/settings/ai/page.tsx` renders and routes correctly

---

## Approval

If you approve this plan, I will:
- Begin with the AI Settings 404 fix (small PR).
- Then implement the reporting orchestrator with PRIME Python + templates and last-known-data fallback.
- Address theming, banners, and history thereafter.
- Update [CHANGELOG.md](CHANGELOG.md) as each part lands.
