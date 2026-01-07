## Context
PRIME recently added backend support for variable eating windows, but the frontend still conflates intermittent fasting with diet types and never forwards the new parameter. At the same time, long-term members restart programs without seeing dashboard totals reset, reports fail when html2canvas encounters modern CSS colors, and Markdown downloads balloon because charts are embedded as Base64. The changelog also lives in a modal despite an existing page route.

## Goals / Non-Goals
- **Goals**
  - Model eating patterns separately from diet type and ensure Python predictions receive `eating_window`.
  - Provide a reliable "New Program" reset path for dashboard metrics without deleting historical entries.
  - Make PDF/Markdown exports deterministic by using widely supported CSS colors and disk-backed images.
  - Normalize displayed dates before rendering them in dashboards or reports.
  - Route changelog access through `/changelog` for consistency and shareability.
- **Non-Goals**
  - Redesigning the entire nutrition profile experience.
  - Changing the PRIME calculation formulas beyond supplying the new window value.
  - Rewriting the report layout or data schema beyond color/image updates.
  - Implementing a versioned changelog backend.

## Decisions
1. **Eating Pattern Modeling**: Introduce an `eating_pattern` enum with a derived `eating_window_hours` map (Standard=12, 16:8=8, OMAD=1). Persist both fields so audits can report human-readable values.
2. **Reset Snapshotting**: Store a `program_reference` object (start_date, initial_weight, initial_bf) per user. The dashboard deltas compute against this object, and triggering “New Program” overwrites it with the current measurements while appending a historical entry for traceability.
3. **Report Assets**: During export, write each chart to `results/images/{report_id}-{chart_name}.png` and reference via relative Markdown paths so PDF/MD stay lightweight. CSS palettes migrate to hex/rgb tokens defined in a shared theme file.
4. **Date Formatting Utility**: Centralize parsing of legacy MMDDYY strings in `PRIME_Utils.py` (Python) and a mirrored TS helper so every caller requests formatted strings instead of formatting inline.
5. **Changelog Navigation**: Remove the dialog component from the sidebar bundle and link directly to `/changelog`, surfacing the richer page that already exists.

## Risks / Trade-offs
- **Data Migration Risk**: Introducing program snapshots without a migration could misalign historical data. Mitigation: default the new reference to account creation values until a “New Program” trigger occurs.
- **File System Writes**: Saving PNGs for each chart increases I/O. Mitigation: reuse filenames per report generation so stale assets can be cleaned, and ensure the folder is mounted in deployment environments.
- **UI Regression**: Adding new profile inputs could confuse users if defaults change. Mitigation: seed "Standard" as default and treat missing data as 12-hour window.

## Migration Plan
1. Deploy schema updates for `eating_pattern`, `program_reference`, and chart asset storage.
2. Release frontend changes with backward-compatible defaults (Standard pattern, legacy reference metrics).
3. Once verified, prompt existing users to set their eating pattern and optionally trigger a "New Program" reset.
4. Monitor report generation logs to confirm html2canvas no longer fails and Markdown sizes drop.

## Open Questions
- Should “New Program” automatically schedule reminders or analytics events?
- Do we need additional eating pattern presets (e.g., 18:6) before release, or is custom entry required?
- How long should generated PNGs remain on disk before cleanup?
