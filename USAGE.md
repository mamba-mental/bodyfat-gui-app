# Apex Fit Usage Guide

**Owner:** PRIME

**Last updated:** August 11, 2026

**Canonical purpose:** concise, current procedures for daily use.

## Quick start

> The desktop **ApexFit Tracker** and **Stop ApexFit** shortcuts are currently stale and should not be used. Their old target directory no longer exists, and the current `.cmd` wrappers also contain that old path. Use the lifecycle commands below until the shortcuts are repaired.

| Action | Command or location |
| --- | --- |
| Start | `python .\_ops\apex_lifecycle.py start` |
| Status | `python .\_ops\apex_lifecycle.py status` |
| Stop | `python .\_ops\apex_lifecycle.py stop` |
| Dashboard | `http://localhost:3010` |
| API status | `http://localhost:8313` |
| API schema | `http://localhost:8313/docs` |

If port `8313` shows `PRIME Body Fat Calculator API`, the backend is working. Open port `3010` for the app.

## Start a standard cut

1. Open **Plans** or use **Start New Program**.
2. Choose 12, 15, or 22 weeks. The setup form is also capable of saving another explicit duration when exposed by the selected flow.
3. Review the copied profile, start date, current measurements, goals, activity, training, nutrition, and PED-use inputs.
4. Change anything that should differ for this cycle.
5. Save/start the program.
6. Confirm the new active-plan name and start date on the dashboard or in **Settings > Check-ins**.

Starting a program preserves the existing profile as the editable starting point and does not delete old entries or reports. It creates a new active cycle and baseline. The prior cycle becomes stopped/history.

If the profile save fails after cycle creation, the client attempts to restore the previous active cycle. This is compensation, not a fully atomic server transaction; confirm the active plan after any visible save error.

## Start a 14-day cut

1. Open **Plans** at `/plans` and select **Start a 14-day cut**.
2. In **Basics**, choose the exact start date and confirm the profile values that will anchor the plan.
3. In **Diet & Training**, review or edit the versioned two-week structure.
4. In **PED Schedule**, choose two consecutive source-protocol weeks and add the exact inventory needed by those dated events.
5. Resolve every range, unit, expiry, divisibility, quantity, and source-coverage blocker, then record the inventory confirmation and separate documented review evidence.
6. In **Readiness**, accept the source/safety acknowledgement and select **Check readiness**. The app saves a draft template automatically when required and never guesses missing source values.
7. When every item is complete, select **Review my plan**.
8. Confirm the exact frozen calculation, schedule, inventory allocation, and report inputs, then select **Start 14-Day Cut**.
9. Use the **14-Day Command Center** for daily logging, future-day amendments, progress reports, and final/stopped-early reporting.

Inventory constrains whether the selected source schedule can be fulfilled. It does not cause the app to choose a protocol or invent a dose. See [docs/TWO-WEEK-PED-INVENTORY-MVP.md](docs/TWO-WEEK-PED-INVENTORY-MVP.md).

## Add a check-in

1. Open **New Entry**.
2. Confirm the active-cycle banner and date.
3. Enter weight, body-fat measurement when available, optional notes, and optional photo.
4. Save.
5. Remain on the form if a persistence error is shown; do not assume a failed save reached SQLite.

A successful save updates app state and recalculates. It does not automatically generate a report. Use **Reports** when you want a durable report revision.

## Generate a standard report

1. Open **Reports**. Dashboard report actions bring you here.
2. Select the active cycle, another historical cycle, or aggregate history deliberately.
3. Review the entry scope and report type.
4. Generate once. The Report Center blocks a duplicate for the same cycle/source fingerprint.
5. Open the saved report from Report History for HTML, Markdown, or PDF options that are available for that artifact.

An n8n reminder is attempted after a successful standard report only when a webhook and weigh-in schedule are configured. Living and 14-day report actions do not currently fire that automation.

## Use the Living Progress Report

The Living Report is a cycle-scoped coaching snapshot. It compares actual entries with the selected cycle plan, explains trend/adherence, and provides a next-session plan without overwriting earlier reports.

Best use:

- Generate it after a consistent scheduled weigh-in, not repeatedly from unchanged data.
- Verify the selected cycle before generation.
- Treat its calculations as decision support and its AI prose as optional explanation, not a replacement for source data or medical review.
- Keep earlier revisions to see what changed over time.

## Configure weigh-in reminders

1. Start or select an active cycle.
2. Open **Settings > Check-ins**.
3. Select at least one weekday in **Weigh-In Schedule** and save.
4. Paste the production n8n webhook URL and save.
5. Build the n8n workflow so `idempotency_key` is checked before creating any downstream event/task.
6. Use **Send test** knowing it is a real POST that may trigger downstream actions.

Full n8n instructions and payload: [docs/N8N-WEIGH-IN-AUTOMATION.md](docs/N8N-WEIGH-IN-AUTOMATION.md).

## Edit profile and settings

- **Setup Profile** is always available and edits the current member profile.
- Starting a new cycle reuses the last profile but allows changes before saving the new baseline.
- **Settings > Profile** updates the actual display name; email and timezone are local preferences.
- Theme mode and the seven palettes are persistent.
- Units, date formatting, notification toggles, and privacy toggles are stored but are not yet enforced throughout the application.

## Data safety

- Canonical database: `data/bodyfat.db`.
- Generated report artifacts: `storage/reports/`.
- Backups: `data/backups/` plus any separately managed operator backup.
- Redis is optional cache/fallback state, not the record of truth.
- Activated 14-day plan/protocol snapshots are historical evidence; edits create a revision/amendment rather than rewriting completed days.
- Never wipe SQLite just to begin a new program.

## Update rule

When runtime behavior changes, update this guide, the [user manual](USER_MANUAL.md), [current status](CURRENT_STATUS.md), [changelog](CHANGELOG.md), affected API/developer/runbook documents, the relevant OpenSpec tasks/specs, and [docs/VERIFICATION-2026-08-11.md](docs/VERIFICATION-2026-08-11.md) in the same change.
