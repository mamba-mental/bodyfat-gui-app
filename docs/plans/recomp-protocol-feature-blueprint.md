# Blueprint — "Generate Recomp Protocol" feature (Apex Fit)

> **Blueprint, not current capability.** The app can track a selected source-backed 14-day schedule/inventory snapshot, but it does not yet generate universal-duration or AI-authored PED protocols.

Status: SPEC ONLY (not implemented). Produced via feature-dev (3 code-explorers + 2 code-architects). 2026-06-03.

## What it does
A button in the app generates the 3 personalized DOCX docs that `/fat-loss-coach` + `C:\AI CoWork\recomp-protocol\build_docs.py` produce today — nutrition plan (~9pg), complete protocol (~10pg), PED protocol (~25pg + safety appendix) — using the **active cycle + latest entry**, downloadable like existing reports.

## Recommendation: ship PRAGMATIC v1, evolve to CLEAN v2
Two approaches were designed; they converge on the same integration points and differ only in personalization depth + module structure.

- **v1 (pragmatic — recommended first):** ONE vendored module `new_prime_python_code/PRIME_Protocol_Generator.py` (copy of build_docs.py, parameterized). Personalize the **YOUR INFO block + start date + all dates** (inline the date math, drop the 2-step refresh). Keep the calorie/weight/macro **trajectory tables as labeled "Example/Reference" for v1** (honest — they're already labeled that way). Fixed 16-week. Button on the dashboard **ReComp Cycle card** (or reports page). Ships in ~Phase 1–2.
- **v2 (clean — the proper end state):** package `new_prime_python_code/protocol_docs/` (config/db_loader/trajectory/date_math/builders/orchestrator) with a `UserConfig` dataclass and **personalized trajectory** (port `build_calculator.py` scale-factors: weight=linear interp, calories×current_weight/281.3, protein×lbm/177.78), plus a pytest/vitest suite. Adopt incrementally on top of v1.

## Decisions resolved by both architects
- **Server assembles the context, not the client.** New `Database.get_recomp_context("default")` → `{name, current_weight, current_bf, goal_weight, goal_bf, timeline_weeks, start_date}` (latest entry + active cycle, with fallbacks to the user profile). The DOCX always reflects persisted DB state.
- **Download is free** — reuse `storage/reports/` + the existing `src/app/api/reports/files/[filename]/route.ts` (DOCX → `application/octet-stream` → browser download). No new serving route.
- **New endpoint** `POST /generate-protocols` (python-api/main.py) + Next proxy `src/app/api/generate-protocols/route.ts` (mirror `/generate-report`).
- **`python-docx>=1.1.0`** must be added to `python-api/requirements.txt` (not currently a dependency).
- **PED safety content is copied verbatim** (disclaimer, PCT, ancillaries, sides tree, injection SOP, bloodwork interpretation, glossary) — only the user-info block + dates are personalized. Regression-test that disclaimer text is present in output.
- **Timeline fixed at 16 for v1** (the PED `WEEKS` list is hardwired wks 2–16). Validate `timeline_weeks==16`; return 422 with a clear message otherwise. Variable timeline = documented v2 seam.
- **Separate `protocol-actions.ts`** (don't grow report-actions.ts); add `generateProtocols()` to storage-api.ts; raise the `callApi` timeout for this call (generation is ~2–30s; 5-min headroom).

## Files
**Create (v1):** `new_prime_python_code/PRIME_Protocol_Generator.py`, `src/app/api/generate-protocols/route.ts`, `src/contexts/app/actions/protocol-actions.ts`.
**Create (v2 adds):** `new_prime_python_code/protocol_docs/{__init__,config,db_loader,trajectory,date_math,orchestrator}.py` + `builders/{shared_style,nutrition_plan,complete_protocol,ped_protocol}.py`; tests `tests/protocol_docs/test_{trajectory,db_loader,orchestrator}.py`, `src/__tests__/protocol-actions.test.ts`.
**Modify:** `python-api/requirements.txt` (+python-docx), `python-api/main.py` (import + ProtocolRequest model + endpoint), `python-api/database.py` (get_recomp_context [+ save_protocol_record in v2]), `src/lib/storage-api.ts` (generateProtocols + timeout), UI: `src/components/cycle/cycle-manager-card.tsx` (button + 3 download links) OR `src/app/reports/page.tsx` (protocol card); `src/types/index.ts` (v2: report_type/docx_paths).

## Endpoint contract
`POST /generate-protocols` body `{"user_id":"default"}` → `{success, nutrition_filename, complete_filename, ped_filename, generated_at, context_used:{...}}`. Download via `/api/reports/files/{filename}`.

## Phased build
1. Backend: add python-docx; vendor+parameterize generator; `get_recomp_context`; endpoint; curl-test → 3 DOCX in storage/reports/, open in Word, verify YOUR INFO + dates + PED intact.
2. Frontend: storage-api fn + proxy + action + UI button + 3 download links; e2e click→download.
3. Polish: no-active-cycle 422 + inline message; no-entries fallback; show `context_used`.
4. v2: package refactor + personalized trajectory (port build_calculator math) + tests.

## Risks
- Generation time vs timeout: python-docx is fast (~2–30s) under the 5-min ceiling; ThreadPoolExecutor if needed.
- MANIFEST module-global in build_docs.py → reset per call (race risk if concurrent).
- DOCX accumulation in storage/reports/ → timestamp filenames; optional cleanup (keep N).
- DOCX→PDF not in v1 (client pdf-generator only does HTML); add docx2pdf later if wanted.
- Unit bug risk: BF stored as fraction (0.368) not percent — assert in config; identity test (reference profile → REF curve) catches it.
- timeline≠16 → 422 in v1.

Full agent analyses (pragmatic + clean) are in the session transcript.
