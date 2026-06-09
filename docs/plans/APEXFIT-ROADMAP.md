# Ap³xFit — Roadmap & North Star

**Owner:** PRIME · **Last updated:** 2026-06-08

---

## 🌟 NORTH STAR (the `/goal`)

> **Ap³xFit is a self-contained `/fat-loss-coach`.** The user enters all their specific
> data in the app once, and every generated report — **especially after each weigh-in** —
> delivers coach-grade guidance and accurate, on-track-to-goal predictions, *as if we ran
> the `/fat-loss-coach` live every time, with course-correction.*

Every feature below is judged against that bar: does it make the report *coach* the user
toward the end goal, not just *calculate* a number?

---

## ✅ Done (2026-06-08 — engine reconciliation)

- **Calc engine fixed end-to-end:** front-loaded geometric fat-loss decay (fast early /
  taper late), configurable 1,200 calorie floor + protein-anchored PSMF, goal-type +
  sign-aware clamp, Forbes × PED-phase `p_ratio`, **Cunningham RMR off measured InBody LBM**,
  dual-goal convergence (weight AND body-fat land on goal), PED-aware graduated feasibility.
  Verified on PRIME's real numbers (271/37.8 → 217/13%, 16 wk): converges exactly, tapers
  7.9→2.4 lb/wk, feasibility "aggressive" on protocol.
- **Reports page fix:** AI Analysis + trends read the latest *cycle-scoped report* (not the
  stale live calc); AI lazy-loads on tab open via `/api/ai/insights`.
- **"This Cycle" filter, default ON:** Entry History + Progress Charts auto-scope to the
  active cycle (all-time/3mo/etc still selectable).

## 🔨 In flight (2026-06-08)

- **Canonical reconciliation matrix:** detects Profile-vs-Cycle drift (goal_bf, goal_wt,
  current stats), per-field selection matrix (Cycle = default canonical), "edit-profile-
  mid-cycle → apply to active cycle?" path.
- **PED stack picker + tiered modifiers:** pick actual compounds per phase → bounded,
  literature-cited modifiers (`docs/PED-MODIFIERS-SOURCING.md`, 29 sources) nudge p_ratio +
  lean retention + a separate thermogenic EE bonus, feeding both the engine and AI insights.
  Per-compound confidence surfaced (RCT-grade vs estimated).

---

## 🏁 CAPSTONE — Post-Weigh-In Course Correction panel

**The single feature that most directly *is* the north star.** Everything above makes the
numbers right; this makes the app **coach** the user after every weigh-in.

### What it does
After each logged weigh-in, the app:
1. **Compares actual vs predicted.** Overlay the user's *actual* logged trajectory (entries)
   against the *predicted* curve from the active cycle's report. Compute deviation for
   **weight AND body-fat separately**: `ahead / on-track / behind` (with the gap quantified).
2. **Re-baselines.** Re-run the engine from the latest weigh-in (rolling-smoothed BF, already
   in `get_smoothed_start_bf`) → updated path + whether the **end-date/goal still holds** or
   needs adjustment. Front-loaded decay recomputed from where they actually are.
3. **Issues a concrete course-correction directive** (this is the coach part) — specific,
   actionable, not vibes:
   - calorie adjustment (± on training/rest/PSMF days),
   - cardio/NEAT adjustment,
   - refeed / diet-break timing (MATADOR-aware),
   - PSMF frequency change,
   - "you're X lb ahead — hold" / "you're Y lb behind — here's the catch-up that's still
     within the Alpert/PED-feasible ceiling, or the goal date moves to Z."
4. **Feeds the directive to AI insights** for the natural-language coaching narrative.

### Where it surfaces
Prominent panel on the **Report page** (top, above the day-type breakdown) and a compact
version on the **Dashboard** + the **New Entry** confirmation (so the correction hits right
after logging a weigh-in — the moment it matters).

### Guardrails (consistent with the engine)
- Goal stays **sacred** — corrections adjust the *path/prescription*, and only suggest moving
  the *end date* when the remaining trajectory exceeds the PED-feasible ceiling (flagged
  honestly, never silently).
- Course-correction math reuses the existing engine (front-load + feasibility + PED stack) —
  no new trajectory model, just actual-vs-predicted + a prescription delta.
- Honest when behind: don't fabricate a rosy catch-up; show the real options
  (extend timeline OR accept a higher end-BF OR a feasibility-capped harder push).

### Acceptance
- A weigh-in that's off-plan produces a specific, numeric correction (not "keep going!").
- Re-baselined path + (held or moved) goal date shown.
- On-track weigh-in says "on track, hold" with the evidence.
- AI narrative references the actual deviation + the prescription.

---

## 🏛️ CORE PRINCIPLE — NOTHING IS STATIC (PRIME, 2026-06-08, emphatic)

**The numbers move at every weigh-in. That IS the app.** Initial setup = the algorithm's *proposed/assumed* opening plan. Then the **actual weigh-ins (weekly, sometimes multiple/week) re-solve calories + cardio UP or DOWN** to keep converging on the ONE fixed goal — exactly like real coaching (you never train at the same calories twice; body comp dictates the adjustment). Engine `course_correct()` + the AI Coach (fat-loss skill brain) deliver the continuous re-adjustment; the report always renders the **current re-solved prescription**, never a frozen plan. No calorie/cardio number is a fixed target — it is the live output of (algorithm + latest weigh-in + honesty enhancements). This is the soul.

## Council Verdict + Resolved Build Spec (2026-06-08, council8 — PROCEED 8/8, 87%)

Full transcript: `C:\AI CoWork\council-deliberations\council8\2026-06-08_apexfit-report-architecture.md`.

**Resolved decisions:**
1. **Consolidate 3 PDFs → 2 living docs** — a run-once **Baseline Blueprint** (comprehensive) + a recurring **weekly Living Progress Report**. **HARD GATE:** PED safety (PCT, bloodwork-due + RED/YELLOW thresholds, sides tree, injection SOP) is a **PERMANENT expanded safety strip in BOTH docs — never a collapsed `<details>` appendix.**
2. **Legacy report → Baseline Blueprint** — keep all 13 sections; **auto-re-baseline at Wk4/8/12 InBody** (scheduled, not user-remembered).
3. **Calorie canon = ONE parametric engine** (single source of truth): **Cunningham RMR off InBody LBM** → TDEE → tapered deficit, **HARD 1,200 PSMF floor**, **≥237 g protein**. doc01/doc02 demoted to optional validation presets.
4. **Both HTML + Markdown** as **pure renderers over the engine** (no duplicated math). Report rhythm: **Mon full report + Thu/Sat 3-line AI Coach check-ins** (delta vs trajectory · on-line/drifting · ≤1 micro-adjust + 1-line safety status, expands on RED).

**Goal reconciliation (PRIME, 2026-06-08 — RESOLVED with proven competition data):**
PRIME's two best comps BOTH = **~189 lb lean** → Powerlifting **217 lb @ 13%** (189 lean + 28 fat) · Bodybuilding **203 lb @ 7%** (189 lean + 14 fat). So **189 lb is his PROVEN, twice-validated lean ceiling** — not net-new muscle. 217@13% is a **muscle-memory REGAIN to a held physique**, not a build → achievable (council's "impossible" assumed net-new lean; corrected by PRIME's stage history).
- **GOAL = 217 lb @ 13%** (powerlifting stage composition). `goal_weight=217`, `goal_bf=13` (the 217-vs-220 ambiguity resolved → **217**).
- **Engine model:** lean trajectory **regains toward the 189 lb proven ceiling** (front-loaded muscle-memory + PED recomp; tunable `lean_ceiling_lb=189` + bounded regain rate, documented—not fabricated; NEVER exceed proven peak without explicit input). Fat drops front-loaded. **BF derived** from weight − lean each week.
- **Engine = course-correction CONTROL SYSTEM (the soul — corrected 2026-06-08):** the deadline (16 wk) + stage target (217@13%) are **FIXED**; the engine **SOLVES the levers** — training/rest/PSMF calories, carbs, and **cardio sessions/duration** — required to hit the target by the date, and **re-solves every weigh-in** (steeper if behind, ease if ahead) = the "Next Session Plan." It is NOT a predict-and-extend forecaster — the date never moves. **Honesty = a constraint FLAG** when the required push exceeds safe limits (1,200 PSMF floor · sane cardio ceiling ~75 min/day · Alpert fat-ox cap PED-widened · 189 lean ceiling): emit `required_deficit` vs `max_safe_deficit` + `residual_gap` + status (`on_track`/`pushing_limits`/`maxed_out`) — exactly what a real coach tells a client. This is how real competitive prep works (course-correct carbs + cardio to make the stage look happen on the day).
- **Future stretch goal:** 203 lb @ 7% (bodybuilding-stage lean — same 189 lean, fat stripped to ~14 lb).

**Build sequence (council-recommended, engine-first):**
1. ✅ **Engine unification** — canonical parametric path (Cunningham/1200/≥237g); honest anchor-weight→derived-BF projection; fix 217/220; extend curve to where 13% is reached.
2. ✅ **HTML + MD renderers** over engine output — `PRIME_Living_Report.py` + `/generate-living-report` (verified rendered 2026-06-08).
3. ✅ **Permanent safety strip + RED banner** — verified expanded near top of BOTH HTML + MD (council hard-gate met).
4. ✅ **Honest BF%-primary projection** in the report (deltas = information, not verdict).
4b. **🧠 AI Coach brain port (PRIME approved 2026-06-08):** embed the `fat-loss-coach` skill's METHODOLOGY (protocol-selection matrix, macro rules by goal+BF-category, electrolyte protocol, training-modification-by-deficit, troubleshooting trees, safety contraindications, the 5 legends' signature methods, + PRIME guardrails: no-shame/ADHD-OCD-MDD framing, lbs, protein on LEAN mass, electrolytes-before-mental-health) INTO the app's AI Coach (`PRIME_AI_Confidence_Analyzer` prompt + a structured knowledge file). Turns the Next Session Plan + Thu/Sat check-ins from "numbers with commentary" into actual coaching judgment. **This is the "judgment half" that makes the app a self-contained `/fat-loss-coach` (engine = the numbers half).** Step (a) extract/distill knowledge [parallel-safe, prep now]; step (b) wire into the analyzer [after engine + renderers]. **✅ DONE 2026-06-08** — `PRIME_AI_Confidence_Analyzer.py` injects `COACH_SYSTEM_PROMPT` (provider-aware: system-role for OpenAI-compat providers, prepended-to-user for Anthropic/Gemini) + `PRIME_GUARDRAILS`; 6 wiring + 3 unit tests pass.
5. **Report Schedule** (Mon full / Thu-Sat 3-line) + **scheduled re-baseline** (Wk4/8/12). *(Renamed from "Cadence" → "Report Schedule" 2026-06-08 to kill the collision with PRIME's Cadence-Prime.Focus pomodoro app — this is a report-rhythm descriptor, NOT that app.)*
6. **Validate taper** against real Wk1-3 data.

## Deferred / separate builds (spec'd, not scheduled)
- **In-app "Generate your 3 PED/nutrition DOCX" button** (`recomp-protocol-feature-blueprint.md`).
- **PED schedule as tracked cycle data** (vs the current static phase boundaries).
