## ADDED Requirements

### Requirement: Plans Landing Decision

The application SHALL expose `/plans` as a plain-language Plans workspace that presents the current plan before asking the member to start a standard cut or a 14-day cut.

#### Scenario: Active plan exists

- **WHEN** a member opens Plans while a cycle is active
- **THEN** the workspace SHALL show the active plan name, dates or start date, status, and a direct continuation action
- **AND** it SHALL keep starting a replacement plan visually separate from continuing the current plan

#### Scenario: Member chooses a standard cut

- **WHEN** a member selects 12, 15, or 22 weeks and continues
- **THEN** the application SHALL open the existing editable copied-profile new-program flow with that duration selected
- **AND** it SHALL preserve all standard lifecycle and history behavior

#### Scenario: Member chooses a 14-day cut

- **WHEN** a member selects the 14-day option
- **THEN** the application SHALL reveal the guided 14-day setup beginning at Basics
- **AND** it SHALL NOT expose PED inventory controls before the PED Schedule step

### Requirement: Guided 14-Day Setup

The application SHALL organize 14-day plan creation into the ordered steps Basics, Diet & Training, PED Schedule, Readiness, and Review.

#### Scenario: Member moves through setup

- **WHEN** the current step's local prerequisites are complete
- **THEN** the member SHALL be able to continue to the next named step
- **AND** the interface SHALL identify the current, completed, and remaining steps without relying on color alone

#### Scenario: Member returns to an earlier step

- **WHEN** the member selects an earlier reachable step or Back
- **THEN** the interface SHALL preserve current in-session selections and SHALL invalidate any preview made stale by a changed input

#### Scenario: Member leaves before activation

- **WHEN** the member saves and leaves or reloads `/plans`
- **THEN** the application SHALL restore safe wizard navigation selections
- **AND** it SHALL reload canonical profile, template, source, inventory, and review data from their authoritative stores rather than duplicating sensitive payloads in the URL

### Requirement: Actionable Readiness

The Readiness step SHALL translate authoritative template, protocol, inventory, review, acknowledgement, and preview state into an actionable checklist.

#### Scenario: A requirement is incomplete

- **WHEN** template, source schedule, inventory coverage, range review, documented review, acknowledgement, or PRIME preview validation is incomplete
- **THEN** the interface SHALL identify the incomplete requirement in plain language
- **AND** it SHALL provide an action or destination for resolving it
- **AND** it SHALL keep final activation blocked

#### Scenario: Exact preview is ready

- **WHEN** the preview API reports that every activation requirement is ready
- **THEN** the interface SHALL mark Readiness complete and allow the member to continue to Review

### Requirement: Explicit Final Review

The Review step SHALL summarize the exact plan revision that will govern the command center and generated reports before activation.

#### Scenario: Member reviews the final plan

- **WHEN** the member reaches Review
- **THEN** the interface SHALL summarize dates, targets, template identity/revision, selected source weeks, PED/inventory coverage, review provenance, acknowledgement state, and preview readiness
- **AND** it SHALL label the final action Start 14-Day Cut

#### Scenario: Member starts the cut

- **WHEN** the member selects Start 14-Day Cut while the exact preview is ready
- **THEN** the application SHALL create and activate the challenge through the existing authoritative API
- **AND** it SHALL clear the completed local wizard draft
- **AND** it SHALL open the 14-Day Command Center

### Requirement: Semantic Theme and Accessible Interaction

The Plans workspace SHALL use shared semantic theme roles and accessible product interaction patterns across all seven palettes and light/dark modes.

#### Scenario: Palette changes

- **WHEN** the member selects another supported palette
- **THEN** the Plans topology, hierarchy, focus, selected, warning, error, success, loading, and disabled meanings SHALL remain consistent
- **AND** the workspace SHALL NOT depend on feature-specific green/brown hard-coded styling

#### Scenario: Keyboard or touch input is used

- **WHEN** the member completes either plan-creation path with keyboard or touch input
- **THEN** every action SHALL have a visible accessible name and focus state
- **AND** primary controls SHALL provide at least a 44 by 44 CSS-pixel target
