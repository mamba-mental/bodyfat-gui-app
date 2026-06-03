# P0 Data Inventory — 2026-06-03 (read-only, non-destructive)

First step of the approved ReComp Cycle plan (`~/.claude/plans/im-leaning-to-option-gleaming-book.md`). No data was modified.

## SQLite stores
| Store | size | md5 (12) | WAL | entries | reports | users | calcs | entry user_ids | max(entries.updated_at) |
|-------|------|----------|-----|---------|---------|-------|-------|----------------|--------------------------|
| `data/bodyfat.db` | 22.38 MB | `9e216407ea7a` | YES | 14 | 63 | 1 | 33 | `default` | **2026-06-03 07:52:11** |
| `.next/standalone/data/bodyfat.db` | 22.38 MB | `2891a93d4edf` | YES | 14 | 63 | 1 | 33 | `default` | 2026-06-03 05:40:43 |
| `_archive/backups/backups-dir/bodyfat_20251006_040645.db` | 14.14 MB | `44b95b547e92` | no | 12 | 32 | 0 | 0 | `default` | 2025-07-24 21:33:25 |

- Live API (`:8313`) serves **14 entries** → matches `data/bodyfat.db` (newest `updated_at`). **`data/bodyfat.db` = CANONICAL.**
- `.next/standalone/data/bodyfat.db` = same 14/63 but ~2 h stale + different md5 = **build-artifact drift**. Action: **discard/ignore** (regenerated on build); do NOT merge — it is a stale subset of canonical, not a separate dataset.
- archive db = old backup (12/32), historical only.

## Identity finding (important)
- **Every SQLite row is `user_id="default"`.** There is **NO `'1'` user data in any `.db` file.** So the SQLite side has no `'1'`-vs-`'default'` conflict to reconcile. The `'1'` label exists only in frontend/Next/Redis code paths.

## Redis (WSL `redis://172.23.89.12:6385`)
- **UNREACHABLE** at inventory time (WSL down). Could not enumerate keys. This is the ONLY place `'1'`-keyed entry/report data could live.
- **BLOCKER for the merge:** PRIME must start WSL so Redis is reachable, then export all keys (`report:1:*`, entries, user) to confirm whether any Redis-only data exists. If Redis is empty / has nothing not already in canonical SQLite, the "merge" collapses to: adopt `data/bodyfat.db` as the single DB + delete the stale standalone copy + remove the Redis code layer.

## WAL note
Both live DBs have `-wal` sidecar files → the P0b backup MUST `PRAGMA wal_checkpoint(TRUNCATE)` (or use SQLite online-backup) before copying, or live transactions are lost (Codex #2).

## Revised P0 read (simpler than worst case)
1. Canonical DB identified: `data/bodyfat.db`.
2. SQLite identity is uniform (`default`) — UUID unification migrates one id, not two, on the DB side.
3. Drift source #1 (stale standalone copy) = discard.
4. Drift source #2 (Redis `'1'` data) = **unknown until WSL is up** — the one gate before the merge can be declared safe.

## P0 PROGRESS (this session — tools built + run, all non-destructive)
- **`python-api/p0_reconcile.py`** — logical-key reconciliation DRY-RUN (Codex #1). RESULT: 40 raw entry rows across the 3 SQLite stores collapse to **14 unique logical weigh-ins, 0 conflicts** (logical key = normalized_user + date-only + md5(weight|bf|notes)). Proves the standalone + archive DBs are loss-free SUBSETS of canonical; SQLite merge is provably safe. Redis EXCLUDED (WSL down) — rerun with WSL up to fold in `1`-keyed data.
- **`python-api/p0_backup.py`** — restore-proven backup (Codex #2). Uses SQLite ONLINE BACKUP (consistent snapshot incl. WAL, live DB untouched) + restore-drill (counts must match). RESULT: verified backup at `data/backups/p0/bodyfat_p0_*.db` (22.4 MB, md5 `b5fefc72987e`), counts match live (14/63/1/33), **RESTORABLE [OK]**, exit 0.
- Both tools are uncommitted on disk; non-destructive; ready for the build session to extend.
- **Alembic framework (P0e) installed + configured** (`python-api/alembic/`, `alembic.ini`): SQLite, `render_as_batch=True` (Codex #5), DB path auto-resolved (override `BODYFAT_DB_URL`). Connection verified.
- **Migration `f3c461796ba2`** — adds nullable `reports.updated_at` + `reports.source_fingerprint` (Codex #5). PROVEN upgrade+downgrade on a copy: columns add/drop, 63 reports preserved, live untouched.
- **Migration `ed3cda93ad18`** — creates `cycles` table + partial unique index `uq_cycles_one_active` (`UNIQUE(user_id) WHERE status='active'`, Codex #2) + nullable `cycle_id` on entries & reports + `legacy_program_id` on cycles (Codex #6). PROVEN on a copy: full chain upgrades, **one-active invariant actually rejects a 2nd active cycle**, 14/63 preserved, downgrade fully reverts, live untouched.
- **NET:** the entire cycle-schema migration path is written + proven reversible/lossless. Remaining DB work (UUID identity rewrite, the real merge, the cycle backfill) is destructive/careful → build session, but now sits on a validated foundation.

## Frontend pure-logic, TDD'd (vitest, 16 tests green; tests under `tests/unit/`)
> NOTE: vitest `include` is `tests/**` only (co-located src tests are NOT picked up). New pure modules: code in `src/lib/`, tests in `tests/unit/` importing `../../src/lib/<mod>`. Project sets `typescript.ignoreBuildErrors:true`, so a project-wide `tsc=0` is not achievable from pre-existing errors; modules verified via vitest's TS transform.
- **`src/lib/cycleWeek.ts`** (P6, Codex #5) — timezone-safe date-only (UTC) math: `currentCycleWeek(start,today,timelineWeeks?)`, `nextWeighIn(today,weighinDays)`, `missedWeighIns(start,today,weighinDays,entryDates)`. RED→GREEN, 10 tests (incl. the real "Week 5 of 16" case + Mon/Thu schedules + ±1-day met rule).
- **`src/lib/reportGate.ts`** (P7, Codex #3) — `sourceFingerprint({cycleId,entryId,entryDate,entryUpdatedAt,calcVersion,generatorVersion})` + `canGenerateReport(lastFp,currentFp) -> {allowed,isUpdate}`. Gates on fingerprint change (edited entry => UPDATE allowed), not `last_report>=last_entry`. RED→GREEN, 6 tests.
- **`src/lib/cycleScope.ts`** (P4) — `defaultSelectedCycle(cycles) -> active id | most-recent | ALL_CYCLES`, `scopeByCycle(items, selected)` filter (ALL = passthrough; a specific cycle excludes null cycle_id). RED→GREEN, 6 tests. Feeds the Reports cycle-selector (default = current cycle).
- **`src/lib/cycleTransitions.ts`** (P3) — pure immutable reducers `startCycle` (demotes prior active→stopped, appends new active), `stopCycle`, `archiveCycle`, `activeCycle`. Enforces one-active at the state layer (complements the DB index); never mutates input. RED→GREEN, 6 tests.
- **`src/lib/weeklyStats.ts`** (P4) — `weeksBetween(later,earlier)` (real elapsed weeks, floored 1/7), `totalChange`, `weeklyRate` (per-week over real interval; loss negative). Extracts + tests the inline fix made in `reports/page.tsx` this session. RED→GREEN, 5 tests.
- **TOTAL new: 7 suites / 44 tests, all green** (`npx vitest run tests/unit/{cycleWeek,reportGate,cycleBackfill,cycleScope,cycleTransitions,weighinSchedule,weeklyStats}.test.ts`).
- **PRE-EXISTING FAILURES (NOT from this work — do not treat as regressions):** `tests/unit/changelog-parser.test.ts` (8 failing) and `tests/unit/dashboard-reset.test.tsx` (program_reference cases) were already red before any change this session. Running the whole `tests/unit/` dir is therefore not green for reasons unrelated to the ReComp Cycle work.
- Build session: wire these into `/entries/new` (week + missed badges), the Reports cycle-selector (P4 default+filter), and the Generate-Report button (gate + UPDATE path); they are the pure cores those UI steps need.

## Next actions (for the build session)
- PRIME: start WSL → re-run `p0_reconcile.py` so Redis `172.23.89.12:6385` is included; confirm conflicts still = 0 (or quarantine).
- Run `p0_backup.py` immediately before any migration (its restore-drill is the abort gate).
- Then: P0a canonical user-id provider + write-freeze → Alembic batch migrations (UUID identity, cycle_id on entries+reports, reports.updated_at + source_fingerprint) → P2 remove Redis layer → P3 cycles → phases P4–P9.
