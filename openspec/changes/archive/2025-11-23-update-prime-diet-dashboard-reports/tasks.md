## 1. Diet & Fasting Logic
- [x] 1.1 Add `eating_pattern` and derived `eating_window_hours` fields to the user profile model, API schema, and persistence layer.
- [x] 1.2 Update profile UI to separate Diet Type vs Eating Pattern selectors with default mapping (Standard=12h, 16:8=8h, OMAD=1h).
- [x] 1.3 Ensure every `predict_weight_loss` invocation includes the resolved `eating_window` parameter, falling back to 12h for legacy data.
- [x] 1.4 Extend automated tests (Python + Next.js) to cover the new field and API contract.

## 2. Dashboard Reset Logic
- [x] 2.1 Create a `program_reference` snapshot (start_date, initial_weight, initial_bf) stored with each user.
- [x] 2.2 Implement a "New Program" action that overwrites the snapshot with the current measurements and persists a history entry.
- [x] 2.3 Recompute dashboard delta widgets against the snapshot and add tests covering the reset workflow.

## 3. Report Generation Fixes
- [x] 3.1 Replace unsupported CSS color functions in report stylesheets with shared hex/rgb tokens and verify html2canvas renders.
- [x] 3.2 Save generated charts as PNG files under `results/images/` and use relative links in Markdown exports instead of Base64 strings.
- [x] 3.3 Update report unit tests / integration tests to assert file creation and Markdown references.

## 4. Date Formatting
- [x] 4.1 Introduce centralized utilities (Python + TS) that parse legacy MMDDYY strings into ISO dates and display-friendly labels.
- [x] 4.2 Apply the helper across dashboard widgets, PRIME utilities, and report generators; add regression tests for representative dates.

## 5. Changelog UI
- [x] 5.1 Replace the sidebar dialog trigger with a navigation link to `/changelog` and remove the unused modal component.
- [x] 5.2 Smoke test the existing `/changelog` page for desktop and mobile to ensure parity with the former modal experience.

## 6. Validation
- [x] 6.1 Run automated test suites (frontend + backend) and update documentation where new inputs or directories are introduced.
- [x] 6.2 Execute `openspec validate update-prime-diet-dashboard-reports --strict` before requesting review.
