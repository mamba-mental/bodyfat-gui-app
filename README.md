# Apex Fit

Apex Fit is a local-first body-composition planning and progress application. The Next.js interface combines profile and check-in history with the Python PRIME calculation engine, cycle-scoped reports, editable standard programs, a separate 14-day cut workflow, nutrition tracking, and optional AI coaching.

> Current documentation baseline: August 11, 2026. Start with the [documentation index](docs/DOCUMENTATION-INDEX.md) when a dated audit or older deployment note conflicts with a current guide.

## What is available

- Modern dashboard, preserved banner artwork, seven selectable palettes, responsive sidebar, and direct page routes.
- Editable profile, entries, progress charts, calculator, nutrition history/import, AI settings/chat/insights, reports, and application settings.
- Standard 12-, 15-, and 22-week plan choices plus editable profile/goal review before a new cycle starts. The underlying cycle may also use another explicit week count.
- New-program profile inheritance: the existing profile is copied into the setup form, remains editable, and is saved as the new cycle baseline without deleting prior entries or reports.
- A distinct 14-day cut with editable/versioned templates, two-week PRIME targets, source-bound PED schedule selection, manual inventory coverage, daily logs, amendments for future days, and progress/final/stopped-early reports.
- Cycle-scoped standard and Living Reports with duplicate-generation protection. Saving an entry does not silently generate a report.
- Optional n8n handoff for the next scheduled weigh-in after a standard report is generated.

## Important limits

- Apex Fit does not diagnose, prescribe PEDs, invent doses, rank compounds, resolve ambiguous source ranges, or replace a qualified clinician. The current 14-day workflow tracks a schedule selected from member-supplied source material and blocks activation until required source, inventory, confirmation, and review data are present.
- The currently available PED inventory feature is manual and deterministic. AI/OCR label extraction, AI schedule drafting, standard/custom-duration PED scheduling, inventory decrement from adherence, and automatic schedule replanning remain roadmap work.
- Stored unit, date-format, notification, and privacy preferences are not yet enforced everywhere. See the [adversarial flow review](docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md).
- Cloud sync is not active. SQLite is the authoritative local application store.

## Local runtime

The verified workstation topology is:

```text
Browser -> Next.js on 3010 -> FastAPI/PRIME on 8313 -> data/bodyfat.db
                                      |
                                      +-> storage/reports

Optional Redis cache -> Docker/WSL port 6385
```

The Apex frontend and FastAPI service are Windows-supervised processes in the current daily-use configuration. Redis is the only Apex component expected in Docker. The older full-stack Docker files remain deployment candidates and are not evidence of the live topology.

### Start, inspect, and stop

> Desktop shortcut warning: the current **ApexFit Tracker** and **Stop ApexFit** shortcuts, plus the two repository `.cmd` wrappers they target, contain the removed non-space project path. Do not use them until they are repointed. Use the commands below from the real project root.

From the project root in PowerShell:

```powershell
python .\_ops\apex_lifecycle.py start
python .\_ops\apex_lifecycle.py status
python .\_ops\apex_lifecycle.py stop
```

Then open:

- Application: [http://localhost:3010](http://localhost:3010)
- FastAPI root/status: [http://localhost:8313](http://localhost:8313)
- FastAPI health: [http://localhost:8313/health](http://localhost:8313/health)
- Interactive FastAPI schema: [http://localhost:8313/docs](http://localhost:8313/docs)

The root API response `{"message":"PRIME Body Fat Calculator API","status":"running"}` is normal. It means the backend URL was opened; the dashboard is on port `3010`.

### Manual development start

```powershell
# Terminal 1
Set-Location .\python-api
python main.py

# Terminal 2, from the project root
npm install
npm run dev
```

The development frontend uses Turbopack/Next development compilation, so the first visit to a route after restart can be slower than later visits.

## Primary workflows

1. Use **Setup Profile** to create or edit the member profile.
2. Use **Plan Studio** to start a standard cut or build a 14-day cut.
3. Use **New Entry** for measurements. A successful save recalculates state but leaves report creation explicit.
4. Use **Reports** to choose the active cycle or aggregate history and generate the desired report.
5. Use **Settings > Check-ins** to select weigh-in days and optionally connect an n8n webhook.

For the complete click path, use the [user manual](USER_MANUAL.md). For tonight's 14-day inventory workflow, use [Two-Week PED Inventory MVP](docs/TWO-WEEK-PED-INVENTORY-MVP.md).

## Development verification

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

The latest verified results and known gaps are in [docs/VERIFICATION-2026-08-11.md](docs/VERIFICATION-2026-08-11.md).

## Documentation map

- [Documentation index](docs/DOCUMENTATION-INDEX.md) — source-of-truth map and lifecycle of every documentation family.
- [Usage guide](USAGE.md) — concise day-to-day procedures.
- [User manual](USER_MANUAL.md) — complete screen and workflow guide.
- [API documentation](API_DOCUMENTATION.md) — current Next.js and FastAPI surface.
- [Developer guide](DEVELOPER_GUIDE.md) — architecture, invariants, and contribution workflow.
- [Database and persistence](DATABASE_INFO.md) — canonical stores, snapshots, and backups.
- [Runbook](RUNBOOK.md) — startup, health, backup, recovery, and release checks.
- [Troubleshooting](TROUBLESHOOTING.md) — current failure modes and fixes.
- [n8n weigh-in automation](docs/N8N-WEIGH-IN-AUTOMATION.md) — payload, deduplication, and activation.
- [Adversarial flow review](docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md) — fixed defects and remaining risks.

## Repository safeguards

- Treat `data/bodyfat.db` as the canonical application store and back it up before migrations or repairs.
- Do not manually edit `.taskmaster/tasks/tasks.json`; use Task Master commands.
- Preserve activated challenge plan/protocol snapshots and historical reports. Changes to future challenge days must create a revision or amendment.
- Do not commit API keys, webhook credentials, provider tokens, member health exports, or generated private reports.
