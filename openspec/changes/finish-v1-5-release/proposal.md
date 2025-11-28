# Change: Finish v1.5 Release (Consolidated)

## Why
Multiple parallel workstreams have converged on the v1.5 release goals. Instead of managing 5+ separate "changes" with overlapping scopes, we are consolidating them into a single master plan to ensure a cohesive release.

This covers:
1.  **Database & Tracking**: Full program lifecycle management (resetting tracking for new programs) and schema updates.
2.  **Data Quality**: Completing the ISO 8601 date migration and standardizing display.
3.  **Stability**: Addressing React lifecycle warnings (mounted guards) and diagnosing dashboard loading regressions.
4.  **Reporting**: Finalizing PDF/Markdown export fixes (if any remain).

## What Changes

### Track 1: Backend & Data (from `weight-tracking-reset`)
-   Add `program_id` to `BodyFatEntry` and `UserData`.
-   Implement full "New Program" logic (archiving old entries, starting fresh week 1).
-   Migrate existing data to `program-1`.

### Track 2: Frontend Stability (from `task-19` & `diagnose-dashboard`)
-   Implement `useMountedRef` hook for chart components.
-   Fix "setState on unmounted component" warnings.
-   Optimize dashboard data hydration to prevent "empty widget" flashes.

### Track 3: Data Quality (from `standardize-dates` & `fix-reports`)
-   Complete the migration of all legacy `MMDDYY` dates to ISO 8601.
-   Ensure reports display "Week X" relative to the current program start.
-   Verify PDF/Markdown export fidelity one last time.

## Impact
-   **Specs**: `data-tracking`, `program-tracking`, `date-formatting`, `dashboard-runtime`.
-   **Code**: `app-context.tsx`, `server-storage.ts`, Chart widgets, Python report generator.

