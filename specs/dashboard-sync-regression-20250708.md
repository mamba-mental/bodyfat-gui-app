# Dashboard Sync Regression — Problem 1-Pager

## Context
- The Next.js dashboard persists user data, entries, and reports via `server-storage.ts`. During page load the API layer first queries the Python backend (`data_endpoints.py`) and mirrors that payload locally for offline use.
- The Python service still exposes bootstrap/demo data (`name: "User"`, default entries) and omits newer fields such as `start_date`, `end_date`, and `timeline_weeks`.
- Because the Next.js routes unconditionally overwrite the local JSON store with whatever the Python API returns, the dashboard ends up showing stale defaults (week 0, demo weights) immediately after the sync runs.

## Problem
- Local profile details and entries that the user configures through the web UI are replaced each time the Python API responds, so the dashboard reverts to placeholder values and progress widgets remain at 0%.
- The Python API is not yet authoritative for these richer fields, so the overwrite cannot be treated as a legitimate source of truth.

## Goal
- Treat the local store as the canonical profile/entry source while still incorporating any genuinely new records from the Python service.
- Preserve advanced fields (dates, timeline, recent weights) in the JSON cache so the dashboard renders accurate metrics after reloads, even when the Python API only serves the bootstrap dataset.

## Non-Goals
- Reworking the Python service schema or adding new endpoints.
- Implementing real-time two-way conflict resolution for all fields.
- Altering charts/widgets beyond ensuring they receive correct backing data.

## Constraints
- Changes must run on Node 18 (current app runtime).
- Sync logic lives inside the existing Next.js route handlers; avoid introducing heavy infrastructure or new dependencies.
- Keep the fix incremental and well-covered by unit tests so future refactors can lean on the behaviour.

## Options Considered
1. Continue overwriting local data with Python payloads while teaching the Python service to emit full, accurate profiles.  
   - **Pro:** Single source of truth server-side.  
   - **Con:** Requires Python changes and deployment; dashboard remains broken until then.  
   - **Risk:** Harder to coordinate releases and data migrations.
2. Merge Python responses into the local cache, favouring existing local values and only persisting new remote records.  
   - **Pro:** Keeps the dashboard accurate immediately; still captures any new remote updates.  
   - **Con:** Needs reconciliation logic and targeted tests.  
   - **Risk:** Potential for drift if both sources diverge heavily; must document precedence rules.

## Decision
- Adopt Option 2. Build small reconciliation helpers that merge remote payloads into the local store with local data treated as canonical, update the `/api/data/user` and `/api/data/entries` routes to use them, and add unit tests to lock in the precedence rules.
