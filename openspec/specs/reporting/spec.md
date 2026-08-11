# reporting Specification

## Purpose

Define explicit, cycle-scoped, reproducible reporting behavior for standard programs, Living Reports, aggregate history, and two-week challenge snapshots.

## Requirements

### Requirement: Explicit Report Generation
The system SHALL generate a report only through an explicit report action and SHALL keep entry persistence independent from report generation.

#### Scenario: Entry is saved
- **WHEN** an entry is durably persisted
- **THEN** the system SHALL update/recalculate application state without waiting for or silently generating a report

#### Scenario: Dashboard report action is selected
- **WHEN** a member requests a standard report from the dashboard
- **THEN** the system SHALL open Report Center and apply the same scope and duplicate-generation gates as a report initiated there

### Requirement: Report Scope
The system SHALL associate cycle reports with an explicit cycle and SHALL use aggregate history only when aggregate scope is selected or no active cycle exists.

#### Scenario: Active cycle exists
- **WHEN** Report Center opens with one active cycle
- **THEN** that cycle SHALL be the default current scope

#### Scenario: No active cycle exists
- **WHEN** Report Center opens without an active cycle
- **THEN** aggregate history SHALL be the default scope
- **AND** a stopped cycle SHALL NOT be silently treated as current

### Requirement: Living Report Cycle Boundaries
The system SHALL generate a Living Report from only the selected cycle's entries, cycle start date, and floor-based seven-day week boundaries.

#### Scenario: Historical cycle is selected
- **WHEN** a member generates a Living Report for a stopped or completed cycle
- **THEN** the report SHALL use that cycle's entries and dates rather than the current profile dates or all-time entries

### Requirement: Reproducible Report History
The system SHALL preserve prior report revisions and prevent equivalent source artifacts from being presented or re-ingested as duplicate reports.

#### Scenario: Equivalent standard report already exists
- **WHEN** the same cycle/source fingerprint is submitted again through Report Center
- **THEN** the duplicate-generation gate SHALL prevent an equivalent new report unless the source state has changed

#### Scenario: Generated artifact is scanned at startup
- **WHEN** an HTML artifact is already represented by a canonical report row
- **THEN** startup ingestion SHALL NOT create a second row for the same artifact

### Requirement: Two-Week Snapshot Reporting
The system SHALL render two-week progress and terminal reports from the immutable activated plan/protocol/inventory revision plus applicable daily logs and amendments.

#### Scenario: Two-week report is generated
- **WHEN** a progress, final, or stopped-early report is requested for a two-week cycle
- **THEN** it SHALL identify governing revisions and source provenance
- **AND** SHALL distinguish planned values from actual logs
- **AND** SHALL NOT substitute the latest editable template or inventory for the frozen snapshot
