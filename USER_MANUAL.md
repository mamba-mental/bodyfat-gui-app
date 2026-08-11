# Apex Fit User Manual

**Current as of:** August 11, 2026

This manual describes the current local application at `http://localhost:3010`. For operational startup or recovery, use [RUNBOOK.md](RUNBOOK.md). For concise daily steps, use [USAGE.md](USAGE.md).

## 1. Dashboard

The dashboard summarizes the active cycle, latest weight/body-fat data, nutrition/adherence, progress, upcoming report state, AI insight entry point, and 14-day challenge discovery. The banner is part of the current visual direction and should remain present through palette changes.

Use the plan selector/header to inspect the current plan. A stopped cycle may be viewed in Reports, but is never silently treated as the current plan.

## 2. Setup Profile

**Setup Profile** remains available after onboarding. Use it to change the current profile, goals, training/activity inputs, nutrition pattern, and other PRIME inputs.

When beginning another standard program, Apex Fit copies the existing profile into an editable review form. Saving creates a new cycle baseline; it does not clear the profile or erase history. Make any cycle-specific changes before saving.

## 3. New Entry and Entry History

### New Entry

1. Confirm the active cycle and date.
2. Enter weight and any available body-fat measurement.
3. Add notes/photo if useful.
4. Save and wait for the success confirmation.

The page navigates away only after persistence succeeds. Recalculation is separate from report generation, so an entry save should not wait for a long report job.

### Entries

Entry History shows recorded measurements and progress from the program baseline. “From start” uses the saved `program_reference` baseline when available. Historical records remain associated with their original program/cycle.

## 4. Nutrition

The Nutrition workspace supports local manual logging, validated CSV import, deterministic updates, daily aggregation, history, deletion, and comparison to PRIME targets. Imported records remain local. Verify dates/units in the preview before accepting a CSV import.

## 5. Reports

### Report Center

Choose the scope deliberately:

- **Active cycle** for the current plan.
- **Historical cycle** for a stopped/completed plan.
- **Aggregate** when no single cycle should own the report.

Report generation is explicit. The dashboard routes generation through Report Center so cycle/source duplicate checks are applied.

### Living Progress Report

The Living Report is a cycle-scoped, revisioned progress/coaching document. It uses only entries belonging to the selected cycle, the cycle's own start date, and seven-day week boundaries. Generate it after meaningful new data, then retain older versions as an audit trail.

### 14-day report

An activated 14-day challenge can produce progress, final, or stopped-early output. Depending on recorded data, it includes:

- member/cycle identity and dates;
- template, plan, protocol, inventory, and source revisions;
- calorie/protein targets and actuals;
- exact source-backed PED events and inventory coverage;
- training/cardio schedule and completion;
- daily recovery/measurement logs;
- future-effective amendments;
- safety/review state and completion totals.

The report is deterministic from the frozen plan snapshot. Optional future AI explanation may summarize it, but must never alter the schedule or historical report.

## 6. Progress Charts and Calculator

**Progress** visualizes recorded weight/body-fat data. **Calculator** exposes PRIME-derived calculation tools. These are support surfaces; the active cycle and report snapshot remain the context for official program reporting.

## 7. Plans

**Plans** opens with the current active plan and a direct continuation action. Starting a replacement plan is a separate choice so it cannot be confused with continuing today's work.

### Standard cut

Select **Start a standard cut**, choose 12, 15, or 22 weeks, continue to the copied profile review, adjust values, and save. A real active cycle and program baseline are created.

### 14-Day Cut

Select **Start a 14-day cut**. The guided setup reveals only the current step: Basics, Diet & Training, PED Schedule, Readiness, and Review. Safe navigation choices are saved in the browser so setup can be resumed. The short challenge is separate from standard cuts and always spans exactly 14 calendar days. Activation requires:

- an exact start date;
- an active/reviewed two-week template revision;
- two consecutive source-protocol weeks;
- complete source-backed PED schedule selection;
- confirmed, unexpired, compatible inventory with sufficient quantity;
- explicit resolution of any literal source range through separate review;
- member confirmation, documented review evidence, and safety/source acknowledgement;
- a successful PRIME-backed preview.

The app blocks rather than guesses when any required value is missing. The final Review step identifies the exact frozen revision that the Command Center and reports will use.

## 8. 14-Day Command Center

The Command Center shows day 1–14, today's requirements, calorie/protein targets, diet schedule, source-backed protocol events, report readiness, safety state, and acknowledgements. Log each day accurately. Future days can be amended with a reason and review; completed days are not rewritten.

## 9. AI Coach

AI Chat and AI Insights use configured provider settings. AI output is supplemental. It may explain progress but should not be treated as confirmation that a PED schedule is safe, clinically appropriate, or source-complete. Provider calls may transmit the context shown in the AI request; configure only providers you intend to use.

## 10. Settings

- **Preferences:** theme mode, one of seven palettes, and display preferences.
- **Profile:** display name plus local email/timezone preferences.
- **Check-ins:** active-cycle weigh-in days and optional n8n webhook.
- **AI Settings:** provider/model/key configuration and connection testing.
- **Notifications, Privacy, Data Management, Feature Lab:** availability varies. Stored units/date/notification/privacy values are not yet enforced in every consuming view.

The n8n URL is stored in browser localStorage for this single-user local MVP. It is not signed by Apex Fit. See [docs/N8N-WEIGH-IN-AUTOMATION.md](docs/N8N-WEIGH-IN-AUTOMATION.md).

## 11. Changelog and test pages

The Changelog is a user-facing release-history page. `/test`, `/test-api`, `/test-fixes`, and `/test-report` are developer routes currently present in the production route manifest; they should not be exposed when the app is made network-accessible.

## 12. Safety and privacy

- SQLite and generated artifacts contain sensitive body-composition and protocol information. Protect backups and do not commit them.
- Apex Fit does not prescribe PEDs or resolve medical suitability.
- “Member confirmed” and “documented review” are separate from clinical approval.
- Stop using the app's protocol tracking and seek qualified care for adverse symptoms or urgent medical concerns.
- Cloud sync and multi-user authentication are not active in the current local configuration.

## 13. When something looks wrong

- API JSON instead of dashboard: open `http://localhost:3010`, not `8313`.
- “Site can't be reached”: run the lifecycle start/status commands.
- Wrong cycle date: confirm the active cycle in Plans/Settings and the selected scope in Reports.
- Missing n8n schedule: select weigh-in days on the active cycle first.
- Slow first page load: let the development server compile that route, then retry.
- Saved report appears twice: refresh; the UI collapses historical duplicate artifact rows and new startup ingestion is deduplicated.

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for diagnostics.
