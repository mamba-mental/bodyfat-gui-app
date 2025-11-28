## ADDED Requirements
### Requirement: Eating Pattern Configuration
The system SHALL collect an "Eating Pattern" independent of "Diet Type" with presets (Standard, 16:8, OMAD) that map to explicit hour windows (12, 8, 1) and persist both the label and derived hour value with the member profile.

#### Scenario: Default pattern applied
- **WHEN** a member has not previously selected an eating pattern
- **THEN** the profile editor SHALL default to "Standard" and store a 12-hour window until the member chooses otherwise.

#### Scenario: Prediction receives window
- **WHEN** the user updates their eating pattern and requests a new PRIME projection
- **THEN** every `predict_weight_loss` API call SHALL include the corresponding `eating_window` hours so backend calculations remain accurate.
