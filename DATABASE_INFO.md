# Apex Fit Database Architecture

**Current as of:** August 11, 2026

## Canonical store

The authoritative local application database is SQLite:

```text
data/bodyfat.db
```

FastAPI owns canonical profile, entry, cycle, report, calculation, 14-day challenge, and PED inventory persistence. The canonical user identifier is `default` in the current single-user application.

## Table families

| Tables | Purpose |
| --- | --- |
| `users` | Member profile JSON plus name and timestamps |
| `entries` | Weigh-ins/body-fat entries, notes/photo reference, `program_id`, and `cycle_id` |
| `cycles` | Standard and two-week cycle identity, dates, status, baseline/goals, weigh-in schedule, plan mode, and snapshot references |
| `reports` | Cycle-scoped report metadata/data, artifact paths, source fingerprint, and timestamps |
| `calculations` | Persisted PRIME calculation data |
| `challenge_templates`, `challenge_template_revisions` | Editable/versioned two-week source templates |
| `challenge_plan_revisions` | Immutable activated plan/protocol/inventory snapshots |
| `challenge_amendments` | Explicit future-effective changes and before/after evidence |
| `challenge_daily_logs` | Day-scoped actuals and completion data |
| `ped_inventory_items` | Manual confirmed inventory records used for deterministic coverage |
| `alembic_version` | Schema revision marker |

The startup initializer is idempotent and ensures required tables/columns exist. Alembic migrations under `python-api/alembic/versions/` provide migration history. Back up the database before migration, repair, or rollback.

## Redis

Redis is optional cache/fallback infrastructure. It is disabled unless configured and is not the source of truth. Current daily-use Redis runs separately in WSL/Docker on host port `6385`; the frontend and FastAPI processes are Windows-supervised.

Do not restore Redis over newer SQLite records. Entry/report reads are intended to preserve Python/SQLite fields such as `cycle_id` and immutable challenge snapshot references.

## Other stores

- `storage/reports/` contains generated HTML/Markdown/PDF artifacts. SQLite metadata points to them.
- `data/settings.json` may retain settings handled by the Python service.
- Browser localStorage contains UI-only/local preferences such as the n8n URL and some Settings values. It is not authoritative for profile, cycle, entry, report, or challenge history.
- Legacy JSON files/backups are reference or quarantine material, not the current application database.

## Invariants

1. At most one active cycle per user (`uq_cycles_one_active`).
2. New programs preserve prior entries/reports and stop—not delete—the former active cycle.
3. Entry/report cycle identifiers survive every round trip.
4. Activated 14-day plan/protocol/inventory data is immutable; edits create a revision/amendment.
5. Missing PED source values stay missing/ranged; persistence must not manufacture a value.
6. Report lists may omit heavy HTML/calculation bodies; detail endpoints fetch the complete record.
7. Generated-artifact ingestion must not create a duplicate row for an artifact already backed by a canonical report.

## Backup and integrity

Stop writers before a material restore. Use a timestamped copy in `data/backups/`, preserve the damaged/current file separately, then verify the replacement with SQLite `PRAGMA quick_check` before restarting services. See [RUNBOOK.md](RUNBOOK.md) for the operational sequence.
