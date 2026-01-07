# Change: Update Diet Logic, Dashboard Reset, Reports, and Changelog Access

## Why

Multiple parts of the PRIME experience are blocked by tightly-coupled assumptions from the original MVP:
- Intermittent fasting is modeled as a diet type rather than an eating window, preventing accurate predictions even though the Python engine now expects an `eating_window` input.
- Dashboard progress deltas never reset when members start a new program, so “Total Weight Loss” and “BF% Change” become meaningless after the first cycle.
- Report exports fail in modern browsers because `html2canvas` cannot parse CSS `lab()` colors, and embedding Base64 charts inflates Markdown downloads to several megabytes.
- Raw six-digit date strings (ex: `112225`) still leak into PRIME utilities and reports, confusing members.
- The changelog is shown in a cramped modal while a dedicated `/changelog` route already exists but is disconnected from navigation.

Addressing these issues together keeps PRIME’s guidance, dashboards, and reports in sync with the updated backend model and ensures the UI surfaces release notes consistently.

## What Changes

1. **Diet & Fasting Logic**
   - Promote “Eating Pattern” to its own profile input (Standard, 16:8, OMAD) mapped to hour windows.
   - Keep “Diet Type” focused on nutrition style (keto, balanced, etc.).
   - Pass the resolved `eating_window` to every `predict_weight_loss` request and persist it with the user profile.

2. **Dashboard Reset Logic**
   - Add a “New Program” trigger that snapshots the current `start_date`, `initial_weight`, and `initial_bf` as the new reference points.
   - Recompute dashboard deltas against this snapshot rather than the account creation metrics.

3. **Report Generation Fixes**
   - Replace unsupported CSS functions (lab(), lch()) in report styles with hex/rgb equivalents so html2canvas can render PDFs.
   - Persist all generated charts as PNG files under `results/images/` and reference them via relative paths in Markdown outputs instead of embedding Base64 blobs.

4. **Date Formatting**
   - Convert raw MMDDYY strings before rendering in PRIME utilities, reports, and dashboards to a friendly format such as “Nov 22, 2025,” keeping ISO storage untouched.

5. **Changelog UI**
   - Replace the sidebar dialog invocation with a standard navigation link to `/changelog`, removing the redundant modal implementation.

## Impact

- **Affected specs**: `nutrition-patterns`, `program-tracking`, `report-export`, `date-formatting`, `changelog-access`.
- **Affected code**: Profile forms, FastAPI diet calculation endpoints, dashboard accumulators, PRIME report generators, Markdown/PDF export utilities, date helpers, Next.js layout/sidebar navigation.
- **Data considerations**: Need migration to store `eating_pattern` choices and to snapshot per-program baselines without losing history. Generated charts must land in `results/images/` with predictable names so existing Markdown export references can update automatically. No backward-incompatible API changes expected once `eating_window` defaults to the legacy behavior when unspecified.
