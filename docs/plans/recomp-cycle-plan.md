# ReComp Cycle — First-Class Feature Plan

> **Implementation plan with work now partially/mostly landed.** Use current OpenSpec tasks and the August 11 adversarial review for actual completion and open atomicity/settings/runtime gaps.

**Status:** DRAFT (pre-review). Branch `007-design-review-fixes`. Base `master`.
**Author:** Claude (this session). For `/codex:adversarial-review` then `/tdd`.
**App:** Next.js 15 frontend (prod build :3010) + Python FastAPI backend (:8313, SQLite).

---

## 0. Problem statement

The app has no concept of "which cycle / which week the user is on." Consequences seen in PRIME's data:
- Program started ~2026-05-04, but the newest **entry** is 2026-03-04 — the current cycle has **zero** entries, yet a *pre-cycle* entry shows as "Latest."
- 63 reports vs 14 entries; reports exist with no corresponding entry.
- Progression/prediction widgets, entry history, and the new-entry page can't say "you're in cycle X, week N, next weigh-in is <date>."

**Premise (challenge this in review):** the unifying fix is a **ReComp Cycle** entity that every entry and report belongs to, with a weigh-in schedule, surfaced as the default scoping context across the app.

## 1. Domain model

### ReComp Cycle (new entity)
| Field | Type | Notes |
|-------|------|-------|
| `id` | string (uuid) | stable, immutable |
| `user_id` | string | canonical id (see §2 — unify '1'/'default') |
| `name` | string | e.g. "Cut Q2 2026" (auto or user-set) |
| `start_date` | date | required |
| `end_date` | date \| null | null = open/active |
| `status` | enum | `active` \| `stopped` \| `archived` |
| `start_weight` / `start_bf` | number | snapshot at cycle start |
| `goal_weight` / `goal_bf` | number | cycle goal |
| `timeline_weeks` | number | planned length |
| `weighin_days` | int[] | 0–6 (Sun–Sat), e.g. [1,4] = Mon+Thu |
| `weighin_per_week` | int | derived/validated against weighin_days |
| `created_at` / `updated_at` | datetime | |

**Invariants:** at most ONE `active` cycle per user. Starting a new cycle stops the current one (status→`stopped`) and snapshots its end. "Archive & Start New" sets prior→`archived`. Cycles are append-only; never deleted (only status changes).

### Entry / Report changes
- Add `cycle_id` (nullable FK) to **both** entries and reports.
- New entries/reports get the current active cycle's id automatically.
- "Current week" = `floor((entryDate - cycle.start_date)/7) + 1`, clamped to `[1, timeline_weeks]`.

## 2. Cross-cutting fix (do first, tiny): unify user id
Frontend writes `user_id: '1'`, Python reads `'default'`. This already causes the entries cache-subset risk (fixed defensively this session). Pick **one** canonical id end-to-end before adding cycle FKs, so cycle ownership isn't split across two ids. Low effort, high leverage.

## 3. Phasing — ONE coordinated build with compatibility gates
> DECISION (PRIME): build all phases A–H in one coordinated effort. Per Codex finding #4, phases are NOT safely independent (A stamps cycle_id while old writes stamp program_id; C/F/G/H depend on fields from other phases; Redis may serve pre-migration rows). So this is a single build behind **compatibility gates**, not a flag-day: (a) **dual-write** `program_id` AND `cycle_id` during transition; (b) defined **read fallback order** (cycle_id → derive-from-date → program_id); (c) **version/flush Redis** keys on migration; (d) **feature-flag** the cycle UI until every writer/reader is migrated; (e) test old-client/new-backend + new-client/old-cache. Phases below are the WORK BREAKDOWN, not independent ship units.

### Phase 0 — BLOCKING: user-id unification + data inventory (Codex #1)
- Inventory SQLite + Redis: every entry/report/program under BOTH `'1'` and `'default'`; assert counts; produce a mapping report.
- Unify to ONE canonical `user_id` end-to-end (frontend, Next routes, Python, Redis keys). Migrate records under the loser id.
- This MUST land + verify before any cycle backfill — otherwise cycle ownership is assigned over split identity and stored wrong durably.
- **TDD:** inventory finds all 14 entries + 63 reports under exactly one id post-unify; no orphans; idempotent.

## 3b. Phasing (work breakdown)

### Phase A — Backend cycle entity + migration (HIGH RISK, isolated)
- SQLite: `CREATE TABLE cycles (...)`; `ALTER TABLE entries ADD COLUMN cycle_id`; same for reports (nullable, no destructive change).
- **Backup gate:** copy the .db file to a timestamped backup BEFORE any migration; abort if backup fails.
- **Backfill:** derive cycles from existing `start_date` + `archived_programs`; assign each existing entry/report a `cycle_id` by date range; anything before the earliest cycle → a synthetic "Cycle 0 (historical)". Idempotent + re-runnable.
- New FastAPI endpoints: `GET/POST /api/data/cycles`, `POST /api/data/cycles/{id}/stop`, `POST /api/data/cycles/{id}/archive`, `GET /api/data/cycles/current`. Entries/reports endpoints accept + return `cycle_id`.
- **TDD:** migration on a copy of real data → all 14 entries + 63 reports keep a valid `cycle_id`; backfill is idempotent; "at most one active" invariant enforced; rollback restores from backup.

### Phase B — Frontend cycle state + types
- `src/types`: `ReCompCycle` type; add `cycle_id?` to `BodyFatEntry` + `Report`.
- app-context: load cycles, expose `currentCycle`, `cycles`, `selectedCycleId`, `setSelectedCycle`, `startNewCycle`, `stopCurrentCycle`. Reconcile with existing `createNewProgram`/`archived_programs` (migrate those into cycles, don't duplicate).
- **TDD:** selectors return current cycle; cycle ops update state immutably.

### Phase C — Reports page cycle scoping
- Cycle-selector dropdown (shadcn Select) on **Summary**, **Progression**, and **Predictions/Benchmarks/Targets**. Options = cycles (newest first) + **"All ReComp Cycles"**. Default = current cycle.
- All three cards filter entries/calculation by `selectedCycleId`; "All" aggregates across cycles.
- Progression "actual" series uses only the selected cycle's entries; "predicted" uses that cycle's calculation.
- **TDD:** selecting a cycle filters the series; "All" aggregates; default is current; empty cycle shows an explicit empty state (not stale data).

### Phase D — Entry History by cycle
- `/entries`: group entries under cycle headers (Current cycle first, then stopped/archived). Keep the time-window tabs but scope within cycle.
- **TDD:** all 14 entries reachable; grouping correct; current-cycle section shows even when empty ("no entries logged this cycle yet").

### Phase E — New Entry cycle/week context + missed weigh-ins
- `/entries/new`: header shows "Cycle <name> · Week <N> of <T>"; compute expected weigh-in dates from `weighin_days` since cycle start; flag any missed (expected date passed, no entry within ±1 day).
- **TDD:** week number correct for given dates; missed-weigh-in list correct for a schedule + sparse entries.

### Phase F — Generate Report gating
- Block "Generate New Report" when there's **no new data** since the last entry/report in the current cycle. Offer: (a) **Edit last entry → generate UPDATED report** (report flagged `is_update: true`; report list + detail show an "Updated" badge), or (b) **go to /entries/new**.
- **TDD:** gate triggers when last report ≥ last entry; "updated" path produces a flagged report; new-data path is allowed.

### Phase G — Weigh-in schedule in settings + next check-in on report
- Settings/Profile: pick `weighin_per_week` + specific `weighin_days` (validated: count matches). Persist on the cycle (and as a profile default for new cycles).
- Report output: after crunching, compute + show **next scheduled check-in date** (next `weighin_day` on/after today).
- **TDD:** next-check-in date correct across week boundaries + multi-day schedules.

### Phase H — Integrations (calendar / Todoist / Sunsama)
- Settings area for tokens/webhook URLs (stored server-side, never in client bundle; encrypted at rest or in a server-only store).
- On report generation, optionally fire the next-check-in as: a calendar event, a Todoist task, and/or a Sunsama task.
- **Recommendation (challenge in review):** use an **n8n webhook** as the single outbound integration point (one webhook URL in settings; n8n fans out to Calendar/Todoist/Sunsama). Rationale: keeps third-party OAuth/tokens out of this app, is the most production-ready + swappable, and PRIME already runs n8n (n8n.primemind.dk). Direct API per service = more code + token management + per-service failure handling. Provide a direct-Todoist fallback only if n8n is unavailable.
- **TDD:** report-generate posts the correct payload to the webhook (mocked); failure is non-fatal (report still saves); opt-in respected.

## 4. Migration risk register (the scary part)
- **R1 — data loss on ALTER.** Mitigation: file backup gate + run migration on a copy first in tests + nullable columns only (no rewrites).
- **R2 — wrong cycle backfill** (overlapping/edited program dates). Mitigation: deterministic date-range mapping + "Cycle 0 historical" catch-all + a dry-run report of the mapping before committing.
- **R3 — split user id ('1' vs 'default')** orphaning cycle ownership. Mitigation: Phase 2 unify-id FIRST.
- **R4 — Redis cache** serving pre-migration entries without cycle_id. Mitigation: bump cache key / flush on migration.

## 5. Out of scope (defer)
- Multi-user. Real auth on integration tokens beyond server-only storage. Editing historical cycle boundaries (cycles are append-only; re-bucketing is explicitly NOT supported). Mobile-specific layouts.

## 6. Already fixed this session — DO NOT redo
settings deep-merge crash; weekly-stat date math in reports/page.tsx; legacy report HTML inline render (sandboxed) + client-side HTML/MD/PDF downloads; new `/api/data/reports/[id]` route; AI Insights infinite-render loop; `/api/data/entries` cache-subset hardening.

## 7. Decisions — RESOLVED
1. **Stored vs derived `cycle_id`** → **STORED** (immutable boundary records; see §8). Data integrity over re-bucketing.
2. **Integration transport** → **Single n8n webhook** (PRIME runs n8n.primemind.dk), hardened with delivery tracking (§8).
3. **Scope/phasing** → **All 8 phases (A–H) in ONE coordinated build** behind compatibility gates (§3).
4. **"Current cycle has zero entries" UX** → default to the current (active) cycle and show an explicit empty state ("no entries logged this cycle yet — log your first weigh-in"); do NOT silently fall back to a prior cycle (that's the exact "wrong latest" bug we're fixing).

## 8. Codex-driven hardening (folded into the phases above)
- **Immutable cycle boundaries (A, Codex #1):** store cycle start/end as immutable boundary records; backfill is a **dry-run first** that ABORTS on overlapping/ambiguous date ranges and prints the proposed mapping for sign-off before committing. If a boundary ever changes later, rebucket **transactionally**, never silently.
- **Active-cycle invariant in the DB (A, Codex #2):** `CREATE UNIQUE INDEX ... ON cycles(user_id) WHERE status='active'`; wrap start/stop/archive in a single write transaction; require an **idempotency key** on start/archive so retries/double-clicks/two-tabs can't create two active cycles or duplicate archives. Test concurrent transitions.
- **Report gate = source fingerprint (F, Codex #3):** persist `source_fingerprint` (cycle_id + entry id + entry.date + entry.updated_at + calc version + generator version) on each report; gate "new data" on fingerprint change, not `last_report >= last_entry`. Add `is_update` + `supersedes_report_id`. Editing an old entry → allowed update path; repeated identical generates → blocked. Tests for edited-historical-entry + repeated-update.
- **Timezone-correct date math (E/G, Codex #5):** persist a cycle timezone (default America/New_York); compute current-week + weigh-in/missed-check-in with **date-only arithmetic in that tz**, not UTC `toISOString().split('T')`. Tests for local Sun/Mon midnight, DST transitions, cycle-start near midnight, multi-day schedules.
- **n8n delivery reliability (H, Codex #6):** add an `outbound_integration_events` table with deterministic **idempotency keys**, retry/backoff, response correlation, and **per-destination status** (calendar/todoist/sunsama). Concrete **server-only encrypted secret store** for the webhook URL/tokens (never in client bundle). Surface unsent/failed integration state in Settings + report detail. Retrying report generation must NOT duplicate tasks/events.
- **Compatibility gates (all, Codex #4):** dual-write `program_id`+`cycle_id`; read fallback order cycle_id → derived-by-date → program_id; bump/flush Redis keys on migration; feature-flag the cycle UI until all readers/writers migrated.
