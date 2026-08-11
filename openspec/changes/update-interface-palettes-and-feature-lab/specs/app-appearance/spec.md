## ADDED Requirements

### Requirement: Selectable Application Palettes
The system SHALL provide exactly seven named visual palettes and SHALL apply the selected palette independently from the Light, Dark, or System brightness preference.

#### Scenario: Select and persist a palette
- **WHEN** the member selects a palette in Settings
- **THEN** the application SHALL preview it immediately, persist it locally and through the theme preference API, and restore it after reload.

#### Scenario: Legacy preference has no palette
- **WHEN** an existing preference record contains theme and font but no palette
- **THEN** the application SHALL use Voltage without discarding the existing brightness or font preference.

### Requirement: Semantic and Accessible Color Application
The system SHALL express application backgrounds, text, controls, states, charts, and navigation through semantic palette variables and SHALL retain non-color indicators for interactive/status states.

#### Scenario: Brightness changes
- **WHEN** a member changes between Light, Dark, and System
- **THEN** the selected visual identity SHALL remain active and foreground/control contrast SHALL remain legible.

### Requirement: Profile Banner Retention
The persistent application shell SHALL render the member's uploaded profile banner as a compact strip without removing the image when the dashboard or palette changes.

#### Scenario: Member has a banner
- **WHEN** a profile contains `profile_banner`
- **THEN** the shell SHALL render the uploaded image with identity details and SHALL not replace it with a decorative palette background.
