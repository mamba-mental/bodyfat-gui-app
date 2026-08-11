# Mobbin design options for remaining Apex Fit pages

These are reference patterns, not instructions to copy another product. Each lane preserves Apex Fit's information and workflows while providing a concrete structure to react to before implementation.

The options are **not mutually exclusive comps that require discarding the other cards/widgets**. They are a pattern library: each reference can contribute useful hierarchy, navigation, form, chart, history, or action behavior to one coherent Apex Fit system. Implementation still follows the selected Quiet Strength/Apex Fit shell, banner, seven palettes, and semantic tokens.

**Current disposition:** Dashboard, guided Plans, 14-day Command Center, Settings palette selection, nutrition, and challenge discovery have been modernized. Plans now uses active-plan context, progressive disclosure, a five-step 14-day setup, an actionable readiness checklist, and an exact final review. New Entry, AI Coach, Reports/history, Progress Charts, and portions of Settings remain the highest-value destinations for the patterns below. Palette-token completion on the remaining modern surfaces is a prerequisite for calling the visual migration complete.

## New Entry and daily check-in

1. [Hims focused measurement form](https://mobbin.com/screens/9654baf0-4e76-4662-8777-948c54d570c9) — one focused column, low cognitive load, strong completion action. Best fit for the standard body-composition entry.
2. [Fresha staged consultation](https://mobbin.com/screens/4bdb985e-94fa-40fd-80ee-bd4bc0ded7fc) — grouped sections with explanatory context. Best fit for the longer 14-day daily check-in.
3. [Julienne health-profile panel](https://mobbin.com/screens/48b235e2-dfdd-4d57-85c1-326d7e156aee) — measurements and nutrition targets remain visible beside the form. Best fit when users need their targets while logging.

Recommended synthesis: Hims' focused form plus Julienne's persistent target summary.

## Progress Charts and analytics

1. [Fresha performance dashboard](https://mobbin.com/screens/510e25d1-0df7-4fbe-aaae-cdd959473ef5479) — date controls and filters lead into one primary trend chart, followed by secondary metrics.
2. [Clockwise analytics](https://mobbin.com/screens/732d4498-c9c9-41e5-a694-4104144ab8da) — sparse metric hierarchy with generous chart space.
3. [Open practice summary](https://mobbin.com/screens/5dc29a96-ecde-44b0-914e-07961161d2e8) — immersive summary band before detailed statistics.

Recommended synthesis: Fresha's controls and chart hierarchy with Clockwise's density.

## Reports and history

1. [Gusto report history](https://mobbin.com/screens/f6f0d3be-5395-4059-b375-4a04dfef5479) — type/date/status/action columns and useful report tabs.
2. [Zoom version history](https://mobbin.com/screens/681304f3-411a-41b5-a477-e523e844709c) — compact before/after history table for revision comparison.
3. [DocuSign envelope history](https://mobbin.com/screens/3b9577ec-b873-41e6-8a9b-82588f79da3b) — report summary, activity trail, and download action on one screen.

Recommended synthesis: Gusto's index with DocuSign's report-detail audit trail. This is especially useful for immutable 14-day plan and protocol revisions.

## AI Coach

1. [Otter AI chat](https://mobbin.com/screens/aa248857-13e4-4106-ad47-da80950aa7e3) — conversation history beside a large, calm coaching canvas.
2. [WRITER assistant](https://mobbin.com/screens/9652aa1a-2aeb-469c-8a84-12d4d01c788c) — centered composer, clear capability chips, and suggested task cards.
3. [Lightfield assistant](https://mobbin.com/screens/a77b052b-5612-4588-895a-6cc553d5b18d) — extremely quiet workspace with high-value suggested prompts.

Recommended synthesis: Otter's durable conversation history with WRITER's suggested actions. Apex Fit prompts should be grounded in current metrics, the active cut, today's nutrition variance, and the bound protocol revision.

## Settings and integrations

1. [Cal.com appearance settings](https://mobbin.com/screens/f561880a-1845-4179-904d-3c3aa8941090) — nested settings navigation and large, visual theme previews.
2. [Featurebase settings](https://mobbin.com/screens/55aece6e-963e-4f34-bbbf-e0bbb52f01c5) — organized account sections and strong appearance-selection cards.
3. [Twenty experience settings](https://mobbin.com/screens/f42390bf-a8f7-4cad-ad42-a95091b84285) — compact appearance controls followed by locale and format preferences.

Recommended synthesis: Featurebase's information architecture with Cal.com's visual previews. The seven Apex Fit palettes already use this direction.

## Suggested implementation order

1. New Entry and daily check-in: frequent, high-value action.
2. AI Coach: unify chat and insights around current plan context.
3. Reports: expose 14-day source/revision history clearly.
4. Progress Charts: reduce the legacy widget density without removing metrics.
5. Settings: complete the structural refresh after all destination pages stabilize.

## Functional preservation checklist

Every future page update must retain:

- the current route and sidebar/header entry point;
- active-cycle context and historical-cycle access;
- all existing data fields, validation, loading/error/empty states, and exports;
- keyboard/focus/reduced-motion/responsive behavior;
- the uploaded banner where the shell calls for it;
- seven palette choices through semantic tokens;
- source/revision/protocol/inventory provenance on report/challenge pages;
- explicit distinction between shipped features and coming-soon actions.
