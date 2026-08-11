## 1. Contracts and tests

- [ ] 1.1 Add failing contract tests for inventory, protocol, schedule, event, review, and adherence schemas.
- [ ] 1.2 Add fixture protocols covering exact values, ranges, missing weeks, explicit off periods, expiration conflicts, shortages, and custom durations.
- [ ] 1.3 Add safety tests proving unknown units, unresolved ranges, substitutions, source gaps, expired inventory, insufficient quantity, invalid AI JSON, and missing review evidence block activation.
- [ ] 1.4 Add parity tests proving the universal scheduler reproduces existing 14-day source snapshots exactly.

## 2. Persistence and migration

- [ ] 2.1 Add additive SQLite migrations for inventory items, protocol revisions, schedule revisions, schedule events, inventory allocations/transactions, reviews, and adherence events.
- [ ] 2.2 Add repositories with immutable revision and append-only audit behavior.
- [ ] 2.3 Add backup/export/import coverage without exposing AI credentials or unnecessary health data.
- [ ] 2.4 Add read-only migration/adaptation for existing 14-day protocol snapshots.

## 3. Deterministic scheduler and validation

- [ ] 3.1 Implement canonical unit parsing and Decimal-based inventory arithmetic.
- [ ] 3.2 Implement protocol coverage matching without substitutions, range resolution, or implicit repetition.
- [ ] 3.3 Implement duration-independent date/event generation with independent diet and protocol windows.
- [ ] 3.4 Implement fail-closed validation results with critical, major, and informational severity.
- [ ] 3.5 Implement review, activation, future-amendment, rescheduling, and inventory reconciliation services.

## 4. AI-assisted drafting

- [ ] 4.1 Define versioned structured input/output schemas for label normalization and reviewed-template matching.
- [ ] 4.2 Add a dedicated AI planner adapter that returns drafts only and never writes active schedules.
- [ ] 4.3 Deterministically reconstruct and compare every AI draft before presenting it.
- [ ] 4.4 Record provider/model/schema identifiers, input/output hashes, sources, confidence, and known unknowns without credentials.
- [ ] 4.5 Add explicit external-provider transmission consent and data minimization for label images and health context.

## 5. User interface

- [ ] 5.1 Build Settings > PED Inventory with manual entry, optional label extraction, confirmation, expiration, and reconciliation states.
- [ ] 5.2 Build Plan Studio protocol matching with coverage, shortages, extra inventory, source basis, unknowns, and blocked-state explanations.
- [ ] 5.3 Build independent plan/protocol date controls for 14-day, standard, and custom durations.
- [ ] 5.4 Build a review screen with persistent blockers, separate member confirmation and clinical review evidence, and no AI one-click activation.
- [ ] 5.5 Extend Command Center and standard program views with planned/completed/skipped/rescheduled event tracking.
- [ ] 5.6 Add accessible local reminders only after schedule activation.

## 6. Reports and AI explanation

- [ ] 6.1 Extend progress/final reports with effective schedule revisions, planned-versus-actual events, inventory usage, amendments, sources, review status, and unknowns.
- [ ] 6.2 Add an optional read-only AI explanation generated from the immutable schedule/report snapshot.
- [ ] 6.3 Prove AI explanation cannot alter the schedule, inventory ledger, calculation, or report history.

## 7. Verification and release

- [ ] 7.1 Run unit, contract, integration, migration, report parity, accessibility, and end-to-end tests.
- [ ] 7.2 Validate app startup, 14-day regression, standard/custom duration behavior, backup/restore, and rollback with live local services.
- [ ] 7.3 Complete a safety-focused review of every activation and amendment blocker.
- [ ] 7.4 Update product documentation and Feature Lab status only after the verified capability is available.

## 8. Approved Tonight MVP slice

- [x] 8.1 Add editable manual inventory with exact strength/concentration, units on hand, expiration, and confirmation state.
- [x] 8.2 Expand the selected reviewed 14-day source window into dated events without substitutions or inferred repetition.
- [x] 8.3 Add Decimal-based allocation plus persistent blockers for source ranges, units, confirmation, expiration, divisibility, and shortages.
- [x] 8.4 Require separate member inventory confirmation and documented human-review evidence before activation.
- [x] 8.5 Freeze inventory coverage, range records, allocations, and review provenance into the plan revision, Command Center, and report.
- [x] 8.6 Add focused Python/API/frontend/report tests and preserve medical safety status as `not_validated`.
- [x] 8.7 Publish tonight-use instructions and distinguish the available manual MVP from the remaining AI/custom-duration roadmap.
