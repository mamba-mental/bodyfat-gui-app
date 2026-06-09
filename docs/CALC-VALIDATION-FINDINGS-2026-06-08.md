# Ap³xFit Calc Engine — Validation Findings (2026-06-08)

Synthesis of 4 parallel agents: **calc-inventory** (45 calcs mapped) · **fat-loss-coach** (domain) ·
**deep-research** (2024-26 science, cited) · **codex** (code/pipeline). This is the source-of-truth
content for the per-calculation dashboard. Nothing here is auto-applied — these are findings + PRIME's decisions.

---

## 🔴 HEADLINE — the model is internally inconsistent + the goal is infeasible (coach + research AGREE)

- **Calorie engine ⟂ body-comp engine.** Prescribed food = ~1,500–1,800/day deficit. Prescribed
  trajectory needs **~2,500+/day from fat alone**. Calibrated separately, never reconciled.
- **39%→13% BF in 15 wk = ~5.6 lb fat/wk ≈ 3× the max fat-oxidation ceiling** (Alpert ~22–31 kcal/lb-fat/day).
  PEDs improve *partitioning*, NOT the ceiling.
- **Realistic for 15 wk:** ~15–20 lb fat → **high-20s% BF**. **13% ≈ a 30-week project.**
- **ND/motivation hazard:** the old plan made every weigh-in read as "failure" vs a fictional schedule.
- 👉 **DECISION (PRIME):** (a) keep 13% → extend to ~25–30 wk · or (b) keep 15 wk → reset endpoint ~16–17%.

---

## Per-calculation verdicts

Legend: ✅ sound · ⚠️ update (science/model) · 🔴 bug (code) · 🟡 decision needed

### Metabolic base
| Calc | Source | Verdict | Finding / fix |
|---|---|---|---|
| **RMR** (Mifflin-St Jeor + 10% athlete) | PRIME_Utils.py:101 | ⚠️ | Coefficients coded correctly (codex), but Mifflin **underestimates RMR for heavy/muscular men** (2023 Sports-Med meta). → **Ten-Haaf (2014)** default; **Cunningham (500+22·LBM_kg)** cross-check when DEXA LBM exists; drop the +10% guess. |
| **TDEE** = RMR×activity + TEF | PRIME_Utils.py:213 | ⚠️🔴 | Multipliers standard ✅. But **TEF added on top double-counts** (multipliers already embed TEF). And **NEAT computed then commented out** (line 241) → exercise/job/leisure don't move calories. Pick ONE model. |
| **TEF** (P25/C7.5/F1.5%) | PRIME_Utils.py:49 | ⚠️ | Macros are filler: `carb_cal = protein_cal` (PRIME_Calculations.py:401-403) → ±50 cal error. Use real macro split. |
| **NEAT** (job+leisure+exercise) | PRIME_Utils.py:73 | 🔴 | Exposed in output but excluded from TDEE → **false signal**. Either include + reduce multiplier, or remove from output+docs. |

### Deficit & partitioning
| Calc | Source | Verdict | Finding / fix |
|---|---|---|---|
| **Energy deficit** (3500 kcal/lb) | PRIME_Calculations.py:234 | ⚠️ | **3500-rule deprecated** (2012 ASN consensus) — overpredicts, ignores adaptive thermogenesis. → **dynamic/rolling TDEE recalc** (pairs with Phase-3 weigh-in re-baseline). Keep 3500 only as fat energy-density constant. |
| **Fat:lean partitioning** (fixed ratio) | PRIME_Calculations.py:485 | ⚠️ | p-ratio must **vary with current BF%** (Forbes curve): leaner → more LBM at risk. → Forbes-based dynamic p-ratio + PED modifier (biases toward fat). |
| **Weekly fat/weight targets** (linear) | PRIME_Calculations.py:265 | ⚠️ | Linear to goal → impossible flat 4.95 lb fat/wk. → **front-loaded decay** (% of *current* fat mass/wk, ~3–4%). |

### Calorie / macro prescription (the calibrated curve)
| Calc | Source | Verdict | Finding / fix |
|---|---|---|---|
| **Calibrated curve × scale** (cal = REF×weight/281.3) | PRIME_Calculations.py:51 | ✅ | Smart approach (coach). Keep. |
| **daily_calorie_intake** (weekly avg) | PRIME_Calculations.py:39 | 🔴 | Contradicts spec (training-day headline). → set = `training_calories`; add separate `weekly_average_calories`. |
| **Training/Rest day cal** | scaled_recomp_targets | ✅ | Defensible for PED-assisted cut. Add **RMR×0.85 floor + "below RMR" flag** (rest days dip sub-RMR silently). |
| **PSMF day cal** | scaled_recomp_targets | 🔴 | **IMPOSSIBLE cell:** 771 cal budget vs 237g protein = 948 cal. → **protein-anchor PSMF** (kcal = protein×4 + ~120 ≈ 1,000). |
| **Protein target** (×lean/177.78) | PRIME_Calculations.py:57 | ✅ | 1.4–1.6 g/lb LEAN — model's best part. PED makes upper end optional. Keep (scaled to lean, not total). |
| **Refeed** (Sun wk5+) | spec only | 🔴⚠️ | **Not in the running curve** (no refeed column; avg = 3 train/3 rest/1 PSMF). → add real refeed wk5+ (~2–3 g/lb-lean carbs); MATADOR-backed. |
| **Phases** RESET→ADAPT→CYCLE→PEAK | RECOMP_REF_CURVE | ✅ | Hardcoded labels; fine. |
| **Muscle gain** (multiplier stack) | PRIME_Calculations.py:101 | 🟡 | Now advisory (clamp-derive made it non-driving). Keep as informational. |

### Trajectory & feasibility
| Calc | Source | Verdict | Finding / fix |
|---|---|---|---|
| **Weight + BF convergence** (dual-goal) | PRIME_Calculations.py:509 | ✅ | The 2026-06-08 fix is correct — both hit goal. |
| **Clamp-then-derive** | PRIME_Calculations.py:534 | 🔴 | **Sign bug:** for GAIN goals (goal_weight>current), `max()` clamp jumps straight to goal. → sign-aware (`max` cut / `min` gain). |
| **BF% trajectory** (linear) | inline | ⚠️ | Unrealistic; decelerate (Forbes + Alpert fat-ox cap). Flag infeasible targets instead of rendering linearly. |

### Report metrics & pipeline
| Calc | Source | Verdict | Finding / fix |
|---|---|---|---|
| Progress %, time-to-goal | calculations.ts:226,246 | ✅ | NaN-safe; fine. |
| Muscle retention %, metabolic adaptation %, preservation score | PRIME_Report_Generator_v3_Fast.py | ✅ | Computed; fine. |
| **NEW fields → frontend** (training/rest/psmf/protein/phase) | main.py:188-201,418-431; src/types/index.ts:123-137 | 🔴 **P0** | **Dropped — never reach UI.** Engine emits them; WeeklyProgression (Py + TS) doesn't declare them; /calculate doesn't copy them. → add to both models + copy + contract test. |
| **/calculate vs /generate-report** start-date | main.py:392 vs 515-537 | 🔴 | /generate-report resets start to today + may rewrite end → report HTML can disagree with saved calc. → pass the computed progression in, or unify inputs. |
| **weekly_caloric_output** | PRIME_Calculations.py:482 | 🔴 | Reports dual-goal deficit, not calibrated calories → mismatch. Rename `required_weekly_deficit` or recompute from calibrated days. |
| **/rmr, /tdee endpoints** | main.py:600,610 | 🔴 | Broken signatures (wrong arg count/order). → fix or delete. |
| **<1wk timeline** | PRIME_Calculations.py:360 | 🔴 | ValueError → HTTP 500. → validate at API → 400/422; guard `remaining_weeks<=0`. |
| **PRIME_Utils.py duplicated** | :1-103 then :104-253 | 🔴 | File restarts mid-way (second defs win). → de-dupe. |
| **Dead code** | tdee-deficit daily_calorie_intake; fat_loss_ratio | 🧹 | Remove or wire into a named feasibility output. |

---

## Priority fix list

**P0 (correctness — report is wrong/blocked without these):**
1. Wire new calibrated fields through API + TS models (+contract test) — codex #1.
2. Protein-anchor PSMF day (impossible cell) — coach #4 / inventory.
3. Reconcile calorie-engine ⟂ trajectory: **the timeline/endpoint decision** (PRIME) + front-loaded fat-loss decay.
4. Sign-aware clamp (gain-goal bug) — codex #8.

**P1 (accuracy/science):**
5. RMR → Ten-Haaf/Cunningham; drop +10%.
6. Deficit → dynamic/rolling recalc (3500-rule out) — ties to Phase-3 re-baseline.
7. Forbes p-ratio + PED modifier.
8. Add real refeed (MATADOR) wk5+.
9. TDEE TEF double-count + NEAT decision.

**P2 (hygiene/safety):**
10. De-dupe PRIME_Utils.py; remove dead code.
11. Fix/delete /rmr + /tdee endpoints; API date validation (400 not 500).
12. Surface safety flags: sub-RMR intake, electrolyte protocol, supervision assumption.

---

## Sound — keep (don't touch)
Dual-goal convergence fix · calibrated-curve+scale approach · protein scaled to lean mass · PSMF 1×/wk
cadence · Mifflin coefficients (impl correct) · activity multiplier set · progress/time-to-goal (NaN-safe).

## Key sources (deep-research, cited)
Ten-Haaf 2014 + 2023 Sports-Med RMR meta (PMC10687135) · NIH Body Weight Planner / Hall dynamic model ·
ISSN 2017 protein stand (PMC5470183/5477153) · MATADOR RCT (Nature IJO 2017) · Forbes p-ratio ·
Alpert fat-ox ceiling · testosterone+deficit FFM-sparing RCTs (PMC9483439/9712311).
</content>
