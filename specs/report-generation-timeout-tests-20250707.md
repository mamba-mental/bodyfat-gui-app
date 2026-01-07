# Report Generation Timeout Regression Tests – Problem 1-Pager

## Context
- The PRIME report flow now waits up to five minutes both server-side (`src/app/api/generate-report/route.ts`) and client-side (`src/contexts/app-context.tsx`).
- Documentation (`REPORT_GENERATION_FIXES.md`) promises the longer window so heavy PRIME jobs avoid fallback.
- No automated tests currently guard these timeout expectations or the updated user messaging on the reports page.

## Problem
- Without automated coverage, future edits could silently revert the timeout constants or user guidance, reintroducing premature failures.
- We need deterministic tests that fail if the timeout drops below the five-minute SLA or the reports UI copy regresses.

## Goal
- Add Vitest coverage that verifies:
  1. The API route issues `fetch` with a five-minute `AbortSignal.timeout`.
  2. The AppContext orchestration supplies a five-minute timeout (with buffer) and user-facing announcement.
  3. The reports loading panel copy reflects the five-minute expectation.

## Non-Goals
- No end-to-end timing test of actual Python execution.
- No refactor of the report generation logic or dependency graph.
- No Playwright/UI automation; coverage stays in Vitest.

## Constraints
- Tests must run quickly and deterministically (no real network calls; mock `fetch` and timers).
- Maintain the existing test directory conventions (`tests/unit` for focused unit coverage).
- Avoid leaking timers or spies—clean up after each test.

## Option Analysis
1. **Unit-level Vitest mocks** (targeting route handler and context functions).
   - Pros: Fast, deterministic, minimal infrastructure.
   - Cons: Requires careful mocking of Next.js primitives and timers.
   - Risks: Tight coupling to implementation details (constants, message text).
2. **Higher-level integration test via Next server harness**.
   - Pros: Closer to runtime behaviour.
   - Cons: Heavy setup, slower, and overkill for constant verification.
   - Risks: Flaky due to environment startup; harder to isolate timeout parameter.

## Decision
- Proceed with Option 1: add focused Vitest unit tests that mock dependencies, ensuring both server and client logic enforce the five-minute timeout and messaging contract.
