# Apex Fit Documentation Index

**Documentation baseline:** August 11, 2026

This index is the authority for which documents describe current behavior. Dated audits, implementation plans, generated protocol extracts, test reports, and deployment experiments remain useful evidence, but they do not override the current guides below.

## Current user and operator documentation

| Document | Purpose |
| --- | --- |
| [`README.md`](../README.md) | Product, current topology, quick start, limits, and primary documentation map |
| [`CURRENT_STATUS.md`](../CURRENT_STATUS.md) | Verified live state, shipped behavior, release gates, and open work |
| [`USAGE.md`](../USAGE.md) | Short day-to-day procedures |
| [`USER_MANUAL.md`](../USER_MANUAL.md) | Complete screen-by-screen and workflow guide |
| [`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md) | Current diagnostics and recovery steps |
| [`RUNBOOK.md`](../RUNBOOK.md) | Local lifecycle, health checks, backups, recovery, and release operations |
| [`DATABASE_INFO.md`](../DATABASE_INFO.md) | Canonical storage architecture and table families |
| [`DATA-PERSISTENCE-INFO.md`](../DATA-PERSISTENCE-INFO.md) | Persistence, cache, report artifacts, browser preferences, and backups |
| [`API_DOCUMENTATION.md`](../API_DOCUMENTATION.md) | Current Next.js and FastAPI route inventory and invariants |
| [`DEVELOPER_GUIDE.md`](../DEVELOPER_GUIDE.md) | Current architecture and implementation rules |
| [`CHANGELOG.md`](../CHANGELOG.md) | User-visible and engineering change history |
| [`N8N-WEIGH-IN-AUTOMATION.md`](N8N-WEIGH-IN-AUTOMATION.md) | Exact webhook trigger, payload, deduplication, and workflow setup |
| [`TWO-WEEK-PED-INVENTORY-MVP.md`](TWO-WEEK-PED-INVENTORY-MVP.md) | What the manual inventory MVP can and cannot do tonight |

## Current verification and design authority

| Document | Status |
| --- | --- |
| [`VERIFICATION-2026-08-11.md`](VERIFICATION-2026-08-11.md) | Latest release verification record |
| [`ADVERSARIAL-FLOW-REVIEW-2026-08-11.md`](ADVERSARIAL-FLOW-REVIEW-2026-08-11.md) | Latest complete user-flow review and remaining defects |
| [`MOBBIN-DESIGN-OPTIONS.md`](MOBBIN-DESIGN-OPTIONS.md) | Reference patterns for pages not yet fully modernized |
| [`CLOUD-SYNC-READINESS.md`](CLOUD-SYNC-READINESS.md) | Current no-cloud-write boundary and migration requirements |
| [`../openspec/specs`](../openspec/specs) | Accepted baseline requirements |
| [`../openspec/changes/add-two-week-cut-challenge`](../openspec/changes/add-two-week-cut-challenge) | Implemented 14-day challenge contract |
| [`../openspec/changes/update-interface-palettes-and-feature-lab`](../openspec/changes/update-interface-palettes-and-feature-lab) | Implemented palette/Feature Lab contract, subject to open token-coverage finding |
| [`../openspec/changes/add-ai-ped-inventory-scheduler`](../openspec/changes/add-ai-ped-inventory-scheduler) | Approved full roadmap; only section 8 Tonight MVP is complete |
| [`../openspec/changes/finish-v1-5-release`](../openspec/changes/finish-v1-5-release) | Completed historical release change; retained until formally archived |

## Calculation and source references

These are engineering/source references, not medical instructions and not proof that every proposed modifier is active:

- [`CALORIE-ENGINE-SPEC-v1.md`](CALORIE-ENGINE-SPEC-v1.md)
- [`CALORIE-ENGINE-AUDIT-AND-BUILD-2026-06-08.md`](CALORIE-ENGINE-AUDIT-AND-BUILD-2026-06-08.md)
- [`CALC-VALIDATION-FINDINGS-2026-06-08.md`](CALC-VALIDATION-FINDINGS-2026-06-08.md)
- [`PED-MODIFIERS-SOURCING.md`](PED-MODIFIERS-SOURCING.md)
- [`protocol-data/nutrition-and-ped.md`](protocol-data/nutrition-and-ped.md)

The structured protocol extract preserves what source documents said—including missing/ranged values. It is not authorization for the application to fill gaps, make substitutions, or determine clinical suitability.

## Historical snapshots and plans

The following families are intentionally retained as dated evidence. Treat their dates and status claims literally; use the current guides for operation:

- `docs/audit/` — historical read-only audits.
- `docs/plans/` — north-star and implementation plans; completion must be checked against OpenSpec tasks and current status.
- `docs/mockups/` — visual/content samples, not live screenshots or guaranteed report output.
- `docs/superpowers/` — older design artifacts.
- Root `AI_SPEED_*`, `REPORT_*`, `T015-*`, `PARAMETER_USAGE_VERIFICATION.md`, `TEST_ALL_FIXES.md`, `verify-fixes.md`, `FINAL_*`, and `PRODUCTION_READINESS_*` — dated implementation/test records.
- Root Docker/NAS deployment guides — deployment candidates that predate the current Windows-supervised daily-use topology.
- Root TTS, MCP, SDD, Gemini, and tooling guides — development-tool references independent of the Apex Fit user flow.
- `REDIS_IMPLEMENTATION_PLAN.md` — historical Redis-first proposal. Current architecture is SQLite-authoritative with Redis optional.
- `weight-tracking-reset-on-new-program.md`, `plan.md`, and `implement.md` — proposal/implementation artifacts superseded by current OpenSpec and code.
- `ARCHIVE_OPERATION_REPORT.txt`, `STORAGE_REPORT_SUMMARY_FOR_TTS.txt`, `TTS_OPTION_B_IMPACT_SUMMARY.txt`, `DOCKER_VALIDATION_REMINDER.txt`, and `tts_announcement.txt` — historical transcripts/reminders, not instructions.

## Documentation maintenance contract

When behavior changes:

1. Update the affected user guide and current status.
2. Update API, developer, database/persistence, runbook, or troubleshooting material when their contracts change.
3. Update the relevant OpenSpec task/spec; do not mark roadmap work complete because a narrower MVP exists.
4. Add verification evidence and known gaps.
5. Add a changelog entry.
6. Run local-link validation, strict OpenSpec validation, and `git diff --check`.

Historical evidence should receive a supersession note when necessary, but its original findings/results should not be rewritten to manufacture present-day pass status.
