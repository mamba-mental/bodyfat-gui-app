# Ap³xFit Calorie Engine — Implementation Spec v1 (2026-06-08)

> **Versioned engineering reference.** This v1 document does not override newer code, accepted OpenSpec contracts, or source-safety requirements. Coefficients must remain traceable and tested.

**Goal:** the app's weekly report must produce PRIME's **calibrated** calorie/protein numbers —
the ones from his proven `recomp-protocol/recomp-calculator.xlsx` (`build_calculator.py`) — not the
app's from-scratch TDEE−deficit estimate. "Correct values" == his calculator's values.

## Source of truth = `recomp-protocol/build_calculator.py`

**Reference curve** (calibrated 281→220 lb PED cut), per week: `weight, bf%, training_cal, rest_cal,
psmf_cal, protein_g, phase`. Anchors: `REF_START_W = 281.3`, `REF_START_LBM = 177.78`.

**His equations:**
- **Weight / BF%:** linear interpolate Current→Goal over (weeks−1).  ✅ *already done by the 2026-06-08 convergence fix.*
- **Calories:** `week_cal = REF_curve[week] × scale`, where **`scale = current_weight / 281.3`**.
  Training, Rest, PSMF day calories each scale by the same factor.
- **Protein:** `REF_protein[week] × (current_LBM / 177.78)` where `current_LBM = current_weight × (1 − bf%)`.
- **Day types** (`Daily Structure` tab): TRAINING (gym 3×/wk) · REST (non-gym) · PSMF (Mon) ·
  REFEED (Sun, wk5+). Each a calorie range × scale.
- **Adaptive rule:** "ADJUST weekly on real weigh-ins: lose >4 lb/wk → eat more · <2 lb/wk → eat less."

## Phases

### Phase 1 — Engine calorie port (CORE — gets correct values today)
In `new_prime_python_code/PRIME_Calculations.py predict_weight_loss`:
- Embed the REF curve (16-week calibrated table) + `REF_START_W` / `REF_START_LBM`.
- Per week, set the calorie fields from `REF × scale` (scale = current_weight/281.3), NOT tdee−deficit.
- Generalize: if the user's cycle ≠ 16 weeks, interpolate the REF curve across the user's week count;
  scale still = current_weight/281.3 (the calibration anchor).
- Add per-week fields: `training_calories, rest_calories, psmf_calories, protein_g, phase`.
- Keep `daily_calorie_intake` = the **training-day** number (the anchor/headline) for back-compat.
- Keep tdee/rmr as informational (still reported), but they no longer DRIVE the prescription.

### Phase 2 — Report surfaces the day-types + protein + phase
`python-api/main.py` WeeklyProgression model + the report component: show the Training/Rest/PSMF/
Refeed breakdown + protein + phase per week (matches the xlsx Daily Structure).

### Phase 3 — Adaptive re-baseline on each weigh-in
`generate_report` / `calculate_progression`: use the **latest weigh-in** as the rolling current_weight,
recompute remaining weeks + rescale. Apply the weigh-in adjustment heuristic (>4 lb/wk eat more,
<2 lb/wk eat less) as a surfaced recommendation.

### Phase 4 — Explanatory wording
Per-week narrative: what changed + WHY (phase transition, refeed introduced wk5+, scale change after
a weigh-in). Reflects the active inputs.

### Phase 5 — PED type (net-new input) + modifier nuance
`ped_type` (test / fat-burner / GH / none) — in PRIME's model this selects/shifts the calibrated curve
or phase aggressiveness. Coefficients sourced from `recomp-protocol/03-ped-protocol.docx`, NOT invented.

## Open decisions (PRIME)
- **D1 — Align to xlsx model?** REC: **yes** (this whole spec). The app should match the calculator he trusts.
- **D2 — Weekly report representation?** REC: show the **day-type breakdown** (Training/Rest/PSMF/Refeed)
  + protein + phase, with the training-day cal as the headline. (Alt: single weekly-average number.)

## Code-health (fix alongside)
- `PRIME_Utils.py` is DUPLICATED top-to-bottom — de-dupe.
- Report shows 17 rows for 16wk = week-0 baseline counted; label it "Start" or hide from the 1–16 count.
