# PRIME Coaching Protocol — Nutrition & PED (Structured Extraction)

> **Subject:** MJ PRIME — 281.3 lbs @ 36.8% BF -> 220 lbs @ 13% BF, 16-week cut, cycle start June 1, 2026
> **Extraction date:** 2026-06-08
> **Method:** python-docx — iterated document.paragraphs AND document.tables. Per-week PED timeline cross-verified between both PED docs (zero diff across weeks 2-16).
> **Anti-fabrication:** Only literal document values extracted. Absent values marked null or 'NOT SPECIFIED IN DOC'. No macro numbers, doses, or timing invented.

**Source files:**
- 01-nutrition-plan.docx
- 03-ped-protocol-060226.docx (NEWEST PED — preferred)
- 03-ped-protocol.docx (older PED — identical week-by-week, used to cross-verify)
- 02-complete-protocol.docx (training/cardio/troubleshooting + alternate nutrition)

---

## 1. NUTRITION

**Base diet:** Ketogenic (high fat, adequate protein, very low carb)

**Structure** _(src: 01-nutrition-plan.docx > The Protocol: Keto + Carb Cycling + PSMF)_
- BASE DIET: Ketogenic (high fat, adequate protein, very low carb)
- CARB CYCLING: Higher carbs on training days, very low on rest days
- PSMF: Every Monday — protein only, minimal fat/carbs
- REFEED: Sunday (starting Week 5) — strategic carb load to reset leptin
- PED ENHANCEMENT: Stack supports muscle preservation + accelerated fat loss

### Phase Definitions

| Phase | Name | Weeks | Notes |
|---|---|---|---|
| 1 | METABOLIC RESET | 1-4 | Monday PSMF, training days higher cal, rest days very low |
| 2 | FAT ADAPTATION | 5-8 | Sunday refeed begins Week 5, carbs increase on training days |
| 3 | CARB CYCLING INTENSIFIED | 9-12 | Higher training day carbs, lower rest days, strategic refeeds |
| 4 | FINAL CUT / PEAK | 13-16 | Lowest baseline, strategic carb loads for final look |

### Day-Type Macro Ranges _(src: 01-nutrition-plan.docx > Daily Calorie Structure (DAY TYPE table))_

| Day Type | Calories | Protein | Fat | Carbs | When |
|---|---|---|---|---|---|
| TRAINING DAY | 1650–1800 | 250–280g | 65–80g | 50–100g | Gym days (3x/wk) |
| REST DAY | 1200–1400 | 250–280g | 55–75g | 15–25g | Non-gym days |
| PSMF DAY | 700–800 | 250–280g | 20–30g | <10g | Monday |
| REFEED DAY | 2200–2500 | 200g | 40g | 200–300g | Sunday (Wk 5+) |

### Per-Phase Macros by Day Type _(src: 01-nutrition-plan.docx > Daily Calorie Structure)_

**Phase 1 (Weeks 1-4)**

| Metric | TRAINING DAY | REST DAY | PSMF (Mon) | REFEED (Sun) |
|---|---|---|---|---|
| Calories | 1800 | 1400 | 800 | N/A |
| Protein | 250g | 250g | 250g | 200g |
| Fat | 80g | 60g | 25g | 40g |
| Carbs | 50g | 20g | <10g | N/A |

**Phase 2 (Weeks 5-8)**

| Metric | TRAINING DAY | REST DAY | PSMF (Mon) | REFEED (Sun) |
|---|---|---|---|---|
| Calories | 1750 | 1350 | 800 | 2200–2500 |
| Protein | 260g | 260g | 260g | 200g |
| Fat | 75g | 55g | 25g | 40g |
| Carbs | 75g | 20g | <10g | 200g |

**Phase 3 (Weeks 9-12)**

| Metric | TRAINING DAY | REST DAY | PSMF (Mon) | REFEED (Sun) |
|---|---|---|---|---|
| Calories | 1650 | 1250 | 750 | 2200–2500 |
| Protein | 270g | 270g | 270g | 200g |
| Fat | 70g | 50g | 25g | 40g |
| Carbs | 100g | 15g | <10g | 250g |

**Phase 4 (Weeks 13-16)**

| Metric | TRAINING DAY | REST DAY | PSMF (Mon) | REFEED (Sun) |
|---|---|---|---|---|
| Calories | 1500 | 1200 | 700 | 2200–2500 |
| Protein | 280g | 280g | 280g | 200g |
| Fat | 65g | 45g | 25g | 40g |
| Carbs | 75g | 10g | <10g | 300g |

### Weekly Calorie & Macro Curve (16 weeks) _(src: 01-nutrition-plan.docx > Weekly Calorie & Macro Targets (16-week curve table))_

> Reference curve calibrated for a 281->220 lb cut over 16 weeks. Scale weight and calorie columns proportionally if start/goal/deficit differ.

| Wk | Weight | BF% | Training cal | Rest cal | PSMF cal | Protein | Phase |
|---|---|---|---|---|---|---|---|
| 1 | 281 | 36.8% | 1800 | 1400 | 800 | 250g | RESET |
| 2 | 277 | 35.5% | 1800 | 1400 | 800 | 250g | RESET |
| 3 | 273 | 34.2% | 1775 | 1375 | 800 | 255g | RESET |
| 4 | 269 | 32.9% | 1750 | 1350 | 800 | 260g | RESET |
| 5 | 265 | 31.5% | 1750 | 1350 | 800 | 260g | ADAPT |
| 6 | 261 | 30.0% | 1725 | 1325 | 800 | 265g | ADAPT |
| 7 | 257 | 28.6% | 1700 | 1300 | 800 | 265g | ADAPT |
| 8 | 253 | 27.1% | 1675 | 1275 | 775 | 270g | ADAPT |
| 9 | 249 | 25.5% | 1650 | 1250 | 750 | 270g | CYCLE |
| 10 | 245 | 23.9% | 1625 | 1225 | 750 | 275g | CYCLE |
| 11 | 241 | 22.2% | 1600 | 1200 | 750 | 275g | CYCLE |
| 12 | 237 | 20.5% | 1575 | 1175 | 725 | 280g | CYCLE |
| 13 | 233 | 18.7% | 1500 | 1200 | 700 | 280g | PEAK |
| 14 | 229 | 16.9% | 1475 | 1175 | 700 | 285g | PEAK |
| 15 | 224 | 15.0% | 1450 | 1150 | 700 | 285g | PEAK |
| 16 | 220 | 13.0% | 1425 | 1125 | 700 | 290g | PEAK |

### Weekly Eating Template _(src: 01-nutrition-plan.docx > Weekly Eating Template)_

| Day | Type | Calories | Protein | Carbs | Fat | Notes |
|---|---|---|---|---|---|---|
| Monday | PSMF | 750–800 | 250g | <10g | 20g | Lean protein only. Reset. |
| Tuesday | REST | 1300–1400 | 260g | 20g | 60g | Keto. 3 meals. |
| Wednesday | TRAINING | 1650–1800 | 260g | 75g | 75g | Pre/post WO carbs. |
| Thursday | REST | 1300–1400 | 260g | 20g | 60g | Keto. 3 meals. |
| Friday | TRAINING | 1650–1800 | 260g | 75g | 75g | Pre/post WO carbs. |
| Saturday | TRAINING | 1650–1800 | 260g | 75g | 75g | Pre/post WO carbs. |
| Sunday | REFEED* | 2200–2500 | 200g | 250–300g | 40g | *Starting Week 5 |

### Weekly Calorie Average _(src: 01-nutrition-plan.docx > Weekly Calorie Average)_
- Weeks 1–4 (no refeed): ~10,350 cal/week = ~1,478 cal/day average
- Weeks 5–16 (with refeed): ~11,550 cal/week = ~1,650 cal/day average

### Sample Meal Plans by Day Type _(src: 01-nutrition-plan.docx > Sample Meal Plans by Day Type)_

**TRAINING DAY** — ~1700 cal | 260g P | 75g F | 75g C

| Meal | Food | Protein | Fat | Carbs | Cal |
|---|---|---|---|---|---|
| Meal 1 (7am) | 6 whole eggs scrambled, 2 strips bacon, 1/2 avocado | 42g | 45g | 3g | 580 |
| Pre-WO (11am) | 8oz chicken breast, 1 cup rice cooked, 1 tbsp olive oil | 55g | 15g | 45g | 540 |
| Post-WO (3pm) | 10oz 93% ground beef, 6oz sweet potato, 1 cup broccoli | 65g | 12g | 25g | 480 |
| Meal 4 (7pm) | 6oz salmon, 2 cups spinach, 1 tbsp butter | 40g | 18g | 2g | 340 |
| TOTAL |  | 202g | 90g | 75g | 1940 |

**REST DAY** — ~1350 cal | 260g P | 60g F | 20g C

| Meal | Food | Protein | Fat | Carbs | Cal |
|---|---|---|---|---|---|
| Meal 1 (8am) | 6 whole eggs, 2oz cheese, 2 cups spinach | 48g | 42g | 3g | 580 |
| Meal 2 (1pm) | 8oz chicken thigh (skin on), mixed greens, ranch | 52g | 25g | 4g | 460 |
| Meal 3 (6pm) | 8oz ribeye, 1 cup asparagus, 1 tbsp butter | 56g | 35g | 5g | 560 |
| TOTAL |  | 156g | 102g | 12g | 1600 |

**PSMF DAY** — ~800 cal | 250g P | 20g F | <10g C

| Meal | Food | Protein | Fat | Carbs | Cal |
|---|---|---|---|---|---|
| Meal 1 (8am) | 10 egg whites, 4oz chicken breast | 58g | 4g | 2g | 275 |
| Meal 2 (1pm) | 10oz cod or tilapia, lettuce, lemon | 55g | 3g | 2g | 255 |
| Meal 3 (6pm) | 10oz chicken breast, cucumber, vinegar | 62g | 6g | 3g | 310 |
| Meal 4 (9pm) | 1 scoop whey isolate (if needed) | 25g | 1g | 1g | 110 |
| TOTAL |  | 200g | 14g | 8g | 950 |

**REFEED DAY** — ~2400 cal | 200g P | 40g F | 300g C — Starting Week 5

| Meal | Food | Protein | Fat | Carbs | Cal |
|---|---|---|---|---|---|
| Meal 1 (8am) | 6 egg whites + 2 whole eggs, 1.5 cups oatmeal, 1 banana | 40g | 12g | 85g | 600 |
| Meal 2 (12pm) | 8oz chicken breast, 2 cups white rice, low-fat teriyaki | 55g | 8g | 100g | 700 |
| Meal 3 (4pm) | 8oz lean ground turkey, 12oz potato, 1 cup vegetables | 50g | 10g | 75g | 600 |
| Meal 4 (8pm) | 6oz white fish, 1 cup rice, fat-free sauce | 40g | 5g | 45g | 400 |
| TOTAL |  | 185g | 35g | 305g | 2300 |

### Supplements _(src: 01-nutrition-plan.docx > Recommended Supplements)_

| Supplement | Dose | Timing | Purpose |
|---|---|---|---|
| Whey Isolate | 25–50g | Post-workout | Fast protein, hit daily target |
| Creatine Mono | 5g | Any time | Strength, cell volume |
| Electrolytes | Per label | AM + PM | Critical on keto: sodium, potassium, magnesium |
| Fish Oil | 2–4g EPA/DHA | With meals | Inflammation, lipids |
| Vitamin D3 | 5000 IU | Morning | Hormone support |
| Magnesium | 400mg | Before bed | Sleep, recovery, cramps |
| NAC | 600–1200mg | AM | Liver support (on orals) |
| TUDCA | 250–500mg | With orals | Liver support (on orals) |
| Fiber (psyllium) | 5–10g | Before bed | Digestion on high protein |

### Alternate Nutrition System (02-complete-protocol) _(src: 02-complete-protocol.docx > Nutrition Structure (DAY/NUTRITION/CALORIES table))_

> Alternate day-by-day nutrition+training pairing from 02-complete-protocol (DeLauer PSMF Hybrid + Palumbo Keto). Numbers differ from 01-nutrition-plan (Monday PSMF=1000 cal here vs 700-800; weekly avg ~1860 cal/day).
> **Weekly average:** ~1,860 cal/day | ~252g protein | ~67g fat | ~53g carbs

| Day | Nutrition | Calories | Protein | Fat | Carbs | Training |
|---|---|---|---|---|---|---|
| MONDAY | PSMF | 1,000 | 180g | 15g | <20g | Cardio Only |
| TUESDAY | Palumbo Keto | 2,000 | 280g | 90g | <30g | Weights + Cardio |
| WEDNESDAY | Palumbo Keto | 1,800 | 250g | 75g | <30g | Cardio Only |
| THURSDAY | Palumbo Keto | 2,000 | 280g | 90g | <30g | Weights + Cardio |
| FRIDAY | Palumbo Keto | 1,800 | 250g | 75g | <30g | Cardio Only |
| SATURDAY | Palumbo Keto | 2,000 | 280g | 90g | <30g | Weights + Cardio |
| SUNDAY | REFEED | 2,400 | 225g | 35g | 175g | Kettlebell / Active Recovery |

---

## 2. PED PROTOCOL

**Stack overview** _(src: 03-ped-protocol-060226.docx > Daily Totals by Phase + Weekly Injections tables)_
- Injectables: Testosterone (enanthate/cypionate), Equipoise (EQ), Deca (Nandrolone decanoate), Tren E (Trenbolone enanthate)
- Orals: Superdrol, Anavar, Winstrol, Proviron
- Non-AAS fat loss: T3, Clenbuterol
- GH secretagogue: MK-677

**CRITICAL LIMITS:** T3 MAX 75mcg | Clen never after 2pm | Deca STOP Wk 6 | Superdrol MAX 2wks | Skip T4 & Oral Primo  _(src: 03-ped-protocol-060226.docx > CRITICAL banner above Week-by-Week Dose Checklists)_

### Weekly Injections (per pin, 3 pins/wk Mon/Wed/Fri) _(src: 03-ped-protocol-060226.docx > Weekly Injections (Split Doses per Pin) — 3 pins/wk Mon/Wed/Fri)_

| Compound | weekly_total | WKS 2–6 Per Pin (3x) | WKS 7–10 Per Pin (3x) | WKS 11–16 Per Pin (3x) |
|---|---|---|---|---|
| Testosterone | 600→400→250mg | 200mg | 133mg | 83–100mg |
| Equipoise | 600mg | 200mg | 200mg | 200mg |
| Deca | 200mg→OFF | 100mg (2x/wk) | OFF | OFF |
| Tren E | OFF→300mg | OFF | 100–150mg (2x) | 150mg (2x) |

### Orals & Daily Compounds by Phase _(src: 03-ped-protocol-060226.docx > Daily Totals by Phase)_

| Compound | WK 2–3 | WK 4–8 | WK 9–14 | WK 15–16 |
|---|---|---|---|---|
| Superdrol | 20mg (10+10) | OFF | OFF | OFF |
| Anavar | OFF | 50mg (25+25) | OFF | OFF |
| Winstrol | OFF | OFF | 50mg (25+25) | 50–75mg (25+25+25) |
| Proviron | 50mg (25+25) | 50mg (25+25) | 75–100mg (37.5+37.5) | 100mg (50+50) |
| T3 | 50mcg (all AM) | 50–75mcg (all AM) | 50–75mcg (all AM) | 50–75mcg (all AM) |
| Clen | 40–60mcg (AM) | 60–80mcg (AM) | 80–100mcg (AM) | 80–100mcg (AM) |
| MK-677 | 10mg (bedtime) | 10mg (bedtime) | 10mg (bedtime) | OFF |

### Daily Administration Timing by Phase _(src: 03-ped-protocol-060226.docx > Daily Administration Timing (Exact Doses by Phase))_

| Time | Compound | WK 2–3 KICKSTART | WK 4–8 RECOMP | WK 9–14 HARDEN | WK 15–16 PEAK |
|---|---|---|---|---|---|
| WAKING (Fasted) | T3 | 50mcg | 50–75mcg | 50–75mcg | 50–75mcg |
| WAKING (Fasted) | Clenbuterol | 40–60mcg | 60–80mcg | 80–100mcg | 80–100mcg |
| BREAKFAST | Proviron | 25mg | 25mg | 37.5–50mg | 50mg |
| BREAKFAST | Superdrol | 10mg | OFF | OFF | OFF |
| BREAKFAST | Anavar | OFF | 25mg | OFF | OFF |
| BREAKFAST | Winstrol | OFF | OFF | 25mg | 25mg |
| PRE-WO (60–90 min) | Superdrol | 10mg | OFF | OFF | OFF |
| PRE-WO (60–90 min) | Anavar | OFF | 25mg | OFF | OFF |
| PRE-WO (60–90 min) | Winstrol | OFF | OFF | 25mg | 25–37.5mg |
| DINNER | Proviron | 25mg | 25mg | 37.5–50mg | 50mg |
| DINNER | Winstrol (if 75mg) | OFF | OFF | OFF | 12.5–25mg |
| BEDTIME | MK-677 | 10mg (opt) | 10mg (opt) | 10mg (opt) | OFF |

### Week-by-Week PED Timeline (Weeks 2–16) _(src: 03-ped-protocol-060226.docx > Week-by-Week Dose Checklists)_

> Weeks 2-16 only. Week 1 has NO dosing table in either PED doc — cycle dosing begins Week 2 (Kickstart). Both 03-ped-protocol-060226.docx and 03-ped-protocol.docx contain identical week-by-week injectable + oral timing (verified zero diff).

#### Week 2 — KICKSTART

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 200mg | 200mg | 200mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | 100mg | — | 100mg |
| Tren | — | — | — |

Oral & daily timing:
- **AM:** T3: 50mcg, Clen: 40–60mcg, Proviron: 25mg, Superdrol: 10mg
- **PRE_WORKOUT:** Superdrol: 10mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 3 — KICKSTART

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 200mg | 200mg | 200mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | 100mg | — | 100mg |
| Tren | — | — | — |

Oral & daily timing:
- **AM:** T3: 50mcg, Clen: 40–60mcg, Proviron: 25mg, Superdrol: 10mg
- **PRE_WORKOUT:** Superdrol: 10mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 4 — RECOMP

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 200mg | 200mg | 200mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | 100mg | — | 100mg |
| Tren | — | — | — |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 60–80mcg, Proviron: 25mg, Anavar: 25mg
- **PRE_WORKOUT:** Anavar: 25mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 5 — RECOMP

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 200mg | 200mg | 200mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | 100mg | — | 100mg |
| Tren | — | — | — |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 60–80mcg, Proviron: 25mg, Anavar: 25mg
- **PRE_WORKOUT:** Anavar: 25mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 6 — RECOMP

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 200mg | 200mg | 200mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | 100mg | — | 100mg |
| Tren | — | — | — |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 60–80mcg, Proviron: 25mg, Anavar: 25mg
- **PRE_WORKOUT:** Anavar: 25mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 7 — TRANSITION

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 133mg | 133mg | 133mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 100–150mg | — | 100–150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80mcg, Proviron: 25mg, Anavar: 25mg
- **PRE_WORKOUT:** Anavar: 25mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 8 — TRANSITION

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 133mg | 133mg | 133mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 100–150mg | — | 100–150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80mcg, Proviron: 25mg, Anavar: 25mg
- **PRE_WORKOUT:** Anavar: 25mg
- **PM:** Proviron: 25mg
- **BEDTIME:** MK-677: 10mg

#### Week 9 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 133mg | 133mg | 133mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 37.5mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 37.5mg
- **BEDTIME:** MK-677: 10mg

#### Week 10 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 133mg | 133mg | 133mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 37.5mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 37.5mg
- **BEDTIME:** MK-677: 10mg

#### Week 11 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83–100mg | 83–100mg | 83–100mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg
- **BEDTIME:** —

#### Week 12 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83–100mg | 83–100mg | 83–100mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg
- **BEDTIME:** —

#### Week 13 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83–100mg | 83–100mg | 83–100mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg
- **BEDTIME:** —

#### Week 14 — HARDENING

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83–100mg | 83–100mg | 83–100mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg
- **BEDTIME:** —

#### Week 15 — PEAK

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83mg | 83mg | 83mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg + Winstrol: 25mg
- **BEDTIME:** —

#### Week 16 — PEAK

Injectables per pin:

| Compound | Mon | Wed | Fri |
|---|---|---|---|
| Test | 83mg | 83mg | 83mg |
| EQ | 200mg | 200mg | 200mg |
| Deca | — | — | — |
| Tren | 150mg | — | 150mg |

Oral & daily timing:
- **AM:** T3: 50–75mcg, Clen: 80–100mcg, Proviron: 50mg, Winstrol: 25mg
- **PRE_WORKOUT:** Winstrol: 25mg
- **PM:** Proviron: 50mg + Winstrol: 25mg
- **BEDTIME:** —

### Key Transitions _(src: 03-ped-protocol-060226.docx > Key Transitions table)_

| Week | What Changes | Why |
|---|---|---|
| 4 | Superdrol → OFF, Anavar → ON (25+25mg) | Liver recovery; recomp oral |
| 7 | Deca → OFF, Tren → ON, Test 600→400 | Remove water; add hardener |
| 9 | Anavar → OFF, Winstrol → ON (25+25mg) | Hardening oral switch |
| 11 | Test 400→250–300, Proviron 50→100mg, MK → OFF | Final dry-out phase |
| 15 | Winstrol can increase to 75mg (25+25+25) | Peak week polish |

### Front-Load / Taper Notes _(src: 03-ped-protocol-060226.docx > Weekly Injections table + Key Transitions)_
- **test_taper:** Testosterone tapers across cycle: 600mg/wk (Wk2-6, 200mg/pin) -> 400mg/wk (Wk7-10, 133mg/pin) -> 250-300mg/wk (Wk11-16, 83-100mg/pin).
- **deca:** Deca 200mg/wk (Wk2-6, 100mg 2x/wk Mon+Fri) then STOP after Wk6.
- **tren:** Tren E starts Wk7 (OFF before): 100-150mg per pin 2x/wk (Mon+Fri), ramps to 150mg per pin (300mg/wk) Wk9-16.
- **eq:** Equipoise held constant at 600mg/wk (200mg/pin) entire cycle.
- **no_explicit_frontload:** No explicit single-dose front-load/loading-dose protocol stated; ramp is via phase dose escalation. NOT SPECIFIED IN DOC (for any classic front-load).

### Ancillaries / AI / HCG / Caber _(src: 03-ped-protocol-060226.docx > On-Cycle Ancillaries table)_

| Compound | Dose | When | Purpose |
|---|---|---|---|
| Anastrozole (Arimidex) | 0.25–0.5mg EOD | Start Wk 2, titrate to E2 labs | Aromatase inhibitor — controls estrogen from Test/EQ aromatization. Bloods-driven dosing; do NOT crash E2. |
| Aromasin (Exemestane) | 12.5–25mg EOD | Alternative to Anastrozole | Suicidal AI — preferred by some; doesn't rebound on cessation |
| HCG (on-cycle) | 250–500 IU 2x/wk (Mon + Thu, SubQ) | Start Wk 2, run through Wk 16 | Keeps Leydig cells responsive. Maintains testicle size + fertility. Optional but recommended for 16wk+ cycles. |
| Cabergoline (Caber) | 0.25mg E3D (every 3 days) | Start Wk 7 (when Tren begins) | Dopamine agonist. Controls prolactin elevation from Tren + Deca. Prevents prolactin-induced gyno + libido loss. |
| Nolvadex (Tamoxifen) — RESERVE | 20–40mg/day PRN | Only if gyno symptoms appear | SERM. Acute gyno rescue. Have 60 tabs on hand from cycle start — don't wait until you need it. |
| Telmisartan | 20–40mg/day | If BP > 135/85 sustained | ARB blood pressure med. EQ + Tren elevate BP. Coordinate with physician. |
| Bergamot Citrus / Niacin | 1000mg / 500mg daily | Throughout cycle | Lipid management (LDL up, HDL down on cycle). Cardiovascular protection. |

**AI dosing principle (bloods, not symptoms)** _(src: 03-ped-protocol-060226.docx > On-Cycle Ancillaries > AI dosing principle)_
- Do NOT dose AI blindly. Start at 0.25mg E3D. Get E2 + Sensitive E2 panel at Week 4.
- Target E2: 20-40 pg/mL on standard assay, 20-30 on sensitive assay.
- If E2 < 20 with symptoms (joint pain, low libido, depression) -> reduce AI dose.
- If E2 > 40 with symptoms (gyno itch, water retention, BP spike) -> increase AI dose.
- Crashed E2 is WORSE than slightly elevated E2 — never overshoot.

### Bloodwork Schedule _(src: 03-ped-protocol-060226.docx > Bloodwork Schedule table (Baseline/Wk4/Wk8/Wk12))_

| Timing | Cycle Day | Tests |
|---|---|---|
| Baseline | __D+0__ | CBC, CMP, Lipids, Glucose, Thyroid, Test/E2, Prolactin, HbA1c, BP |
| Week 4 | __D+21__ | CBC, CMP, Lipids, Liver (ALT/AST), BP |
| Week 8 | __D+49__ | Full panel |
| Week 12 | __D+77__ | CBC, CMP, Lipids, Thyroid, BP |

### Bloodwork Reference Ranges _(src: 03-ped-protocol-060226.docx > Bloodwork Interpretation Guide (reference ranges table))_

| Marker | Green (normal) | Yellow (review) | Red (intervene) | Action if Red |
|---|---|---|---|---|
| ALT (liver) | 7–56 U/L | 56–100 | >100 | Stop/halve orals. TUDCA 500mg + NAC 1200mg. Re-test in 2 weeks. |
| AST (liver) | 10–40 U/L | 40–80 | >80 | Same as ALT. Note: heavy training elevates AST briefly — fast 12hr + avoid lifting 48hr pre-draw. |
| Hematocrit | 40–50% | 50–54 | >54 | Donate blood (Red Cross / therapeutic phlebotomy). Drop EQ +/- Test 100mg if persists. |
| Hemoglobin | 13.5–17.5 g/dL | 17.5–18.5 | >18.5 | Same as Hct. Donate blood. |
| LDL cholesterol | <100 mg/dL | 100–160 | >160 | Bergamot 1g + cardio +1x/wk. If >190, Crestor 5mg w/ physician. |
| HDL cholesterol | >40 mg/dL | 30–40 | <30 | Niacin 500mg, fish oil up to 4g, drop orals. HDL recovers post-cycle. |
| Total/HDL ratio | <3.5 | 3.5–5.0 | >5.0 | Aggressive lipid mgmt + drop or rotate orals. |
| Triglycerides | <150 mg/dL | 150–200 | >200 | Fish oil 4g, drop sugar, cardio up. Tren can spike trigs. |
| Total Testosterone | On-cycle: supraphysiologic OK (>1500) | — | <300 in PCT/post-cycle | Extend PCT, recheck Wk 30. See endo if Wk 30 still suppressed. |
| Estradiol (E2 Sensitive) | 20–40 pg/mL | 40–70 (asx) / 15–20 | >70 (sx) / <15 | Adjust AI dose. Re-test in 7–10 days. Never crash E2. |
| Prolactin | <15 ng/mL | 15–25 | >25 | Caber 0.5mg 2x/wk for 2 weeks. Re-test. |
| Glucose (fasting) | 70–99 mg/dL | 100–125 | >125 | Drop oral compounds (esp Anavar/Winstrol). Check HbA1c. See physician. |
| HbA1c | <5.7% | 5.7–6.4 (prediabetic) | >6.4 (diabetic range) | Drop carbs, cardio up, drop orals. See physician. |
| BP (resting) | <130/80 | 130–140 / 80–90 | >140/90 sustained | Telmisartan 20–40mg. Drop Tren/EQ if persists. |
| TSH (post-T3) | 0.4–4.5 mIU/L | Suppressed on T3 (normal) | Still suppressed 4+ wk post-T3 | Iodine 150mcg, see endo for recovery protocol. |
| PSA | <2.5 ng/mL (under 50) | 2.5–4.0 | >4.0 | Stop cycle, see urologist. |

### Post-Cycle Therapy (PCT) _(src: 03-ped-protocol-060226.docx > Post-Cycle Therapy (PCT))_
- **Mandatory:** True

| When | What | Why |
|---|---|---|
| Wk 14–16 (final 3 weeks of cycle) | HCG 500–1000 IU 2x/wk (Mon + Thu) | Restart Leydig cell function before SERM hits |
| Wk 17 (1 week after last pin) | Continue HCG, no SERM yet | Long esters still active — SERM would be wasted |
| Wk 18 (2 weeks after last pin) | Stop HCG. Wait 1 more week. | Let HCG-driven E2 clear before starting SERM |
| Wk 19 — start SERM Week 1 | Nolvadex 40mg/day OR Clomid 50mg/day | Restart endogenous LH/FSH |
| Wk 20 — SERM Week 2 | Nolvadex 40mg OR Clomid 50mg | Continue restart |
| Wk 21 — SERM Week 3 | Nolvadex 20mg OR Clomid 25mg | Taper down |
| Wk 22 — SERM Week 4 | Nolvadex 20mg OR Clomid 25mg | Final taper |
| Wk 26 (4 weeks post-PCT) | Full bloodwork: Test, LH, FSH, E2, SHBG | Verify HPTA recovery |
| Wk 30 (8 weeks post-PCT) | Re-test if Wk 26 results were low | Some men need 12+ weeks; PCT extension may help |

**Restart success criteria (Week 26 bloodwork):**
- Total Test back in normal range (typically 400-900 ng/dL depending on lab + age)
- LH + FSH detectable (anything > 1 IU/L is recovery; suppressed = still shut down)
- E2 in 20-40 pg/mL range
- Libido + AM erections returning
- Mood + energy stable

**Failure action:** If Week 26 bloodwork still shows shutdown (Test < 250, LH/FSH < 1) — see an endocrinologist familiar with anabolic recovery. Do NOT just blast another cycle to mask it.

### Injection Sites _(src: 03-ped-protocol-060226.docx > Injection Technique + Safety SOP > Site rotation)_

| Day | Primary Site | Alternate | Notes |
|---|---|---|---|
| MONDAY | Right Glute (upper-outer quadrant) | Right Ventroglute | Largest muscle, highest volume tolerance |
| WEDNESDAY | Left Glute (upper-outer quadrant) | Left Ventroglute | Match Monday side for symmetry |
| FRIDAY | Right Delt (lateral head) | Left Quad (VL) | Smaller volume — split if you're pinning >2mL |

### Needles & Syringes _(src: 03-ped-protocol-060226.docx > Injection Technique + Safety SOP > Needles + syringes)_

| Purpose | Gauge × Length | Why |
|---|---|---|
| Draw from vial | 18g × 1.5" | Fast draw for viscous oils |
| IM glute injection | 23g × 1.5" | Reaches deep muscle on most adult builds |
| IM glute (lean) | 23g × 1.0" — if BF <12% | Shorter needle if you're already lean — avoid IM-too-deep |
| IM delt / quad | 25g × 1.0" | Smaller muscle, thinner needle, less PIP |
| SubQ HCG | 29–31g × 0.5" insulin pin | Belly fat pinch, painless |

### Sides Decision Tree _(src: 03-ped-protocol-060226.docx > Sides Decision Tree table)_

| Symptom | Mild (monitor) | Moderate (modify) | Severe (stop / see doctor) |
|---|---|---|---|
| Gyno: itch under nipple | Track daily, no action | Start Nolva 20mg/day. Check E2 + prolactin within 7 days. | Visible lump + tender + leaking → Nolva 40mg, see endo within 72hr |
| Tren cough (post-injection) | <30s cough, no other sx | Inject slower, rotate sites, warm oil pre-inject | Persistent cough, chest tightness, wheezing → ER, possible PE |
| Insomnia (Tren / MK-677) | Mild trouble falling asleep | Move Tren pin to AM only. Mag glycinate 400mg + glycine 3g pre-bed. Drop MK-677 if needed. | <3hr sleep for 5+ nights → drop Tren 50mg or switch to Tren ACE; if persistent, drop Tren entirely |
| Night sweats | Light sweating, OK | Cool room (65°F), moisture-wick sheets, sleep half-naked | Soaking sheets nightly = drop Tren 100mg or stop |
| BP elevation | <135/85 — monitor weekly | 135–150 / 85–95: Telmisartan 20–40mg, cardio +1x/wk, drop sodium, bergamot citrus | >150/100 sustained → stop Tren + EQ, see physician immediately |
| Resting HR | <90 bpm — monitor | 90–105: drop Clen, more potassium (lite salt), taurine 3g/day | >110 sustained → stop Clen, EKG |
| Tren paranoia / aggression | Mild mood shift, irritability | Talk to partner/coach, drop Tren 50mg, cardio for cortisol | Rage episodes you can't control → STOP Tren immediately, see physician + therapist |
| EQ anxiety | Mild edge, manageable | Drop EQ 100mg/wk, ashwagandha 600mg, breathwork | Panic attacks, derealization → drop EQ entirely |
| Clen tremor | Hand shake, normal | Taurine 3g, potassium up, drop Clen 20mcg | Severe tremor + palpitations → stop Clen, EKG |
| T3 fatigue / thyroid | Mild on T3 OK | Hold T3 at current dose, don't go above 75mcg | Crashing energy + cold post-cycle → see endo for thyroid panel, possible recovery support |
| Acne (back/shoulder) | Mild breakout | Benzoyl peroxide 5%, salicylic body wash, shower post-cardio | Cystic + spreading → accutane consult, drop oral compound |
| Hair shedding (DHT-driven) | Few extra in drain | Topical finasteride/minoxidil (NOT oral fin on cycle — kills libido) | Aggressive shedding → drop Winstrol/Anavar/Proviron, see dermatologist |
| Libido / erection issues | Mild dip | Check E2 (likely crashed or too high). Adjust AI. Consider Cialis 5mg daily. | No AM erections for 14+ days → check E2 + prolactin + Test. Adjust ancillaries. |
| Liver: yellow eyes, dark urine, nausea | — | Stop ALL orals immediately. NAC 1200mg + TUDCA 500mg. Bloods within 48hr. | Yellowing + RUQ pain → ER. Liver damage. |

---

## 3. COACH PIVOTS / CONDITIONAL RULES

### Nutrition Critical Rules _(src: 01-nutrition-plan.docx > Critical Rules (numbered list))_
- HIT YOUR PROTEIN EVERY DAY. 250g minimum. Non-negotiable. Protects muscle.
- PSMF Monday is not optional. Anchor of the deficit. Do it.
- Refeeds are CLEAN CARBS. Not pizza. Not ice cream. Rice, potato, oats.
- Weigh yourself daily, track weekly average. Don't panic at daily fluctuations.
- Stall 2+ weeks: drop rest day calories by 100, add 10 min cardio.
- Losing >4 lbs/week: add 100 cal to training days. Preserve muscle.
- SLEEP IS CRITICAL. Fix sleep or progress stalls.
- HYDRATION: 1 gallon water minimum. More on training days. Electrolytes daily.
- Track everything. MyFitnessPal, Cronometer, or paper. What gets measured gets managed.

### Conditional Rules (if X → do Y)

| Trigger | Action | Source |
|---|---|---|
| Stall 2+ weeks | drop rest day calories by 100, add 10 min cardio | 01-nutrition-plan.docx > Critical Rules #5 |
| Losing >4 lbs/week | add 100 cal to training days. Preserve muscle. | 01-nutrition-plan.docx > Critical Rules #6 |
| Losing >4 lbs/wk (weekly adjust) | increase calories | 01-nutrition-plan.docx > Weekly Calorie & Macro Targets note |
| Losing <2 lbs/wk | decrease calories | 01-nutrition-plan.docx > Weekly Calorie & Macro Targets note |
| Stall 2+ weeks (phase note) | drop rest day calories by 100, add 10 min cardio | 01-nutrition-plan.docx > Critical Rules |

### Refeed / Diet Break _(src: 01-nutrition-plan.docx > REFEED DAY + Meal Timing Strategy + Critical Rules)_
- **Start:** Sunday refeed begins Week 5
- **Purpose:** Reset leptin, refill glycogen, psychological break. Keep fat LOW. Carbs from clean sources only.
- Refeeds are CLEAN CARBS. Not pizza. Not ice cream. Rice, potato, oats.
- Front-load carbs earlier in day
- Keep fat very low (<40g total)
- No junk food 'cheat' — this is strategic, not emotional

### Cardio Escalation _(src: 02-complete-protocol.docx > Cardio Protocol: Palumbo LISS Method (DAY/TYPE/DURATION/TIMING/INTENSITY table))_
- **Rule:** Heart rate UNDER 120 BPM at all times (Palumbo LISS method). Higher = muscle breakdown on keto.

| Day | Type | Duration | Timing | Intensity |
|---|---|---|---|---|
| MONDAY | LISS — Incline Walk | 30–45 min | Fasted AM (after T3/Clen) | HR 100–115 |
| TUESDAY | LISS — Post-Weights | 20 min | After training | HR 100–115 |
| WEDNESDAY | LISS — Incline Walk | 30–45 min | AM or PM | HR 100–115 |
| THURSDAY | LISS — Post-Weights | 20 min | After training | HR 100–115 |
| FRIDAY | LISS — Incline Walk | 30–45 min | AM or PM | HR 100–115 |
| SATURDAY | LISS — Post-Weights | 20 min | After training | HR 100–115 |
| SUNDAY | Kettlebell Flow | 20–30 min | Any time | HR 110–120 |

**Stall cardio bumps:**
- Stall 2+ weeks: add 10 min cardio (01-nutrition-plan Critical Rules)
- Stall (>10 days): add 2nd PSMF day OR audit food tracking (02-complete-protocol Troubleshooting)

### Peak-Week Manipulation _(src: 03-ped-protocol-060226.docx > Week 15 marker + Key Transitions; 01-nutrition-plan.docx > PHASE 4)_
- PEAK WEEK (Wk15) — Winstrol can go to 75mg (add 25mg PM dose).
- Test drops 400->250-300mg/wk in Wk11 (final dry-out phase); MK-677 stops Wk11.
- Nutrition Phase 4 (Wk13-16): lowest baseline, strategic carb loads for final look.
- **Explicit carb/water manipulation:** NOT SPECIFIED IN DOC — no explicit carb-depletion/water-load/sodium-manipulation peak-week protocol is written in the docs; 'strategic carb loads for final look' is the only peak nutrition guidance.

### Troubleshooting _(src: 02-complete-protocol.docx > Troubleshooting (ISSUE/LIKELY CAUSE/FIX table))_

| Issue | Likely Cause | Fix |
|---|---|---|
| Stall (>10 days) | Metabolic adaptation or tracking error | Add 2nd PSMF day OR audit food tracking |
| Low energy | Electrolytes (90% of keto issues) | Add 1–2g sodium, check Mg/K |
| Strength dropping | Deficit too aggressive | Add 200 cal on training days |
| Not hungry on PSMF | Ketones suppressing appetite | This is good — eat protein anyway |
| Muscle cramps | Magnesium/potassium low | Add 400mg Mg, more lite salt |
| Sleep issues | Cortisol, caffeine, or Clen | No Clen after 10am, Mg at bed |
| Bloating on refeed | Too much carbs too fast | Spread carbs over more meals |

---

## 4. GAPS / NOT SPECIFIED IN DOC

- Week 1 has NO PED dosing table in either PED doc — cycle dosing begins Week 2 (Kickstart). Week 1 PED doses = NOT SPECIFIED IN DOC.
- Week 1 nutrition: weekly curve (01-nutrition-plan) gives Week 1 macros, but PED Week 1 is undefined. Possible intentional ramp-in / baseline-bloodwork week (Baseline panel = D+0).
- No explicit single-dose front-load / loading-dose protocol — dose ramp is via phase escalation only.
- No explicit peak-week carb-depletion / water-load / sodium-manipulation protocol — only 'strategic carb loads for final look' (nutrition Phase 4).
- AI (Anastrozole/Aromasin) and HCG doses appear ONLY in the On-Cycle Ancillaries table, not in the per-week timeline checklists — they are not tracked week-by-week in the dose checklists.
- Two nutrition systems exist and DISAGREE: 01-nutrition-plan (PSMF 700-800 cal, ~1478-1650 cal/day avg) vs 02-complete-protocol (PSMF 1000 cal, ~1860 cal/day avg, DeLauer/Palumbo hybrid). Both extracted; app must choose canonical source.
- Refeed protein differs between sources: 200g (01-nutrition-plan) vs 225g (02-complete-protocol).
- Tren weekly total: phase table (idx4) says 'OFF->300mg' and 100-150mg per pin; per-week timeline shows Wk7-8 = 100-150mg/pin (2 pins Mon+Fri) and Wk9-16 = 150mg/pin. Wk7-8 exact dose (100 vs 150) left as range in doc.
- Test per-pin in Wk11-16 timeline shows '83-100mg' (Wk11-14) then '83mg' (Wk15-16); weekly total stated as 250-300mg — exact taper point within the range not pinned per week.
- Cardio intensity for fat-loss escalation beyond the fixed weekly LISS schedule is not quantified week-by-week (only the stall-bump rules).
- PSMF second-day add (troubleshooting fix) has no defined macros — uses standard PSMF day macros by implication.
- Glossary, injection aseptic-technique steps, PIP management, and red-flag lists are captured in nutrition/PED docs as prose; included as reference but not structured per-compound.

