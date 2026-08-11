## ADDED Requirements

### Requirement: Member-Controlled Nutrition Actuals
The system SHALL allow a member to record dated calorie and macro actuals manually or import them from a CSV containing at least Date and Calories columns.

#### Scenario: Manual daily total
- **WHEN** the member enters a valid date and calories with optional macro values
- **THEN** the record SHALL be persisted and included in the daily aggregate.

#### Scenario: CSV import
- **WHEN** the member uploads a CSV with supported date, calorie, meal, and macro headers
- **THEN** the system SHALL validate and import usable rows, reject ambiguous files, and update rather than duplicate identical imported rows.

### Requirement: PRIME Nutrition Variance
The system SHALL aggregate nutrition rows by calendar date and display actual calories/protein beside the active PRIME targets where those targets exist.

#### Scenario: Daily actual exists
- **WHEN** one or more nutrition rows exist for a date
- **THEN** the nutrition workspace SHALL display the summed calories/macros, target variance, source row count, and the dashboard SHALL display today's actuals.
