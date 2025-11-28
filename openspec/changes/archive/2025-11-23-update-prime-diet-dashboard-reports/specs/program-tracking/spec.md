## ADDED Requirements
### Requirement: Program Reference Snapshot
The system SHALL maintain a `program_reference` snapshot containing `start_date`, `initial_weight`, and `initial_bf` that dashboard deltas use as their baseline and SHALL expose a "New Program" action that refreshes this snapshot with the member's current measurements without deleting historical data.

#### Scenario: Resetting progress
- **WHEN** a member starts a new training block and triggers "New Program"
- **THEN** the application SHALL overwrite the `program_reference` with current values and display 0.0 deltas until new measurements accumulate.

#### Scenario: Legacy members
- **WHEN** an existing member visits the dashboard before activating a new program
- **THEN** the snapshot SHALL default to the last known account creation metrics so that progress is still computed, and the UI SHALL prompt them to reset when appropriate.
