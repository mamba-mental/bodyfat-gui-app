# Apex Fit Local Operations Runbook

**Current as of:** August 11, 2026

**Verified topology:** Windows-supervised Next.js/FastAPI plus optional Redis in WSL/Docker.

## Endpoints and stores

| Item | Location |
| --- | --- |
| Dashboard | `http://127.0.0.1:3010` |
| API root | `http://127.0.0.1:8313` |
| API health | `http://127.0.0.1:8313/health` |
| API docs | `http://127.0.0.1:8313/docs` |
| Redis cache | host port `6385` when enabled |
| Canonical database | `data/bodyfat.db` |
| Report artifacts | `storage/reports/` |
| Supervisor log | `_ops/supervisor.log` |

## Normal lifecycle

### Desktop shortcut status

Do **not** use the current Desktop shortcuts named **ApexFit Tracker** or **Stop ApexFit**. Both `.lnk` files point to:

```text
C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app
```

That directory no longer exists. The `Launch-ApexFit.cmd` and `Stop-ApexFit.cmd` files in the current repository also `cd` to the same stale path, so merely repointing the `.lnk` files would not be sufficient. Until a separately authorized repair updates both wrapper contents and shortcut targets, use the Python lifecycle commands from the real project root:

```powershell
python .\_ops\apex_lifecycle.py start
python .\_ops\apex_lifecycle.py status
python .\_ops\apex_lifecycle.py stop
```

The start command is idempotent: it leaves already-listening services alone and opens the browser unless `--no-browser` is supplied.

## Health verification

```powershell
$apexTargets = @(
  'http://127.0.0.1:3010/',
  'http://127.0.0.1:8313/',
  'http://127.0.0.1:8313/health'
)
$apexTargets | ForEach-Object {
  Invoke-WebRequest -Uri $_ -UseBasicParsing -TimeoutSec 15 |
    Select-Object StatusCode, StatusDescription
}
Get-NetTCPConnection -State Listen -LocalPort 3010,8313,6385 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Expected API root body:

```json
{"message":"PRIME Body Fat Calculator API","status":"running"}
```

Service health is necessary but insufficient. For a release or repair, also read cycles/profile/reports, test the relevant UI route, and verify persisted associations.

## Manual foreground diagnosis

Stop only the Apex listeners through the lifecycle tool, then run visible processes:

```powershell
# Terminal 1
Set-Location .\python-api
python main.py

# Terminal 2, repository root
npm run dev
```

Do not kill all `python.exe` or `node.exe` processes. Other local agents and tools use them.

## Backup procedure

Before a migration, data repair, or restore:

1. Stop Apex writers.
2. Resolve the exact source and backup paths.
3. Copy—do not move—the canonical database.
4. Record timestamp/reason outside the database.
5. Start services only after the copy completes.

Example from the repository root:

```powershell
python .\_ops\apex_lifecycle.py stop
$apexStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$apexSource = (Resolve-Path .\data\bodyfat.db).Path
$apexBackupDir = (Resolve-Path .\data\backups).Path
$apexBackup = Join-Path $apexBackupDir "bodyfat-$apexStamp.db"
Copy-Item -LiteralPath $apexSource -Destination $apexBackup
Get-Item -LiteralPath $apexSource,$apexBackup | Select-Object FullName,Length,LastWriteTime
python .\_ops\apex_lifecycle.py start
```

Also back up `storage/reports/` and uploads when complete recovery of generated/member artifacts matters.

## Restore procedure

Restore is destructive to the current live database and requires explicit operator intent.

1. Stop all Apex writers.
2. Resolve and inspect the exact candidate backup.
3. Preserve the current database under a new recovery filename.
4. Validate the candidate offline with SQLite `PRAGMA quick_check`.
5. Copy the validated candidate into `data/bodyfat.db`.
6. Start services.
7. Re-read health, profile, cycles, entry/report counts, and active-cycle invariant.
8. Verify the UI and one non-mutating report/detail path.

Never restore Redis over SQLite and never infer that a Docker volume contains the workstation database without inspecting the resolved mount.

## Release verification

```powershell
npx tsc --noEmit
npm run build
python -m pytest python-api\tests\unit -q
npx playwright test tests\e2e\modern-workspace.spec.ts --project=chromium --workers=1
openspec validate add-two-week-cut-challenge --strict
openspec validate update-interface-palettes-and-feature-lab --strict
openspec validate add-ai-ped-inventory-scheduler --strict
git diff --check
```

Confirm all relevant route checks and record gaps in `docs/VERIFICATION-2026-08-11.md`. The current build's known ESLint circular-configuration warning must be distinguished from a failed production build.

## Incident quick paths

### Frontend down, API up

- Confirm `3010` listener and `_ops/supervisor.log`.
- Start `npm run dev` in the foreground.
- If a stale production bundle was introduced, return to the verified dev lifecycle; do not delete user data.

### API down

- Confirm `8313` listener.
- Run `python-api/main.py` in the foreground.
- Inspect dependency/import/database errors.
- Do not switch to another database path to make health green.

### Wrong active cycle/report date

- Read `GET /api/data/cycles` and verify exactly one `status=active`.
- Read `GET /api/data/user` and compare `program_reference`/dates.
- Inspect report `cycle_id` and source fingerprint.
- Preserve incorrect historical rows until the recovery decision is explicit.

### Slow navigation

- Determine whether the route is cold under `next dev`.
- Retry after compilation and compare warmed latency.
- If still slow, inspect network waterfall, process CPU/memory, and server logs.

### n8n failure

- Confirm active cycle and saved `weighin_days`.
- Confirm n8n workflow is active and URL is the production webhook.
- Inspect n8n execution and CORS/auth behavior.
- Never roll back a successful report because reminder delivery failed.

## Docker deployment files

`docker-compose.yml`, `docker-compose.prod.yml`, and related Dockerfiles remain deployment candidates. Their internal ports (`3000`/`8000`), volumes, config mounts, monitoring profiles, and secrets must be validated before use. They do not describe the currently running workstation topology, and the old deployment guides are retained as historical/reference material in the [documentation index](docs/DOCUMENTATION-INDEX.md).

## Security/operational constraints

- Keep services bound to local/trusted interfaces until authentication exists.
- Do not expose test pages, FastAPI docs, raw health data, SQLite, reports, uploads, or n8n URLs publicly.
- Do not log or copy AI/PED/provider credentials.
- Use exact PIDs/ports for process intervention.
- Preserve rollback artifacts and report what was actually verified rather than equating process health with user-flow success.
