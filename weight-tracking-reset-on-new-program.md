# OpenSpec Proposal: weight-tracking-reset-on-new-program

> **Superseded proposal.** The accepted baseline now lives in [`openspec/specs/program-tracking/spec.md`](openspec/specs/program-tracking/spec.md), and the August 11 implementation creates/preserves a first-class cycle plus editable profile baseline. See [`CURRENT_STATUS.md`](CURRENT_STATUS.md).

## Problem
The current weight tracking and dashboard metrics exhibit inconsistent behavior when a user starts a new program:
- The weight displayed on the dashboard does not update to reflect the starting weight of the new program.
- Dashboard widgets (e.g., weight loss/gain, body fat metrics) pull from an unknown data source, leading to a lack of program-specific context.
- Progress metrics such as `weight_loss_current_week` and `fat_loss_current_week` do not reset to zero upon starting a new program, continuing to accumulate from the previous program's data.
- This is inconsistent with `body_fat%` and calorie calculations, which *do* correctly update for the new program.

## Requirements

1.  **Program Reference System:** Implement a `program_id` reference system across relevant data tables to clearly distinguish between different program cycles.
2.  **Widget Data Filtering:** Update all widget data queries to filter results based on the `current_program_id` and the `current_week` within that program.
3.  **Metric Reset on New Program:** Upon the creation of a new program, the following metrics must be reset to `0`:
    - `weight_loss_current_week`
    - `fat_loss_current_week`
    - Any other progress metrics that track accumulation (e.g., total weight loss, total fat loss for the program).
4.  **Historical Data Preservation:** All historical data entries must be preserved. No existing data should be deleted.
5.  **Database Indicator:** Add a `program_start_date` indicator to the database schema for tracking the start of each program cycle.

## Constraints

-   Do not delete any existing database entries.
-   Use the `Ref-Tools` to check database query optimization for the new filtering logic.
-   Ensure week calculations (e.g., `current_week`) align correctly with the `program_start_date`.

## Success Criteria

-   The dashboard weight display accurately matches the latest weight entry recorded for the currently active program.
-   All progress metrics (e.g., weight loss, fat loss) reset to `0` when a new program is created.
-   Historical data from previous programs remains intact and accessible.
-   Widget calculations accurately reflect data only for the current program's active week.
