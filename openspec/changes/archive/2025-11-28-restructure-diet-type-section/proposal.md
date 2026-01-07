# OpenSpec Proposal: Restructure Diet Type Section

## Proposal Title: Restructure Diet Type Section

## Problem Statement

Currently, the nutrition profile's "Diet Type" field incorrectly includes "Intermittent Fasting." Intermittent fasting is an eating pattern, not a diet type. This miscategorization can impact the accuracy of macro calculations and weight tracking algorithms, as the Python calculation functions may not correctly interpret or utilize this distinction.

## Requirements

1.  **Separate Intermittent Fasting from Diet Types in Database Schema:** Modify the database schema to introduce a distinct field for "eating pattern" that can accommodate options like "Intermittent Fasting," while ensuring the "diet type" field is reserved for actual dietary approaches (e.g., Keto, Vegan, Mediterranean, Paleo).
2.  **Create Macro-Calculation Validation Tests:** Develop a suite of validation tests specifically for macro-calculation algorithms. These tests will ensure that after the schema changes and any necessary Python function adjustments, the algorithms continue to produce accurate results and correctly account for the new eating pattern field.
3.  **Update Nutrition Profile UI:** Modify the user interface for the nutrition profile to clearly display "diet type" and "eating pattern" as separate, distinct fields. This will improve user clarity and data integrity.
4.  **Preserve All Existing Data and History:** Ensure that the restructuring of the database schema and UI updates do not result in any loss or corruption of existing user data, historical entries, or reports.

## Constraints

*   **Use Context7 to Verify Python pandas/numpy Calculation Libraries:** Leverage Context7 to thoroughly verify the usage and behavior of Python pandas/numpy libraries within the existing calculation functions, ensuring that any modifications are compatible and do not introduce regressions.
*   **Keep Changes Surgical:** All modifications must be precise and limited strictly to the diet type and eating pattern features. Avoid making changes to other unrelated nutrition features.
*   **Maintain Backward Compatibility:** The updated system must remain backward compatible with existing calculation functions. Any changes to Python scripts should be implemented in a way that either gracefully handles the old data structure or provides a clear migration path without breaking current functionality.

## Success Criteria

*   **Diet Type Field:** The "diet type" field in the nutrition profile UI and database schema will exclusively display actual diet types (e.g., Keto, Vegan, Mediterranean, Paleo), explicitly excluding "Intermittent Fasting."
*   **Eating Pattern Field:** A new, distinct "eating pattern" field will be present in the nutrition profile UI and database schema, correctly displaying options such as "Intermittent Fasting," "Continuous," etc.
*   **Macro Calculation Accuracy:** All existing macro calculation algorithms will produce identical and accurate results when provided with the same input data, demonstrating that the separation of diet type and eating pattern has not introduced any calculation errors.
*   **No Breaking Changes:** The implementation will introduce no breaking changes to existing calculation algorithms or data structures, ensuring seamless operation and data integrity.

## Implementation Plan (High-Level)

1.  **Database Schema Update:** Add `eating_pattern` field, migrate existing `diet_type` values if necessary.
2.  **Python Backend Modifications:** Adjust `PRIME_Calculations.py` and related scripts to use the new `eating_pattern` field and ensure macro calculations remain accurate.
3.  **Frontend UI Update:** Modify `src/app/setup/custom/page.tsx` and related components to display separate fields for `diet_type` and `eating_pattern`.
4.  **Testing:** Implement new unit and integration tests for macro calculations and UI, ensuring backward compatibility and data preservation.

## Estimated Time & Resources

*   **Estimated Time:** 8-12 hours
*   **Resources:** Python backend developer, React/Next.js frontend developer, Database administrator (for schema review)

## Dependencies

*   Access to database schema definition.
*   Access to Python calculation scripts.
*   Access to frontend nutrition profile components.

## Risks

*   **Data Migration Complexity:** Potential for data loss if migration is not handled carefully.
*   **Calculation Regressions:** Risk of introducing errors in macro calculations if Python scripts are not thoroughly tested.
*   **Backward Compatibility:** Ensuring old reports/entries still function correctly.

## Reviewers

*   [Lead Backend Developer]
*   [Lead Frontend Developer]
*   [QA Engineer]

---

**Status:** Completed (Archived)
**Date:** 2025-11-16
**Archived:** 2025-11-28
**Implementation Notes:**
- Eating pattern separated from diet type via specs/nutrition-patterns spec
- Database schema includes eating_window_hours field
- Macro-calculation validation tests added (tests/unit/macro-calculations.test.ts)
- 11 test cases covering all diet types (default, keto, high_protein, balanced) and edge cases
