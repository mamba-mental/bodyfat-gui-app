# program-tracking Specification

## Purpose
Define the program reference snapshot system that enables users to reset dashboard progress deltas when starting new training blocks. This specification ensures "New Program" actions capture baseline measurements (start_date, initial_weight, initial_bf) without losing historical data, and provides sensible defaults for legacy users.
## Requirements
### Requirement: Program Reference Snapshot
The system SHALL maintain a `program_reference` snapshot containing `start_date`, `initial_weight`, and `initial_bf` that dashboard deltas use as their baseline and SHALL expose a "New Program" action that refreshes this snapshot with the member's current measurements without deleting historical data.

#### Scenario: Resetting progress
- **WHEN** a member starts a new training block and triggers "New Program"
- **THEN** the application SHALL overwrite the `program_reference` with current values and display 0.0 deltas until new measurements accumulate.

#### Scenario: Legacy members
- **WHEN** an existing member visits the dashboard before activating a new program
- **THEN** the snapshot SHALL default to the last known account creation metrics so that progress is still computed, and the UI SHALL prompt them to reset when appropriate.

### Requirement: Editable Profile Inheritance
The system SHALL begin a new standard program from an editable copy of the current member profile and SHALL NOT delete the profile, entries, reports, or historical cycles as part of that action.

#### Scenario: Existing member starts a standard program
- **WHEN** an existing member selects a standard program duration
- **THEN** the setup form SHALL be pre-populated with the current profile and goals
- **AND** the member SHALL be able to change those values before saving the new program

#### Scenario: New program is saved
- **WHEN** the edited profile review is successfully saved
- **THEN** the system SHALL create a new active standard cycle and program identity
- **AND** it SHALL save the new `program_reference` baseline
- **AND** it SHALL stop the previously active cycle without deleting its data
- **AND** subsequent entries and reports SHALL be associated with the new cycle/program

### Requirement: One Current Cycle
The system SHALL enforce no more than one active cycle per user while retaining stopped, completed, and archived cycles as selectable history.

#### Scenario: Another cycle becomes active
- **WHEN** a standard or two-week cycle is activated while another cycle is active
- **THEN** the previous cycle SHALL leave the active state
- **AND** its entries, reports, dates, snapshots, and lifecycle history SHALL remain readable

#### Scenario: No cycle is active
- **WHEN** no active cycle exists
- **THEN** current-cycle UI SHALL show no active plan or an explicit aggregate history state
- **AND** SHALL NOT silently treat the newest stopped cycle as current

