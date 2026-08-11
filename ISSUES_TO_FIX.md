# Apex Fit Outstanding Issues

**Reviewed:** August 11, 2026

**Evidence:** [`docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md`](docs/ADVERSARIAL-FLOW-REVIEW-2026-08-11.md)

Older July 2025 issues in this file were reconciled against the current application. Report waiting, profile prefill, theme navigation, sidebar routes, and AI page availability are no longer described here as current defects.

## Open defects and risks

| Priority | Issue | Current impact | Required fix |
| --- | --- | --- | --- |
| P1 | Standard program start is not atomic | A crash between cycle/profile requests can leave split state despite client compensation | One backend SQLite transaction plus failure/retry tests |
| P1 | Palette coverage is incomplete | Seven choices exist, but hard-coded modern-page colors can ignore selection | Convert to semantic tokens and visually verify every palette/page/theme |
| P1 | Some Settings success is optimistic | UI can show Saved before the profile server write is confirmed | Await persistence and surface failure |
| P1 | Desktop start/stop shortcuts are stale | Both shortcuts and both current `.cmd` wrappers reference a deleted repository path | Update wrapper `cd` paths and repoint/recreate shortcuts, then run lifecycle integration test |
| P2 | Units/date/notification/privacy preferences are not fully consumed | Settings imply broader behavior than exists | Implement consumers or label/disable inactive controls |
| P2 | n8n is browser-side and unsigned | URL in localStorage; no signature, retry ledger, or app-side dedupe enforcement | Server-side secure delivery service and audit table |
| P2 | Local runtime uses `next dev` | Cold routes can feel slow; not a production lifecycle | Verified standalone build/start supervisor with rollback |
| P2 | Full PED scheduler/AI roadmap incomplete | Only manual 14-day inventory coverage is shipped | Complete unchecked `add-ai-ped-inventory-scheduler` tasks |
| P3 | Test routes ship in production manifest | Debug/test pages could be exposed | Gate/remove outside development |
| P3 | Cross-browser verification incomplete | Chromium verified; Firefox/WebKit binaries unavailable | Install browsers and run release suite |
| P3 | Older broad suites are stale | Noise from retired paths/ports/schema/harness failure | Update harness/contracts and restore trustworthy all-suite status |

## Resolved in the August 11 flow repair

- New Program preserves and pre-populates the profile.
- A new standard program creates a first-class active cycle and baseline.
- Reports do not silently use the newest stopped cycle.
- Entry save does not wait for or silently create reports.
- Dashboard generation uses Report Center's duplicate gate.
- Plans separates continuing the active plan from starting a replacement, and standard 12/15/22 choices continue to setup.
- The 14-day builder is a resumable five-step flow with authoritative Readiness and exact Review gates.
- Living Reports are selected-cycle scoped and use correct week math.
- 14-day report creation refreshes app state.
- Startup/UI report artifact duplication is guarded.
- n8n requires active cycle, schedule, and next date; downstream enforcement is explicit.
- Entry-history progress uses the program baseline.
- Setup/Profile remains available; Settings display name updates the real profile.
- The live active-cycle start date is August 11, with the June 3 cycle/report preserved as history.

## Verification gaps, not proven defects

- No paid AI provider call was made during the audit.
- No live n8n downstream task/calendar event was created.
- No 14-day challenge was activated against the member's live data.
- No destructive entry/report/profile operation was exercised against live data.

Do not close an issue merely because a page renders or a health endpoint returns 200. Verify the complete read/write/re-read/UI path with the appropriate safe fixture or explicitly authorized live mutation.
