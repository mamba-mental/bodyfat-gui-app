# Preliminary Two-Week Template Mapping

## Provenance and Status

- Original source: `C:\Users\tiran\Downloads\Two-Week-Cut-Comprehensive-Plan.md`
- Original SHA-256: `4EA1C012F03D9EFEEE35564867A741BF291D94D8120C4C92E658DA11FA309EA3`
- Preserved project asset: `two-week-cut-preliminary.md`
- Preserved asset SHA-256 after line-ending normalization: `D010C42B9ACADBD99A066957CCF893FFB12211A3150312E6196FEC3FC4FEFFAD`
- Import status: `draft`
- Duration: exactly 14 calendar days
- PED/protocol module: `not_provided`

The preserved Markdown remains the source artifact. A structured runtime revision is derived from it, validated, and editable. The import MUST NOT convert the document's example values into personal facts without explicit user confirmation.

## Structured Modules

| Source section | Runtime module | Key editable fields |
|---|---|---|
| Purpose, assumptions, bottom line | `metadata` | name, purpose, assumptions, status, duration, expectation notes |
| Nutrition targets | `nutrition.targets` | formula, deficit range, calorie target, protein/fat/carbohydrate targets, bodyweight basis |
| Day types | `nutrition.day_types` | standard, controlled-high-carb, appearance-day calories and macros |
| Meal structure and food rules | `nutrition.meals` / `nutrition.rules` | meal count, meal targets, food guidance, conditional high-carb changes |
| 14-day execution calendar | `days[1..14]` | training, cardio/movement, nutrition day type, key instruction |
| Workouts A-D and pump circuit | `workouts` | exercises, sets, reps, tempo, rest, ordering, optionality |
| Week 2 progression | `progression_rules` | load/volume alternatives, recovery regressions, excluded techniques |
| Hydration/sodium/final 24 hours | `hydration` / `appearance_day` | consistency rules, prohibited practices, conditional appearance steps |
| Supplements | `supplements` | continue, optional, do-not-add, contextual cautions |
| Recovery | `recovery_rules` | sleep target, low-sleep adaptation, session duration, recovery activity |
| Measurement | `measurements` | daily metrics, days 1/7/14 metrics, collection instructions |
| Day 6 adjustment | `adjustment_rules` | condition, audit step, mutually exclusive adjustment choices, recovery response |
| Stop/escalation guidance | `safety` | stop conditions, contraindication notes, acknowledgement requirement |
| Decision record/checklist/references | `rationale` / `checklist` / `references` | retained/rejected rationale, daily requirements, source links |

## Values Requiring Confirmation or Separate Data

1. The 245 lb, 5'9" example is an assumption and MUST be recalculated from the active profile rather than saved as the member's current values.
2. Calorie and macro values are examples until PRIME calculates the member-specific plan and the user accepts the preview.
3. The statement about Adderall and coffee is contextual source text, not a verified medication record; the application MUST NOT add it to the profile automatically.
4. Day 13 high carbohydrate intake and Day 14 appearance steps are conditional and require an explicit appearance-target option.
5. The Day 6 reduction-or-cardio rule is mutually exclusive; both changes MUST NOT be auto-applied together.
6. No PED schedule, compound list, dose, timing, or review evidence appears in this source. Integrated PED presentation remains unavailable.
7. References remain provenance, not proof that the application independently reviewed or clinically validated every instruction.

## Editing Contract

- Editing the reusable template creates a new immutable revision and updates the template's current-revision pointer.
- A challenge activation stores the exact template revision plus a complete plan snapshot.
- Editing a template after activation affects future challenges only unless the user deliberately starts an active-plan amendment.
- An active-plan amendment names an effective future day, stores a reason and before/after diff, and creates a new plan revision.
- Completed days, historical check-ins, and reports are never silently rewritten.
- Restoring an earlier template revision creates a new revision copied from the historical one; it does not erase intervening history.
- Reports identify the activated template revision and every amendment with its effective day/date.
