# Change: Add a Two-Week Cut Challenge

## Why

The application supports open-ended ReComp cycles and week-based PRIME projections, but it does not provide a dedicated 14-day experience that combines daily adherence, calorie and diet scheduling, protocol status, and a challenge-specific report. A separate challenge mode is needed so short cuts are not disguised as ordinary 12–22 week programs or mixed into their progress history.

## What Changes

- Add a distinct `two_week_cut` plan mode with an exact 14-day duration and day-level progress.
- Extend cycle persistence additively so standard programs and two-week challenges share history, scoping, and lifecycle behavior without losing existing data.
- Reuse the PRIME calculation engine for calorie, protein, feasibility, and ceiling/floor calculations while producing a 14-day schedule from its two weekly prescriptions.
- Add a required, versioned PED schedule snapshot contract. A 14-day plan may preview nutrition before selection, but activation and complete report generation require an explicitly selected, source-backed PED schedule.
- Import the supplied 14-day nutrition/training/safety document as an editable draft template with immutable revisions, source provenance, and a structured editor.
- Allow an active challenge to be amended explicitly for future days while preserving completed-day history, prior revisions, and already generated reports.
- Add a lightweight day-scoped challenge check-in for the actual values required by the source and final report, without pretending that a full meal, wearable, HRV, or workout-tracking subsystem already exists.
- Add protocol selection, source-week mapping, readiness, user confirmation, safety acknowledgement, and report-readiness states.
- Generate a challenge-specific Living Report from the same immutable calculation inputs and outputs used by the active plan, including its required PED schedule, diet schedule, adherence, actual entries, modifier provenance, and amendment history.
- Preserve every current navigation destination and workflow. The visual implementation will follow the design direction selected from the seven comps and will use shared design tokens/components rather than feature-specific styling.

## Selected Visual Direction

The selected structural direction is **Comp 5's premium editorial dashboard**, including its banner-led identity, clear hierarchy, serif display accents, precise utility type, hairline dividers, and restrained cards. The original warm green/brown palette is explicitly not part of the selection. The reference comp is stored at [`assets/quiet-strength-reference.png`](assets/quiet-strength-reference.png).

The 14-day challenge will use the same shared shell and the member-selected semantic palette rather than switching to a separate feature-specific theme. Its denser day-by-day command center is expressed through the shared hierarchy and remains functional across all seven palette choices.

This selection chooses the **visual language and shell**, not an exclusive bundle of widgets. Valuable concepts from the other comps remain in the product map and will be placed on the surface where they are most useful. Concepts that require new tracking data—such as meals, consumed macros, steps, workouts, sleep/HRV, streaks, achievements, or user-arranged widgets—remain explicit feature scope rather than being misrepresented as already implemented.

## Impact

- Affected specs: `program-tracking`, new `cut-challenges`
- Affected frontend: cycle manager, dashboard/program selector, setup flow, daily challenge view, reports, shared types
- Affected backend: cycle schema/migration, calculation request model, protocol loader, report generation
- Affected data: additive nullable cycle fields, versioned challenge templates, immutable plan/protocol snapshots, and auditable active-plan amendments; existing rows retain standard behavior
- Compatibility: no removal or reinterpretation of current 12/15/22-week or custom-length cycles
- Safety: no automated PED recommendation or dosage generation; unreviewed or missing protocol data remains visibly unavailable

## Preliminary Source Captured

The user-supplied preliminary document is preserved at [`assets/two-week-cut-preliminary.md`](assets/two-week-cut-preliminary.md). It is imported as `draft`, not `reviewed`. It supplies nutrition, training, cardio/movement, recovery, measurement, adjustment, appearance-day, supplement, and safety content. It does **not** supply a PED schedule.

The repository already contains a separate sourced PED protocol at `docs/protocol-data/nutrition-and-ped.json`, including phase timing and a week-by-week timeline. The 14-day builder SHALL let the member select and confirm the applicable sourced protocol revision and starting source week, derive exactly two consecutive source weeks, pass that selected stack into PRIME, and persist the resulting schedule with the plan/report snapshot. A generic `ped_use=true` flag or an empty compound row is insufficient.

The original download had SHA-256 `4EA1C012F03D9EFEEE35564867A741BF291D94D8120C4C92E658DA11FA309EA3`. The project copy is line-ending-normalized and is mapped in [`assets/two-week-cut-template-mapping.md`](assets/two-week-cut-template-mapping.md).

## Approval Gate

The visual-selection gate is complete. Implementation MUST NOT begin until the remaining gates are complete:

1. ~~A visual direction is selected.~~ **Complete: Comp 5 — Quiet Strength.**
2. ~~The preliminary two-week source is captured in the change with provenance.~~ **Complete: draft source captured; it is not yet reviewed or final.**
3. ~~PED integration behavior is selected.~~ **Complete: the PED schedule is required for activation and complete plan/report generation.**
4. The member confirms which sourced PED protocol revision and starting source week apply when activating a specific 14-day challenge.
