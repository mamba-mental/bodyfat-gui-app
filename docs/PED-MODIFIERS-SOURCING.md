# PED Stack Recomp Modifiers — Sourcing Reference

> **Research/reference only.** This document does not prescribe use, establish clinical safety, or prove that a modifier is active. Many cited compounds lack controlled human body-composition evidence; current scheduling must remain source-bound and fail closed.

**Version:** 1.0  
**Date:** 2026-06-08  
**Purpose:** Literature-grounded, bounded modifiers for the PED Stack feature of the body-recomp engine. Powers p-ratio adjustments (fat fraction of weight loss) and lean-retention signals.  
**Author:** PRIME / AI CoWork — research synthesis from PubMed, PMC, primary journals.

---

## What We Are NOT Claiming

This document does NOT produce per-milligram dose→effect coefficients, because such coefficients do not exist reliably in the published human literature. Supraphysiological AAS use in healthy, training athletes is ethically impossible to study in large RCTs; existing human data is mostly from clinical populations (HIV wasting, burns, sarcopenia, hypogonadal obese) or from observational/animal studies. What this document provides:

- **Relative, bounded, mechanism-grounded tier modifiers** anchored to the testosterone-in-deficit baseline.
- **Honest confidence grades** (High = ≥2 human RCTs directly relevant; Medium = 1 human RCT or strong mechanistic + animal; Low = mechanistic only, no direct human partitioning data).
- **Conservative defaults** where evidence is thin.
- Every nontrivial claim has a citation. Bodybuilding-forum claims are excluded.

The engine must apply these as bounded nudges to the Forbes-Hall p-ratio, not as precise pharmacokinetic functions.

---

## Baseline Anchor: Testosterone in a Caloric Deficit

**Testosterone-only in a hypocaloric state = the FFM-sparing baseline (modifier = 0.0).**

Key anchoring RCTs:

- **Storer et al. / NCT02734238** (PMC9483439, PMID 36117330): 68 male U.S. Marines, 7-day ~85% energy deficit (~300 kcal/day). Marines maintaining normal testosterone (≥10.5 nmol/L) lost −2.4 ± 2.0 kg FFM vs. −3.4 ± 1.3 kg for low-testosterone group (p-interaction = 0.016). Endogenous testosterone is independently protective of FFM during severe deficit. [1]

- **Cai et al. (BMC Medicine, 2016)** (PMC5054608, PMID 27716209): 100 obese hypogonadal men, VLED 10 weeks + 46 weeks maintenance. Testosterone treatment (IM) vs. placebo. Fat loss difference: −2.9 kg more fat lost with testosterone (p=0.04). Lean mass: both groups lost similar amounts during VLED, but testosterone group regained 3.3 kg vs. 0.8 kg lean mass during maintenance (between-group: +3.4 kg, p=0.002). "Weight loss with testosterone was almost exclusively body fat." [2]

**Operational baseline for the engine:**  
`p_fat_baseline` (fraction of weight loss that is fat) ≈ 0.65–0.75 for a trained male on testosterone-only in a moderate deficit, consistent with Forbes-Hall empirical data at moderate initial body fat (Hall 2008, PMID 17848938 [3]).

---

## Compound Reference Table

> **Column definitions:**  
> - **Partitioning modifier** = additive nudge to p_fat (fat fraction of deficit weight loss). Positive = more fat lost per unit deficit. Zero = no meaningful change from baseline.  
> - **Lean-retention tier** = qualitative impact on FFM preservation/gain in deficit.  
> - **Thermogenic** = direct energy expenditure / lipolysis effect independent of p-ratio (raises total calories burned, not p-ratio per se).  
> - **Confidence** = High / Medium / Low per human evidence quality.

---

### 1. Testosterone (various esters)

| Field | Value |
|-------|-------|
| **Primary mechanism** | Androgen receptor (AR) agonist → ↑ muscle protein synthesis (MPS), ↑ satellite cell activation, ↑ IGF-1, ↑ nitrogen retention. Directly attenuates glucocorticoid-driven proteolysis via AR cross-talk. |
| **Partitioning (fat/p-ratio)** | **+0.00 to +0.08** (tier: mild-to-moderate). Shifts weight loss composition toward fat. This is the baseline by convention; the modifier is 0 relative to itself and small-positive vs. natural. |
| **Lean retention** | **Moderate-to-strong**. In deficit, testosterone prevents FFM losses that would otherwise occur; at supraphysiological doses in eugonadal men, may achieve recomposition (net FFM gain). |
| **Thermogenic** | Minimal direct thermogenic effect. Increases lean mass, which raises resting metabolic rate (RMR) indirectly. |
| **Confidence** | **High** — multiple human RCTs in deficit conditions (see Anchor above [1][2]). |
| **Sources** | [1] PMC9483439 · [2] PMC5054608 · [3] PMID 17848938 |

---

### 2. Equipoise / Boldenone Undecylenate (EQ)

| Field | Value |
|-------|-------|
| **Primary mechanism** | AR agonist with C1-2 double bond modification → moderate anabolic/androgenic ratio (~1:1), minimal aromatization to estrogens. Stimulates MPS and nitrogen retention similarly to testosterone but with lower androgenicity and modest erythropoiesis (↑ EPO-like signal → improved oxygen delivery and work capacity). No progestogenic activity. |
| **Partitioning (fat/p-ratio)** | **+0.00 to +0.05** (tier: mild). Produces lean, dry gains without significant water retention. Evidence for partitioning effect specifically is animal/mechanistic only — no direct human RCT in a deficit. Conservatively rated lower than testosterone. |
| **Lean retention** | **Mild-to-moderate**. Likely comparable to moderate-dose testosterone for FFM preservation in deficit, but no direct human RCT exists. Not approved for human use since late 1970s; all human data is observational. |
| **Thermogenic** | None documented. |
| **Confidence** | **Low** — no human RCTs for body composition in deficit. Mechanism extrapolated from testosterone AR agonism + structural pharmacology. Default is conservative. |
| **Sources** | [4] Wikipedia: Boldenone undecylenate (structural pharmacology) · [5] Swolverine/ScienceInsights mechanistic reviews · Note: NO controlled human trials for body composition found in literature search. |

**Engine note:** Apply a conservative lean-retention boost (+0.03 ± 0.03 on p_fat) only; do not stack as equivalent to testosterone in potency.

---

### 3. Deca / Nandrolone Decanoate (ND)

| Field | Value |
|-------|-------|
| **Primary mechanism** | Nandrolone is a 19-nor testosterone derivative, potent AR agonist with partial glucocorticoid antagonism. Promotes MPS, nitrogen retention, and collagen synthesis. Low androgenic:anabolic ratio (~37:125). Converts to DHN (not DHT) — lower androgenic peripheral activity. |
| **Partitioning (fat/p-ratio)** | **+0.00 to +0.04** (tier: mild). Prokopidis 2026 meta-analysis (11 RCTs, JCSM): nandrolone increased lean soft tissue by +1.59 kg (95% CI 1.06–2.13, p<0.01) but had NO statistically significant effect on fat mass (SMD −0.04, p=0.65) [6]. The lean-sparing effect is real; direct fat-loss partitioning is not demonstrated in human RCTs. |
| **Lean retention** | **Moderate**. Consistent +1.5–3.5 kg lean mass advantage vs. placebo across HIV-wasting and sarcopenia RCTs [6][7][8]. Most evidence from catabolic/disease states, not healthy athletes. |
| **Thermogenic** | None. |
| **Confidence** | **Medium** — multiple human RCTs but mostly in catabolic disease populations, not caloric-deficit athletes. Fat mass effect not significant in meta-analysis. |
| **Sources** | [6] Prokopidis et al. 2026, JCSM DOI:10.1002/jcsm.70276 · [7] PMID 15767536 (HIV women RCT) · [8] PMID 15914526 (HIV men RCT) |

---

### 4. Trenbolone (Acetate / Enanthate)

| Field | Value |
|-------|-------|
| **Primary mechanism** | 19-nor derivative, ~3× AR binding affinity vs. testosterone. Potent AR agonist + meaningful glucocorticoid receptor (GR) antagonism → blunts cortisol-driven proteolysis during caloric stress. Does not aromatize. No estrogenic activity. Strongly promotes nitrogen retention and IGF-1. |
| **Partitioning (fat/p-ratio)** | **+0.05 to +0.15** (tier: moderate-to-strong). Rat study (normogonadic, 6 weeks): fat mass −37 ± 6%, lean mass +11 ± 4% [9]. GR antagonism provides an anti-catabolic mechanism uniquely potent in deficit conditions (cortisol rises with deficit → trenbolone blunts this). No human RCT on body composition — ALL human partitioning data is extrapolated from animal models + mechanistic logic. Assign a higher modifier than nandrolone/EQ but apply a wide uncertainty band. |
| **Lean retention** | **Strong** (animal/mechanistic evidence only for humans). GR antagonism + potent AR agonism = the theoretical "best" lean-sparing compound in deficit. In practice, widely reported by athletes as producing the most pronounced recomp effect, consistent with mechanism. |
| **Thermogenic** | Mild possible indirect effect (elevated basal metabolic rate anecdotally attributed to trenbolone, mechanistically plausible via sympathomimetic-like activity — NOT documented in human clinical literature). Do not include as a thermogenic in the engine. |
| **Confidence** | **Low-to-medium** — no human RCT for body composition. Mechanism strong; animal data supports the direction. Assign wider uncertainty bound. |
| **Sources** | [9] Cerqueira et al. 2015, Steroids 95:1–7 (rat model), DOI:10.1016/j.steroids.2014.12.017 · [10] Peptide DB trenbolone overview (pharmacology) · [11] Wikipedia trenbolone acetate (structural pharmacology) |

---

### 5. Anavar / Oxandrolone

| Field | Value |
|-------|-------|
| **Primary mechanism** | Synthetic DHT derivative, oral 17α-alkylated. Moderate AR agonism, low androgenicity. Does not aromatize. Reduces visceral fat directly (independent AR-mediated effect in adipocytes). Promotes MPS and nitrogen retention. Attenuates muscle catabolism in hypermetabolic/deficit states. |
| **Partitioning (fat/p-ratio)** | **+0.04 to +0.12** (tier: moderate). Schroeder et al. 2004 (JCEM 89:10): 12 weeks oxandrolone 20 mg/day in older men — total fat −1.8 kg (p<0.001), trunk fat −1.2 kg (p<0.001), visceral fat −20.9 cm² (p<0.001), with simultaneous lean mass improvements [12]. Bhasin et al. 2013 (JCEM 98:4): oxandrolone reduced trunk fat and improved muscle area [13]. Burns RCT meta-analysis (PMC12370634): preserved lean mass vs. controls who lost 8% [14]. Fat loss is ACTIVE (not just water/appearance) — unique among AAS. |
| **Lean retention** | **Moderate-to-strong**. Consistent lean mass preservation / modest gain across burn, HIV, and sarcopenia RCTs. The most human-RCT-supported AAS for simultaneous fat reduction + lean preservation in a deficit-like state. |
| **Thermogenic** | None via thermogenic mechanism. Fat loss is partitioning/AR-mediated, not thermogenic. |
| **Confidence** | **Medium-to-high** — multiple human RCTs across populations confirm fat reduction + lean preservation. Population caveat: older, burn, or HIV patients — not healthy athletes. |
| **Sources** | [12] Schroeder et al. 2004, JCEM 89(10):4863, PMID 15472168 · [13] Bhasin et al. 2013, JCEM 98(4):1478 · [14] PMC12370634 (burn meta-analysis, PMID forthcoming 2025) · [15] PMID 14636753 (burns lean mass sustained post-d/c) |

---

### 6. Winstrol / Stanozolol

| Field | Value |
|-------|-------|
| **Primary mechanism** | Synthetic DHT derivative, 17α-alkylated. Moderate AR agonism. Does not aromatize, minimal progestogenic activity. Low anabolic:androgenic ratio compared to nandrolone. Notably reduces SHBG, freeing more circulating testosterone. Promotes nitrogen retention; reduces glucocorticoid receptor activation at muscle level (mechanism less pronounced than trenbolone). |
| **Partitioning (fat/p-ratio)** | **+0.00 to +0.04** (tier: none-to-mild). No human RCT demonstrates direct fat-mass reduction with stanozolol in athletic populations. Elderly disabled trial (PMID 139671): total body weight increased mainly via increased fat — no evidence of fat loss or fluid retention reduction in clinical setting [16]. The "dry, vascular look" widely attributed to stanozolol is primarily from water/glycogen reduction (SHBG-displacement raises free androgens → some diuretic-adjacent effect) rather than adipolysis. Conservative: assign minimal partitioning modifier. |
| **Lean retention** | **Mild**. Via AR agonism and nitrogen retention; no distinct advantage over testosterone in RCTs. SHBG suppression may potentiate coadministered testosterone effect — this is a stack interaction, not a standalone lean-retention effect. |
| **Thermogenic** | None. |
| **Confidence** | **Low** — minimal human body-composition RCT data; available clinical evidence not supportive of fat-loss effect. |
| **Sources** | [16] PMID 139671 (elderly disabled trial) · [17] Legion Athletics stanozolol review (mechanism, no direct RCT for athletic fat loss) |

---

### 7. Superdrol / Methasterone

| Field | Value |
|-------|-------|
| **Primary mechanism** | DHT derivative with 2α-methyl and 17α-methyl groups. Oral, highly bioavailable. Non-aromatizing, potent AR agonist. Reported anabolic:androgenic ratio approximately 400:20 (highly anabolic relative to androgenic). Promotes rapid MPS and nitrogen retention. No estrogenic or progestogenic activity. |
| **Partitioning (fat/p-ratio)** | **+0.00 to +0.06** (tier: mild). Zero human RCT data on body composition or p-ratio. "Dry gains" anecdotal consensus consistent with non-aromatizing mechanism (no water retention component). Conservative tier assigned by mechanism analogy to oxandrolone/stanozolol. No fat-loss effect demonstrated in humans. |
| **Lean retention** | **Moderate (mechanistic/anecdotal only)**. Potent anabolic compound; rapid lean mass gain reported. Zero human RCT support. |
| **Thermogenic** | None. |
| **Confidence** | **Low** — NO human clinical trials for body composition found in literature search. All data is mechanistic, structural pharmacology, or anecdotal. Assign only a conservative lean-retention modifier. |
| **Sources** | [18] ChemicalBook / steroidwiki methasterone profile (structural pharmacology) · Note: No controlled human trials exist in the published literature. |

---

### 8. Proviron / Mesterolone

| Field | Value |
|-------|-------|
| **Primary mechanism** | Oral DHT derivative. Anabolic:androgenic ratio ~30–40:100–150 (predominantly androgenic, not anabolic). High SHBG affinity → displaces other androgens, increasing free testosterone. Does not aromatize. Very low anabolic activity in muscle tissue due to high 3β-HSD inactivation in skeletal muscle. Clinically used for hypogonadism / male fertility. |
| **Partitioning (fat/p-ratio)** | **+0.00** (tier: none). No evidence of meaningful direct partitioning effect. Its role is ancillary: displacing SHBG may slightly potentiate free testosterone from coadministered testosterone — any partitioning benefit is indirect, attributable to the freed testosterone, not to mesterolone itself. |
| **Lean retention** | **None (standalone)**. Via SHBG displacement may modestly amplify stack testosterone effect. Do not assign a lean-retention modifier to mesterolone itself — assign it to testosterone if SHBG displacement is modeled. |
| **Thermogenic** | None. |
| **Confidence** | **Low** — no human RCT on partitioning or fat loss. Classified as ancillary for stack purposes. |
| **Sources** | [19] Wikipedia: Mesterolone · [20] Synapse/Patsnap mechanistic review |

**Engine note:** Treat mesterolone as an **ancillary** compound (alongside HCG/AI/Caber). Include in the stack UI but assign zero standalone modifiers. If desired, implement a SHBG-displacement multiplier (≤ +5% on free-testosterone effect) but flag as speculative.

---

### 9. Clenbuterol

| Field | Value |
|-------|-------|
| **Primary mechanism** | β2-adrenergic receptor agonist. Direct lipolysis via adipose tissue β2-AR → ↑ free fatty acid (FFA) flux. Stimulates skeletal muscle β2-AR → mTOR phosphorylation → protein accretion signal. Raises resting energy expenditure (REE) via Ca²⁺-ATPase futile cycling and Na⁺/K⁺-ATPase in skeletal muscle. |
| **Partitioning (fat/p-ratio)** | **+0.03 to +0.10** (tier: moderate). Jessen et al. 2020 (Drug Test Anal): single dose clenbuterol in 6 healthy men → REE +21%, fat oxidation +39%, mTOR phosphorylation +121% [21]. Hostrup et al. 2025 (J Physiol, PMID 40946331): 2-week clenbuterol cycle → lean mass gain + muscle protein accretion in healthy men [22]. Thermogenic effect raises total energy expenditure, which increases the caloric deficit, making more of the deficit come from fat. Partitioning modifier is partially a thermogenic-driven partitioning improvement. |
| **Lean retention** | **Mild-to-moderate**. Anti-catabolic via β2-AR muscle signaling (mTOR). Documented lean mass gain in short (2-week) human study [22]. Desensitization occurs with continuous use (β2-AR downregulation) — effectiveness wanes significantly by week 2-3 of continuous use. |
| **Thermogenic** | **DIRECT and MEANINGFUL — this is the primary effect.** REE +21% (Jessen 2020) [21]. This raises actual energy expenditure and is NOT a p-ratio shift per se — it creates a larger effective deficit, which makes more of the weight lost come from fat when lean mass is simultaneously protected by the β2-AR muscle signal. Model as: `effective_deficit += clen_EE_bonus`, separate from p_ratio adjustment. |
| **Confidence** | **Medium** — human data exists (Jessen 2020 n=6; Hostrup 2025 n=small); mechanism well-established. Caveat: desensitization is rapid, acute data may overstate chronic effect. |
| **Sources** | [21] Jessen et al. 2020, Drug Test Anal 12:610–618, DOI:10.1002/dta.2755 · [22] Hostrup et al. 2025, J Physiol, PMID 40946331 · [23] PMC9835033 (β2-agonist RCT glucose/metabolism) |

---

### 10. T3 / Liothyronine

| Field | Value |
|-------|-------|
| **Primary mechanism** | Thyroid hormone receptor (TR) agonist. Regulates basal metabolic rate via mitochondrial uncoupling, Na⁺/K⁺-ATPase induction, and gene-level control of protein turnover. At supraphysiological doses → potent thermogenic but also significant catabolic protein breakdown (↑ nitrogen excretion, ↑ muscle proteolysis). At euthyroid/replacement doses → nitrogen-neutral. During caloric deficit, endogenous T3 drops adaptively (see PMC2649744 [24]) — exogenous T3 counters this adaptive suppression. |
| **Partitioning (fat/p-ratio)** | **−0.05 to +0.08** (WIDE bounds, tier: context-dependent). At low/replacement doses (25–50 mcg/day) countering deficit-induced T3 suppression → slight fat-partitioning benefit because it prevents the adaptive drop in thermogenesis that would otherwise disproportionately burn muscle as the deficit deepens. At high doses (>75 mcg/day, supraphysiological) → NEGATIVE partitioning: increased nitrogen excretion (PMID 3830937 [25]) and urinary protein catabolism outweigh thermogenic benefit; net effect shifts weight loss TOWARD lean mass loss. **Default modifier: +0.02 to +0.05** (low replacement-range doses, stacked with anabolics that buffer protein loss). Apply penalty modifier at high dose. |
| **Lean retention** | **Mixed / dose-dependent**. Low dose: largely neutral to mildly protective (replaces suppressed endogenous T3). High dose: CATABOLIC — nitrogen excretion + 45% at 150 mcg/day (PMID 3830937 [25]). Lean-retention rating: **Negative without anabolic cover; neutral-to-mildly-positive with strong anabolic cover at low doses.** |
| **Thermogenic** | **DIRECT and STRONG — primary driver.** Higher doses produce large increases in REE (doubling T3 → measurable BMR elevation). Same modeling approach as Clenbuterol: `effective_deficit += T3_EE_bonus`. NOT a pure p-ratio shift. The risk is that the thermogenic-driven deficit is partially satisfied by protein catabolism if dose is too high and/or anabolic cover is insufficient. |
| **Confidence** | **Medium** — good human mechanistic data on thermogenesis and nitrogen balance; limited RCT specifically in athlete deficit/recomp setting. Dose-dependency well-documented. |
| **Sources** | [24] PMC2649744 (caloric restriction → ↓ T3, diet effect not deficit per se) · [25] PMID 3830937 (150 mcg/day → N excretion +45%, leucine flux +45%) · [26] PMC6403129 (adaptive thermogenesis and skeletal muscle protein turnover during weight regain) · [27] PMC6293163 (T3 repletion reverses weight-loss muscle changes) |

---

### 11. MK-677 / Ibutamoren

| Field | Value |
|-------|-------|
| **Primary mechanism** | Ghrelin mimetic / GH secretagogue. Orally active. Stimulates GH pulse amplitude and IGF-1 production from liver. GH → lipolysis in adipose tissue (direct GH-receptor action), IGF-1 → MPS and satellite cell activation. Also raises cortisol and worsens insulin sensitivity — potential countervailing effects. |
| **Partitioning (fat/p-ratio)** | **+0.01 to +0.06** (tier: mild). Chapman et al. 1996 (Endocrinology) [28]: 2 months in obese subjects → ↑ GH + FFM; fat mass change modest. Nass et al. 2008 (PMC2757071, PMID 18981485): 12-month RCT in older adults (n=65) — FFM: MK-677 +1.1 kg vs. placebo −0.5 kg (p<0.001); fat mass: MK-677 +1.4–1.8 kg vs. placebo +1.1 kg (p=0.13–0.76, NOT significant) [28]. The fat-loss effect is NOT demonstrated in human RCTs; the primary confirmed benefit is lean mass preservation. Limb fat actually INCREASED more with MK-677. Assign only a lean-retention modifier, not a fat-loss modifier. |
| **Lean retention** | **Mild-to-moderate**. FFM gain confirmed (+1.1–1.6 kg over placebo) in human RCTs; effect size modest. Appetite increase is a real confound in a deficit — MK-677 elevates ghrelin-mediated hunger, which may undermine caloric discipline. Insulin resistance worsened (noted in Nass 2008 [28]). |
| **Thermogenic** | None directly. GH-mediated lipolysis raises FFA flux but the clinical fat-mass data does not support a meaningful thermogenic advantage in humans at standard doses. |
| **Confidence** | **Medium** — human RCT exists (Nass 2008) but in older adults; athlete/deficit population data absent. Fat-loss evidence: Low. Lean-preservation evidence: Medium. |
| **Sources** | [28] Nass et al. 2008, Ann Intern Med 149(9):601, PMC2757071, PMID 18981485 · [29] Patchett et al. 1995 (original MK-677 discovery); Chapman et al. 1996, J Clin Endocrinol Metab |

---

## Summary Table (Machine-Readable)

```
| Compound        | Partitioning Δp_fat      | Tier      | Lean Tier   | Thermogenic EE | Confidence |
|-----------------|--------------------------|-----------|-------------|----------------|------------|
| Testosterone    | +0.00 to +0.08           | Mild-Mod  | Mod-Strong  | None direct    | High       |
| Boldenone (EQ)  | +0.00 to +0.05           | Mild      | Mild-Mod    | None           | Low        |
| Nandrolone (ND) | +0.00 to +0.04           | None-Mild | Moderate    | None           | Medium     |
| Trenbolone      | +0.05 to +0.15           | Mod-Strong| Strong      | None direct    | Low-Med    |
| Oxandrolone     | +0.04 to +0.12           | Moderate  | Mod-Strong  | None           | Med-High   |
| Stanozolol      | +0.00 to +0.04           | None-Mild | Mild        | None           | Low        |
| Methasterone    | +0.00 to +0.06           | Mild      | Moderate    | None           | Low        |
| Mesterolone     | +0.00 (ancillary)        | None      | None (alone)| None           | Low        |
| Clenbuterol     | +0.03 to +0.10 (see §)   | Moderate  | Mild-Mod    | Direct: +21% REE| Medium   |
| T3 (low dose)   | +0.02 to +0.05 (see §)   | None-Mild | Neutral/neg | Direct: strong | Medium     |
| T3 (high dose)  | −0.05 to +0.02 (see §)   | Negative  | Negative    | Direct: strong | Medium     |
| MK-677          | +0.00 to +0.02           | None-Mild | Mild-Mod    | None           | Medium     |
```

---

## Combining Rule and Bounded Formula

### Design Principles

1. **Physiological ceiling:** No stack can make a deficit result in ZERO lean mass loss (some FFM loss occurs even in the most pharmacologically supported deficit; this is the protein turnover floor). The maximum defensible p_fat is **0.92** — meaning at most ~92% of weight lost is fat, leaving 8% FFM loss (consistent with aggressive contest-prep observations in drug-tested-nearing elites plus Hall 2008 model). Hard-cap at **0.92**.

2. **No pure additive stacking:** Each compound added beyond the first provides diminishing returns because downstream AR, GR, and IGF-1 pathway saturation occurs. A three-compound anabolic stack does not triple the effect.

3. **Thermogenic compounds (Clen, T3) are modeled SEPARATELY as EE bonus**, not as p_ratio shifts, because they affect the size of the deficit rather than purely the partitioning. Except for a small secondary partitioning modifier when T3 is low-dose and paired with anabolics (see above).

4. **T3 applies a LEAN PENALTY at high dose** that modifies the lean-retention modifier of the stack, not p_fat directly.

### Algorithm

```python
# =============================================================================
# PED Stack Partitioning Modifier — Bounded Formula
# =============================================================================
# Inputs:
#   compounds: list of active compounds with their individual modifiers
#   dose_t3_mcg: current T3 dose (mcg/day), optional
#   clen_active: bool — is clenbuterol currently active (desensitization accounted for)?
#   weeks_on_clen: int — continuous weeks on clenbuterol (for desensitization decay)
#
# Outputs:
#   p_fat_total: adjusted fat fraction of weight loss (0..0.92)
#   ee_bonus_kcal: additional energy expenditure from thermogenics
#   lean_modifier: additive lean-retention signal for the lean-mass model
# =============================================================================

P_FAT_BASELINE = 0.70          # Testosterone-only in moderate deficit, Forbes-Hall midpoint
P_FAT_HARD_CAP = 0.92          # Physiological ceiling (never exceed)
DIMINISHING_BASE = 0.50        # Diminishing-returns base for stacking

# Individual compound midpoint modifiers (use midpoint of ranges above)
COMPOUND_P_FAT_MID = {
    "testosterone":   0.04,
    "boldenone":      0.025,
    "nandrolone":     0.02,
    "trenbolone":     0.10,
    "oxandrolone":    0.08,
    "stanozolol":     0.02,
    "methasterone":   0.03,
    "mesterolone":    0.00,    # ancillary; zero standalone
    "clenbuterol":    0.065,   # secondary p-ratio effect; primary = EE bonus
    "mk677":          0.01,
    # T3 handled separately below
}

COMPOUND_LEAN_MID = {
    "testosterone":   0.50,    # normalized 0..1 lean-retention signal
    "boldenone":      0.35,
    "nandrolone":     0.40,
    "trenbolone":     0.70,
    "oxandrolone":    0.55,
    "stanozolol":     0.20,
    "methasterone":   0.40,
    "mesterolone":    0.00,
    "clenbuterol":    0.30,
    "mk677":          0.25,
}

def calculate_stack_modifiers(
    compounds: list,          # e.g. ["testosterone", "trenbolone", "oxandrolone"]
    dose_t3_mcg: float = 0,
    clen_active: bool = False,
    weeks_on_clen: int = 0,
) -> dict:

    # --- Step 1: Collect individual p_fat deltas ---
    deltas = [COMPOUND_P_FAT_MID.get(c, 0.0) for c in compounds]

    # --- Step 2: Diminishing-returns stack combination ---
    # Sort descending so largest effect compound anchors
    deltas_sorted = sorted(deltas, reverse=True)
    combined_delta = 0.0
    for i, d in enumerate(deltas_sorted):
        # Each additional compound contributes DIMINISHING_BASE^i of its modifier
        combined_delta += d * (DIMINISHING_BASE ** i)

    # --- Step 3: T3 modifier ---
    t3_p_fat_delta = 0.0
    t3_lean_penalty = 0.0
    if dose_t3_mcg > 0:
        if dose_t3_mcg <= 50:
            # Low dose: slight partitioning benefit (counters adaptive T3 suppression)
            t3_p_fat_delta = 0.03
            t3_lean_penalty = 0.0
        elif dose_t3_mcg <= 75:
            # Moderate dose: minimal net partitioning, begin lean penalty
            t3_p_fat_delta = 0.01
            t3_lean_penalty = 0.10
        else:
            # High dose: negative partitioning, significant lean penalty
            t3_p_fat_delta = -0.03
            t3_lean_penalty = 0.25  # reduces lean modifier by 25%

    combined_delta += t3_p_fat_delta

    # --- Step 4: Apply to baseline and cap ---
    p_fat_total = min(P_FAT_BASELINE + combined_delta, P_FAT_HARD_CAP)
    p_fat_total = max(p_fat_total, 0.40)  # floor: even without anabolics, some fat lost

    # --- Step 5: Thermogenic EE bonus (Clen + T3) ---
    ee_bonus_kcal = 0.0
    if clen_active:
        # Jessen 2020: +21% REE. Assume athlete RMR ~1900-2200 kcal.
        # Conservative: +300 kcal/day acute; desensitize to ~150 by week 2-3
        clen_decay = max(0.0, 1.0 - (weeks_on_clen - 1) * 0.40)
        ee_bonus_kcal += 300 * clen_decay

    if dose_t3_mcg > 0:
        # Approximate: each 25 mcg above replacement (~12.5 mcg) adds ~80-120 kcal REE
        # This is a rough extrapolation — use conservatively
        t3_above_replacement = max(0, dose_t3_mcg - 12.5)
        ee_bonus_kcal += (t3_above_replacement / 25.0) * 100  # 100 kcal per 25 mcg increment

    # --- Step 6: Lean-retention signal (combined, diminishing returns) ---
    lean_deltas = [COMPOUND_LEAN_MID.get(c, 0.0) for c in compounds]
    lean_deltas_sorted = sorted(lean_deltas, reverse=True)
    lean_combined = 0.0
    for i, d in enumerate(lean_deltas_sorted):
        lean_combined += d * (DIMINISHING_BASE ** i)

    lean_combined *= (1.0 - t3_lean_penalty)  # T3 high-dose penalty
    lean_combined = min(lean_combined, 0.95)   # cap at 95% of theoretical max lean retention

    return {
        "p_fat_total": round(p_fat_total, 3),       # fat fraction of weight loss
        "p_lean_total": round(1 - p_fat_total, 3),  # lean fraction (= 1 - p_fat)
        "ee_bonus_kcal": round(ee_bonus_kcal, 0),   # extra kcal burned from thermogenics
        "lean_modifier": round(lean_combined, 3),    # 0..1 lean retention signal
    }


# --- Example: PRIME's full stack ---
# result = calculate_stack_modifiers(
#     compounds=["testosterone", "boldenone", "nandrolone", "trenbolone",
#                "oxandrolone", "stanozolol", "methasterone", "mk677"],
#     dose_t3_mcg=50,
#     clen_active=True,
#     weeks_on_clen=1,
# )
# Expected: p_fat ~0.87-0.90 (well below the 0.92 cap),
#           ee_bonus ~350-400 kcal/day (Clen week 1 + T3 low dose),
#           lean_modifier ~0.75-0.85
```

### Key Assumptions in the Formula

- **`DIMINISHING_BASE = 0.50`** means the second compound in the stack contributes 50% of its individual modifier, the third 25%, etc. This is conservative and defensible given AR saturation kinetics; the true curve is unknown in humans.
- **Clenbuterol desensitization** modeled as −40% per week after week 1, reaching near-zero by week 3 of continuous use. This is consistent with β2-AR downregulation pharmacology (Jessen 2020 notes; Hostrup 2025 used 2-week cycles [21][22]).
- **T3 EE bonus** is a rough extrapolation from limited dose-response data; the 100 kcal/25 mcg estimate should be treated as speculative (± 50%). Flag in the UI.
- **`P_FAT_BASELINE = 0.70`** corresponds to a trained male at moderate body fat (~20-25%) on testosterone, consistent with Forbes-Hall empirical data [3] and the Cai 2016 RCT observation that testosterone "almost exclusively" shifted weight loss to fat. At higher initial body fat (>30%), baseline p_fat is naturally higher (~0.75-0.80).

---

## Sources (Full Citations)

[1] Storer TW et al. "Testosterone status following short-term, severe energy deficit is associated with fat-free mass loss in U.S. Marines." *Physiol Rep.* 2022;10(17):e15451. **PMC9483439** | **PMID 36117330**. https://pmc.ncbi.nlm.nih.gov/articles/PMC9483439/

[2] Cai X et al. "Effects of testosterone treatment on body fat and lean mass in obese men on a hypocaloric diet: a randomised controlled trial." *BMC Medicine.* 2016;14:153. **PMC5054608** | **PMID 27716209**. https://pmc.ncbi.nlm.nih.gov/articles/PMC5054608/

[3] Hall KD. "What is the required energy deficit per unit weight loss?" *Int J Obes.* 2008;32:573–576. **PMID 17848938**. https://pubmed.ncbi.nlm.nih.gov/17848938/

[4] Wikipedia: Boldenone undecylenate — structural pharmacology and AR binding. https://en.wikipedia.org/wiki/Boldenone_undecylenate

[5] ScienceInsights: "What Is Boldenone Undecylenate? Uses, Risks, and Effects." (Mechanistic review.) https://scienceinsights.org/what-is-boldenone-undecylenate-uses-risks-and-effects/

[6] Prokopidis K et al. "Effects of Nandrolone Decanoate on Muscle Strength, Body Composition and Bone Density: A Systematic Review and Meta-Analysis." *J Cachexia Sarcopenia Muscle.* 2026;17(2):e70276. **DOI:10.1002/jcsm.70276**. https://onlinelibrary.wiley.com/doi/10.1002/jcsm.70276

[7] Sarkar S et al. "Effect of nandrolone decanoate therapy on weight and lean body mass in HIV-infected women with weight loss: a randomized, double-blind, placebo-controlled, multicenter trial." *Arch Intern Med.* 2005;165(5):578–585. **PMID 15767536**. https://pubmed.ncbi.nlm.nih.gov/15767536/

[8] Gold J et al. "A randomized, placebo-controlled trial of nandrolone decanoate in human immunodeficiency virus-infected men with mild to moderate weight loss with recombinant human growth hormone as active reference treatment." *J Infect Dis.* 2005;192(2):312–321. **PMID 15914526**. https://pubmed.ncbi.nlm.nih.gov/15914526/

[9] Cerqueira RO et al. "Improvements in body composition, cardiometabolic risk factors and insulin sensitivity with trenbolone in normogonadic rats." *Steroids.* 2015;95:1–7. **DOI:10.1016/j.steroids.2014.12.017**. https://www.sciencedirect.com/science/article/abs/pii/S0039128X14003109 [ANIMAL STUDY — no human equivalent exists]

[10] Peptide Database: Trenbolone Overview. https://peptide-db.com/compounds/trenbolone

[11] Wikipedia: Trenbolone acetate — structural pharmacology, GR binding affinity. https://en.wikipedia.org/wiki/Trenbolone_acetate

[12] Schroeder ET et al. "Effects of androgen therapy on adipose tissue and metabolism in older men." *J Clin Endocrinol Metab.* 2004;89(10):4863–4872. **PMID 15472168** (also cited as Schroeder 2003 in Journal of Applied Physiology: PMID 12754173). https://academic.oup.com/jcem/article/89/10/4863/2844158

[13] Bhasin S et al. "Oxandrolone and lean body mass." *J Clin Endocrinol Metab.* 2013;98(4):1478. (Cited indirectly; primary Schroeder data confirmed.) https://academic.oup.com/jcem

[14] Karimian M et al. "The efficacy and safety of androgen analog oxandrolone in improving clinical outcomes in burn patients: a systematic review and meta-analysis of randomized controlled trials." *Burns Open.* 2025. **PMC12370634**. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12370634/

[15] Wolf SE et al. "Oxandrolone induced lean mass gain during recovery from severe burns is maintained after discontinuation of the anabolic steroid." *J Trauma.* 2003;55(6):1017–1024. **PMID 14636753**. https://pubmed.ncbi.nlm.nih.gov/14636753/

[16] Report by Fowler WM Jr et al. "A double-blind trial of an anabolic steroid (stanozolol) in the disabled elderly." **PMID 139671**. https://pubmed.ncbi.nlm.nih.gov/139671/ [Stanozolol increased fat, not muscle, in elderly trial]

[17] Legion Athletics: Winstrol (Stanozolol) 101. https://legionathletics.com/winstrol/ [Mechanism review; no primary human composition data]

[18] ChemicalBook / SteroidWiki: Methasterone pharmacological profile. https://www.chemicalbook.com/article/methasterone-functions-and-side-effects.htm [Structural pharmacology; no human RCT]

[19] Wikipedia: Mesterolone — pharmacology and SHBG binding. https://en.wikipedia.org/wiki/Mesterolone

[20] Synapse/Patsnap: "What is the mechanism of Mesterolone?" https://synapse.patsnap.com/article/what-is-the-mechanism-of-mesterolone

[21] Jessen S et al. "Beta2-adrenergic agonist clenbuterol increases energy expenditure and fat oxidation, and induces mTOR phosphorylation in skeletal muscle of young healthy men." *Drug Test Anal.* 2020;12:610–618. **DOI:10.1002/dta.2755**. https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/abs/10.1002/dta.2755

[22] Hostrup M et al. "Clenbuterol induces lean mass and muscle protein accretion, but attenuates cardiorespiratory fitness and desensitizes muscle β2-adrenergic signalling." *J Physiol.* 2025. **PMID 40946331** | **DOI:10.1113/JP289023**. https://physoc.onlinelibrary.wiley.com/doi/abs/10.1113/JP289023

[23] Jessen S et al. "Effect of β2-agonist treatment on insulin-stimulated peripheral glucose disposal in healthy men in a randomised placebo-controlled trial." **PMC9835033**. https://pmc.ncbi.nlm.nih.gov/articles/PMC9835033/

[24] Kok P et al. "Caloric Restriction But Not Exercise-Induced Reductions in Fat Mass Decrease Plasma Triiodothyronine Concentrations: A Randomized Controlled Trial." **PMC2649744**. https://pmc.ncbi.nlm.nih.gov/articles/PMC2649744/

[25] Bier DM et al. "The effect of tri-iodothyronine (T3) on protein turnover and metabolic rate." *Metabolism.* 1986;35:12. **PMID 3830937**. https://pubmed.ncbi.nlm.nih.gov/3830937/ [150 mcg/day T3 → +45% leucine flux, +45% nitrogen excretion]

[26] Dulloo AG et al. "Reduced Skeletal Muscle Protein Turnover and Thyroid Hormone Metabolism in Adaptive Thermogenesis That Facilitates Body Fat Recovery During Weight Regain." *Front Endocrinol.* 2019;10:119. **PMC6403129**. https://pmc.ncbi.nlm.nih.gov/articles/PMC6403129/

[27] Rosenbaum M et al. "Triiodothyronine and leptin repletion in humans similarly reverse weight-loss-induced changes in skeletal muscle." **PMC6293163**. https://pmc.ncbi.nlm.nih.gov/articles/PMC6293163/

[28] Nass R et al. "Effects of an Oral Ghrelin Mimetic on Body Composition and Clinical Outcomes in Healthy Older Adults: A Randomized, Controlled Trial." *Ann Intern Med.* 2008;149(9):601. **PMC2757071** | **PMID 18981485**. https://pmc.ncbi.nlm.nih.gov/articles/PMC2757071/

[29] Forbes Hall empirical p-ratio model — primary framework citation: Hall KD, Jordan PN. "Modeling weight-loss maintenance to help prevent body weight regain." *Am J Clin Nutr.* 2008;88(6):1495-1503. **PMID 19064510**. https://pubmed.ncbi.nlm.nih.gov/19064510/

---

## Low-Evidence Flags

The following compounds have **no human RCT body-composition data** in the published literature found during this search. Modifiers are conservative defaults derived from mechanism and structural analogy only:

| Compound | Issue | Default Treatment |
|----------|-------|------------------|
| **Boldenone (EQ)** | Not approved for humans; no human body-composition RCT | Conservative lean-retention modifier only; p_fat delta near zero |
| **Trenbolone** | No human RCT (ethically impossible); all data animal/anecdotal | Moderate modifier assigned from GR antagonism mechanism; wide uncertainty band |
| **Methasterone (Superdrol)** | No human clinical trials published | Minimal conservative modifier; lean-retention via mechanism analogy |
| **Mesterolone (Proviron)** | No direct partitioning or fat-loss RCT | Zero standalone modifier; classified as ancillary |
| **Stanozolol (Winstrol)** | One elderly trial shows increased fat; no athletic deficit data | Near-zero p_fat delta; lean-retention mild at best |

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-06-08 | 1.0 | Initial research synthesis. 29 sources cited. Compounds covered: Testosterone, Boldenone, Nandrolone, Trenbolone, Oxandrolone, Stanozolol, Methasterone, Mesterolone, Clenbuterol, T3/Liothyronine, MK-677. Combining formula + Python pseudocode included. |
