## Context

The current two-week implementation reads literal source weeks from `docs/protocol-data/nutrition-and-ped.json`, maps injections and daily timing onto exactly 14 days, fingerprints the source, and freezes it into the challenge revision. Standard Living Reports can display cached weekly protocol data, but there is no on-hand inventory store, universal schedule lifecycle, item-level adherence ledger, or structured AI planning contract.

PED inventory and scheduling are safety-sensitive. Availability is not evidence of suitability: the system must never transform "on hand" into "recommended" without an independently reviewable, source-backed protocol and documented human review. FDA clinical decision-support guidance emphasizes independently reviewable inputs, logic, source data, validation, and patient-specific knowns/unknowns. FDA also warns that steroid/steroid-like bodybuilding products and stacked products can cause serious adverse effects.

References:

- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- https://www.fda.gov/consumers/consumer-updates/caution-bodybuilding-products-can-be-risky
- https://www.endocrine.org/clinical-practice-guidelines/testosterone-therapy

## Goals / Non-Goals

### Goals

- Convert confirmed local inventory and a reviewed protocol revision into a reproducible dated draft.
- Support 14-day, preset weekly, and custom-length plans without assuming the PED window equals the diet window.
- Provide exact inventory coverage, shortages, unknowns, expiration conflicts, and source gaps.
- Preserve every activated schedule and future amendment as an immutable revision.
- Track planned, completed, skipped, and rescheduled events and include them in reports.
- Use AI where language understanding helps while keeping all safety-critical decisions deterministic and reviewable.

### Non-Goals

- Inventing or prescribing compounds, doses, routes, frequencies, tapers, or substitutions.
- Resolving a source range to a single value.
- Inferring that an unlisted inventory item should be added to a protocol.
- Claiming interaction safety, medical suitability, or clinical approval from an LLM response.
- Automatically changing an active protocol from weight, body-fat, adherence, or AI-coach observations.
- Repeating the final sourced week to fill a longer plan unless the reviewed source explicitly defines repetition.

## Architecture

```text
Manual entry or label image
        |
        v
AI normalization draft ----> Member confirms exact label fields
        |                                  |
        +----------------------------------+
                                           v
Reviewed protocol revisions ------> Deterministic matcher and scheduler
                                           |
                                           v
                              Fail-closed validation engine
                              |       |        |        |
                           units   source   inventory  review
                              \       |        |       /
                               +------+--------+------+
                                           |
                              blocked <-----+-----> reviewable draft
                                                       |
                                             documented review gate
                                                       |
                                           immutable active revision
                                                       |
                                   adherence ledger + reports + AI explanation
```

### Responsibility boundary

| Responsibility | AI allowed | Deterministic service required |
| --- | --- | --- |
| Extract label text | Yes, as unconfirmed draft | Validate schema and retain raw/source reference |
| Canonicalize names | Yes, with confidence and alternatives | Require member confirmation |
| Rank reviewed templates by inventory coverage | Yes | Recompute coverage and reject unsupported matches |
| Create event dates from a reviewed schedule | AI may preview | Authoritative schedule must be rebuilt deterministically |
| Resolve dose range or missing value | No | Block until a reviewed exact revision exists |
| Substitute compounds or formulations | No | Block; no equivalence inference |
| Quantity and unit arithmetic | No | Decimal/unit-normalized deterministic arithmetic |
| Interaction or dose safety validation | No LLM-only decision | Maintained rule dataset plus complete inputs; otherwise "not validated" |
| Activate or amend schedule | No | Review gate, audit record, immutable revision |
| Explain schedule and report | Yes | Explanation cannot mutate source data |

## Data model

### `ped_inventory_items`

- Stable item ID and member ID
- Exact label name and confirmed canonical compound
- Category, formulation, route metadata, concentration/strength value and unit
- Container size/count or tablet/capsule count with normalized available quantity
- Lot/source reference, expiration, lifecycle status, created/updated timestamps
- Confirmation status, extraction confidence, and optional retained local label-image reference

### `ped_protocol_revisions`

- Stable protocol ID, immutable revision ID/number, title, lifecycle status
- Structured event rules plus original source reference/hash
- Duration/coverage metadata and explicit off/no-event periods
- Review status, reviewer type/evidence, reviewed timestamp, supersession link

### `ped_schedule_revisions`

- Stable schedule ID, immutable revision, plan/cycle relationship
- Effective start/end, protocol revision, source alignment, generation mode
- Inventory snapshot/allocation, validation results, member confirmation, review evidence
- AI provider/model/prompt-schema version and draft hash without credentials

### `ped_schedule_events`

- Schedule revision, day/date, timing bucket and optional exact time
- Exact source item/value/unit/route text and normalized value when unambiguous
- Inventory allocation, planned status, source pointer, validation flags

### `ped_adherence_events`

- Schedule event, completion state (`planned`, `completed`, `skipped`, `rescheduled`)
- Recorded timestamp, optional reason/note, resulting inventory transaction
- Append-only correction linkage rather than destructive overwrite

## Key decisions

### Dedicated structured planning endpoint

The general `/api/ai/chat` path produces free text and is not an activation boundary. A new backend service accepts a versioned JSON request, invokes the selected model with a strict output schema, rejects additional/unknown fields, stores the draft hash, and passes the result to deterministic reconstruction and validation. Model failure or invalid JSON returns a blocked draft, never a permissive fallback.

### Inventory never determines suitability

Inventory is a supply constraint, not a recommendation signal. The matcher may say which reviewed schedules are fully or partially coverable, but it cannot prefer a protocol because it consumes more inventory or promises more fat loss. Extra inventory remains unallocated.

### Fail closed on ambiguity

Missing units, uncertain concentration, unresolved ranges, expired status, insufficient quantity, source gaps, requested substitutions, or missing review evidence block activation. Warnings that do not affect schedule identity may be acknowledged, but critical blockers are persistent and non-dismissable.

### Independent protocol and cut windows

A diet plan may last longer than an active protocol. The schedule stores explicit pre-protocol, active, transition, off/no-event, and stopped periods. It never fills uncovered plan days with an inferred repeat.

### Versioned future amendments

Elapsed and completed events retain the revision under which they occurred. A change takes effect on a future date, creates a new schedule revision, revalidates inventory coverage, and records before/after values and review evidence. Reports join each event to its effective revision.

### Local-first privacy

Inventory and review data remain in SQLite by default. Label images remain local unless the member explicitly confirms transmission to an external AI provider. Prompts minimize personal health data and never include provider credentials. Audit records store provider/model identifiers and hashes, not secrets.

## Safety and regulatory boundary

- Member confirmation is not medical approval and is stored separately.
- An AI-assisted PED schedule cannot be activated until documented review is recorded.
- The application labels safety/interaction status `not_validated` unless a maintained clinical rules dataset and all required patient inputs are present.
- Critical validation failures block activation and require a new reviewed revision rather than a silent override.
- The UI exposes the recommendation basis, source version, required inputs, validation results, and known unknowns so a reviewer can independently assess the draft.
- Competition users may optionally enable a current prohibited-status reference, but the status is informational and versioned by source date.

## Migration plan

1. Add new tables without changing current cycle or report tables.
2. Represent each existing 14-day source snapshot as a read-only legacy schedule revision on first access.
3. Keep the current `/ped-protocols/window` flow working until the universal scheduler passes parity tests.
4. Add the inventory and planner behind a disabled feature flag.
5. Validate source fidelity, event parity, reports, rollback, and local backup/restore.
6. Enable draft creation first; keep activation disabled until the review and validator paths pass all critical tests.

## Risks / Trade-offs

- **Automation bias:** A polished AI draft may appear authoritative. Mitigation: persistent draft/review status, visible basis/unknowns, no one-click activation from AI output.
- **Label extraction error:** OCR may confuse units or concentrations. Mitigation: exact member confirmation and unit validation before inventory becomes schedulable.
- **False-negative safety checks:** An incomplete dataset could imply safety. Mitigation: `not_validated` default and no LLM-only safety claim.
- **Inventory drift:** Manual usage outside the app can make stock counts inaccurate. Mitigation: reconciliation workflow, negative-stock blocker, and manual correction audit.
- **Source coverage gaps:** Current source weeks do not cover every long plan. Mitigation: independent protocol window and explicit off/uncovered states; never extrapolate.
- **External AI privacy:** Labels or health context could leave the machine. Mitigation: local/manual entry default, data minimization, and explicit transmission confirmation.

## Open questions

- Which reviewer roles and evidence fields are acceptable for activation?
- Should label images be retained after confirmed extraction or deleted by default?
- Which inventory forms and unit conversions are supported in the first release?
- Are reminders local-only in the first release, and which timing buckets require exact times?
- Which reviewed source extends coverage beyond the current weeks 2–16?
- Should standard supplements use a separate inventory/scheduler capability rather than sharing PED review rules?
