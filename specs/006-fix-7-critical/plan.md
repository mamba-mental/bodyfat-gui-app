
# Implementation Plan: Critical Issues Resolution

**Branch**: `006-fix-7-critical` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/specs/006-fix-7-critical/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix 8 prioritized issues (3 critical, 3 high, 2 medium) to achieve production-ready state:
- **Critical**: Verify PRIME report calculations/aesthetics match terminal reference, restore full entry history, remove dashboard debugging messages
- **High**: Fix AI settings routing, implement report form auto-populate, ensure theme persistence
- **Medium**: Update CHANGELOG.md with v1.3.1 patch, verify banner image aspect ratio handling

Technical approach: Verify existing implementations (5 issues already resolved), fix remaining 3 issues, write comprehensive regression tests for all 8 to prevent future regressions, ensure constitutional compliance throughout.

## Technical Context
**Language/Version**: TypeScript 5.x (Next.js 14), Python 3.12 (FastAPI backend)
**Primary Dependencies**: Next.js 14 App Router, React 18, FastAPI, SQLite, Recharts, TailwindCSS, PRIME calculation modules
**Storage**: SQLite database at `data/bodyfat.db` (single source of truth per Constitution Article II)
**Testing**: Vitest (unit/integration), Playwright (E2E), pytest (Python backend)
**Target Platform**: Web application (cross-browser), WSL2/Linux development environment
**Project Type**: web (Next.js frontend + FastAPI Python backend microservice)
**Performance Goals**: <200ms p95 API latency, 60fps UI interactions, <5s report generation per Constitution Article V
**Constraints**: Must maintain 100% backward compatibility with existing user data, zero data loss during fixes, PRIME calculation accuracy within 0.0001 tolerance
**Scale/Scope**: 8 prioritized issues (3 critical blocking, 3 high user-facing, 2 medium polish), comprehensive regression test suite for all fixes
**User Context**: "these step s to ensure that there are no hiccups" - Execute implementation with careful validation at each step, verify no regressions introduced

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Article I: Python Module Integrity** ✅ PASS
- Report generation uses PRIME_Report_Generator_v3_Fast.py (verified in investigation)
- Python modules from new_prime_python_code/ are correctly integrated
- FastAPI microservice pattern already in use (python-api/main.py)
- Action: Verify calculations match terminal reference numerically

**Article II: Database Consistency & Migration** ✅ PASS
- SQLite at data/bodyfat.db is single source of truth
- Entry history restoration preserves existing 12 entries
- No schema changes required for these fixes
- All fixes maintain backward compatibility

**Article III: Frontend Stability** ⚠️ ATTENTION REQUIRED → ✅ READY FOR IMPLEMENTATION
- Next.js 14 App Router routing working for most pages
- AI settings page routing verified functional (FR-009)
- Theme persistence uses hybrid localStorage + database (Constitution-compliant)
- Dashboard temporarily disabled - MUST restore per FR-007
- Action: Remove debugging message at src/app/page.tsx:8, uncomment component at line 11
- **Phase 1 Impact**: API contracts generated, E2E test scenarios defined in quickstart.md

**Article IV: Test-First Development** ⚠️ ATTENTION REQUIRED → ✅ READY FOR IMPLEMENTATION
- Tests exist for some features but not comprehensive
- FR-024 requires comprehensive automated tests for ALL 8 issues
- Action: Write regression tests BEFORE marking issues resolved
- TDD cycle: Write failing tests → Fix issues → Tests pass
- **Phase 1 Impact**: 4 API contracts created (report, entry, ai-settings, theme), 8 test scenarios documented in quickstart.md with acceptance criteria

**Article V: Report System Integrity** ⚠️ VERIFICATION NEEDED → ✅ READY FOR VERIFICATION
- Report format must match terminal version exactly (FR-003)
- PRIME modules integrated correctly
- Numerical accuracy within 0.0001 tolerance required
- Visual presentation requires stakeholder review
- Action: Generate test report, compare with Master_Journey reference
- **Phase 1 Impact**: report-generation.yaml contract defines verification requirements, quickstart.md Test 1 provides dual validation approach (automated numerical + manual visual)

**Article VI: Code Quality Standards** ✅ PASS
- Following existing codebase patterns
- TypeScript strict mode in use
- File sizes within limits
- Action: Remove debugging messages, clean production code

**Article VII: Agent Governance** ✅ PLANNED
- Will use specialized agents per task type (frontend-developer, qa-expert, code-reviewer)
- Agent outputs will be verified for truthfulness
- Constitutional compliance verified at each handoff

**Initial Assessment**: 2 blocking items (Dashboard restoration, Test coverage), 1 verification item (Report matching). All constitutional violations have clear remediation paths.

**Post-Phase 1 Assessment**: All 3 attention items now READY FOR IMPLEMENTATION:
- Article III: Dashboard restoration - Clear implementation path defined (2-line fix)
- Article IV: Test coverage - 4 API contracts + 8 test scenarios documented with acceptance criteria
- Article V: Report verification - Dual validation approach designed (automated + manual)
- **Conclusion**: Design phase complete, no constitutional blockers remain, ready for task execution

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
python-api/                      # FastAPI backend microservice
├── main.py                      # Primary API entry point (417 lines)
├── new_prime_python_code/       # PRIME calculation modules
│   ├── PRIME_Report_Generator_v3_Fast.py
│   ├── PRIME_Calculations.py
│   └── PRIME_Utils.py
├── templates/                   # Report templates directory
└── results/                     # Generated reports output

src/                             # Next.js 14 frontend
├── app/                         # App Router pages
│   ├── page.tsx                 # Dashboard (currently disabled)
│   ├── settings/
│   │   ├── page.tsx
│   │   └── ai/
│   │       └── page.tsx         # AI Settings (739 lines)
│   └── api/                     # API routes
│       ├── entries/
│       ├── reports/
│       ├── dashboard/
│       └── theme/
├── components/                  # React components
│   ├── charts/                  # Recharts visualizations
│   ├── forms/                   # Entry forms
│   └── settings/                # Settings UI
├── contexts/                    # React contexts
│   ├── app-context.tsx          # App state + auto-populate logic
│   └── theme-context.tsx        # Theme persistence (hybrid approach)
├── hooks/                       # Custom hooks
│   └── use-mounted-ref.ts       # Lifecycle guards
└── lib/                         # Utilities

tests/                           # Test suites
├── unit/                        # Unit tests (Vitest)
├── integration/                 # Integration tests
└── e2e/                         # End-to-end tests (Playwright)

data/
└── bodyfat.db                   # SQLite database (12 entries)

templates/                       # Shared report templates
```

**Structure Decision**: Web application with Next.js frontend and FastAPI Python backend microservice. Frontend uses Next.js 14 App Router file-based routing. Backend integrates PRIME calculation modules via Python. Data persistence through SQLite at data/bodyfat.db.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
Based on Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md), the /tasks command will generate:

1. **Contract Test Tasks** (from contracts/ directory):
   - Task: Create contract test for report-generation.yaml [P]
   - Task: Create contract test for entry-management.yaml [P]
   - Task: Create contract test for ai-settings.yaml [P]
   - Task: Create contract test for theme-persistence.yaml [P]
   - **These tests MUST fail initially** (Red phase of TDD)

2. **Implementation Tasks** (from Investigation Status in spec.md):
   - Task: Issue #1 - Verify PRIME report calculations match terminal reference
     - Subtask: Generate test report using PRIME_Report_Generator_v3_Fast.py
     - Subtask: Automated numerical comparison (0.0001 tolerance)
     - Subtask: Manual stakeholder visual review
   - Task: Issue #3 - Restore dashboard production functionality
     - Subtask: Remove debugging message at src/app/page.tsx:8
     - Subtask: Uncomment dashboard component at src/app/page.tsx:11
     - Subtask: Verify all charts/widgets render correctly
   - Task: Issue #7 - Update CHANGELOG.md with v1.3.1 patch
     - Subtask: Parse git commits since v1.3.0 (2025-07-21)
     - Subtask: Document all 8 resolved issues under "Fixed" category
     - Subtask: Add constitutional amendments under "Changed"

3. **Regression Test Tasks** (from quickstart.md test scenarios):
   - Task: Issue #2 - Write entry history regression test [P]
   - Task: Issue #4 - Write AI settings routing E2E test [P]
   - Task: Issue #5 - Write report auto-populate integration test [P]
   - Task: Issue #6 - Write theme persistence integration test [P]
   - Task: Issue #8 - Write banner aspect ratio visual regression test [P]

4. **Verification Tasks**:
   - Task: Run comprehensive test suite (contract + integration + E2E)
   - Task: Validate quickstart.md scenarios with stakeholders
   - Task: Constitutional compliance final review

**Ordering Strategy**:
- **TDD Strict Order**: Contract tests → Integration tests → Implementation → E2E tests
- **Dependency Order**:
  - Phase 1: Contract tests (all [P] parallel)
  - Phase 2: Implementation fixes (Issues #3, #7 can run [P])
  - Phase 3: Regression tests (all [P] parallel)
  - Phase 4: Issue #1 verification (depends on Python API running)
  - Phase 5: Comprehensive validation
- **Parallel Execution**: Mark [P] for tasks operating on independent files
- **Constitutional Mandate**: Tests written FIRST, implementations SECOND (Article IV)

**Estimated Output**: 18-22 numbered, dependency-ordered tasks in tasks.md

**Agent Assignment** (when /tasks executes):
- Contract tests: `test-automator` agent
- Issue #1 (PRIME): `python-pro` + `test-automator`
- Issue #3 (Dashboard): `frontend-developer` + `qa-expert`
- Issue #7 (Changelog): `documentation-expert`
- Regression suite: `test-automator` + `qa-expert`
- Final validation: `code-reviewer` + stakeholder

**Success Criteria**:
- All contract tests fail initially (Red phase)
- All tests pass after implementation (Green phase)
- Code refactored per Article VI (Refactor phase)
- No regressions introduced (validated via regression suite)
- Constitutional compliance verified at each handoff

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ 2025-10-07
- [x] Phase 1: Design complete (/plan command) - ✅ 2025-10-07
- [x] Phase 2: Task planning approach documented (/plan command) - ✅ 2025-10-07
- [x] Phase 3: Tasks generated (/tasks command) - ✅ 2025-10-07
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All 7 articles assessed, 3 attention items identified
- [x] Post-Design Constitution Check: PASS - All 3 attention items transitioned to READY FOR IMPLEMENTATION
- [x] All NEEDS CLARIFICATION resolved - Investigation section in spec.md confirms no unknowns
- [x] Complexity deviations documented - No complexity violations, feature is bug fixes only

**Artifacts Generated**:
- [x] research.md - 5 technical decisions, risk assessment, validation approach
- [x] data-model.md - 6 entities defined with constitutional compliance matrix
- [x] contracts/ - 4 OpenAPI specifications (report, entry, ai-settings, theme)
- [x] quickstart.md - 8 test scenarios with acceptance criteria
- [x] CLAUDE.md updated - Feature-specific context added for agent handoff
- [x] tasks.md - 20 numbered, dependency-ordered tasks following TDD principles

**Next Action**: Execute Phase 4 (Task Implementation) - Begin with T001 (Project Environment Setup)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
