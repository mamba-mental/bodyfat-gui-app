# Managed Postgres and multi-user sync readiness

## Current state

- SQLite remains the authoritative local store.
- JSON export provides a recoverable local backup.
- `GET /api/sync/status` reports configuration readiness without exposing connection strings or credentials.
- Cloud writes remain disabled until a provider, authentication model, migration window, and rollback plan are explicitly configured.

## Required external decisions

1. Select a managed Postgres provider.
2. Select an authentication provider and define athlete/coach workspace roles.
3. Define retention, encryption, recovery, and account-deletion policies.
4. Back up and integrity-check SQLite immediately before migration.
5. Run a read-only migration rehearsal and compare row counts, source hashes, active-cycle invariants, and report reproducibility.
6. Enable dual-read validation before any cloud write cutover.

## Proposed ownership boundary

Every remotely synchronized record must carry:

- `workspace_id`
- `owner_user_id`
- stable local record ID
- monotonically increasing revision or update timestamp
- deletion tombstone where applicable
- source device ID
- content hash for conflict and duplicate detection

Athletes own profiles, entries, nutrition records, photos, plans, challenge logs, and reports. Coaches receive scoped workspace membership; they do not become record owners.

## Environment contract

The readiness endpoint checks only whether configuration classes are present:

- `POSTGRES_URL` or `DATABASE_URL`
- `AUTH_SECRET` or `AUTH_PROVIDER`
- `CLOUD_SYNC_ENABLED=true` only after migration validation

The endpoint never returns values from those variables.

## Rollback boundary

Until cloud cutover is accepted, SQLite remains writable and authoritative. A failed rehearsal or row/hash mismatch stops the migration. Cloud records may be discarded without altering the local database.
