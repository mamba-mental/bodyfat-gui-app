## Context

`src/components/challenge/plan-studio.tsx` currently exposes standard duration selection and the complete 14-day challenge builder in one component. Standard selections navigate to the established copied-profile setup route, while 14-day selection expands protocol, inventory, template, preview, and activation controls in place. The backend contracts are already complete and must remain the single source of truth.

## Goals / Non-Goals

### Goals

- Make the first useful action understandable within seconds.
- Separate standard and 14-day setup without creating parallel backend behavior.
- Preserve current plan context and a direct continuation path.
- Use ordered progressive disclosure for the high-detail 14-day setup.
- Preserve work across ordinary navigation or reloads where it is safe to do so.
- Keep all seven palettes semantically correct and keyboard/touch accessible.
- Make the final report-input snapshot explicit before activation.

### Non-Goals

- No new calculation, PED recommendation, inventory, clinical-validation, report, or cycle APIs.
- No change to completed-day immutability or future-effective amendment behavior.
- No automatic medical review or source-range resolution.
- No separate mobile implementation or new UI framework.

## Decisions

### Decision: Keep one `/plans` route with progressive disclosure

The landing decision and 14-day steps remain in one client component so existing links and loaded challenge data stay stable. The standard path continues to the existing `/setup/custom?newProgram=true&weeks=...` route.

### Decision: Use five real steps

The 14-day flow uses Basics, Diet & Training, PED Schedule, Readiness, and Review. Step order is meaningful and therefore earns a numbered progress rail. Members may return to completed earlier steps; forward navigation requires the current step's local prerequisites.

### Decision: Persist only safe wizard navigation state

The browser stores the selected plan kind, standard duration, current wizard step, challenge start date, and selected source week. Complete profile, PED inventory, review evidence, and preview payloads remain in their existing stores/APIs and are not duplicated in wizard local storage.

### Decision: Preserve server gates

The preview API remains the readiness authority. The interface translates its blockers into an actionable checklist but never replaces its validation. Template activation continues through the existing endpoint. Challenge creation continues through the existing create endpoint and requires `preview.readiness.ready` for activation.

### Decision: Semantic tokens only

The redesigned surface uses `background`, `card`, `foreground`, `muted`, `primary`, `accent`, `success`, `warning`, `border`, and `ring` roles. It does not add feature-specific hard-coded green/brown colors. Voltage is the default, and the other six palette identities inherit the same topology and state meanings.

## Risks / Trade-offs

- Unmounting the inventory workspace between steps can obscure unsaved form input. Mitigation: keep the workspace mounted once the PED step has been visited and hide it visually when later steps are active, while retaining parent activation context.
- A local wizard draft can become stale if server templates or profile data change. Mitigation: reload canonical template/catalog/profile data and invalidate the exact preview whenever relevant local selections or activation context change.
- The template editor is a separate route. Mitigation: provide a clear edit action and preserve wizard navigation state so returning to `/plans` resumes the intended step.
- A five-step flow adds clicks. Mitigation: each step contains one coherent decision, supports back navigation, and avoids the previous full-page cognitive load.

## Verification

- Unit/component tests for navigation naming, landing decisions, step order, standard routing, local draft restoration, readiness gates, and final activation labeling.
- Playwright verification at desktop and mobile widths, including keyboard focus and no horizontal overflow.
- Existing challenge API and report tests remain unchanged and must pass.
- Strict OpenSpec validation, TypeScript typecheck, production build, and deterministic UI detector.
