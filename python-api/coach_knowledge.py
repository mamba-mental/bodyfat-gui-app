"""
Ap³xFit AI Coach Knowledge Base
Distilled from: ~/.claude/skills/fat-loss-coach/ (SKILL.md + reference files)
Protocol data traces to Lyle McDonald, Dave Palumbo, Frank Zane, Vince Gironda, Thomas DeLauer.
Numbers are distilled ranges — not invented. Original sources in the skill's reference files.
DO NOT edit macro targets here without updating the calc engine (PRIME_Calculations.py) to match.
"""

# ---------------------------------------------------------------------------
# 1. PROTOCOL SELECTION
#    Keys: (goal_key, bf_category) → recommended protocol + notes
#    bf_category: 1=lean (<15% M / <24% F), 2=moderate (15-25% M / 24-35% F),
#                 3=higher (>25% M / >35% F)
#    Lyle McDonald classification — used for protocol intensity gating.
# ---------------------------------------------------------------------------

BF_CATEGORIES = {
    "male": {1: "<15%", 2: "15–25%", 3: ">25%"},
    "female": {1: "<24%", 2: "24–35%", 3: ">35%"},
}

PROTOCOL_SELECTION = {
    # (goal, bf_category): {"primary": ..., "alternative": ..., "notes": ...}
    ("max_fat_loss_muscle_preserve", 1): {
        "primary": "Palumbo Keto",
        "alternative": "Standard Keto",
        "notes": "PSMF is risky at Cat-1; cap at 11-12 days max if used. Avoid extended fasting.",
    },
    ("max_fat_loss_muscle_preserve", 2): {
        "primary": "PSMF (short-term cycles)",
        "alternative": "Palumbo Keto",
        "notes": "PSMF 2–6 weeks; 1 free meal + weekly structured refeed. Cycle off before metabolic adaptation.",
    },
    ("max_fat_loss_muscle_preserve", 3): {
        "primary": "PSMF (extended, with refeeds)",
        "alternative": "Palumbo Keto",
        "notes": "Cat-3 tolerates PSMF well; 4–12+ weeks viable with 2 free meals/week.",
    },
    ("sustainable_fat_loss", 1): {
        "primary": "Carb Cycling",
        "alternative": "Mediterranean Keto",
        "notes": "Avoid aggressive deficits at Cat-1; prioritise compliance over speed.",
    },
    ("sustainable_fat_loss", 2): {
        "primary": "Standard Keto or Carb Cycling",
        "alternative": "Mediterranean Keto",
        "notes": "Most protocols appropriate. Match lifestyle (travel→flexible keto; social→carb cycling).",
    },
    ("sustainable_fat_loss", 3): {
        "primary": "Standard Keto",
        "alternative": "Carb Cycling",
        "notes": "Higher BF = higher hormonal benefit from ketosis. Can run longer durations.",
    },
    ("competition_prep", 1): {
        "primary": "Palumbo Keto + Peak Week",
        "alternative": "CKD (Cyclical Keto)",
        "notes": "Zane carb-cycling variant also proven for symmetry-focused prep.",
    },
    ("competition_prep", 2): {
        "primary": "Palumbo Keto + Peak Week",
        "alternative": "CKD",
        "notes": "Standard NPC/IFBB prep default. 6 meals/day, cheat meal weekly from week 2.",
    },
    ("competition_prep", 3): {
        "primary": "Palumbo Keto → peak week",
        "alternative": "PSMF → Palumbo transition",
        "notes": "Start PSMF to drop bulk of fat, transition to Palumbo in final 8–12 weeks.",
    },
    ("performance_plus_fat_loss", 1): {
        "primary": "Cyclical Keto (CKD)",
        "alternative": "Carb Cycling",
        "notes": "Must be fat-adapted (≥4 weeks keto) before CKD. Refeed 8–10g carbs/kg LBM.",
    },
    ("performance_plus_fat_loss", 2): {
        "primary": "CKD or Carb Cycling",
        "alternative": "Carb Cycling",
        "notes": "CKD for strength athletes; carb cycling for mixed training styles.",
    },
    ("performance_plus_fat_loss", 3): {
        "primary": "Carb Cycling",
        "alternative": "CKD",
        "notes": "Higher carb tolerance at Cat-3 makes carb cycling highly effective.",
    },
    ("metabolic_reset", 2): {
        "primary": "Water Fasting (strategic, <72h)",
        "alternative": "Extended IF (18–20h)",
        "notes": "PRIME: flag medical supervision. Do not recommend >48h without explicit medical clearance.",
    },
    ("metabolic_reset", 3): {
        "primary": "Water Fasting (strategic, <72h)",
        "alternative": "PSMF diet break",
        "notes": "Electrolytes mandatory. Never cold-turkey from high-calorie diet.",
    },
    ("long_term_health", 2): {
        "primary": "Mediterranean Keto + IF",
        "alternative": "Carb Cycling",
        "notes": "SKMD study: 12 weeks → avg 31 lb loss, 100% metabolic syndrome reversal.",
    },
    ("muscle_gain_minimal_fat", 2): {
        "primary": "Carb Cycling (surplus on training days)",
        "alternative": "CKD",
        "notes": "High days 2.0–3.0 g carbs/lb; fat at 15–20% of calories on high days.",
    },
}

# By lifestyle factor → best fits
PROTOCOL_BY_LIFESTYLE = {
    "high_stress_job": {
        "best": ["Carb Cycling", "Standard Keto"],
        "avoid": ["PSMF", "Extended Fasting"],
        "reason": "Cortisol + PSMF = muscle loss spiral. Stress hormones tank keto performance.",
    },
    "frequent_travel": {
        "best": ["IF + Flexible Keto"],
        "avoid": ["Strict meal timing protocols"],
        "reason": "Airport / restaurant keto is executable; 6-meal Palumbo is not.",
    },
    "intense_training_5plus_days": {
        "best": ["CKD", "Carb Cycling"],
        "avoid": ["Standard Keto", "PSMF"],
        "reason": "Glycogen demand requires structured refeeds.",
    },
    "limited_food_prep": {
        "best": ["Palumbo Keto"],
        "avoid": ["Complex carb cycling"],
        "reason": "Palumbo uses simple foods (eggs, chicken, fish, nuts) repeatable daily.",
    },
    "social_eating": {
        "best": ["Carb Cycling (strategic high days)"],
        "avoid": ["Strict Keto", "PSMF"],
        "reason": "Bank high-carb day on social events; PSMF has zero flexibility.",
    },
}


# ---------------------------------------------------------------------------
# 2. MACRO RULES
#    All weights in POUNDS. Protein on LEAN mass for PSMF (critical gotcha).
# ---------------------------------------------------------------------------

MACRO_RULES = {
    "protein": {
        "maintenance_g_per_lb_total": (0.8, 1.0),
        "fat_loss_moderate_g_per_lb_total": (1.0, 1.2),
        "fat_loss_aggressive_g_per_lb_total": (1.2, 1.5),
        # PSMF: computed on LEAN mass, NOT total bodyweight
        "psmf_g_per_lb_LEAN_mass": {
            "cat1": (1.25, 1.5),
            "cat2": (1.0, 1.25),
            "cat3": (0.8, 1.0),
        },
        "muscle_gain_g_per_lb_total": (1.0, 1.2),
        "note": (
            "PSMF protein targets lean mass only. Example: 200 lb male @ 25% BF "
            "= 150 lb lean mass → Cat-2 → 150–188g protein daily."
        ),
        "prime_minimum_g": 237,  # Council-locked HARD minimum for PRIME's protocol
    },
    "fat_minimums": {
        "men_g_per_lb": 0.3,       # ~50g for 170 lb male
        "women_g_per_lb": 0.4,     # ~60g for 150 lb female
        "keto_protocols_g_per_lb": (0.5, 1.0),
        "note": "Fat below minimum crashes testosterone and hormone cascades.",
    },
    "carbs_by_protocol": {
        "standard_keto_net_g": (20, 50),
        "ckd_keto_days_net_g": "<30",
        "ckd_refeed_g_per_kg_lean": (8, 10),       # ≈ 4.5g per lb lean
        "carb_cycling_low_g_per_lb": (0.5, 1.0),
        "carb_cycling_moderate_g_per_lb": (1.0, 1.5),
        "carb_cycling_high_g_per_lb": (2.0, 3.0),
        "psmf_max_g": 20,                           # vegetables only
        "palumbo_keto_max_g": 30,                   # indirect sources only
        "mediterranean_keto_max_net_g": 30,
    },
    "calorie_floor": 1200,  # PRIME engine HARD floor (PSMF); never breach
    "palumbo_meal_frequency": 6,  # meals every 2.5–3h
}


# ---------------------------------------------------------------------------
# 3. ELECTROLYTE PROTOCOL
#    Deficiency mimics depression/fatigue. Rule out before protocol changes.
# ---------------------------------------------------------------------------

ELECTROLYTE_PROTOCOL = {
    "daily_targets_mg": {
        "standard_keto": {"sodium": (3000, 5000), "potassium": (3000, 4000), "magnesium": (300, 500)},
        "extended_fasting": {"sodium": (5000, 7000), "potassium": (1000, 3500), "magnesium": (300, 500)},
        "psmf": {"sodium": (3000, 5000), "potassium": (3000, 4000), "magnesium": (400, 500)},
    },
    "deficiency_symptom_map": {
        "headache": "Sodium — add 1–2g salt to water immediately",
        "fatigue_brain_fog": "Sodium (primary) — full electrolyte protocol",
        "muscle_cramps": "Magnesium or Potassium — 300–500mg Mg + 3,000mg K",
        "heart_palpitations": "Potassium or Magnesium — increase both; see doctor if persistent",
        "dizziness_on_standing": "Sodium — orthostatic hypotension signal",
        "insomnia": "Magnesium — 300–400mg glycinate or citrate before bed",
        "irritability": "Blood sugar + electrolytes — will pass 3–5 days into adaptation",
        "nausea": "Fat adaptation — temporarily reduce dietary fat intake",
    },
    "quick_fix_ketoade": (
        "1 liter water + ½ tsp salt (sodium) + ¼ tsp lite salt (potassium) "
        "+ magnesium supplement (300mg citrate/glycinate)"
    ),
    "prime_rule": (
        "ALWAYS check electrolyte status before attributing low energy or mood dip "
        "to overtraining or mental health. 90% of keto complaints are electrolyte issues."
    ),
}


# ---------------------------------------------------------------------------
# 4. TRAINING MODIFICATIONS BY DEFICIT
#    Core principle: maintain INTENSITY (weight on bar), reduce VOLUME.
# ---------------------------------------------------------------------------

TRAINING_MOD_BY_DEFICIT = {
    "moderate_deficit": {
        "volume_reduction_pct": (20, 30),
        "intensity": "Maintain weight on bar",
        "cardio": "Low-to-moderate intensity; no HR ceiling issue",
        "frequency": "No change needed",
    },
    "aggressive_deficit": {
        "volume_reduction_pct": (40, 50),
        "intensity": "Maintain weight on bar",
        "cardio": "Low intensity only — walking, incline treadmill",
        "frequency": "Reduce 1 session if recovery impaired",
    },
    "psmf": {
        "volume_reduction_pct": (50, 66),
        "intensity": "Maintain weight on bar (compound movements only)",
        "cardio": "Walking only — NO HIIT, no sprint work",
        "frequency": "2 sessions/week maximum, 10–20 min per session",
        "note": "PSMF training: signal muscle retention, not hypertrophy stimulus.",
    },
    "water_fasting": {
        "volume_reduction_pct": 100,
        "intensity": "Rest or very light movement",
        "cardio": "Walking only (16–24h: light-moderate OK; 24h+: walking only)",
        "frequency": "Rest recommended at 72h+",
    },
    "palumbo_cardio_rule": {
        "max_hr_bpm": 120,
        "rationale": (
            "On keto, carbohydrates are unavailable as fuel above ~120 BPM. "
            "The body then converts PROTEIN (muscle) to glucose via gluconeogenesis. "
            "Stay under 120 BPM or you cannibalize muscle on a fat-loss protocol."
        ),
        "approved_cardio": ["Walking", "Incline treadmill (low speed)", "Stationary bike (easy pace)"],
    },
    "zane_split": {
        "structure": "3 days on, 1 day off",
        "days": {
            "Day 1 (Pull)": "Back, Biceps, Forearms, Abs",
            "Day 2 (Legs)": "Thighs, Calves, Abs",
            "Day 3 (Push)": "Chest, Shoulders, Triceps, Abs",
            "Day 4": "Rest",
        },
        "volume_per_muscle": "3–4 exercises × 3 sets × 8–12 reps",
        "method": "Pyramid (increasing weight, decreasing reps)",
        "philosophy": "Quality of contraction over quantity of weight",
    },
    "sleep_requirement": "7–9 hours — non-negotiable; cortisol from poor sleep blocks fat loss",
}


# ---------------------------------------------------------------------------
# 5. TROUBLESHOOTING
#    Symptom → causes (ranked) + fixes
# ---------------------------------------------------------------------------

TROUBLESHOOTING = {
    "fat_loss_stalled": [
        {
            "cause": "Recalculate TDEE — weight has changed",
            "fix": "Re-run engine with today's verified weight. Do not use stale inputs.",
            "priority": 1,
        },
        {
            "cause": "Tracking accuracy — hidden calories",
            "fix": "Food scale audit. Serving size errors compound to 200–400 cal/day.",
            "priority": 2,
        },
        {
            "cause": "Sleep/stress — cortisol blocks fat oxidation",
            "fix": "Address sleep first; 7–9h mandatory. Add 300–400mg magnesium before bed.",
            "priority": 3,
        },
        {
            "cause": "Metabolic adaptation",
            "fix": "Diet break: 1–2 weeks at TDEE (MATADOR protocol). Resets leptin.",
            "priority": 4,
        },
        {
            "cause": "Low leptin from extended deficit",
            "fix": "Single high-carb refeed day (full CKD-style: 8–10g carbs/kg lean mass).",
            "priority": 5,
        },
    ],
    "muscle_loss_concern": [
        {
            "cause": "Protein below target",
            "fix": "Verify DAILY protein hits — 1.0–1.5g/lb lean mass on deficit.",
            "priority": 1,
        },
        {
            "cause": "Training intensity dropped",
            "fix": "Maintain weight on bar. Volume can drop; weight should not.",
            "priority": 2,
        },
        {
            "cause": "Deficit too severe",
            "fix": "Moderate to sustainable. Check against 1,200-cal PSMF floor.",
            "priority": 3,
        },
        {
            "cause": "Cardio exceeding 120 BPM on keto (Palumbo rule)",
            "fix": "Drop all cardio below 120 BPM. Use HR monitor.",
            "priority": 4,
        },
    ],
    "energy_performance_issues": [
        {
            "cause": "Electrolyte deficiency (most likely)",
            "fix": "Ketoade immediately. 90% of keto complaints are electrolytes.",
            "priority": 1,
        },
        {
            "cause": "Not fat-adapted yet",
            "fix": "Allow 3–6 weeks for full fat adaptation. Do not judge protocol before week 3.",
            "priority": 2,
        },
        {
            "cause": "Targeted carbs needed for intense sessions",
            "fix": "15–30g fast carbs pre-workout (white rice, dextrose) — targeted approach.",
            "priority": 3,
        },
        {
            "cause": "Extreme deficit tanking performance",
            "fix": "Audit total calories — confirm above 1,200 floor. Moderate deficit.",
            "priority": 4,
        },
    ],
    "digestive_issues": [
        {
            "cause": "Too much fat too fast",
            "fix": "Increase dietary fat over 1–2 weeks, not overnight.",
            "priority": 1,
        },
        {
            "cause": "Fiber transition",
            "fix": "Add vegetables gradually. No sudden high-fiber days.",
            "priority": 2,
        },
        {
            "cause": "MCT oil overload",
            "fix": "Start with 1 tsp. Increase slowly over 2–3 weeks.",
            "priority": 3,
        },
        {
            "cause": "Artificial sweeteners",
            "fix": "Eliminate and test individually. Maltitol and sorbitol are frequent culprits.",
            "priority": 4,
        },
    ],
    "keto_flu": {
        "duration": "Days 3–7 (peak); resolves by week 2",
        "fix": "Electrolyte protocol — almost always sodium deficiency. Not a reason to quit.",
        "note": "Keto flu is electrolyte withdrawal, not carb withdrawal per se.",
    },
    "general_principle": (
        "When in doubt: more protein, add electrolytes, extend timeline rather than "
        "increase aggression. Compliance beats optimization every time."
    ),
}


# ---------------------------------------------------------------------------
# 6. SAFETY CONTRAINDICATIONS
# ---------------------------------------------------------------------------

SAFETY_CONTRAINDICATIONS = {
    "ketogenic_diet_absolute_no": [
        "Type 1 Diabetes (without close medical supervision)",
        "SGLT2 inhibitor medications (ketoacidosis risk)",
        "Fatty acid oxidation disorders",
        "Pyruvate carboxylase deficiency",
        "Porphyria",
        "Primary carnitine deficiency",
    ],
    "extended_fasting_48h_plus_absolute_no": [
        "Type 1 Diabetes",
        "Pregnancy or breastfeeding",
        "Under 18 or over 75 years old",
        "Active eating disorder",
        "BMI under 18.5",
        "Cardiac or kidney disease",
        "Medications requiring food",
        "History of fainting/syncope",
    ],
    "psmf_absolute_no": [
        "All extended fasting contraindications apply",
        "Category 1 individuals beyond 11–12 days without structured refeed",
        "Without required supplements (fish oil, multivitamin, electrolytes, calcium)",
    ],
    "requires_medical_supervision": [
        "Type 2 Diabetes on medication (dose adjustments needed as carbs drop)",
        "Extended fasting over 5 days",
        "PSMF for Category 1 individuals",
        "History of eating disorders",
        "Multiple concurrent medications",
        "Cardiovascular conditions",
        "Kidney or liver disease",
        "Pancreatitis",
    ],
    "psmf_max_duration_by_category": {
        "cat1": "11–12 days maximum (then structured diet break)",
        "cat2": "2–6 weeks (weekly free meal + 5-hour structured refeed)",
        "cat3": "4–12+ weeks (2 free meals/week; diet break every 6–12 wk)",
    },
    "water_fasting_stop_signs": [
        "Severe dizziness",
        "Heart palpitations",
        "Fainting or near-fainting",
        "Extreme weakness",
        "Persistent nausea",
        "Chest pain",
        "Confusion",
    ],
}


# ---------------------------------------------------------------------------
# 7. LEGENDS — 5 signature methods (1-2 lines each, distilled)
# ---------------------------------------------------------------------------

LEGENDS = {
    "frank_zane": {
        "signature": "Aesthetic precision via carb cycling (3 low days → 1 refeed equal to protein grams). "
                     "3-on/1-off Pull/Legs/Push split, 3–4 exercises × 3 sets, pyramid style. "
                     "Never bulked beyond 5% of stage weight.",
        "macro_snapshot": "Pre-contest: 1.0–1.2g protein/lb, <100g carbs/day, ~25% fat; 1,500–2,000 kcal.",
        "key_quote": "Numbers are an abstraction. Your body doesn't know absolute weight—only how heavy it feels.",
        "application": "Use for symmetry-focused cuts; carb-cycle with 3 low days → 1 refeed.",
    },
    "arnold_schwarzenegger": {
        "signature": "Volume-first mass building: 5–6 meals/day, 1.0–1.5g protein/lb, 40–50% carbs. "
                     "Antagonist supersets (chest/back in same session). Mental visualization.",
        "macro_snapshot": "Off-season 3,000–5,000 kcal; contest: deficit with protein priority maintained.",
        "key_quote": "Everything I ate was geared first and foremost to how much protein it had.",
        "application": "Reference for muscle-building phases; post-show rebound or off-season architecture.",
    },
    "vince_gironda": {
        "signature": "Steak & eggs (zero-carb 5 days, carb refeed day 6) or 36 raw fertile eggs/day "
                     "(6-week hormone precursor protocol). 8×8 training (30s rest → 15s). "
                     "Zero squat rack; sissy/hack squat for quads. Workouts <45 min.",
        "macro_snapshot": "Steak & eggs: 0 carbs Mon–Fri; carb refeed Saturday (spaghetti, original).",
        "key_quote": "Bodybuilding is 85% nutrition.",
        "application": "8×8 training for metabolic effect + simultaneous fat loss; steak-and-eggs for "
                       "rapid zero-carb phases.",
    },
    "dave_palumbo": {
        "signature": "Default NPC/IFBB competition prep: 60% protein / 30% fat / 10% carbs. "
                     "6 meals every 2.5–3h. Cardio STRICTLY under 120 BPM on keto. "
                     "1 weekly cheat meal (days 14+), max 3,000 kcal, last meal of day.",
        "macro_snapshot": "200 lb male: ~300g P / 115g F / <30g C = ~2,400 kcal.",
        "key_quote": "Keep sodium constant — only adding sodium near show causes water retention.",
        "application": "Primary competition prep protocol. Use for PRIME's 16-week cut.",
    },
    "thomas_delauer": {
        "signature": "Science-based metabolic flexibility: keto 2:1 fat:protein ratio, 20–30g net carbs. "
                     "Emphasises circadian meal timing (high-fat AM, lean PM). "
                     "IF 18h 2–3×/week; always break fast with 4–8oz lean protein.",
        "macro_snapshot": "Fat:protein 2:1 by grams; ≤30g net carbs; protein 0.5–0.6g/lb for adapted athletes.",
        "key_quote": "Metabolic flexibility over strict protocol adherence.",
        "application": "Long-term sustainable keto + IF; inflammation reduction focus; "
                       "preferred sweeteners: allulose > monk fruit > stevia.",
    },
}


# ---------------------------------------------------------------------------
# 8. PRIME GUARDRAILS (INVIOLABLE)
#    PRIME-specific coaching constraints — must apply in every response.
# ---------------------------------------------------------------------------

PRIME_GUARDRAILS = {
    "no_shame_framing": {
        "rule": "NEVER shame for off-plan days. ADHD + OCD + MDD = shame spirals compound executive "
                "dysfunction and make adherence worse, not better.",
        "reframe": "Frame deviations as data: 'That's a data point, not a verdict.' "
                   "Reset to protocol without commentary or moral weight.",
        "reason": "Shame → guilt loop → avoidance → worse outcomes. Data framing = actionable.",
    },
    "weight_units": {
        "rule": "ALL macro tables, TDEE calculations, and progress tracking in POUNDS (lbs). "
                "Not kg. Default output = lbs unless user explicitly requests kg.",
        "applies_to": "Protein targets, body-weight references, progress deltas, all calculations.",
    },
    "protein_on_lean_mass_for_psmf": {
        "rule": "PSMF protein target = 1.0–1.5g per lb of LEAN mass, NOT total bodyweight.",
        "example": "271 lb @ 37.8% BF → lean mass ≈ 169 lb → PSMF protein = 169–253g (Cat-3: 135–169g).",
        "why": "Using total weight on PSMF over-estimates protein → too many calories → PSMF ineffective.",
    },
    "electrolytes_before_mental_health": {
        "rule": "Before attributing low energy, brain fog, or mood dip to mental health or overtraining, "
                "ALWAYS rule out electrolyte deficiency first.",
        "protocol": "Ketoade check: ½ tsp salt + ¼ tsp lite salt in 1L water + magnesium. "
                    "90% of keto-related complaints resolve with electrolytes.",
    },
    "verify_weight_before_macros": {
        "rule": "NEVER compute macro targets or TDEE without verified current weight. "
                "PRIME's weight changes actively during recomp; using stale weight = 200+ cal error.",
        "action": "Always ask for or read today's verified weight before any calculation.",
    },
    "medical_supervision_fasting": {
        "rule": "ALWAYS flag medical supervision recommendation for extended fasting (48h+) given "
                "PRIME's medication history and comorbid conditions (ADHD, OCD, MDD, GAD).",
        "medications_note": "Multiple psychotropic medications interact with fasting metabolically; "
                            "electrolyte management becomes critical.",
    },
    "goal_deadline_is_fixed": {
        "rule": "The deadline (16 weeks) and stage target (217 lb @ 13% BF) are FIXED. "
                "Manipulate carbs, calories, and cardio to hit the target — do not suggest moving the date. "
                "Only surface a constraint flag when the required push exceeds safe limits.",
        "constraint_flags": [
            "required_deficit > max_safe_deficit (Alpert fat-ox cap, PED-widened)",
            "cardio ceiling approached (~75 min/day max)",
            "1,200 kcal PSMF floor would be breached",
            "protein below 237g minimum",
        ],
        "when_to_flag": "Emit status: on_track / pushing_limits / maxed_out + residual_gap. "
                        "Never silently fabricate a rosy catch-up.",
    },
    "honest_not_optimistic": {
        "rule": "Show real options when behind: extend timeline OR accept a higher end-BF "
                "OR a feasibility-capped harder push. Do not fabricate rosy catch-up paths.",
        "framing": "Honesty = the constraint is flagged, not hidden. Real coaches tell clients the truth.",
    },
    "prime_goal": {
        "goal_weight_lb": 217,
        "goal_bf_pct": 13,
        "goal_lean_lb": 189,  # twice-validated proven lean ceiling (competition history)
        "start_weight_lb": 271,  # approximate at cycle start (verify at each weigh-in)
        "start_bf_pct": 37.8,
        "timeline_weeks": 16,
        "protocol": "Palumbo Keto as primary; PSMF cycling as secondary (Cat-3 appropriate)",
        "note": "189 lb lean is PRIME's PROVEN competition ceiling — not a build target. "
                "This is muscle-memory regain to a held physique, not net-new lean mass.",
    },
}


# ---------------------------------------------------------------------------
# 9. COACH SYSTEM PROMPT
#    Ready-to-inject string for the AI Coach's LLM system prompt.
#    Prepend to any coaching narrative / check-in / course-correction call.
# ---------------------------------------------------------------------------

COACH_SYSTEM_PROMPT = """You are the Ap³xFit AI Coach — an expert fat-loss and body-recomposition coach \
built on the methodologies of Frank Zane, Arnold Schwarzenegger, Vince Gironda, Dave Palumbo, and Thomas DeLauer, \
integrated with modern evidence-based nutrition science (Lyle McDonald, MATADOR protocol, Forbes p-ratio model).

## YOUR ROLE
You receive structured data from the Ap³xFit engine (current weight, BF%, projected vs actual trajectory, \
macro targets, deficit level, protocol in use, PED phase, and any constraint flags) and your job is to turn \
that data into COACHING JUDGMENT — specific, actionable, honest guidance — not just a number summary.

## THE GOAL (FIXED — DO NOT MOVE THE DATE)
PRIME's deadline and stage target are FIXED:
- Target: 217 lb @ 13% body fat (189 lb lean mass — twice-validated competition ceiling)
- Timeline: 16 weeks from cycle start
- Manipulate carbs, calories, and cardio to hit the target. The date does not move.
- If the required push exceeds safe limits, SURFACE THE CONSTRAINT (on_track / pushing_limits / maxed_out) \
and present the real options honestly. Never fabricate a rosy catch-up.

## PROTOCOL IN USE: Palumbo Keto (primary) / PSMF cycles (secondary)
- Dave Palumbo keto: 6 meals/day, 60% P / 30% F / 10% C; cardio STRICTLY under 120 BPM
- Protein minimum: 237g/day (absolute floor on any protocol)
- Calorie floor: 1,200 kcal (hard limit — never breach on PSMF days)
- Electrolytes: sodium 3,000–5,000mg + potassium 3,000–4,000mg + magnesium 300–500mg daily

## MACRO CALCULATION RULES
- All weight in POUNDS (lbs) — never kg unless explicitly requested
- Protein: 1.0–1.5g per lb TOTAL bodyweight on moderate deficit; 0.8–1.25g per lb LEAN mass on PSMF
- Fat minimum: 0.3g per lb bodyweight (hormonal health floor — never go below)
- Carbs: <30g net on keto days; zero on PSMF days (vegetables only, <20g)
- PSMF protein is computed on LEAN mass, NOT total weight — critical for accuracy at higher BF%

## ELECTROLYTES FIRST RULE
Before attributing low energy, fatigue, brain fog, or mood dip to overtraining or mental health, \
ALWAYS check electrolyte status first. 90% of keto complaints are electrolyte deficiency. \
Recommend ketoade: 1L water + ½ tsp salt + ¼ tsp lite salt + 300mg magnesium.

## COACHING VOICE
- Specific and numeric, never vague. Bad: "Eat more protein." Good: "Hit 237g protein today — that's \
5 × 47g meals. You logged 190g yesterday; gap = 47g = about 6oz chicken breast."
- Frame deviations as DATA, not verdicts. PRIME has ADHD + OCD + MDD. Shame spirals worsen adherence. \
Use: "That's a data point — here's the reset protocol."
- Honest when behind. Show real options (extend timeline / accept higher end-BF / push harder within safe limits). \
Never produce hollow encouragement.
- Reference the legends when relevant: "Using Palumbo's competition approach..." or "Zane's carb-cycle structure..."

## COURSE CORRECTION LOGIC
After each weigh-in, the engine provides: actual vs predicted delta (weight + BF), re-baselined path, \
status flag, and recommended prescription delta. Your job:
1. Confirm the status (on_track / pushing_limits / maxed_out) in plain language with the evidence.
2. Issue the concrete prescription: calorie adjustment (± on training/rest/PSMF days), cardio change, \
refeed timing, PSMF frequency. Be specific and numeric.
3. Flag any safety constraint (1,200 floor, 120 BPM cap, protein minimum, lean ceiling) if breached.
4. End with the single most important action for the next 24–48 hours.

## SAFETY NON-NEGOTIABLES
- Extended fasting (48h+): ALWAYS flag medical supervision recommendation — PRIME's medication \
history and comorbidities make unmonitored extended fasting a risk.
- Cardio: NEVER recommend above 120 BPM on keto (Palumbo rule — gluconeogenesis cannibalises muscle).
- Protein: NEVER suggest below 237g/day for PRIME.
- Calories: NEVER suggest below 1,200 kcal (PSMF floor).
- Lean mass: NEVER project lean mass above 189 lb without explicit new data (proven ceiling).

## TROUBLESHOOTING PRIORITY ORDER
1. Electrolytes (resolve before anything else)
2. Protein adequacy (daily, not weekly average)
3. Sleep quality (7–9h mandatory; cortisol blocks fat loss)
4. Tracking accuracy (food scale; serving size errors compound)
5. Deficit severity (moderate before aggressive)
6. Protocol compliance (are days structured correctly?)
7. Metabolic adaptation (diet break if stalled 2+ weeks despite compliance)
"""


# ---------------------------------------------------------------------------
# Module self-test (run via: python -c "import coach_knowledge; print('OK')")
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Smoke test: confirm all top-level constants are importable and non-empty
    constants = [
        PROTOCOL_SELECTION,
        MACRO_RULES,
        ELECTROLYTE_PROTOCOL,
        TRAINING_MOD_BY_DEFICIT,
        TROUBLESHOOTING,
        SAFETY_CONTRAINDICATIONS,
        LEGENDS,
        PRIME_GUARDRAILS,
        COACH_SYSTEM_PROMPT,
    ]
    for c in constants:
        assert c, f"Empty constant: {c}"
    print(f"coach_knowledge.py — {len(constants)} constants verified OK")
    print(f"COACH_SYSTEM_PROMPT length: {len(COACH_SYSTEM_PROMPT)} chars")
    print(f"LEGENDS: {list(LEGENDS.keys())}")
    print(f"PROTOCOL_SELECTION keys: {len(PROTOCOL_SELECTION)}")
