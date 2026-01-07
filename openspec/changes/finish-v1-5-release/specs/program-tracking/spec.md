## MODIFIED Requirements
### Requirement: Program Context
The system MUST track discrete "Programs" for a user.
#### Scenario: New Program
- **WHEN** a user starts a new program
- **THEN** a new unique `program_id` is generated
- **AND** subsequent entries are associated with this ID
- **AND** dashboard metrics calculate progress relative to this program's start

