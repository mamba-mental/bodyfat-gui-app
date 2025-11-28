# Report Generation Timeout Adjustment – Problem 1-Pager

## Context
- PRIME report generation now relies on the Python service for full calculations, charts, and AI analysis.
- `REPORT_GENERATION_FIXES.md` documents the need for a five-minute budget so the Python service can finish heavy workloads.
- Current frontend/App Router orchestration uses hard-coded timeouts inside `src/app/api/generate-report/route.ts` and `src/contexts/app-context.tsx`.

## Problem
- Those timeouts remain at roughly thirty to thirty-five seconds.
- Long-running PRIME jobs still exceed the threshold, forcing premature failures and the HTML fallback.
- Implementation and documentation are out of sync, creating confusion during validation.

## Goal
- Align both server route and client orchestration timeouts with the documented five-minute window while keeping behaviour deterministic and observable.

## Non-Goals
- No changes to report payload validation, Python integration, or fallback logic.
- No new queues, retries, or job status endpoints.
- No restructuring of storage or announcement UX.

## Constraints
- Keep the change localized and small per operating rules.
- Use intention-revealing constants; avoid magic numbers.
- Preserve existing logging and error flows.
- Ensure the timeout values stay consistent between client and server layers.

## Option Analysis
1. **Hard-code five-minute constants (300 s) in both locations.**
   - Pros: Minimal surface area; directly satisfies documentation; easy to review.
   - Cons: Requires code change for future adjustments.
   - Risks: Hung Python jobs could tie up requests for up to five minutes.
2. **Introduce configurable timeout sourced from env/central config.**
   - Pros: Adjustable without code edits; single source of truth.
   - Cons: Additional plumbing, validation, and documentation; higher regression risk.
   - Risks: Misconfiguration (missing/invalid env) causing crashes or zero timeout.

## Decision
- Proceed with Option 1. The documented SLA is stable, and the small code change minimizes risk while restoring alignment between behaviour and documentation.

## Impact Note
- `AbortSignal.timeout` appears only in the PRIME report generation call path; increasing it to 5 minutes simply extends the wait window before falling back and mirrors the Python service’s expected runtime.
