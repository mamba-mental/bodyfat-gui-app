# Quickstart: Critical Issues Resolution Validation

**Feature**: 006-fix-7-critical
**Purpose**: Execute test scenarios validating all 8 resolved issues
**Target Users**: QA Engineers, Developers, Stakeholders
**Estimated Time**: 30 minutes

## Prerequisites

- [ ] Application running locally (`npm run dev` + Python API on port 5000)
- [ ] SQLite database populated with 12 test entries
- [ ] Terminal reference PDF available: `Z:\2024.0917 - Bf-estimator-v2\122924_bf-estimator-terminal\results\Master_Journey_Prime_Prime_20250916_164621.pdf`
- [ ] Test user account created with known credentials

## Test Execution Order

**Philosophy**: Test-First Development (Constitution Article IV)
- Tests MUST be written before implementation
- Follow Red-Green-Refactor cycle
- Validate test failures before fixes

---

## CRITICAL Priority Scenarios

### Test 1: PRIME Report Calculation & Aesthetic Verification

**User Story**: As a user generating a report, I expect calculations to match terminal version numerically AND visually.

**Functional Requirements**: FR-001, FR-002, FR-003, FR-004

**Steps**:
1. Navigate to report generation page
2. Fill in test data matching terminal reference input
3. Generate report (PDF format)
4. Download generated report

**Expected Results**:
- ✅ Report generates without errors
- ✅ Numerical accuracy within 0.0001 tolerance (automated test)
- ✅ Visual presentation matches terminal reference aesthetic (manual stakeholder review)
- ✅ Uses PRIME_Report_Generator_v3_Fast.py (verify in logs)

**Acceptance Criteria**: 
- Automated test: `npm test -- tests/integration/prime-report-verification.test.ts` PASSES
- Manual review: Stakeholder confirms visual match with terminal reference

---

### Test 2: Entry History Restoration

**User Story**: As a user viewing my history, I expect all entries from all time periods to be visible.

**Functional Requirements**: FR-005, FR-006

**Steps**:
1. Navigate to entry history page
2. Scroll through all entries
3. Verify total count matches expected: 12 entries

**Expected Results**:
- ✅ All 12 historical entries displayed
- ✅ Entries sorted by date (newest first by default)
- ✅ Data persists after browser refresh

**Acceptance Criteria**:
- E2E test: `npx playwright test tests/e2e/entry-history.spec.ts` PASSES

---

### Test 3: Dashboard Production Readiness

**User Story**: As a user accessing the dashboard, I expect production features enabled with NO debugging messages.

**Functional Requirements**: FR-007, FR-008

**Steps**:
1. Navigate to dashboard page (/)
2. Inspect page content for debugging messages
3. Verify all dashboard features render

**Expected Results**:
- ✅ Dashboard renders without errors
- ✅ NO "The dashboard is temporarily disabled for debugging" message visible
- ✅ All charts and widgets display correctly

**Acceptance Criteria**:
- E2E test: `npx playwright test tests/e2e/dashboard-production.spec.ts` PASSES

---

## HIGH Priority Scenarios

### Test 4: AI Settings Page Routing

**User Story**: As a user navigating to AI Settings, I expect the page to load without 404 errors.

**Functional Requirements**: FR-009, FR-010, FR-011

**Steps**:
1. Navigate to Settings page
2. Click "AI Settings" tab
3. Verify route: `/settings/ai`

**Expected Results**:
- ✅ Route `/settings/ai` accessible (200 response)
- ✅ AI Settings page renders correctly
- ✅ Settings persist after form submission

**Acceptance Criteria**:
- E2E test: `npx playwright test tests/e2e/ai-settings-routing.spec.ts` PASSES

---

### Test 5: Report Form Auto-Populate

**User Story**: As a user creating a report, I expect the form to auto-populate with my most recent entry data.

**Functional Requirements**: FR-012, FR-013

**Steps**:
1. Navigate to report generation page
2. Observe form fields (should be pre-filled)
3. Verify pre-filled values match latest entry

**Expected Results**:
- ✅ Form auto-populates from latest entry
- ✅ User can override pre-filled values

**Acceptance Criteria**:
- Integration test: `npm test -- tests/integration/report-auto-populate.test.ts` PASSES

---

### Test 6: Theme Persistence

**User Story**: As a user selecting a theme, I expect my preference to persist across browser sessions.

**Functional Requirements**: FR-014, FR-015, FR-016

**Steps**:
1. Select "Dark" theme
2. Refresh browser
3. Close and reopen browser

**Expected Results**:
- ✅ Theme applies immediately
- ✅ Theme persists after refresh
- ✅ Theme persists after browser restart

**Acceptance Criteria**:
- Integration test: `npm test -- tests/integration/theme-persistence.test.ts` PASSES

---

## MEDIUM Priority Scenarios

### Test 7: Changelog Update

**User Story**: As a stakeholder reviewing release notes, I expect CHANGELOG.md to document all 8 resolved issues.

**Functional Requirements**: FR-017, FR-018, FR-019

**Steps**:
1. Open CHANGELOG.md
2. Locate v1.3.1 patch entry
3. Verify all 8 issues documented

**Expected Results**:
- ✅ New section: `## [v1.3.1] - 2025-10-07`
- ✅ All 8 issues listed under `### Fixed`

---

### Test 8: Banner Image Aspect Ratio

**User Story**: As a user uploading a profile banner, I expect the image to maintain proper aspect ratio.

**Functional Requirements**: FR-020, FR-021, FR-022

**Steps**:
1. Upload banner image with extreme aspect ratio
2. View profile page

**Expected Results**:
- ✅ Banner displays without warping
- ✅ CSS `object-fit: contain` applied

---

## Post-Test Validation

Run comprehensive regression suite:

```bash
npm test
npx playwright test
```

**Success Criteria**:
- ✅ All tests pass
- ✅ No regressions introduced
- ✅ Constitutional compliance verified

**Quickstart Complete**
