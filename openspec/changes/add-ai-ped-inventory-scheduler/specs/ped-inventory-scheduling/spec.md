## ADDED Requirements

### Requirement: Confirmed PED Inventory

The system SHALL store PED inventory as local-first structured records with an exact label name, confirmed canonical identity, formulation, concentration or strength, units, quantity, expiration, provenance, and confirmation state. AI-extracted values SHALL remain unconfirmed and unusable for scheduling until the member verifies every required field.

#### Scenario: AI extracts an inventory label

- **WHEN** the member submits a label image or free-text inventory description
- **THEN** the system SHALL return a structured unconfirmed draft with field-level confidence and unresolved alternatives
- **AND** it SHALL NOT make the item schedulable until the required fields are confirmed.

#### Scenario: Required inventory data is ambiguous

- **WHEN** a unit, concentration, formulation, quantity, expiration, or canonical identity is missing or ambiguous
- **THEN** the system SHALL mark the item unresolved and block it from schedule allocation.

### Requirement: Reviewed-Protocol-Constrained AI Drafting

The system SHALL allow AI to match confirmed inventory only to immutable reviewed protocol revisions. The AI SHALL NOT invent a compound, dose, route, frequency, taper, substitution, source value, or protocol rule, and SHALL NOT resolve a source range.

#### Scenario: Reviewed protocol matches confirmed inventory

- **WHEN** AI proposes a protocol match
- **THEN** the system SHALL present the reviewed source revision, coverage, unused inventory, shortages, assumptions, and known unknowns
- **AND** a deterministic service SHALL independently reconstruct and verify the match before it is shown as reviewable.

#### Scenario: No reviewed protocol matches

- **WHEN** no reviewed protocol revision can be fulfilled without an unsupported substitution, inferred dose, or missing source value
- **THEN** the system SHALL return a blocked `no_valid_schedule` result instead of generating a new regimen.

### Requirement: Duration-Independent Deterministic Scheduling

The system SHALL deterministically map a selected reviewed protocol revision onto explicit dates for 14-day, preset weekly, and custom-length cuts. The protocol start/end window SHALL be independent from the diet-plan start/end window, and uncovered days SHALL remain explicitly pre-protocol, off, stopped, or uncovered rather than receiving inferred events.

#### Scenario: Protocol is shorter than the cut

- **WHEN** an approved protocol window covers fewer days than the diet plan
- **THEN** the system SHALL schedule only the sourced protocol window and SHALL NOT repeat the final week or extend events into uncovered days.

#### Scenario: Source does not cover a requested event period

- **WHEN** a requested active protocol period contains a missing source week or day
- **THEN** the system SHALL block activation and identify the exact missing coverage.

### Requirement: Deterministic Inventory Allocation

The system SHALL use unit-normalized deterministic arithmetic to allocate confirmed inventory to sourced schedule events and SHALL expose starting quantity, required quantity, remaining quantity, shortages, and expiration conflicts without allowing AI to perform authoritative arithmetic.

#### Scenario: Inventory is insufficient

- **WHEN** confirmed unexpired inventory cannot cover every sourced event in the requested protocol window
- **THEN** the system SHALL block activation, identify the shortage by inventory item and date, and SHALL NOT shorten, reduce, substitute, or remove events automatically.

#### Scenario: Extra inventory exists

- **WHEN** confirmed inventory contains items not required by the selected reviewed protocol
- **THEN** the system SHALL leave those items unallocated and SHALL NOT add them to the schedule.

### Requirement: Fail-Closed Validation

The system SHALL classify validation findings as critical, major, or informational. Critical findings SHALL block activation and remain persistent. Missing validation data SHALL produce `not_validated` or a blocker, never a passing safety conclusion.

#### Scenario: LLM reports no interaction

- **WHEN** an AI response states or implies that a schedule has no interactions or is medically safe
- **THEN** the system SHALL disregard that claim unless a maintained deterministic validation dataset and all required patient inputs independently support the result
- **AND** the UI SHALL continue to display `not_validated` when that evidence is absent.

#### Scenario: Critical input is missing

- **WHEN** a required source, unit, exact reviewed value, inventory allocation, or review record is missing
- **THEN** the system SHALL block activation without a permissive fallback.

### Requirement: Independent Human Review

The system SHALL expose the inputs, source revisions, algorithms, validation results, AI metadata, and known unknowns needed for independent review. Member confirmation and clinical review SHALL be stored as separate facts, and an AI-assisted PED schedule SHALL remain a draft until documented review is recorded.

#### Scenario: Member confirms without review

- **WHEN** the member confirms the inventory and proposed schedule but no documented clinical review exists
- **THEN** the system SHALL preserve the draft and member confirmation but SHALL NOT mark it clinically reviewed or activate it.

#### Scenario: Reviewed draft is activated

- **WHEN** all deterministic blockers are cleared and documented review evidence is recorded
- **THEN** the system SHALL create an immutable active schedule revision with member confirmation, reviewer evidence, source hashes, and generation metadata.

### Requirement: Immutable Schedule Revisions and Amendments

The system SHALL preserve activated schedules as immutable revisions. Any change SHALL create a new future-effective revision and SHALL NOT rewrite elapsed, completed, skipped, or reported events.

#### Scenario: Future event is changed

- **WHEN** an authorized future amendment is requested
- **THEN** the system SHALL show before/after values, revalidate source and inventory coverage, record the reason and review evidence, and create a new effective revision.

#### Scenario: Elapsed event is selected

- **WHEN** the member attempts to edit an elapsed or completed event
- **THEN** the system SHALL prevent destructive editing and offer an append-only correction or note.

### Requirement: PED Event Adherence and Inventory Ledger

The system SHALL track each scheduled event as planned, completed, skipped, or rescheduled and SHALL update inventory only through auditable transactions associated with an event or explicit reconciliation.

#### Scenario: Event is completed

- **WHEN** the member marks a scheduled event completed
- **THEN** the system SHALL record the completion timestamp, effective schedule revision, allocated inventory transaction, and resulting balance.

#### Scenario: Inventory changed outside the app

- **WHEN** the member reports a physical inventory balance that differs from the ledger
- **THEN** the system SHALL create a reconciliation transaction with the prior value, new value, reason, and timestamp rather than rewriting history.

### Requirement: Revision-Bound Reporting and AI Explanation

The system SHALL generate progress and final reports from immutable schedule revisions, adherence events, inventory transactions, amendments, review state, and source provenance. Any AI explanation SHALL be read-only and SHALL NOT alter schedule, inventory, calculations, or report history.

#### Scenario: Report spans an amendment

- **WHEN** a report period includes multiple effective schedule revisions
- **THEN** the report SHALL identify the revision governing each event and distinguish planned values from recorded actuals.

#### Scenario: AI explanation is unavailable or invalid

- **WHEN** the AI provider fails or returns an invalid explanation
- **THEN** the deterministic report SHALL remain complete and available without AI content.

### Requirement: Inventory Privacy and External AI Consent

The system SHALL keep inventory and label images local by default and SHALL require explicit confirmation before transmitting label content or health context to an external AI provider. Audit records SHALL exclude provider credentials.

#### Scenario: External label extraction is requested

- **WHEN** label extraction would send an image or text to an external provider
- **THEN** the system SHALL identify the data being transmitted, request explicit confirmation, minimize the payload, and record consent without storing credentials in the audit trail.
