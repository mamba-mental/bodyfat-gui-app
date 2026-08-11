# Apex Fit Adversarial Flow Review — 2026-08-11

**Disposition updated:** August 11, 2026 after the flow repair and guided Plans implementation. This is the current full-flow audit; older June audits remain historical snapshots.

The later guided Plans slice resolved the audit's Plan Studio discoverability and palette findings for `/plans`: the route now presents the current plan first, separates standard and 14-day creation, uses five resumable steps with authoritative Readiness and Review gates, and consumes semantic palette roles. The remaining palette finding applies to other modern Dashboard and Command Center surfaces.

## Scope and method

This review traced every primary sidebar destination, the header plan/profile links, all Settings tabs, the standard-cycle and 14-day-cycle entry points, entry persistence, report generation, Living Report generation, and the n8n reminder handoff. It compared visible promises with the actual write/read path and exercised non-destructive browser and HTTP checks.

- 22 application routes returned HTTP 200, including all 17 primary/sidebar workspaces and the four exposed test pages.
- Chromium modern-workspace suite: 11/11 passed. Firefox and WebKit were not installed locally; their failures were missing-browser infrastructure failures, not application assertions.
- Focused Vitest regression set: 21/21 passed.
- Python unit suite: 28/28 passed.
- TypeScript typecheck and `git diff --check`: passed.
- Clean Next.js production build: passed, 57/57 static pages generated. The existing ESLint circular-configuration warning remains.
- No webhook, report generation, challenge activation, entry mutation, or destructive data action was fired during the audit.

After the read-only audit, an explicitly scoped live-state repair restored the current profile/cycle association: exactly one standard cycle is active from August 11, prior cycles are stopped/preserved, and the June 3 report remains historical. The repair was preceded by a SQLite backup under `data/backups/`.

## Findings fixed in this change

| Severity | Flow | Adversarial finding | Resolution |
| --- | --- | --- | --- |
| Critical | Setup → Start New Program | The button deleted `/api/data/user`, cleared the profile cache, and then opened a blank setup form despite promising to preserve history. | Removed every delete/clear operation. The current profile is copied into an editable review form. |
| High | New standard program | The legacy action changed `current_program_id` and dates but did not create the ReComp cycle used by dashboards, entries, reports, and reminders. | Saving the reviewed profile now creates a matching active standard cycle and profile baseline. |
| High | Reports after new program | With no active cycle, Reports silently selected the newest stopped cycle, causing the August 11 report to inherit the June 3 cycle. | No-active-cycle now selects the aggregate view; a stopped cycle is never silently treated as current. |
| High | New Entry | A saved check-in awaited recalculation plus a report job with a five-minute timeout, making the page appear frozen. Save errors were swallowed and the form still navigated away. | Entry save returns success/failure, recalculation remains, report generation is explicit, and navigation occurs only after persistence succeeds. |
| High | Dashboard Generate | Dashboard generation bypassed the Report Center's cycle/source-fingerprint duplicate gate. | Dashboard report actions now open Report Center, which owns the gate. |
| High | Plan Studio 12/15/22 | Standard plan buttons changed selection text but exposed no next action. | Each selection now opens the copied, editable profile review with that duration preselected and creates a real cycle on save. |
| High | Living Report | The selected-cycle UI passed all historical entries and used profile date/rounded week math. | It now passes only the selected cycle's entries, uses that cycle's start date, and applies floor-based seven-day week boundaries. |
| Medium | 14-day Command Center | Generating a report persisted it in the backend but did not refresh/append the global report state, so Report History could remain stale. | The generated record is added to app state and widgets are refreshed. |
| Medium | Report History | Generator rows were re-imported at service startup under the HTML filename, showing one artifact twice. | Startup ingestion recognizes already-backed artifacts; the UI also collapses historical duplicate rows without deleting data. |
| Medium | Weigh-in webhook | Test/send could emit a meaningless `nocycle:none` event and implied the key itself prevented duplicates. | Sends now require an active cycle, configured weigh-in days, and a calculable next date; UI states that n8n must enforce deduplication. |
| Medium | Entry History progress | “From start” used the mutable current profile values instead of the program baseline. | It now uses `program_reference.initial_weight` and `initial_bf` when available. |
| Medium | Setup sidebar | Setup could be disabled using the obsolete `userData` localStorage key even though Setup is also the profile editor. | Setup Profile remains available at all times. |
| Medium | Settings profile name | “Full Name” was saved only into a disconnected local preference object. | Save Settings now also updates the actual app profile name; email/timezone are explicitly described as local preferences. |

## Route/action disposition

| Workspace | Result | Notes |
| --- | --- | --- |
| Dashboard | Pass with fix | Current metrics use active-cycle domain data; report CTA now enters the gated Report Center. Standard and 14-day replacement flows are directly available in Plans. |
| Setup Profile / custom / wizard | Pass with fix | Existing profile is reused and editable. No historical entry/report deletion occurs. |
| New Entry | Pass with fix | Persistence, recalculation, failure retention, and post-save navigation are separated from report generation. |
| Entry History | Pass with fix | Baseline delta uses the program snapshot. Edit/delete mutations were not fired against live data during this read-only audit. |
| Nutrition | Pass, availability only | Workspace and controls render. Live import/delete was not exercised because it would mutate member data. |
| Reports | Pass with fixes | Active/aggregate scoping, duplicate gate, standard, Living, and 14-day report state paths were traced. Existing duplicate DB rows remain preserved but are hidden as one artifact. |
| Progress Charts | Pass, availability only | Browser assertion passed; no live record mutation was needed. |
| Plans | Pass with fixes | Current-plan continuation is separated from replacement. Standard 12/15/22 choices continue, and the 14-day path is guided through Basics, Diet & Training, PED Schedule, authoritative Readiness, and exact Review. Challenge activation was not fired. |
| 14-Day Cut | Pass with fix | Draft/active challenge selection, logs, amendment constraints, schedule rendering, and report refresh were traced. There is currently no live 14-day challenge to execute end-to-end. |
| Calculator | Pass, availability only | Primary calculator workspace rendered. |
| AI Settings / Chat / Insights | Pass, availability only | Pages render. No provider credential, paid model call, or medical/PED schedule generation was invoked. |
| Settings | Partial | Appearance controls exist and seven palettes render. Check-in scheduling and n8n guards are real. Several stored preferences remain nonfunctional; see open findings. |
| Template Editor | Pass, availability only | Editor renders. No template revision was written. |
| Changelog | Pass | Workspace renders. |

## Open findings, ordered by risk

### P1 — New-program persistence is not atomic

Cycle creation and profile saving are separate HTTP writes. This change adds client-side compensation: if the profile write fails, the prior active cycle is reactivated (or the new cycle is stopped). That closes the ordinary split-state failure, but a process crash between requests still cannot be made atomic in the browser. The durable fix is one backend transaction endpoint that saves the cycle, profile baseline, and old-cycle status together or rolls all three back.

### P1 — Palette selection does not govern all remaining modern screens

Guided Plans now consumes semantic palette roles and was checked across all seven palettes in light and dark modes. Parts of the modern dashboard and 14-day Command Center still contain hard-coded colors, so palette migration is not complete application-wide.

### P1 — Settings “saved” can get ahead of server persistence

`setUserData` dispatches immediately and starts `saveUserData` without awaiting or surfacing failure. Settings can display Saved even if the profile API write later fails. Convert this action to an awaited result and show success only after the server confirms it.

### P2 — Units, date format, notifications, and privacy toggles are stored but not enforced

Search found no production consumers for unit/date-format preferences or the weekly-report, goal-reminder, entry-reminder, data-sharing, and analytics toggles. Until implementations exist, the UI should label these as local/inactive preferences or disable them rather than imply application-wide behavior.

### P2 — n8n webhook has no app-level signature or secret header

The webhook URL is client-side localStorage and the outbound request is plain JSON. This is acceptable for the current single-user local MVP only. A multi-user/remote version needs server-side encrypted storage, a signing secret or authenticated header, allowlisting, and retry/audit state. The automatic trigger currently occurs after successful standard-report generation; it is not a clock-based scheduler and is not fired by Living or 14-day reports.

### P2 — Development runtime causes cold-route delays

The live UI uses `next dev`; the first visit after restart can take several seconds while routes compile, while warmed routes returned roughly 0.13–0.39 seconds in this run. For daily use, the supervisor should run a verified `next build` + `next start` lifecycle with safe restart/rollback rather than a development compiler.

### P3 — Debug/test pages are included in the production build

`/test`, `/test-api`, `/test-fixes`, and `/test-report` are publicly routable in the current build. Remove them or gate them behind development mode before any network-exposed deployment.

### Verification gaps (not claimed as defects)

- Firefox and WebKit browsers are not installed in this workspace, so only Chromium E2E assertions ran.
- No paid/external AI call, n8n delivery, email/calendar task creation, live template edit, destructive clear/delete, or 14-day activation was performed.
- The existing duplicate database rows were not deleted; the UI deduplicates them and future startup ingestion is prevented.

## Recommended next implementation slice

1. Add an atomic backend `start program` transaction and make the UI wait for its confirmed response.
2. Convert the remaining hard-coded modern workspace colors to semantic palette tokens and visually validate all seven palettes on Dashboard and Command Center.
3. Make Settings honest: implement or label units/date formatting, notifications, and privacy enforcement.
4. Move the live supervisor to production runtime, then add a signed server-side n8n delivery record with retries and event history.
5. Remove or development-gate test routes and install Firefox/WebKit for cross-browser release testing.

## Documentation disposition

The corrected flows are reflected in the root README, current status, usage guide, user manual, API/developer/database/persistence/runbook/troubleshooting documents, the n8n automation guide, the two-week MVP guide, and the documentation index. Historical plans/audits are retained as dated evidence and do not override this review.
