# Feature Specification: Stabilize Reporting, AI Settings, Theme, Banner, and Data Persistence

**Feature Branch**: `001-agents-need-to`  
**Created**: 2025-09-22  
**Status**: Draft  
**Input**: User description: "Agents need to be deployed to fix the following:
1. Reporting:
- All of the calculations and reporting need to use the maticulasioully structured python code in he path "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\new_prime_python_code" , and should look like the reports that have been generated at the path "Z:\2024.0917 - Bf-estimator-v2\122924_bf-estimator-terminal\results\Master_Journey_Prime_Prime_20250916_164621.pdf" which I just generated today using the terminal standalone version.  Updated templates are at the path "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\templates"

2. AI Settings Page is 404 Error

3. Changelog is not up to date

4. New Report Generation should use the last entered data if no new data is given

5. Theme Preference not working

6. There needs to be a standard size for the banner so there is no warping or stretching

7. Previous all time entry history is missing.  this needs to be not only fixed, but persistent."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing (mandatory)

### Primary User Story
As a user, I want to generate health and body composition reports that consistently match the trusted “Prime” report format, adjust my AI-related preferences from an accessible AI Settings page, see my preferred theme across sessions, view a correctly sized banner without distortion, reuse my last entered data for quick report generation, and review my complete entry history at any time.

### Acceptance Scenarios
1. Given the user navigates to Settings, When they select AI Settings, Then the AI Settings screen loads successfully without a 404 and displays provider configuration tabs. (Entry point: [page.tsx](src/app/settings/ai/page.tsx:1))
2. Given the user triggers report generation, When no new inputs are provided, Then the system uses the last valid saved inputs and produces a report matching the approved visual template and calculations.
3. Given the user selects a theme (light/dark/system), When they refresh or return later, Then the theme preference is preserved and applied globally.
4. Given an uploaded or configured banner image, When viewing any page that renders the banner, Then the banner displays at a standard size with no warping/stretching.
5. Given the user has submitted multiple entries over time, When they open the history view, Then all prior entries are listed and remain available across sessions.
6. Given recent changes have shipped, When stakeholders open the changelog, Then they see a current, chronologically accurate summary of changes. (Reference doc: [CHANGELOG.md](CHANGELOG.md))

### Edge Cases
- Report generation with partially missing last-entered data → Define which fields are mandatory and fallback rules. [NEEDS CLARIFICATION: list of required fields and acceptable defaults]
- No network or AI provider keys unavailable → System must gracefully degrade and still show Settings and non-AI features; report generation should not crash. [NEEDS CLARIFICATION: offline behavior expectations]
- Extremely wide or tall banner images → System must crop or letterbox consistently per the standard. [NEEDS CLARIFICATION: exact banner dimensions and cropping behavior]
- Very large entry history → UI/UX must remain responsive with pagination or virtualization. [NEEDS CLARIFICATION: performance target and max records per page]
- Report visual parity → Define measurable criteria to judge “looks like the trusted report.” [NEEDS CLARIFICATION: acceptance baseline and sample(s) to compare]
- Theme preference on first visit and across devices → Specify default and cross-device expectations. [NEEDS CLARIFICATION: is sync required across devices?]

## Requirements (mandatory)

### Functional Requirements
- FR-001: System MUST provide a working AI Settings page accessible from the app’s settings hub and via direct URL “/settings/ai” without 404.
- FR-002: AI Settings page MUST allow enabling/disabling supported AI providers, entering credentials, and selecting models for app areas (readable labels, statuses).
- FR-003: System MUST generate reports whose calculations and outputs match the established “Prime” methodology and approved visual templates.
- FR-004: Reports MUST visually conform to the approved templates in [report-template-new-091625.html](templates/report-template-new-091625.html).
- FR-005: When the user initiates report generation without new inputs, the System MUST use the last entered valid data as the source of truth and clearly indicate that behavior to the user.
- FR-006: System MUST persist “last entered data” so it is available after refresh and future sessions. [NEEDS CLARIFICATION: retention duration and storage policy]
- FR-007: System MUST persist “previous all-time entry history” with the ability to view, sort, and filter.
- FR-008: Entry history MUST remain intact across deployments/updates and be protected against data loss. [NEEDS CLARIFICATION: backup/restore and retention policies]
- FR-009: System MUST provide a standard banner size that prevents warping/stretching and ensures consistent rendering across pages/devices. [NEEDS CLARIFICATION: exact pixel dimensions and aspect ratio]
- FR-010: System MUST offer clear guidance or automatic handling (crop/fit/letterbox) when banner images don’t match the standard. [NEEDS CLARIFICATION: chosen handling policy]
- FR-011: Theme preference (e.g., light/dark/system) MUST be selectable and persist across sessions.
- FR-012: Theme preference MUST apply globally and immediately reflect after change without requiring a full app reload.
- FR-013: The Changelog MUST be updated to reflect recent and upcoming releases with date, version, and concise notes. (See [CHANGELOG.md](CHANGELOG.md))
- FR-014: System MUST provide clear user feedback for success/failure on saving AI settings and testing connections.
- FR-015: System MUST handle missing/invalid AI credentials gracefully with non-blocking errors and guidance.
- FR-016: System MUST avoid exposing sensitive information (e.g., API keys) in the UI, network logs, or exports.
- FR-017: Report generation MUST fail safely with helpful messaging when mandatory inputs are missing. [NEEDS CLARIFICATION: list mandatory fields]
- FR-018: Entry history MUST support export for user-owned data portability. [NEEDS CLARIFICATION: export format(s)]
- FR-019: System MUST define and document performance targets for report generation and history listing. [NEEDS CLARIFICATION: target times, dataset sizes]
- FR-020: System MUST be accessible (WCAG AA baseline): keyboard navigation, color contrast, focus states.

*Ambiguities to confirm:*
- FR-021: Reports MUST use the existing trusted calculation methodology vs. implementing a new engine. [NEEDS CLARIFICATION: confirm authoritative calculation source and certification process]
- FR-022: Visual parity MUST be validated against an approved reference sample(s). [NEEDS CLARIFICATION: provide canonical sample(s) and review sign-off process]

### Key Entities (include if feature involves data)
- User Preference: theme selection, UI options; persisted; applied at startup.
- AI Provider Configuration: provider enablement, credentials, selected model; sensitive fields handled securely.
- Report Template: approved layout artifacts; versioned to track changes; referenced by report generation.
- Report Input Dataset: the structured inputs needed to generate a report; tracks “last entered data” state.
- Entry History Record: timestamp, inputs, output metadata (e.g., report id, version), actions (view/export).

---

## Review & Acceptance Checklist
GATE: Automated checks run during main() execution

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
Updated by main() during processing

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---

## Notes and Open Questions
- What exact dimensions/aspect ratio should the standard banner enforce (e.g., 1200x300 at 4:1)? [NEEDS CLARIFICATION]
- Which fields constitute “last entered data,” and how are conflicts resolved if some fields were edited post-report? [NEEDS CLARIFICATION]
- How long must entry history be retained, and what compliance/privacy constraints apply? [NEEDS CLARIFICATION]
- What is the formal acceptance baseline for “looks like the trusted report” (visual diff tolerance, typography, colors)? [NEEDS CLARIFICATION]
- Should theme preferences sync across devices/accounts, and if so, by what identifier? [NEEDS CLARIFICATION]
- What is the policy for handling absent/invalid AI credentials while still enabling other app features? [NEEDS CLARIFICATION]