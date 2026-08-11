## ADDED Requirements

### Requirement: Accurate Feature Availability
The Settings Feature Lab SHALL identify already implemented progress-photo and AI Insight capabilities as available and SHALL provide direct navigation to them.

#### Scenario: Open implemented feature
- **WHEN** the member chooses an available photo or AI capability
- **THEN** the application SHALL navigate to the working feature rather than present a roadmap-only card.

### Requirement: Cloud Sync Readiness Boundary
The system SHALL keep cloud writes disabled until a managed database and authentication provider are configured and a migration is validated, and SHALL expose readiness booleans without exposing configuration values.

#### Scenario: No providers configured
- **WHEN** cloud readiness is requested with no managed database or authentication configuration
- **THEN** the application SHALL report provider setup required, SQLite authoritative, and cloud writes disabled.

#### Scenario: Configuration status is displayed
- **WHEN** Settings loads the Feature Lab
- **THEN** it SHALL display database, authentication, and cloud-write readiness states without returning hosts, credentials, tokens, or connection strings.
