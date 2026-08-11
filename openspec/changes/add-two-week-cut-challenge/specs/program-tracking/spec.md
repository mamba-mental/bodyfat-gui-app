## ADDED Requirements

### Requirement: Typed Program Cycle

The system SHALL persist a program mode and optional exact-day duration on each cycle while treating all existing cycles as standard programs.

#### Scenario: Existing cycle is read after migration

- **WHEN** a cycle created before the plan-mode migration is loaded
- **THEN** the system SHALL treat it as `standard` and SHALL preserve its dates, goals, entries, reports, lifecycle status, and week-based calculations

#### Scenario: Two-week challenge cycle is round-tripped

- **WHEN** a `two_week_cut` cycle is saved and loaded through the data API
- **THEN** its plan mode, exact 14-day duration, template identity/revision, immutable plan snapshot, amendment history, optional protocol identity/version/status/snapshot, and acknowledgement timestamps SHALL round-trip without loss

### Requirement: Versioned Challenge Plan History

The system SHALL retain immutable template revisions and active-plan amendment records separately from mutable cycle lifecycle state.

#### Scenario: Template revision is saved

- **WHEN** a challenge template edit is saved
- **THEN** the prior revision SHALL remain readable and the new revision SHALL retain its structured content, source provenance, validation status, author timestamp, and revision note

#### Scenario: Active plan amendment is saved

- **WHEN** a confirmed future-effective amendment is added to a cycle
- **THEN** the system SHALL retain its effective day/date, reason, before/after patch, prior and resulting revision identities, safety acknowledgement/review evidence, and creation timestamp

#### Scenario: Historical report is regenerated

- **WHEN** a report for a day governed by an earlier plan revision is regenerated
- **THEN** the system SHALL use the revision effective on that day and SHALL NOT substitute the template's latest revision
