# Implementation Plan: 001-agents-need-to

Created for feature branch: `001-agents-need-to`  
Reference Spec: [spec.md](specs/001-agents-need-to/spec.md)

## 0) Context / Goals / Non-Goals / Constraints

- Context
  - Stabilize reporting to use trusted “Prime” calculations and approved templates.
  - Restore AI Settings page (404), fix theme persistence, standardize banner rendering, persist entry history, and update changelog.
- Goals
  - Reporting uses structured Python code under new_prime_python_code and templates under templates/ with parity to trusted output.
  - AI Settings at /settings/ai loads via direct URL and navigation; configuration persists securely.
  - Theme preference persists and applies globally.
  - Banner renders at a standard, non-warping size.
  - “Last entered data” fallback for report generation is implemented and persistent.
  - All-time entry history is complete and persistent.
  - Changelog is current.
- Non-Goals
  - Introduce new design systems or broad UX overhauls beyond the banner size standardization.
  - Change authentication/authorization model.
  - Replace Python calculation methodology (we adopt it as-is).
- Constraints
  - Sensitive data (API keys) must never leak to client logs/exports.
  - Production parity: deep link to /settings/ai must work in next build + start scenarios.
  - Keep changes small and safe; ship incrementally.

## 1) Milestones

1. Fix /settings/ai 404, add regression test (deep-link and navigation).
2. Theme preference persists and applies across the app.
3. Standardize banner size and rendering behavior.
4. Implement “last entered data” fallback and persist data.
5. Persist and surface all-time entry history.
6. Reporting parity with trusted Python “Prime” code and templates.
7. Update changelog and add final e2e verifications.

## 2) Work Breakdown (small, safe changes)

### M1. Fix AI Settings page 404

- Verify the route file exists and exports a default component: [AISettingsPage()](src/app/settings/ai/page.tsx:42).
- Ensure no runtime error on first render (Next “soft 404” can occur if render throws). Add defensive guards in initial hooks to avoid TDZ/undefined access:
  - Keep loadSettings defined via useCallback before useEffect dependencies; verify ordering in [AISettingsPage()](src/app/settings/ai/page.tsx:42).
- Ensure the Settings hub links to /settings/ai using Link or router.push (audit settings hub and sidebar):
  - Replace any window.location usage with router.push across app (see Cross-Cutting Task CCT-2).
- Add a minimal not-found guard ONLY if needed (avoid swallowing route by over-eager not-found.tsx under /settings).
- Tests:
  - Dev: navigate from settings hub to /settings/ai; direct open /settings/ai; refresh on the page.
  - Prod: next build + next start; repeat above.
- Regression test to ensure no TDZ in effects (see Tests).

Output: Working /settings/ai in dev and prod.  
Files touched (expected):
- May adjust navigation files and tests; AI page remains in [page.tsx](src/app/settings/ai/page.tsx:1).

### M2. Theme preference persistence

- Decide persistence mechanism:
  - Minimum viable: cookie-based or localStorage with SSR-aware default.
  - Preferred: persist on server (user profile or settings endpoint) when auth exists; otherwise cookie-based fallback.
- Implement:
  - Read preference at layout root; apply to HTML class early to avoid FOUC.
  - Provide explicit toggler in the UI (if missing) and ensure it updates persistence atomically.
- Tests:
  - Toggle theme, reload page; theme remains.
  - System theme scenario: verify correct fallback if “system” chosen.

Output: Persistent theme selection across sessions.  
Files touched (expected):
- Root layout or theme provider initialization.

### M3. Standard banner size (no warping/stretching)

- Define the standard: e.g., aspect ratio 4:1 (clarify exact dimensions in PR).
- Implement responsive container class using CSS utilities and object-cover (no distortion).
- If using next/image, provide fixed aspect ratio via wrapper and sizes.
- Add documentation for acceptable banner uploads (crop/letterbox policy).
- Tests:
  - Very wide/tall images render within the frame without stretching.

Output: Consistent banner rendering.  
Files touched (expected):
- Banner component/section styles; shared CSS utilities.

### M4. “Last entered data” fallback for report generation

- Define the canonical input model and required fields for successful generation (record in code and PR description).
- Implement fallback logic:
  - On “Generate Report”, if new inputs absent, load last persisted dataset (server-side store preferred; fallback: encrypted cookie).
  - Indicate in UI that last data are being used.
- Persist “last entered data” atomically post-successful submission.
- Tests:
  - With no new input, generation uses last dataset and completes.
  - With partial new inputs, clarify rules (block or merge as agreed).

Output: Reliable fallback generation path.  
Files touched (expected):
- Report generation handler/service; UI trigger location(s).

### M5. Persistent “previous all-time entry history”

- Design a simple schema: entries include timestamp, input snapshot (or reference), report meta (id, version), and result location(s).
- Persistence target:
  - Preferred: server storage (file/DB) within application volume or external storage.
  - Provide export for user-owned data portability (CSV/JSON).
- Add a History view with pagination/virtualization.
- Tests:
  - Entries survive restart/deploy; listing is performant (define the page-size).
  - Export endpoint returns valid sanitized data.

Output: Durable, queryable history.  
Files touched (expected):
- API endpoints for create/list/export history; client view components.

### M6. Reporting uses structured Python “Prime” code + templates

- Use trusted structured code from: new_prime_python_code.
- Use templates from: [report-template-new-091625.html](templates/report-template-new-091625.html:1).
- Integrate via Python runner (local module or service) to produce deterministic outputs that visually match the trusted PDF reference.
- Validation:
  - Golden sample tests comparing generated HTML/PDF to baseline (acceptance threshold documented).
- Templates and formatting:
  - Ensure Comprehensive Reference Guide section is stable (known fix already applied at [report-template-new-091625.html](templates/report-template-new-091625.html:563)).

Output: Reports match trusted format and calculations.  
Files touched (expected):
- Integration layer that calls Python code; template rendering/adapters.

### M7. Update CHANGELOG

- Add entries for each milestone change, with dates and versions.
- Ensure links to key files/specs for traceability:
  - [spec.md](specs/001-agents-need-to/spec.md), [implement.md](implement.md)
- Keep concise and user-facing.

Output: Updated [CHANGELOG.md](CHANGELOG.md)

## 3) Cross-Cutting Tasks

- CCT-1: Security and privacy
  - No API keys in client logs, exports, or browser storage. AI keys live only server-side.
- CCT-2: Replace window.location redirects with router.push across app
  - Audit app directory and replace or guard usages.
  - Update references noted in reminders (e.g., [page.tsx](src/app/test-fixes/page.tsx:1), [page.tsx](src/app/ai/insights/page.tsx:1), [page.tsx](src/app/settings/page.tsx:1))
- CCT-3: Accessibility baseline (WCAG AA)
  - Keyboard navigation, contrast, focus states for new/changed UI.
- CCT-4: Structured logging
  - Clear, non-sensitive logs for report generation and settings persistence.

## 4) Testing Plan

- Unit tests
  - AI settings service cache behavior: [AISettingsService](src/lib/ai-settings-service.ts:1)
  - Theme persistence toggles and application.
  - Report input validation and fallback selection logic.
- Integration tests
  - /settings/ai navigation and deep-link (dev and prod builds).
  - History persist-list-export flow.
  - Report generation pipeline with last-data fallback.
- E2E tests (critical paths)
  - Navigate to Settings → AI Settings and back.
  - Generate report with no new input; verify success and “used last data” notice.
  - History displays recent entries; export returns valid file.
  - Banner renders without distortion across viewports.
- Regression test (TDZ)
  - Assert loadSettings (and required hooks) are defined before useEffect dependency usage in [AISettingsPage()](src/app/settings/ai/page.tsx:42).

## 5) Acceptance Criteria (per Spec)

- /settings/ai works via navigation and direct URL in dev and prod.
- Theme persists across reloads and sessions; applies globally.
- Banner conforms to standard size with no stretching/warping.
- “Last entered data” fallback works deterministically and is transparent to the user.
- All-time entry history persists across restarts and is queryable with sensible performance.
- Reports match trusted visuals and calculations using Python “Prime” code and approved templates.
- CHANGELOG updated with a clear, dated entry.

## 6) Risks and Mitigations

- Risk: Visual parity subjectivity.  
  - Mitigation: Golden sample(s) and documented tolerance for layout diff.
- Risk: Sensitive data leakage.  
  - Mitigation: Server-only storage, sanitize exports/logs, review network calls.
- Risk: Performance degradation with large history.  
  - Mitigation: Pagination/virtualization; define and test target sizes.

## 7) Rollback Plan

- Each milestone is small and can be reverted independently.
- Keep feature flags or guarded rollouts for theme persistence and history pages if needed.
- Retain prior templates and generation path while new path stabilizes; switch via config.

## 8) Implementation Order (recommended)

1) M1 /settings/ai fix → 2) M2 Theme → 3) M3 Banner → 4) M4 Last-data fallback → 5) M5 History → 6) M6 Reporting integration → 7) M7 Changelog.

## 9) Artifacts to Produce

- Code changes per milestone.
- Tests (unit/integration/e2e) added to tests/.
- Documentation notes appended to README/CHANGELOG where relevant.
- Before/after screenshots for banner and AI Settings (optional).