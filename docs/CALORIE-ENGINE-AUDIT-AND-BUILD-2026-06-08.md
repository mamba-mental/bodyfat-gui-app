# Ap³xFit Calorie/Recomp Engine — Audit + Build Plan (2026-06-08)

> **Dated audit/build plan.** Check current code, tests, OpenSpec, and [`VERIFICATION-2026-08-11.md`](VERIFICATION-2026-08-11.md) before treating an item as implemented.

> Source-of-truth for the recomp projection engine. Written after PRIME flagged that
> reports converge WEIGHT to goal but not BODY FAT, and that lifestyle/PED modifiers
> should drive the daily calorie prescription.

## ✅ DONE THIS SESSION — Body-fat convergence (the keystone bug)

**Bug:** the 16-week report drove WEIGHT to goal but BODY FAT just drifted (ended ~21% vs goal 13%).

**Root cause:** `new_prime_python_code/PRIME_Calculations.py` weekly loop computed
`fat_loss = weekly_weight_target * fat_loss_ratio` — it **ignored** the `weekly_fat_target`
the dual-goal function already calculated. Weight was steered to goal; body-fat was a side effect.

**Fix (clamp-then-derive, "goal is sacred"):**
```python
fat_loss = weekly_fat_target                                   # drive fat by the FAT goal
current_fat_mass = max(goal_fat_mass, current_fat_mass - fat_loss)
current_weight   = max(goal_weight,  current_weight  - weekly_weight_target)
current_lean_mass = current_weight - current_fat_mass         # lean = remainder (recomp emerges)
```
Plus `goal_fat_mass = goal_weight * (goal_bf/100)` added before the loop.

**Verified** with PRIME's numbers (266.8/39.2% → 217/13%, 16wk): week-16 lands EXACTLY
217.0 lbs / 13.00% BF; fat 104→28 lbs, lean RISES 162→189 (true recomp); kcal 1824→1495.
Tests: `python-api/test_fatloss_modifiers.py` — 2 pass + 1 xfail (the pending build below).

**History (why it flip-flopped):** v1 `fat_loss=weekly_fat_target` (BF converges, modifiers inert)
→ v2 "F8 audit" `=weight_target*ratio` (modifiers matter, BF drifts) → v3 (this fix) back to v1.
The peace treaty: **goal defines the endpoint; modifiers move the CALORIES, never the endpoint.**

**To see it live:** restart the Python API (it caches the module) + regenerate the report.

---

## 🔧 THE BUILD — Wire modifiers → calorie prescription (PRIME's full vision)

PRIME's spec: "diet, PEDs, PED type, workouts, experience, cardio, lifestyle all factor into
how many calories to eat per day to hit the goal — like a personal trainer's game plan. Every
new weigh-in should re-baseline the plan to what was actually accomplished."

### Audit — what each input affects TODAY (calorie path = `TDEE = RMR×activity_mult + TEF`, NEAT commented out)

| Input | Affects calories now? | Where |
|---|---|---|
| Activity level (sed→active) | ✅ | TDEE activity multiplier |
| Protein / macros | ✅ | TEF |
| Age / weight / height / athlete | ✅ | RMR |
| Exercise type (cardio/lift/HIIT) | ❌ | `estimate_neat` exists but NEAT is commented OUT of `calculate_tdee` (PRIME_Utils.py:241) |
| Job / leisure activity (lifestyle) | ❌ | same — NEAT disabled |
| Diet type (keto/high-protein) | ❌ | read in `get_rmr_and_tdee` but never passed to `calculate_tdee`; only feeds muscle calc |
| PED use | ❌ | not in calorie path at all (only boosted muscle_gain, now reported-only) |
| **PED type** (test / fat-burner / etc.) | ❌ | **does not exist as an input** |
| Workout days / experience / sleep | ❌ | only feed `estimate_muscle_gain` |

**Verdict:** scaffolding mostly EXISTS (DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS, estimate_neat,
ped multiplier) — it's just **not connected to calories**. So: CONNECT, don't rebuild. PED-type is net-new.

### The 5 pieces

1. **Wire NEAT into TDEE** — un-comment/reconcile so exercise type + job + leisure move calories.
   ⚠️ Avoid double-counting NEAT with the activity multiplier (the comment's warning) — pick one model.
2. **Diet type → calories** — pass `diet_type` into the calorie target (keto/high-protein partitioning + TEF).
3. **PED + PED TYPE → calories** — add a `ped_type` input (test / fat-burner / GH / etc.) with per-type
   effects on RMR/partitioning/retention → the calorie target. (Source coefficients from PRIME's
   `recomp-protocol` PED protocol docs — NOT invented.)
4. **Explanatory report wording** — per-week narrative: what changed + WHY, reflecting the active
   modifiers ("Week 3: +X kcal because cardio added / PED retains lean…").
5. **Adaptive re-baseline on weigh-in** — each new actual weigh-in recomputes the remaining
   trajectory from current state over remaining weeks (the personal-trainer "revamp" loop).

### Also flagged (code health)
- **`PRIME_Utils.py` is DUPLICATED** — the whole file's content appears twice (lines ~1-103 then
  104-253). Second defs win so it runs, but it should be de-duped.
- Report shows **17 weeks** for a 16-week cut = the week-0 baseline row counted as a week (display only).

### File map
- Engine: `new_prime_python_code/PRIME_Calculations.py` (predict_weight_loss, dual-goal deficit)
- TDEE/RMR: `PRIME_RMR_Calculations_v2.py` → `PRIME_Utils.py` (calculate_tdee, calculate_rmr, estimate_neat/tef, multipliers)
- Fasting: `PRIME_Diet_Calculations_v2.py`
- API: `python-api/main.py` (calculate_progression, generate_report)
- Tests: `python-api/test_fatloss_modifiers.py`

**Recommended:** build on a Leverage/build day. Each piece is independently shippable + testable.
