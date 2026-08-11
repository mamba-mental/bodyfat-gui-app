# Apex Fit Troubleshooting

**Current as of:** August 11, 2026

## Dashboard cannot be reached

Run from the project root:

```powershell
python .\_ops\apex_lifecycle.py status
python .\_ops\apex_lifecycle.py start
```

Then open `http://localhost:3010`. If `3010` remains down, inspect the listener and supervisor output without killing unrelated processes:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3010,8313 -ErrorAction SilentlyContinue
Get-Content .\_ops\supervisor.log -Tail 100
```

Do not use a machine-wide `taskkill /IM python.exe`; it can terminate unrelated Python services.

## Browser shows a JSON API message

`http://localhost:8313` is the backend. The response below is success, not the dashboard:

```json
{"message":"PRIME Body Fat Calculator API","status":"running"}
```

Open `http://localhost:3010` for Apex Fit.

## Frontend is slow on the first click

The current local supervisor runs `next dev`. The first visit to an uncompiled page after restart can take several seconds. Wait for compilation and retry once. Repeated warm-route delays indicate a real problem; inspect process CPU/memory, browser network timing, and supervisor logs.

Do not switch the supervisor to `next start` without a verified standalone build/copy lifecycle; this project uses Next `output: 'standalone'` and a stale bundle can otherwise be served.

## API is down

Check:

```powershell
Invoke-WebRequest http://127.0.0.1:8313/health -UseBasicParsing
Get-NetTCPConnection -State Listen -LocalPort 8313 -ErrorAction SilentlyContinue
```

Start it directly for visible logs if necessary:

```powershell
Set-Location .\python-api
python main.py
```

The local backend port is `8313`, not `8000`. Port `8000` is used inside some Docker deployment candidates.

## New program has the wrong profile or date

1. Confirm the active cycle in Plan Studio or **Settings > Check-ins**.
2. Confirm the Reports selector is not showing a stopped historical cycle.
3. Reopen **Setup Profile** and verify the copied/editable profile values.
4. If a save error occurred, refresh and re-check the active cycle; client compensation is not a fully atomic server transaction.
5. Do not delete the user/profile or database to reset a program.

The repaired August 11 active cycle begins `2026-08-11`. An older June 3 report/cycle remains historical by design.

## Entry save appears stuck or missing

- Confirm the API health first.
- A successful entry save no longer waits for report generation.
- If an error is displayed, remain on the form and retry after the API is healthy.
- Check `/api/data/entries` or the Python `/api/data/entries` endpoint only as a read-only diagnostic.
- Do not trust Redis alone; SQLite is canonical.

## Report date/scope is wrong

- Open Report Center and explicitly select the intended active/historical/aggregate scope.
- Verify the cycle start date and entry association.
- Living Reports use the selected cycle only.
- New entries do not auto-generate reports; a visible report may be an older artifact.
- Historical duplicate artifact rows are hidden by UI deduplication; new ingestion is guarded.

## 14-day cut is missing or blocked

Open `/plans`, select **14-Day Cut**, and resolve the displayed blockers. Typical blockers are a draft template, missing consecutive source weeks, incomplete source values, unconfirmed/expired inventory, incompatible units, non-divisible oral strength, shortage, missing review evidence, or missing acknowledgement.

The app intentionally refuses to infer or recommend a replacement compound/dose.

## n8n test will not send

You need all three:

1. An active cycle.
2. At least one saved weigh-in weekday.
3. A valid webhook URL.

If delivery succeeds but duplicates are created, enforce `idempotency_key` inside n8n. See [docs/N8N-WEIGH-IN-AUTOMATION.md](docs/N8N-WEIGH-IN-AUTOMATION.md).

## Data integrity or recovery concern

Stop application writers, copy the current database to a separate recovery filename, and do not overwrite it until a candidate backup passes `PRAGMA quick_check`. Use [RUNBOOK.md](RUNBOOK.md); never replace the live database while FastAPI is writing.

## Build/test issues

Current commands:

```powershell
npx tsc --noEmit
npm run build
python -m pytest python-api\tests\unit -q
npx playwright test tests\e2e\modern-workspace.spec.ts --project=chromium --workers=1
```

The build may print an existing ESLint circular-configuration warning even when page generation succeeds. Firefox/WebKit require their Playwright browser binaries to be installed.

## What to include in a bug report

- Page/URL and exact action.
- Active cycle ID/name/start date shown in the UI.
- Expected versus observed result.
- Browser console/network error and HTTP status, with credentials removed.
- Relevant supervisor/API log excerpt, with health/PED/private data minimized.
- Whether the route was cold or already compiled.
- Whether the problem reproduces after a refresh without mutating data.
