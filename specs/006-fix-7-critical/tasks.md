# Tasks: Critical Issues Resolution

**Feature**: 006-fix-7-critical
**Branch**: `006-fix-7-critical`
**Status**: Generated from Phase 1 design artifacts
**Estimated Tasks**: 20
**Test Strategy**: Test-First Development (Red-Green-Refactor)

---

## Phase 1: Setup & Contract Tests (TDD Red Phase)

### T001: Project Environment Setup [P]
**Priority**: Critical
**Agent**: `general-purpose`
**Status**: pending
**Dependencies**: None

**Description**: Initialize test environment and verify all dependencies installed

**Actions**:
- Verify Next.js 14 App Router configured
- Verify Python 3.12 + FastAPI microservice accessible at port 5000
- Verify SQLite database exists at data/bodyfat.db with 12 entries
- Verify PRIME modules present in new_prime_python_code/
- Verify test frameworks installed (Vitest, Playwright, pytest)

**Acceptance Criteria**:
- `npm run dev` starts Next.js server without errors
- Python API responds at http://localhost:5000/health
- SQLite query returns 12 entries: `sqlite3 data/bodyfat.db "SELECT COUNT(*) FROM entries;"`
- PRIME_Report_Generator_v3_Fast.py exists and imports successfully
- Test commands run: `npm test`, `npx playwright test`, `pytest`

---

### T002: Contract Test - Report Generation API [P]
**Priority**: Critical
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T001

**Description**: Create failing contract tests for report generation endpoints per `contracts/report-generation.yaml`

**Actions**:
- Create `tests/contracts/report-generation.contract.test.ts`
- Test POST /api/reports/generate endpoint schema
- Test GET /api/reports/{reportId} endpoint schema
- Validate ReportRequest schema (userId, entryIds, templateVersion, outputFormat)
- Validate ReportResponse schema (reportId, status, calculationEngine, numericalAccuracy < 0.0001)
- Assert Constitution Article I: calculationEngine === "PRIME_Report_Generator_v3_Fast"
- Assert Constitution Article V: numericalAccuracy < 0.0001

**Test Must FAIL Initially** (Red Phase):
- Run: `npm test -- tests/contracts/report-generation.contract.test.ts`
- Expected: Tests fail because API implementation doesn't exist yet or doesn't match contract

**Acceptance Criteria**:
- Contract test file created with schema validations
- Tests fail with clear error messages indicating missing/incorrect implementation
- All required fields validated per OpenAPI spec
- Constitutional requirements asserted in tests

---

### T003: Contract Test - Entry Management API [P]
**Priority**: Critical
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T001

**Description**: Create failing contract tests for entry management endpoints per `contracts/entry-management.yaml`

**Actions**:
- Create `tests/contracts/entry-management.contract.test.ts`
- Test GET /api/entries endpoint schema (pagination, sorting)
- Test GET /api/entries/latest endpoint schema
- Test GET /api/entries/{entryId} endpoint schema
- Test PUT /api/entries/{entryId} endpoint schema
- Validate Entry schema (12 required fields including gender enum, activityLevel enum)
- Validate EntryListResponse schema (entries array, total, hasMore)
- Assert Constitution Article II: Historical entries preserved (total >= 12)

**Test Must FAIL Initially** (Red Phase):
- Run: `npm test -- tests/contracts/entry-management.contract.test.ts`
- Expected: Tests fail because endpoints don't return correct schema or data

**Acceptance Criteria**:
- Contract test file created with schema validations
- Tests fail indicating schema mismatches or missing data
- Pagination and sorting parameters validated
- Constitutional Article II compliance checked

---

### T004: Contract Test - AI Settings API [P]
**Priority**: High
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T001

**Description**: Create failing contract tests for AI settings endpoints per `contracts/ai-settings.yaml`

**Actions**:
- Create `tests/contracts/ai-settings.contract.test.ts`
- Test GET /api/settings/ai endpoint schema
- Test PUT /api/settings/ai endpoint schema
- Validate AISettings schema (aiProvider enum, modelAssignment object, encryptedApiKey writeOnly)
- Validate AISettingsUpdate schema
- Assert apiKey field is writeOnly (never returned in GET responses)
- Test 404 response when settings don't exist

**Test Must FAIL Initially** (Red Phase):
- Run: `npm test -- tests/contracts/ai-settings.contract.test.ts`
- Expected: Tests fail because /settings/ai route may not exist or schema incorrect

**Acceptance Criteria**:
- Contract test file created with schema validations
- Tests fail indicating route issues or schema mismatches
- API key security (writeOnly) validated
- Provider enum values validated

---

### T005: Contract Test - Theme Persistence API [P]
**Priority**: High
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T001

**Description**: Create failing contract tests for theme preference endpoints per `contracts/theme-persistence.yaml`

**Actions**:
- Create `tests/contracts/theme-persistence.contract.test.ts`
- Test GET /api/theme endpoint schema
- Test PUT /api/theme endpoint schema
- Validate ThemePreference schema (theme enum ['light', 'dark', 'system'], persistenceMethod enum)
- Validate ThemeUpdate schema
- Test SSR cookie setting in response headers
- Assert Constitution Article III: Hybrid persistence (localStorage + database + cookie)

**Test Must FAIL Initially** (Red Phase):
- Run: `npm test -- tests/contracts/theme-persistence.contract.test.ts`
- Expected: Tests fail because hybrid persistence may not be fully implemented

**Acceptance Criteria**:
- Contract test file created with schema validations
- Tests fail indicating persistence strategy incomplete
- Cookie headers validated
- Theme enum values validated

---

## Phase 2: Integration Tests for Unfixed Issues (TDD Red Phase Continued)

### T006: Integration Test - PRIME Report Numerical Verification
**Priority**: Critical
**Agent**: `test-automator` + `python-pro`
**Status**: pending
**Dependencies**: T002

**Description**: Create integration test comparing PRIME report calculations to terminal reference (FR-003)

**Actions**:
- Create `tests/integration/prime-report-verification.test.ts`
- Load terminal reference PDF data: `Master_Journey_Prime_Prime_20250916_164621.pdf`
- Extract numerical values from reference (body fat %, lean mass, RMR, etc.)
- Generate test report using same input data
- Compare all numerical fields with 0.0001 tolerance
- Parse generated PDF to extract calculated values
- Assert Constitution Article V: Match terminal reference numerically

**Test Must FAIL Initially** (Red Phase):
- Run: `npm test -- tests/integration/prime-report-verification.test.ts`
- Expected: Test fails if calculations deviate > 0.0001 or report generation errors

**Acceptance Criteria**:
- Integration test created with numerical comparison logic
- Reference PDF data loaded correctly
- Tolerance threshold (0.0001) enforced
- Test fails if calculation accuracy insufficient

---

### T007: Integration Test - Dashboard Restoration
**Priority**: Critical
**Agent**: `qa-expert`
**Status**: pending
**Dependencies**: T001

**Description**: Create E2E test verifying dashboard renders without debugging messages (FR-007, FR-008)

**Actions**:
- Create `tests/e2e/dashboard-production.spec.ts`
- Navigate to dashboard page (/)
- Assert NO text "The dashboard is temporarily disabled for debugging" visible
- Assert dashboard component renders
- Assert all charts visible (calorie-management-widget, goal-progress-widget, metabolic-insights-widget, progress-trend-chart)
- Assert no console errors
- Screenshot dashboard for visual verification

**Test Must FAIL Initially** (Red Phase):
- Run: `npx playwright test tests/e2e/dashboard-production.spec.ts`
- Expected: Test fails because debugging message present or dashboard commented out

**Acceptance Criteria**:
- E2E test created with element assertions
- Test fails detecting debugging message or missing component
- All dashboard widgets checked
- Visual regression baseline created

---

### T008: E2E Test - Entry History Restoration
**Priority**: Critical
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T003

**Description**: Create E2E test verifying all 12 historical entries display (FR-005, FR-006)

**Actions**:
- Create `tests/e2e/entry-history.spec.ts`
- Navigate to entry history page
- Wait for entries to load
- Count displayed entries
- Assert total === 12
- Assert entries sorted by recordedAt DESC (newest first)
- Test pagination if applicable
- Assert Constitution Article II: No data loss

**Test Must PASS** (Green Phase - already working per investigation):
- Run: `npx playwright test tests/e2e/entry-history.spec.ts`
- Expected: Test passes because entry history already restored

**Acceptance Criteria**:
- E2E test created with count assertions
- Validates all 12 entries visible
- Sorting validated
- Test provides regression protection

---

### T009: E2E Test - AI Settings Routing
**Priority**: High
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T004

**Description**: Create E2E test verifying /settings/ai route accessible (FR-009, FR-010, FR-011)

**Actions**:
- Create `tests/e2e/ai-settings-routing.spec.ts`
- Navigate to /settings
- Click "AI Settings" tab/link
- Assert URL === "/settings/ai"
- Assert page returns 200 (not 404)
- Assert AI Settings form renders
- Test form submission and persistence
- Assert settings persist after page refresh

**Test Must PASS** (Green Phase - already working per investigation):
- Run: `npx playwright test tests/e2e/ai-settings-routing.spec.ts`
- Expected: Test passes because routing already fixed

**Acceptance Criteria**:
- E2E test created with routing assertions
- 404 error checked and prevented
- Form rendering validated
- Persistence validated

---

### T010: Integration Test - Report Form Auto-Populate
**Priority**: High
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T003

**Description**: Create integration test verifying report form pre-fills from latest entry (FR-012, FR-013)

**Actions**:
- Create `tests/integration/report-auto-populate.test.ts`
- Query GET /api/entries/latest
- Store latest entry values
- Render report form component
- Assert form fields pre-filled with latest entry values
- Assert weight field === latestEntry.weight
- Assert bodyFatPercentage field === latestEntry.bodyFatPercentage
- Assert height, age, gender, activityLevel all match
- Test user can override pre-filled values

**Test Must PASS** (Green Phase - already working per investigation):
- Run: `npm test -- tests/integration/report-auto-populate.test.ts`
- Expected: Test passes because auto-populate already implemented in app-context.tsx

**Acceptance Criteria**:
- Integration test created with field value assertions
- Latest entry query validated
- All form fields checked
- Override capability tested

---

### T011: Integration Test - Theme Persistence
**Priority**: High
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T005

**Description**: Create integration test verifying theme survives browser restart (FR-014, FR-015, FR-016)

**Actions**:
- Create `tests/integration/theme-persistence.test.ts`
- Set theme to "dark" via PUT /api/theme
- Assert localStorage updated
- Assert database updated (for authenticated users)
- Assert cookie set
- Simulate page refresh (reload context)
- Assert theme still "dark"
- Simulate browser restart (new test context)
- Assert theme still "dark"
- Assert Constitution Article III: Hybrid persistence working

**Test Must PASS** (Green Phase - already working per investigation):
- Run: `npm test -- tests/integration/theme-persistence.test.ts`
- Expected: Test passes because hybrid persistence already implemented

**Acceptance Criteria**:
- Integration test created with persistence assertions
- localStorage checked
- Database checked (authenticated)
- Cookie checked
- Restart scenario validated

---

### T012: Integration Test - Banner Image Aspect Ratio
**Priority**: Medium
**Agent**: `test-automator`
**Status**: pending
**Dependencies**: T001

**Description**: Create visual regression test verifying banner maintains aspect ratio (FR-020, FR-021, FR-022)

**Actions**:
- Create `tests/integration/banner-aspect-ratio.test.ts`
- Upload test banner image with extreme aspect ratio (e.g., 21:9)
- Render profile page
- Capture banner element computed styles
- Assert CSS object-fit === "contain"
- Assert no image warping (compare original vs rendered dimensions)
- Test multiple aspect ratios (16:9, 21:9, 4:3)
- Screenshot banner for visual verification

**Test Must PASS** (Green Phase - already working per investigation):
- Run: `npm test -- tests/integration/banner-aspect-ratio.test.ts`
- Expected: Test passes because CSS object-fit already applied

**Acceptance Criteria**:
- Integration test created with CSS assertions
- object-fit property validated
- Multiple aspect ratios tested
- Visual regression baseline created

---

## Phase 3: Implementation Tasks (TDD Green Phase)

### T013: Fix Issue #1 - PRIME Report Verification
**Priority**: Critical
**Agent**: `python-pro` + `frontend-developer`
**Status**: pending
**Dependencies**: T006

**Description**: Verify and fix PRIME report calculations to match terminal reference (FR-001 to FR-004)

**Actions**:
- Run integration test T006 to identify numerical deviations
- If test fails: Debug PRIME_Report_Generator_v3_Fast.py calculations
- Compare template rendering with terminal reference template
- Fix any calculation errors to achieve < 0.0001 tolerance
- Verify templates/ directory structure matches "14-section-format"
- Run test again until it passes (Green phase)
- Manual stakeholder review for visual presentation matching

**Validation**:
- Run: `npm test -- tests/integration/prime-report-verification.test.ts`
- Expected: Test passes with all numerical values within 0.0001 tolerance
- Stakeholder confirms visual presentation matches terminal reference

**Acceptance Criteria**:
- T006 integration test passes
- Numerical accuracy < 0.0001
- Visual presentation approved by stakeholder
- Constitution Article V compliance verified

---

### T014: Fix Issue #3 - Dashboard Production Restoration
**Priority**: Critical
**Agent**: `frontend-developer`
**Status**: pending
**Dependencies**: T007

**Description**: Remove debugging message and restore dashboard component (FR-007, FR-008)

**Actions**:
- Open src/app/page.tsx
- Remove debugging message at line 8: "The dashboard is temporarily disabled for debugging"
- Uncomment dashboard component at line 11
- Verify no other debugging messages in production code
- Run E2E test T007 to verify fix
- Test passes (Green phase)

**Implementation**:
```typescript
// BEFORE (src/app/page.tsx):
{/* <div>The dashboard is temporarily disabled for debugging</div> */}
{/* <Dashboard /> */}

// AFTER (src/app/page.tsx):
<Dashboard />
```

**Validation**:
- Run: `npx playwright test tests/e2e/dashboard-production.spec.ts`
- Expected: Test passes, no debugging message, dashboard renders

**Acceptance Criteria**:
- T007 E2E test passes
- No debugging messages visible
- All dashboard widgets render correctly
- No console errors

---

### T015: Fix Issue #7 - Update CHANGELOG.md
**Priority**: Medium
**Agent**: `documentation-expert`
**Status**: pending
**Dependencies**: None

**Description**: Update CHANGELOG.md with v1.3.1 patch documenting all 8 resolved issues (FR-017, FR-018, FR-019)

**Actions**:
- Parse git commit history since v1.3.0 (2025-07-21)
- Extract commits related to 8 issues
- Create new section: `## [v1.3.1] - 2025-10-07`
- Document all 8 issues under `### Fixed` category:
  - Issue #1: PRIME report calculations match terminal reference (FR-003)
  - Issue #2: Entry history restoration (FR-005, FR-006)
  - Issue #3: Dashboard debugging message removed (FR-007, FR-008)
  - Issue #4: AI settings page routing (FR-009, FR-010, FR-011)
  - Issue #5: Report form auto-populate (FR-012, FR-013)
  - Issue #6: Theme persistence (FR-014, FR-015, FR-016)
  - Issue #7: Changelog updated with v1.3.1 patch (FR-017, FR-018, FR-019)
  - Issue #8: Banner image aspect ratio (FR-020, FR-021, FR-022)
- Add `### Changed` section for constitutional amendments

**Validation**:
- Review CHANGELOG.md for completeness
- Verify all 8 issues documented
- Verify semantic versioning (v1.3.1 patch for bug fixes)

**Acceptance Criteria**:
- CHANGELOG.md updated with v1.3.1 section
- All 8 issues documented under "Fixed"
- Constitutional amendments noted under "Changed"
- Semantic versioning followed

---

## Phase 4: Contract Implementation (TDD Green Phase)

### T016: Implement Report Generation Contract
**Priority**: Critical
**Agent**: `backend-architect` + `python-pro`
**Status**: pending
**Dependencies**: T002, T013

**Description**: Implement POST /api/reports/generate and GET /api/reports/{reportId} per contract

**Actions**:
- Create/update src/app/api/reports/generate/route.ts
- Implement POST handler calling Python API at http://localhost:5000/api/reports/generate
- Validate request schema per ReportRequest (userId, entryIds, templateVersion, outputFormat)
- Call PRIME_Report_Generator_v3_Fast.py via Python microservice
- Return response matching ReportResponse schema
- Create/update src/app/api/reports/[reportId]/route.ts
- Implement GET handler retrieving report metadata
- Run contract test T002 to verify implementation
- Test passes (Green phase)

**Validation**:
- Run: `npm test -- tests/contracts/report-generation.contract.test.ts`
- Expected: Contract test passes, schema validated

**Acceptance Criteria**:
- T002 contract test passes
- All schema validations satisfied
- Constitution Article I verified (calculationEngine correct)
- Constitution Article V verified (numericalAccuracy < 0.0001)

---

### T017: Implement Entry Management Contract
**Priority**: Critical
**Agent**: `backend-architect`
**Status**: pending
**Dependencies**: T003

**Description**: Implement entry management endpoints per contract (already mostly working, ensure schema compliance)

**Actions**:
- Review src/app/api/entries/route.ts (GET /api/entries)
- Verify pagination, sorting, filtering implemented
- Review src/app/api/entries/latest/route.ts (GET /api/entries/latest)
- Verify returns most recent entry
- Ensure all schema fields returned (12 required fields)
- Run contract test T003 to verify implementation
- Test passes (Green phase)

**Validation**:
- Run: `npm test -- tests/contracts/entry-management.contract.test.ts`
- Expected: Contract test passes, all 12 entries returned

**Acceptance Criteria**:
- T003 contract test passes
- All schema validations satisfied
- Constitution Article II verified (12+ entries preserved)

---

### T018: Implement AI Settings Contract
**Priority**: High
**Agent**: `backend-architect`
**Status**: pending
**Dependencies**: T004

**Description**: Implement AI settings endpoints per contract (already mostly working, ensure schema compliance)

**Actions**:
- Review src/app/api/settings/ai/route.ts
- Verify GET handler returns AISettings schema
- Verify PUT handler accepts AISettingsUpdate schema
- Ensure apiKey field is writeOnly (encrypted, never returned)
- Verify page src/app/settings/ai/page.tsx renders correctly
- Run contract test T004 to verify implementation
- Test passes (Green phase)

**Validation**:
- Run: `npm test -- tests/contracts/ai-settings.contract.test.ts`
- Expected: Contract test passes, apiKey security validated

**Acceptance Criteria**:
- T004 contract test passes
- All schema validations satisfied
- API key encryption verified
- Page routing verified (no 404)

---

### T019: Implement Theme Persistence Contract
**Priority**: High
**Agent**: `frontend-developer` + `backend-architect`
**Status**: pending
**Dependencies**: T005

**Description**: Implement theme endpoints per contract (already mostly working, ensure hybrid persistence)

**Actions**:
- Review src/app/api/theme/route.ts
- Verify GET handler returns ThemePreference schema
- Verify PUT handler accepts ThemeUpdate schema
- Verify hybrid persistence implementation in src/contexts/theme-context.tsx
- Ensure localStorage updated immediately
- Ensure database updated for authenticated users
- Ensure SSR cookie set in response headers
- Run contract test T005 to verify implementation
- Test passes (Green phase)

**Validation**:
- Run: `npm test -- tests/contracts/theme-persistence.contract.test.ts`
- Expected: Contract test passes, hybrid persistence validated

**Acceptance Criteria**:
- T005 contract test passes
- All schema validations satisfied
- Constitution Article III verified (hybrid persistence working)
- Cookie headers set correctly

---

## Phase 5: Comprehensive Validation & Refactor

### T020: Comprehensive Test Suite & Code Review
**Priority**: Critical
**Agent**: `qa-expert` + `code-reviewer`
**Status**: pending
**Dependencies**: T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019

**Description**: Run complete test suite, validate quickstart.md scenarios, perform code review

**Actions**:
- Run all unit tests: `npm test`
- Run all integration tests: `npm test -- tests/integration/`
- Run all contract tests: `npm test -- tests/contracts/`
- Run all E2E tests: `npx playwright test`
- Execute quickstart.md test scenarios (8 scenarios)
- Verify no regressions introduced
- Code review for debugging messages (Constitution Article VI)
- Verify constitutional compliance (all 7 articles)
- Performance validation (<200ms p95 API latency, 60fps UI, <5s report generation)
- Stakeholder sign-off for Issue #1 visual presentation
- Stakeholder sign-off for Issue #3 dashboard production-ready

**Validation**:
- All tests pass (100% success rate)
- All quickstart.md scenarios validated
- Code quality standards met (Constitution Article VI)
- Performance goals achieved (Constitution Article V)
- Stakeholder approval obtained

**Acceptance Criteria**:
- All 20 tasks completed
- All tests passing
- No regressions detected
- Constitutional compliance verified
- Stakeholder sign-off obtained
- Feature ready for production deployment

---

## Task Execution Order

**Phase 1: Setup & Contract Tests (Red)**
- T001 [P] → T002 [P], T003 [P], T004 [P], T005 [P]

**Phase 2: Integration Tests (Red Continued)**
- T002 → T006
- T003 → T008, T010
- T004 → T009
- T005 → T011
- T001 → T007, T012

**Phase 3: Implementation (Green)**
- T006 → T013
- T007 → T014
- (None) → T015 [P]

**Phase 4: Contract Implementation (Green Continued)**
- T002, T013 → T016
- T003 → T017 [P]
- T004 → T018 [P]
- T005 → T019 [P]

**Phase 5: Validation (Refactor)**
- ALL → T020

**Legend**:
- [P] = Can execute in parallel with other [P] tasks
- → = Depends on completion of previous task
- ALL = Depends on all previous tasks

---

## Agent Assignments Summary

| Agent | Tasks | Role |
|-------|-------|------|
| `general-purpose` | T001 | Environment setup |
| `test-automator` | T002, T003, T004, T005, T006, T008, T009, T010, T011, T012 | Contract & integration tests |
| `python-pro` | T006, T013, T016 | PRIME module verification |
| `qa-expert` | T007, T020 | E2E testing & final validation |
| `frontend-developer` | T014, T019 | Dashboard & theme fixes |
| `documentation-expert` | T015 | Changelog update |
| `backend-architect` | T016, T017, T018, T019 | API implementation |
| `code-reviewer` | T020 | Code quality review |

---

## Success Metrics

- **Test Coverage**: >80% for critical paths (Constitution Article VI)
- **Test Success Rate**: 100% (all tests passing)
- **Numerical Accuracy**: <0.0001 tolerance (Constitution Article V)
- **Performance**: <200ms p95 API latency, 60fps UI, <5s report generation
- **Regressions**: 0 (validated via comprehensive regression suite)
- **Constitutional Compliance**: All 7 articles verified
- **Stakeholder Approval**: Obtained for visual presentation and dashboard

---

**Task Generation Complete**: 20 tasks generated from Phase 1 design artifacts following Test-First Development principles.
