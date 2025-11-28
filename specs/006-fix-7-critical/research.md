# Research & Technical Decisions

**Feature**: Critical Issues Resolution (006-fix-7-critical)
**Date**: 2025-10-07
**Status**: Complete

## Decision Summary

All technical context for this feature is well-defined from investigation findings (see spec.md Investigation Summary). No NEEDS CLARIFICATION items exist. This research document captures key technical decisions and validation strategies.

## Technical Decisions

### 1. Report Verification Strategy

**Decision**: Implement dual verification approach (automated numerical + manual visual)

**Rationale**: 
- Constitution Article V requires both numerical accuracy (0.0001 tolerance) and visual presentation matching terminal version
- Automated tests verify PRIME calculation outputs match reference values
- Manual stakeholder review validates aesthetic formatting/layout compliance
- Terminal reference: Master_Journey_Prime_Prime_20250916_164621.pdf at Z:\2024.0917 - Bf-estimator-v2\122924_bf-estimator-terminal\results\

**Implementation Approach**:
- Create contract tests comparing Python API report output to known-good terminal output
- Implement integration test loading reference PDF and comparing numerical values
- Document visual verification checklist for stakeholder review
- Use PRIME_Report_Generator_v3_Fast.py as authoritative engine (Constitution Article I)

**Alternatives Considered**:
- Automated visual regression testing (rejected: too brittle for PDF layout changes)
- Manual-only verification (rejected: doesn't scale, misses numerical errors)

---

### 2. Test Coverage Strategy

**Decision**: Implement comprehensive regression test suite for all 8 issues

**Rationale**:
- Constitution Article IV mandates Test-First Development
- FR-024 requires automated tests for ALL 8 issues (including 5 already resolved)
- Prevents future regressions on fixes that are already working
- Provides executable documentation of expected behavior

**Test Types Required**:
- **Contract Tests**: API endpoint schemas (report generation, entry retrieval, theme persistence)
- **Integration Tests**: Python-JavaScript boundary (PRIME module integration), database operations
- **E2E Tests**: User flows (AI settings navigation, report form auto-populate, theme selection)
- **Unit Tests**: Individual component behavior (theme context, entry form)

**Coverage Targets**:
- Critical issues (FR-001 to FR-008): 100% coverage with contract + integration + E2E
- High issues (FR-009 to FR-016): Integration + E2E
- Medium issues (FR-017 to FR-022): Integration tests
- Constitution Article VI: >80% coverage for critical paths

**Alternatives Considered**:
- Test only the 3 unfixed issues (rejected: violates FR-024, misses regression protection)
- Skip E2E tests for medium priority (rejected: FR-024 requires comprehensive coverage)

---

### 3. Dashboard Restoration Approach

**Decision**: Uncomment dashboard component, remove debugging message at src/app/page.tsx:8-11

**Rationale**:
- Investigation confirmed dashboard component exists but is commented out
- Debugging message "The dashboard is temporarily disabled for debugging" violates FR-007/FR-008
- Dashboard functionality already implemented (charts, widgets, metrics)
- Simple code cleanup task, not architectural change

**Implementation Steps**:
1. Read src/app/page.tsx
2. Remove debugging message (line 8)
3. Uncomment dashboard component (line 11)
4. Verify no other debugging messages exist in production code
5. Write E2E test confirming dashboard renders without debug text

**Risk Assessment**: LOW - Dashboard code already exists and was previously functional

**Alternatives Considered**:
- Rewrite dashboard from scratch (rejected: unnecessary, existing code works)
- Keep debugging message with conditional rendering (rejected: violates FR-008)

---

### 4. Changelog Generation Strategy

**Decision**: Manual changelog update based on git commit history analysis

**Rationale**:
- FR-018 requires parsing git commit history since v1.3.0 (2025-07-21)
- Last changelog entry: v1.3.0 (2025-07-21)
- Current work includes constitutional amendments and 8 bug fixes
- Semantic versioning: v1.3.1 patch for bug fixes (FR-019)

**Content Structure**:
```markdown
## [v1.3.1] - 2025-10-07

### Fixed
- Issue #1: PRIME report calculations match terminal reference (FR-003)
- Issue #2: Entry history restoration (FR-005, FR-006)
- Issue #3: Dashboard debugging message removed (FR-007, FR-008)
- Issue #4: AI settings page routing (FR-009, FR-010, FR-011)
- Issue #5: Report form auto-populate (FR-012, FR-013)
- Issue #6: Theme persistence (FR-014, FR-015, FR-016)
- Issue #7: Changelog updated with v1.3.1 patch (FR-017, FR-018, FR-019)
- Issue #8: Banner image aspect ratio (FR-020, FR-021, FR-022)

### Changed
- Constitution updated to v1.1.0 (added Articles I, II, III, VI, VII)
- Test coverage expanded per Article IV requirements
```

**Risk Assessment**: LOW - Straightforward documentation update

**Alternatives Considered**:
- Automated changelog generation (rejected: requires custom tooling, manual review still needed)
- Skip detailed issue references (rejected: violates FR-017 documentation completeness)

---

### 5. Test Execution Order

**Decision**: Strict TDD cycle - Write failing tests FIRST, then fix issues

**Rationale**:
- Constitution Article IV: "Tests MUST be written and approved before implementation begins"
- Red-Green-Refactor cycle enforced
- Tests must fail before implementation to verify test validity
- Prevents false positives from tests that always pass

**Execution Order**:
1. Phase 1: Generate contract tests from API contracts (must fail initially)
2. Phase 2: Write integration tests for all 8 issues (must fail for 3 unfixed issues)
3. Phase 3: Write E2E tests for user flows (must fail where applicable)
4. Phase 4: Implement fixes to make tests pass
5. Phase 5: Verify all tests pass, run regression suite

**Risk Assessment**: MEDIUM - Requires discipline to not implement before tests exist

**Validation**: Each test file must initially fail when run against current codebase

---

## Known Dependencies

### Internal Dependencies
- PRIME calculation modules: new_prime_python_code/PRIME_Report_Generator_v3_Fast.py
- Database: data/bodyfat.db (12 existing entries)
- Theme context: src/contexts/theme-context.tsx (hybrid localStorage + database)
- App context: src/contexts/app-context.tsx (auto-populate logic)

### External Dependencies
- Next.js 14 App Router (file-based routing)
- FastAPI (Python microservice)
- SQLite (database)
- Vitest (test runner)
- Playwright (E2E testing)

### Test Data Requirements
- Terminal reference PDF: Master_Journey_Prime_Prime_20250916_164621.pdf
- Known-good PRIME calculation outputs for contract tests
- Test user data for entry history verification
- Theme preference test scenarios (light/dark/system)

---

## Risk Assessment

### High Risk Items
- Report verification: Manual visual review required (stakeholder dependency)
- Test coverage: Comprehensive suite adds significant test maintenance overhead

**Mitigation**: 
- Schedule stakeholder review early in Phase 5
- Use test utilities to reduce boilerplate
- Document test scenarios clearly for maintainability

### Medium Risk Items
- Test execution order: Requires discipline to follow TDD strictly
- Dashboard restoration: Potential for hidden bugs in commented code

**Mitigation**:
- Automated checks in CI/CD to enforce test-first workflow
- Thorough E2E testing of dashboard after restoration

### Low Risk Items
- Changelog update: Simple documentation task
- Banner sizing: Already fixed with CSS object-fit

**Mitigation**: Standard code review process sufficient

---

## Validation Approach

### Automated Validation
- Contract tests verify API schemas
- Integration tests verify Python-JavaScript boundary
- E2E tests verify user flows
- Numerical accuracy tests verify PRIME calculations within 0.0001 tolerance

### Manual Validation
- Stakeholder visual review of generated reports vs terminal reference
- Code review for debugging message removal
- Constitutional compliance review at Phase 1 handoff

### Stakeholder Sign-off Required
- Report visual presentation (FR-003)
- Dashboard production-ready state (FR-007)

---

## Next Steps

1. Phase 1: Design & Contracts
   - Extract entities from spec.md → data-model.md
   - Generate API contracts from functional requirements → contracts/
   - Create test scenarios → quickstart.md
   - Update CLAUDE.md with new technical context

2. Re-evaluate Constitution Check after Phase 1 design

3. Document Phase 2 task generation approach (DO NOT create tasks.md)

---

**Research Complete**: All technical unknowns resolved, ready for Phase 1 design.
