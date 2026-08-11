# Change: Simplify Plan Creation Flow

## Why

The current Plan Studio mixes standard-program selection, two-week template management, source-protocol selection, inventory coverage, preview, and activation on one surface. Members must understand internal terms such as template activation, protocol window, preview readiness, cycle, and challenge before the next action is clear.

The approved redesign replaces that mixed workspace with a Plans landing page and a guided, resumable setup flow. It preserves all existing lifecycle, safety, inventory, calculation, and reporting behavior while revealing each decision only when it becomes relevant.

## What Changes

- Rename the persistent navigation destination from **Plan Studio** to **Plans** and the page heading to **Start or change a plan**.
- Show the active plan first, with a direct action to continue the current standard plan or two-week command center.
- Ask members to choose a standard cut or a 14-day cut before displaying setup details.
- Keep standard 12/15/22-week creation on the existing editable profile-inheritance flow.
- Replace the all-at-once 14-day builder with five ordered steps: Basics, Diet & Training, PED Schedule, Readiness, and Review.
- Persist the in-progress wizard position and safe scalar selections locally so the member can leave and resume without placing health/protocol payloads in URLs.
- Move source schedule and PED inventory controls to the PED Schedule step.
- Consolidate template readiness, source/inventory blockers, review evidence, safety acknowledgement, and exact preview into the Readiness step.
- Reserve plan activation for the final Review step and identify that reviewed snapshot as the source for the command center and reports.
- Implement the approved Voltage semantic visual system while inheriting all seven palettes and light/dark mode through existing tokens.

## Impact

- Affected specs: new `plan-creation` capability; existing program and challenge lifecycle behavior remains authoritative.
- Affected frontend: shared navigation, `Plans` route, Plan Studio component, focused UI tests, and current user documentation.
- Affected backend/data: none. Existing cycle, template, inventory, preview, activation, amendment, and report APIs remain unchanged.
- Compatibility: `/plans` remains the route; old bookmarks continue to work.
- Safety: the redesign does not recommend, infer, substitute, or prescribe PED content. Existing source, coverage, review, and acknowledgement gates remain blocking.

## Approval

The user approved the simplified workflow, confirmed the Voltage semantic palette contract, and approved the generated north-star Plans screen in this task before implementation began.
