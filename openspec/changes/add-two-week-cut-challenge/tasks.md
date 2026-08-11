## 1. Approval and Contracts

- [x] 1.1 Select one visual comp: Comp 5 — Quiet Strength.
- [x] 1.2 Approve the challenge name and active-plan amendment rules.
- [x] 1.3 Preserve the preliminary source with provenance and classify it as draft.
- [x] 1.4 Review and approve the structured mapping for nutrition, training, recovery, measurement, adjustment, safety, and optional appearance-day content.
- [x] 1.5 Identify the existing sourced PED timeline and require explicit revision/start-week selection without inventing missing values.
- [x] 1.6 Add shared TypeScript/Pydantic contract fixtures for standard and two-week plans, template revisions, and amendments.

## 2. Data and Backend

- [x] 2.1 Back up and integrity-check SQLite, then add backward-compatible cycle, template-revision, and amendment migrations.
- [x] 2.2 Extend cycle models and persistence round trips with plan, template revision, snapshot, amendment, and optional protocol fields.
- [x] 2.3 Add exact `timeline_days=14` request validation and map it to two PRIME weeks.
- [x] 2.4 Add the day-schedule adapter using PRIME weekly outputs and configured day types.
- [x] 2.5 Add deterministic template import, schema validation, immutable revision storage, source hashing, and draft/reviewed/superseded states.
- [x] 2.6 Add active-plan amendment APIs with explicit effective day, reason, before/after diff, and completed-day protection.
- [x] 2.7 Add day-scoped challenge logs for calorie/protein totals, steps, training/cardio completion, sleep, resting heart rate, optional blood pressure/notes, and Day 1/7/14 waist/photo references.
- [x] 2.8 Add required protocol loading, two-consecutive-week validation, source-week selection, user confirmation, versioning, snapshotting, and readiness states.
- [x] 2.9 Extend Living Report generation with two-week progress/final modes, template/protocol provenance, amendment history, and recorded actuals.
- [x] 2.10 Remove sensitive calculation/profile payload logging from affected API paths.

## 3. Shared UI Direction

- [x] 3.1 Inventory every current route, action, empty/error/loading state, and responsive breakpoint.
- [x] 3.2 Encode the selected direction as shared color, type, spacing, radius, elevation, and chart tokens.
- [x] 3.3 Migrate the persistent shell/navigation while preserving route and keyboard parity.
- [x] 3.4 Migrate shared cards, forms, dialogs, tables, charts, alerts, and report surfaces.

## 4. Two-Week Challenge UI

- [x] 4.1 Add program-mode selection alongside standard/custom cycles.
- [x] 4.2 Build the 14-day preview with calorie/protein targets, feasibility, residual gap, required protocol revision/start-week selection, and schedule confirmation.
- [x] 4.3 Build a structured Template Editor with source view, field/day editing, validation, revision history, duplicate, and restore actions.
- [x] 4.4 Build activation confirmation and immutable plan/protocol snapshot display.
- [x] 4.5 Build the day 1–14 command center, lightweight daily check-in, checkpoint measurements, diet schedule, and readiness states.
- [x] 4.6 Build the active-plan amendment flow with future-day effective date, reason, before/after diff, and confirmation.
- [x] 4.7 Add progress and final report entry points, including stopped-early behavior and revision provenance.

## 5. Verification

- [x] 5.1 Unit-test schedule mapping, inclusive date behavior, safety gates, and missing protocol values.
- [x] 5.2 Unit-test template import/revision behavior, deterministic validation, amendment effective-day boundaries, rejection of completed-day rewrites, and daily-log readiness.
- [x] 5.3 Contract-test TypeScript → Next gateway → Pydantic → PRIME for both plan modes.
- [x] 5.4 Migration-test existing cycles, entries, reports, and one-active-cycle behavior.
- [x] 5.5 Verify standard-plan calculation/report parity against current fixtures.
- [x] 5.6 Verify reports remain reproducible before and after template revisions and active amendments.
- [x] 5.7 Run accessibility checks and Playwright coverage for every navigation destination and both challenge paths.
- [x] 5.8 Verify the live topology exposes the Windows-supervised frontend on `:3010` and FastAPI on `:8313`, with only Redis running in Docker on `:6385`.
