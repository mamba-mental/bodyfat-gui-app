# Change: Add AI-assisted PED inventory and protocol scheduling

## Why

The 14-day challenge can preserve two source protocol weeks, but the application has no on-hand PED inventory model, no duration-independent protocol scheduler, and no safe way for AI to help match inventory to reviewed schedules. The existing general chat route cannot provide the structured provenance, fail-closed validation, review gates, or immutable revisions required for a medication-like workflow.

## What Changes

- Add a local-first PED inventory with confirmed compound, formulation, concentration/strength, units, quantity, expiration, provenance, and lifecycle status.
- Add AI-assisted label normalization and reviewed-protocol matching using schema-constrained drafts; AI output remains untrusted until member confirmation and deterministic validation.
- Add a duration-independent deterministic scheduler for 14-day, standard, and custom-length cuts, with the protocol window independent from the diet-plan window.
- Block invented compounds, doses, substitutions, range resolution, implicit repetition, expired/uncertain inventory, insufficient source coverage, and schedules that cannot be fulfilled from confirmed inventory.
- Require documented review before an AI-assisted PED draft can become active, while recording member confirmation separately from clinical review.
- Add immutable schedule revisions, future-effective amendments, planned-versus-completed adherence events, inventory allocation, and report provenance.
- Keep AI limited to extraction, matching, comparison, and explanation; deterministic code remains authoritative for scheduling, arithmetic, validation, activation, and reporting.
- Add a Settings Feature Lab card while this capability remains behind its approval and implementation gate.

## Impact

- Affected specs: `ped-inventory-scheduling` (new), `cut-challenges` (integration after the existing two-week change is archived)
- Affected frontend: Settings Feature Lab, new inventory workspace, Plan Studio, challenge Command Center, standard program views, Reports
- Affected backend: SQLite schema, FastAPI inventory/protocol/schedule endpoints, challenge protocol adapter, report generator
- Affected AI: dedicated structured planning route and prompt contract; the general AI chat route is not used to activate schedules
- Data migration: existing 14-day protocol snapshots remain valid and can be represented as immutable legacy schedule revisions without rewriting historical reports
