# Ap3xFit / Bodyfat Tracker — Usage Guide

**Owner:** PRIME
**Project root:** `C:/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/`
**Last updated:** 2026-05-04

This guide tracks how the app works in its current state + every change made to it. Update this file whenever behavior changes — keep it the single source of truth for "how do I do X" so we don't re-derive it next time.

---

## Quick Start

| Action | Command |
|--------|---------|
| Start app | `/start-bodyfat-tracker` |
| Stop app | `/stop-bodyfat-tracker` |
| Open URL | http://localhost:3010 |
| Backend API docs | http://localhost:8313/docs |

**Ports:** Next.js frontend = `3010`, Python API = `8313`.
*Port 3000 is permanently grabbed by Windows `iphlpsvc` — moved off it 2026-05-04.*

---

## Architecture

```
Browser  ──►  Next.js (3010)  ──►  Python API (8313)  ──►  SQLite (data/bodyfat.db)
                  │                       │
                  └─ Redis (optional)     └─ legacy JSON (data/*.json) — read-only quarantine
```

- **SQLite is the source of truth** at `data/bodyfat.db` — tables: `users`, `entries`, `reports`, `calculations`.
- **Single canonical user_id = `default`.** Don't create new user_ids. Fields stored as JSON blob in `users.data`.
- **Redis is optional.** When down (the default in dev), all `lib/redis.ts` calls early-exit via `redisReady()` guard — no perf penalty.
- **Next.js wraps Python.** Frontend calls relative `/api/data/*` URLs → Next routes proxy to `127.0.0.1:8313`. Don't bypass the wrapper from the browser.

---

## Common Workflows

### Start a new program from today (with all new stats)

**Two UI entry points — both call `POST /api/programs/archive`:**

1. **Dashboard header** → "Start New Program" button (modal) — `src/components/programs/StartNewProgramModal.tsx`
2. **Settings page** → "Start New Program" with confirm dialog — `src/app/settings/page.tsx:636`

**What happens:**
1. Current program is archived to `users.data.archived_programs[]` with summary (initial weight/BF, final weight/BF, duration, weekly avg loss, best entry).
2. New `current_program_id = program-{timestamp}`.
3. New `start_date = today`, `end_date = today + timeline_weeks` (default 16 weeks).
4. New `program_reference` snapshot uses **the latest entry's weight/BF as the new baseline** (not current_weight in profile — the most recent measurement).
5. All historical entries stay in DB. Dashboard filters them out by `program_id` mismatch (entries from old program are tagged with old `current_program_id`).

**To start with completely fresh stats (different from your last entry):**
1. Profile → update `current_weight` + `current_bf` first, save.
2. Add a new entry today with the new measurements.
3. Click "Start New Program" — it'll snapshot from that latest entry.

**Backend handler:** `python-api/data_endpoints.py:482` — `archive_program()`
**Frontend action:** `src/contexts/app/actions/program-actions.ts:118` — `archiveProgram()`

### Add a daily entry

UI: "New Entry" sidebar item → form → submit. Calls `POST /api/data/entries` (Next) → `POST /api/data/entries` (Python) → SQLite insert.

### Generate a report

UI: "Generate New Report" button on Reports page or Dashboard. Backend renders full HTML via Python report generator → saves to `storage/reports/` (PDF/HTML/MD) + writes to SQLite.

**Performance note:** report list endpoint strips `html_content` + `calculation_result` to keep response under 20KB. Detail view at `/reports/{id}` lazy-fetches the full HTML on open.

### Reset / wipe all data

Settings page → "Clear All Data" (destructive). Or directly:
```python
import sqlite3
c = sqlite3.connect("data/bodyfat.db")
c.execute("DELETE FROM entries")
c.execute("DELETE FROM reports")
c.execute("DELETE FROM calculations")
c.commit()
```

---

## Change Log (this session — 2026-05-04)

Every modification made today, ordered by impact:

### Infra fixes (made the app actually run)
- Moved Next.js dev port from 3000 → **3010** (Windows `iphlpsvc` permanently grabs 3000). Updated `package.json`, both slash commands, CORS allow-lists in `python-api/main.py:90`, `middleware.ts`, `src/lib/config.ts`.
- Reinstalled Python deps into `python-api/venv/` (Python 3.13). Old `requirements.txt` pinned `pydantic==2.5.0` which has no Py3.13 wheels → bumped to `pydantic 2.13.3`, `fastapi 0.136.1`, `uvicorn 0.46.0`. **TODO:** sync `requirements.txt` with installed versions.
- Killed all stale `python.exe` zombies (had ~28 running) + nuked `__pycache__`. Fresh start uses explicit `venv/Scripts/python.exe -u`.
- *Note:* `python-api/.venv/` (Python 3.12) also exists — older parallel venv. Caused stale-code-served bugs. **TODO:** delete `.venv/` to avoid future drift.

### Data unification
- DB had drift: entries under `user_id='1'`, reports under `user_id='default'`, two user rows. Unified to `user_id='default'`. Backed up DB to `B:/AI-CoWork-Archive/config-backups/2026-05-04/bodyfat.db.11-57.bak` first.
- Patched `data_endpoints.py:303,318` — entries handlers were hardcoded to `user_id='1'`, now `'default'`. **TODO:** lines 473/586/605/617 still hardcoded `'1'` for `/api/programs/*` routes — needs same fix.

### Performance fixes
- `lib/redis.ts` — added `redisReady()` guard at top of every public function (12 funcs). When Redis client is closed, calls early-exit with sane fallback instead of waiting per-call timeout. Cut user route latency 65s → 57ms (~1100x).
- `data_endpoints.py:329` — `/api/data/reports` strips heavy fields (`html_content`, `chart_images`, `chart_image_data`, `calculation_result`) from list response. Cut payload 22MB → 18KB. Detail view at `/api/data/reports/{id}` returns full report.
- `src/app/reports/page.tsx` — added `ensureHtmlContent()` lazy-fetch helper. Download/markdown/PDF/view-full-report buttons now fetch detail on click instead of relying on list-loaded HTML.

### Frontend gating fix
- Welcome screen was triggering when `current_user` was null. Caused by Next.js wrapper returning `null` on first request after Python cold-start (8s timeout, Python warmup took longer). Now Python stays warm + Redis guard removes per-call lag, so first refresh resolves cleanly.

### Report save fix
- `Report` Pydantic model required `date: str` but frontend sends `generated_at` instead → all report saves failed with 422 "Unprocessable Content".
- Made `date` optional + added `generated_at` field to model. `save_report()` endpoint now normalises: `date = date OR generated_at OR now()`.

### Gotcha — uvicorn `reload=True` does NOT pick up Pydantic class changes
- File saves trigger watchfiles reload, but Pydantic model classes attached to existing FastAPI routes stay cached in memory.
- **When you change a `BaseModel` field, do a full Python restart.**
- Code-only changes inside route handlers (no model edits) DO reload correctly.

### Gotcha — DON'T `taskkill //F //IM python.exe` to restart bodyfat
- That nuclear kill nukes EVERY python.exe on the box — including serena MCP, claude-mem, voice-mode, any other python tool you have running.
- **Right way:** kill by specific PID:
  ```bash
  netstat -aon | grep "LISTENING" | grep ":8313"  # find PID
  taskkill //F //PID <listener-pid>
  ```
- If serena dashboard at `localhost:24282` stops working after a Python restart, you killed it. Run `/mcp` → reconnect `serena-desktop` to bring it back.

---

## Known Issues / TODO

| Severity | Issue | Fix |
|----------|-------|-----|
| **High** | **Calculation accuracy unverified** — `python-api/new_prime_python_code/PRIME_*.py` (RMR, BF, diet, report-gen) need accuracy audit | Dispatch `/codex:rescue` with focused brief on a single PRIME_*.py module → add unit tests covering known reference values + edge cases. Repeat per module. **PRIME-requested 2026-05-04.** |
| **High** | **UI redesign needed** — current dashboard/reports/setup pages are functional but visually generic (default Tailwind, basic cards) | Run `/impeccable` skill on the bf-estimator frontend → produces stunning standard. Apply WebGL/3D where viz fits (progress charts), OKLCH palette, glassmorphism cards, motion. Per PRIME visual-standard-stunning rule. **PRIME-requested 2026-05-04.** |
| Medium | `requirements.txt` pins broken old versions | Run `pip freeze > requirements.txt` from the working `venv/` |
| Medium | `python-api/.venv/` (Py 3.12) ghost venv | `rm -rf python-api/.venv/` after confirming no Win Task references it |
| Medium | `data_endpoints.py:473,586,605,617` hardcoded `user_id='1'` for `/api/programs/*` | Replace with `'default'` (same pattern as lines 303/318) |
| Low | `@app.on_event("startup")` deprecated (FastAPI) | Migrate to lifespan handler |
| Low | `aiohttp` missing — PRIME analytics modules log import error | `pip install aiohttp` |
| Low | 32MB of orphan `data/*.json.*.tmp` files from old atomic writes | Move to `data/_legacy/` quarantine; delete after 30 days clean |
| Low | Project bloat: `_archive/`, multiple Dockerfiles, `nul` files, simple-server*.js | Cleanup pass when bandwidth allows |
| Low | Pyright warns "Import 'database' could not be resolved" | Add `python.defaultInterpreterPath` pointing at `venv/Scripts/python.exe` in IDE config |

---

## Database Recovery Notes

Current backup: `B:/AI-CoWork-Archive/config-backups/2026-05-04/bodyfat.db.11-57.bak` (22MB, pre-unification snapshot).

**Restore procedure (if data corrupts):**
```bash
# Stop app
/stop-bodyfat-tracker

# Replace
cp "B:/AI-CoWork-Archive/config-backups/2026-05-04/bodyfat.db.11-57.bak" \
   "C:/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/data/bodyfat.db"

# Start app
/start-bodyfat-tracker
```

Legacy JSON snapshots (read-only reference, do not edit):
- `data/apexfit-data.json.backup.20251115_073330` (14MB, Nov 15 2025)
- `data/apexfit-data.json.*.tmp` (orphans from atomic-write churn)

---

## Update Protocol

Whenever code changes that affect runtime behavior:
1. Edit code.
2. **Update this file in the same commit.** Add row to Change Log + adjust Common Workflows / Known Issues if the change affects them.
3. If a workflow becomes obsolete, delete the section — don't leave stale instructions.

Same rule for slash commands at `~/.claude/commands/start-bodyfat-tracker.md` + `~/.claude/commands/stop-bodyfat-tracker.md` — update them when ports/paths/dependencies change.
