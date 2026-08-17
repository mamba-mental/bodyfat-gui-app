# Current Application Status

**Verified:** August 17, 2026

**Branch:** `feat/recomp-cycle-foundation`

**Last verified repository baseline:** `0592572`; shortcut/runtime repair is pending commit

## Operational state

| Component | Current local endpoint | Verified state |
| --- | --- | --- |
| Dashboard | `http://localhost:3010` | HTTP 200 |
| FastAPI root | `http://localhost:8313` | HTTP 200; JSON service status is expected |
| FastAPI health | `http://localhost:8313/health` | `healthy` |
| SQLite | `data/bodyfat.db` | Canonical local store; integrity check passed in release verification |
| Redis | WSL/Docker host port `6385` | Optional cache only; not authoritative |
| Cloud sync | Settings Feature Lab | Disabled; provider required |

The frontend and API are not currently served by the Docker application stack. The local supervisor runs them on Windows; only Redis is expected in Docker.

The OneDrive Desktop shortcuts **ApexFit Tracker** and **Stop ApexFit** now point to the current repository and have valid working directories. The launcher uses the repository's pinned Next.js rather than allowing `npx` to download a different major version, waits for HTTP health rather than an open socket, and coordinates the supervisor through a no-admin stop marker. Real shortcut tests returned HTTP 200 for both services and proved that Stop kept both ports down for at least 25 seconds.

The full Apex application is not yet container-deployed. Live Docker inspection found only `apex-fit-redis`; the existing full-stack Compose path selects the simplified backend and bakes a browser-facing localhost API URL into the frontend. Do not deploy it unchanged. HP1 is the preferred future host based on current capacity, with private Tailscale access and Synology backups.

## Live member/cycle repair state

- The member profile is present and no longer deleted when a new program begins.
- The active standard cycle starts on `2026-08-11`; the incorrect June 3 cycle is stopped and retained as history.
- Exactly one cycle is active.
- The active cycle currently has no weigh-in days selected, so n8n test/send correctly remains blocked until at least one day is saved in **Settings > Check-ins**.
- The old report associated with the June 3 cycle was preserved rather than destructively rewritten or deleted.

## Working flow behavior

- **Start New Program:** copies the current profile into an editable form, creates a real active cycle, saves a new baseline, stops the prior active cycle, and preserves all historical data.
- **New Entry:** confirms persistence before navigation, recalculates the app state, and does not wait for or silently create a report.
- **Reports:** defaults to the active cycle when one exists; otherwise it uses aggregate history and never silently treats a stopped cycle as current.
- **Living Report:** uses the selected cycle's entries, cycle start date, and floor-based seven-day week boundaries.
- **Dashboard Generate:** opens Report Center so the cycle/source duplicate gate is applied.
- **14-day reports:** use the immutable activated challenge snapshot and can include template, protocol/PED, inventory review, amendments, planned-versus-actual daily data, and completion state.
- **Plans:** presents the active plan first, separates standard and 14-day creation, and guides the 14-day path through Basics, Diet & Training, PED Schedule, Readiness, and exact final Review. Safe navigation choices resume locally; canonical profile, protocol, inventory, and preview data are reloaded.
- **n8n:** sends only when there is an active cycle, at least one weigh-in day, and a calculable next date. n8n—not the app—must enforce the supplied idempotency key.

## Verified release gates

- TypeScript typecheck passed.
- Production build passed with 57 static pages; the pre-existing ESLint circular-configuration warning remains.
- 28 Python backend tests passed.
- 8 focused guided-Plans/palette frontend tests passed in the final slice; the earlier 22-test flow-repair regression set also passed.
- 16 Chromium modern-workspace and guided-Plans end-to-end tests passed.
- 22 checked HTTP routes returned 200.
- All three active relevant OpenSpec changes passed strict validation.

See [docs/VERIFICATION-2026-08-11.md](docs/VERIFICATION-2026-08-11.md) for exact scope and [docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md](docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md) for remaining risks.

## Not complete

- Atomic backend transaction for starting a standard program.
- Full semantic-palette coverage on the remaining modern Dashboard and Command Center surfaces.
- Awaited server confirmation for all Settings saves.
- Enforcement of units, date-format, notification, and privacy preferences.
- Signed/server-side n8n delivery with retries and event history.
- AI-assisted PED inventory extraction or schedule drafting.
- PED scheduling for standard/custom durations, adherence event tracking, and automatic inventory decrement.
- Production-gating/removal of the four test routes.
- Firefox and WebKit end-to-end verification.
- Production-grade HP1 container deployment with same-origin API routing, private access, health checks, persistent storage, and Synology backup.

These items must not be described elsewhere as shipped. The [documentation index](docs/DOCUMENTATION-INDEX.md) identifies older plans and snapshots that are historical rather than current instructions.
