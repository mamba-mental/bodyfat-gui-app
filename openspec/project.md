# Project Context

## Purpose

Apex Fit is a local-first body-composition planning and progress application for a serious self-directed athlete. It combines measured profile/check-in data, the Python PRIME engine, standard and exact 14-day cycles, nutrition/adherence data, source-bound protocol tracking, and reproducible reports.

The system must make current state and provenance understandable without deleting history, silently switching cycle scope, or using AI to invent source/medical facts.

## Current technology

### Frontend

- Next.js 15 App Router, React 19, and TypeScript.
- Tailwind CSS plus shared UI primitives and semantic theme/palette variables.
- React Context/reducer/actions for application state.
- Recharts, Turndown, jsPDF, and local/browser preferences where explicitly documented.

### Backend and storage

- Python FastAPI and Pydantic.
- PRIME calculation/report modules under `python-api/new_prime_python_code/`.
- SQLite at `data/bodyfat.db` as the canonical local store.
- Generated report artifacts under `storage/reports/`.
- Optional Redis cache/fallback; never authoritative.

### Current local topology

```text
Browser -> Next.js :3010 -> FastAPI/PRIME :8313 -> SQLite
                                      |
                                      +-> report artifacts

Optional Redis in WSL/Docker -> host :6385
```

The current daily-use frontend/API are Windows-supervised. Full Docker Compose files are deployment candidates, not proof of the live topology.

## Product/domain rules

- Preserve the current member profile and all historical entries/reports when a new program begins.
- Copy the current profile into an editable new-program review, then create a first-class active cycle and new baseline.
- Enforce one active cycle per local user.
- Treat stopped/completed cycles as history; never silently select one as current.
- Confirm entry persistence before UI success/navigation.
- Keep entry saving and report generation separate.
- Scope Living Reports to the selected cycle and its dates.
- Treat a 14-day challenge as exactly 14 calendar days mapped to two PRIME weeks.
- Preserve immutable activated challenge plan/protocol/inventory snapshots; future changes become versioned amendments.
- Preserve literal source values, ranges, missing values, and hashes.
- Do not infer, substitute, rank, optimize, recommend, or prescribe PED compounds/doses.
- Separate member confirmation, documented human review, and clinical validation.
- AI may provide optional explanation/drafting only under the accepted capability's gates and may never mutate deterministic schedules/calculations/history.

## Current capabilities

- Modern route-based workspace with banner, responsive navigation, Light/Dark/System mode, and seven palettes.
- Profile/setup, standard 12/15/22-week selection, editable new-program review, entries, progress, calculator, nutrition, reports, AI settings/chat/insights, and settings.
- Exact 14-day preview/activation/command-center/template/amendment/report workflow.
- Manual PED inventory and deterministic two-week schedule coverage Tonight MVP.
- Active-cycle weigh-in schedule and optional report-triggered n8n webhook.

## Known incomplete work

- Atomic backend standard-program transaction.
- Complete palette-token coverage on modern pages.
- Awaited/enforced Settings consumers.
- Server-side signed n8n delivery with retries/audit.
- Full AI/universal-duration PED inventory scheduler beyond the approved Tonight MVP.
- Production standalone local lifecycle, test-route gating, and Firefox/WebKit release verification.

## Coding conventions

- Functional React components and hooks.
- Absolute `@/` imports and kebab-case files/PascalCase components.
- Preserve type fidelity across TypeScript, Next, Pydantic, repositories, and SQLite.
- Prefer semantic theme tokens; do not add new hard-coded prototype colors.
- Date-only values use `YYYY-MM-DD`; avoid timezone-shifting date parsing.
- Do not log complete profiles, health/protocol payloads, AI keys, webhook URLs, or reusable credentials.
- Do not manually edit `.taskmaster/tasks/tasks.json`.

## Testing and release evidence

- Unit and contract tests for calculations, cycle/challenge/inventory/report contracts.
- Python repository/domain tests.
- Playwright route/accessibility/responsive flows.
- TypeScript typecheck, production build, strict OpenSpec validation, and `git diff --check`.
- A health endpoint is not an end-to-end pass; persistence flows require read/write/re-read/scope/UI verification.

The current results and gaps are recorded in `docs/VERIFICATION-2026-08-11.md` and `docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md`.

## Documentation authority

Use `docs/DOCUMENTATION-INDEX.md`. Current root guides and accepted specs override older dated plans/audits. Preserve historical evidence and add a supersession note instead of rewriting its original claims.
