## ADDED Requirements

### Requirement: Two-Week Cut Plan Mode

The system SHALL offer a `two_week_cut` plan mode with an exact duration of 14 calendar days, separate from standard/custom week-based programs.

#### Scenario: User previews a two-week cut

- **WHEN** a member selects the two-week cut plan mode
- **THEN** the system SHALL create a 14-day preview and SHALL NOT reinterpret it as a standard 12/15/22-week plan

#### Scenario: User switches back to a standard program

- **WHEN** a member selects a standard or custom-length program instead
- **THEN** the existing week-based calculation, lifecycle, history, and report behavior SHALL remain available and unchanged

### Requirement: PRIME-Authoritative Challenge Targets

The system SHALL derive two-week calorie, protein, progression, cardio, feasibility, and floor/ceiling values from the existing PRIME calculation engine and SHALL preserve all capped or residual-gap outcomes.

#### Scenario: Requested result exceeds feasibility

- **WHEN** the requested 14-day goal exceeds PRIME's configured diet or cardio ceilings
- **THEN** the preview, active challenge, and report SHALL show the capped projection and residual gap and SHALL NOT silently lower a floor, move the deadline, or promise the requested result

#### Scenario: Daily schedule is rendered

- **WHEN** PRIME returns the two weekly prescriptions
- **THEN** the system SHALL map them to 14 configured day types without independently recalculating metabolic targets

### Requirement: Required Source-Bound PED Schedule

The system SHALL keep the PED schedule separate from the nutrition/training template, SHALL require an explicitly selected versioned source schedule for activation and complete plan/report generation, and SHALL represent absent values as not specified.

#### Scenario: Sourced protocol is selected

- **WHEN** a member selects a protocol revision and starting source week whose next consecutive week also exists, reviews the derived 14-day schedule, and confirms that it is the schedule being tracked
- **THEN** PRIME SHALL receive the source-derived stack, the cycle SHALL retain an immutable schedule/calculation snapshot, and the UI/report SHALL display only values and instructions present in that snapshot

#### Scenario: Protocol is missing or unreviewed

- **WHEN** no complete source-backed two-week schedule has been selected and confirmed
- **THEN** the system SHALL show PED schedule required, SHALL block activation and complete report generation, and SHALL NOT infer, rank, substitute, optimize, or invent a compound or dose

#### Scenario: Generic PED flag or incomplete stack exists

- **WHEN** the profile contains `ped_use=true` but lacks a confirmed two-week schedule
- **THEN** the system SHALL treat the challenge protocol as incomplete and SHALL require source revision and starting-week selection

#### Scenario: Requested source week is absent

- **WHEN** either selected source week is absent from the sourced timeline
- **THEN** the system SHALL block activation, identify the missing source week, and SHALL NOT interpolate from adjacent phases

#### Scenario: Source protocol changes after activation

- **WHEN** a newer protocol version is added after a challenge starts
- **THEN** the active and archived challenge SHALL continue using its original protocol snapshot unless the member deliberately creates and confirms a future-effective active-plan amendment from another sourced version

### Requirement: Calculation and Report Snapshot Parity

The system SHALL generate the active plan and every challenge report from the same revisioned member, template, PED schedule, PRIME input, modifier-output, and day-schedule snapshot.

#### Scenario: Challenge is activated

- **WHEN** PRIME successfully calculates a confirmed 14-day configuration
- **THEN** the system SHALL store all calculation inputs, source identities, modifier outputs, and 14 plan days as one immutable plan revision before exposing the active command center

#### Scenario: Report is generated

- **WHEN** a progress or final report is requested
- **THEN** the report SHALL use the plan revision effective for each included day plus its recorded actuals and SHALL NOT silently recalculate against newer global data

#### Scenario: Future plan inputs are amended

- **WHEN** nutrition or PED inputs are amended for future days
- **THEN** the system SHALL re-run PRIME for the future window, create a new plan revision, and retain the original revision for earlier days and reports

### Requirement: Editable Versioned Challenge Template

The system SHALL import the supplied nutrition/training/safety source as a draft challenge template, SHALL preserve its source provenance, and SHALL store every saved edit as an immutable revision.

#### Scenario: Preliminary Markdown is imported

- **WHEN** the supplied preliminary Markdown is first added to the application
- **THEN** the system SHALL preserve the source content and hash, map every supported section to structured fields, classify the template as draft, and mark the separate PED/protocol module as not provided

#### Scenario: User edits a reusable template

- **WHEN** a member changes calories, macros, meals, training, cardio, recovery, measurements, adjustment rules, safety text, or any day-specific instruction and saves
- **THEN** the system SHALL create a new template revision, retain the prior revision, validate the complete structured template, and make the new revision available to future challenge previews

#### Scenario: User restores an earlier revision

- **WHEN** a member chooses an earlier template revision
- **THEN** the system SHALL create a new revision copied from that historical revision and SHALL NOT erase or mutate intervening revisions

#### Scenario: User edits a template after challenge activation

- **WHEN** a reusable template is edited after an active challenge was created from an earlier revision
- **THEN** the active challenge SHALL retain its activated snapshot and the edit SHALL affect future challenges only unless the member explicitly starts an active-plan amendment

### Requirement: Auditable Active-Plan Amendments

The system SHALL allow a member to amend an active two-week plan for uncompleted days through an explicit, versioned amendment flow.

#### Scenario: Future days are amended

- **WHEN** a member reviews a before/after diff, supplies a reason, chooses an effective uncompleted day, and confirms the amendment
- **THEN** the system SHALL create a new plan revision, apply it from the chosen day forward, and retain the earlier plan revision for historical and report reproduction

#### Scenario: Amendment attempts to rewrite completed days

- **WHEN** an amendment targets a completed day or would change instructions already recorded as completed
- **THEN** the system SHALL block the rewrite and SHALL offer the next uncompleted day as the earliest permitted effective day

#### Scenario: Safety-critical content changes

- **WHEN** an amendment changes a source stop condition, contraindication, reviewed protocol item, or required safety acknowledgement
- **THEN** the system SHALL present a persistent blocking review state, require a new acknowledgement or review evidence as applicable, and store that evidence in the amendment audit record

### Requirement: Challenge Lifecycle and History

The system SHALL preserve the existing one-active-cycle invariant and SHALL scope challenge entries and reports to the challenge cycle.

#### Scenario: Challenge activation replaces an active cycle

- **WHEN** a member confirms activation while another cycle is active
- **THEN** the system SHALL stop the prior cycle without deleting its entries or reports and SHALL activate the two-week challenge

#### Scenario: Challenge ends early

- **WHEN** a member stops the challenge before day 14
- **THEN** the system SHALL retain its entries, schedule snapshot, and report history and SHALL label the terminal state as stopped early rather than completed

### Requirement: Day-Scoped Challenge Check-In

The system SHALL provide a lightweight check-in for each challenge day and SHALL bind recorded actuals to the cycle, calendar day, and plan revision effective on that day.

#### Scenario: Member records daily actuals

- **WHEN** a member saves a challenge-day check-in
- **THEN** the system SHALL retain calorie and protein totals, steps, training/cardio completion, sleep, resting heart rate, and any optional blood pressure or notes without requiring granular meal, wearable, or exercise records

#### Scenario: Member reaches a checkpoint day

- **WHEN** the active day is 1, 7, or 14
- **THEN** the check-in SHALL additionally prompt for waist measurement and consistent-condition photo references while allowing an explicit skipped/not-recorded state

#### Scenario: Required actual is absent

- **WHEN** a required challenge value has not been recorded
- **THEN** the UI and report SHALL show it as not logged, SHALL NOT fabricate a value from the target, and SHALL keep the affected completion/readiness state incomplete

#### Scenario: Plan is amended after earlier check-ins

- **WHEN** a future-effective amendment is created
- **THEN** prior check-ins SHALL remain bound to their earlier effective plan revision and future check-ins SHALL use the amended revision

### Requirement: Two-Week Challenge Reports

The system SHALL generate cycle-scoped progress and terminal Living Reports for a two-week challenge.

#### Scenario: Progress report is generated

- **WHEN** a member generates a report before the challenge ends
- **THEN** the report SHALL include the current day, PRIME projection, diet schedule, adherence, actual entries, feasibility, activated template revision, amendment history, and protocol readiness or reviewed snapshot provenance

#### Scenario: Final report is generated

- **WHEN** day 14 is completed
- **THEN** the report SHALL summarize all 14 days, distinguish planned values from recorded actuals, and identify which plan revision governed each day

### Requirement: Functional Parity During UI Modernization

The modernized interface SHALL preserve access to every current application destination and critical workflow while adding the two-week challenge.

#### Scenario: Existing member uses a current workflow

- **WHEN** an existing member navigates to Dashboard, New Entry, Entries, Reports, Progress, Calculator, AI Coach, or Settings after the redesign
- **THEN** the destination and its existing actions SHALL remain available with equivalent keyboard, responsive, loading, empty, and error behavior
