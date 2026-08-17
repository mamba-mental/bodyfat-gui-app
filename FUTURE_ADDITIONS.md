# Apex Fit Remaining Roadmap

**Updated:** August 11, 2026

**Authority:** Accepted OpenSpec changes and the latest adversarial review. This file summarizes; task completion is tracked in `openspec/changes/*/tasks.md`.

## P1 — Reliability and honest state

1. **Atomic start-program transaction**
   - Save prior-cycle status, new cycle, edited profile, and program baseline in one SQLite transaction.
   - Return the complete committed state and test failure/rollback boundaries.

2. **Complete palette-token migration**
   - Replace remaining hard-coded modern Dashboard and Command Center colors with semantic tokens; guided Plans is complete.
   - Visually verify all seven palettes, both themes, contrast, reduced motion, and responsive layouts.

3. **Awaited Settings persistence**
   - Make profile/settings actions return server-confirmed success/failure.
   - Do not display Saved before durable writes complete.

4. **Production local runtime**
   - Create a verified standalone Next build/copy/start lifecycle with rollback.
   - Replace the development runtime with a verified HP1 container deployment, private Tailscale HTTPS access, persistent storage, and Synology backups.
   - Gate/remove developer test routes.

## P2 — Complete the PED inventory/scheduler roadmap

The full contract is `openspec/changes/add-ai-ped-inventory-scheduler`. Only its section 8 Tonight MVP is complete.

### Persistence and deterministic scheduling

- Add protocol/schedule/event/allocation/transaction/review/adherence tables beyond the current inventory-only migration.
- Support independent diet and protocol date windows for 14-day, standard, and custom-duration plans.
- Preserve explicit pre-protocol/off/stopped/uncovered periods; never infer repetition or substitution.
- Add immutable future revisions, rescheduling, adherence events, and auditable inventory decrement/reconciliation.
- Extend backup/export/import coverage for every new record.

### AI-assisted drafting

- Optional label extraction/normalization with user confirmation of every required field.
- Reviewed-template matching that returns a draft only.
- Deterministic reconstruction/validation of every AI result before display.
- Provider/model/schema IDs, hashes, sources, confidence, unknowns, and transmission consent without storing credentials in the audit record.
- No one-click AI activation and no AI-created regimen/dose.

### Reports and explanation

- Planned-versus-actual PED event reporting for every program duration.
- Schedule revision, inventory transaction, adherence, review, source, and unknown-state audit trail.
- Optional read-only AI explanation bound to the immutable report snapshot.
- Tests proving AI cannot mutate schedules, inventory, calculations, or report history.

## P2 — Settings and automation completion

- Apply unit/date preferences to all inputs, charts, reports, and exports.
- Implement or honestly disable notification and privacy toggles.
- Move n8n delivery server-side with encrypted URL/credential storage, signed requests, retries, delivery history, and unique-key enforcement.
- Add actual clock-based reminders if desired; the current hook is only report-triggered.

## P2 — Data portability and security

- Verified complete export/import for profile, cycles, entries, calculations, reports/artifacts, nutrition, challenge templates/revisions, amendments, daily logs, inventory, schedules, adherence, and reviews.
- Local backup/restore UI with integrity verification and no credential leakage.
- Authentication, authorization, tenant isolation, encryption/key management, and cloud provider selection before multi-user/cloud writes.
- Development/production network binding and CORS hardening.

## P3 — Test and observability cleanup

- Reconcile older broad suites with current endpoints/ports/theme schema.
- Resolve the Vitest structured-clone harness failure.
- Install/run Firefox and WebKit E2E.
- Add a production startup canary and cold/warm route performance budget.
- Add durable report/webhook job state and correlation IDs without sensitive payload logging.

## Later product opportunities

- Wearable/smart-scale import, progress-photo comparison, additional measurements, recovery integrations, meal planning, and mobile/offline clients.
- Coach/team workflows only after privacy, authentication, audit, and ownership models exist.
- Accessibility validation against WCAG 2.2 AA across every new surface.

## Explicit non-goals unless separately approved

- Automatic PED prescribing, “best stack” ranking, substitution, invented dosing, or claims of clinical safety.
- Blockchain/NFT/crypto reward work.
- Social/community features that expose member health/protocol data before a mature consent/privacy model.
- Replacing reproducible PRIME/source calculations with opaque AI output.
