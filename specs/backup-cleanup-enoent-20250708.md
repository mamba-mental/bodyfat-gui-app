# Backup Cleanup ENOENT Regression — Problem 1-Pager

## Context
- The Next.js data persistence layer (`src/lib/server-storage.ts`) writes JSON snapshots and creates backups through `server-storage-backup.ts`.
- Production-like logs show repeated `Failed to cleanup old backups` messages where `fs.unlink` throws `ENOENT`, indicating concurrent or repeated deletion attempts.
- The API route that caches Python reports also surfaces `[Error: ENOENT ... apexfit-data.json.tmp]`, signalling temp file removal is not idempotent when validation or racing writers delete the same file first.

## Problem
- The backup rotation and temp file cleanup use `fs.unlink`, which throws if the target already disappeared. When multiple requests trigger persistence in quick succession, the shared cleanup logic logs noisy errors and bubbles unexpected exceptions to the API layer.

## Goal
- Make backup rotation and temp file cleanup resilient so repeated runs do not throw or spam logs, while preserving the existing validation/backup guarantees.

## Non-Goals
- Changing the backup retention policy or where data is stored.
- Revisiting the report validation rules or restructuring the JSON payload.
- Addressing unrelated Vitest worker instability (tracked separately).

## Constraints
- Node 18.20 is the deployed environment (per `npm warn EBADENGINE` log), so solutions must work there.
- Keep the fix small and explicit—avoid introducing heavyweight abstractions or new dependencies.
- New behaviour should remain testable under Vitest with isolated mocks.

## Options Considered
1. Wrap every `fs.unlink` in a `try/catch` that ignores `ENOENT`.  
   - **Pro:** Minimal change, matches existing API.  
   - **Con:** Easy to miss future call sites; repetitive boilerplate.  
   - **Risk:** Other errors might be swallowed if guard is too broad.
2. Switch to `fs.rm(target, { force: true })` via a shared helper.  
   - **Pro:** Idempotent deletion without boilerplate; keeps meaningful errors.  
   - **Con:** Requires swapping API in multiple files.  
   - **Risk:** Must ensure helper is covered by tests and Node version supports `force`.

## Decision
- Proceed with Option 2: introduce a small `removeIfExists` helper that delegates to `fs.rm(..., { force: true })`, use it for backup rotation and temp file cleanup, and add Vitest coverage that ensures ENOENT scenarios no longer bubble up.
