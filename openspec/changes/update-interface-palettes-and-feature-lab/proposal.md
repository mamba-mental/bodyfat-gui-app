# Change: Update interface palettes and activate the Feature Lab

## Why

The selected dashboard structure is useful, but its green/brown visual treatment is not acceptable to the member. Settings exposes only brightness, while several capabilities are incorrectly labeled as future work even though progress photos and AI Insights already exist. Nutrition actuals still lack the promised CSV/manual workflow, and cloud sync needs an honest readiness boundary rather than a misleading availability claim.

## What Changes

- Add seven selectable visual palettes, independent of Light/Dark/System mode, with Voltage as the default.
- Persist palette selection through the existing local/server theme preference path.
- Route the modern dashboard and 14-day surfaces through semantic palette tokens while retaining the uploaded banner and all existing routes.
- Add a nutrition workspace with manual intake logging, MyFitnessPal-compatible CSV import, deterministic re-imports, daily aggregation, PRIME-target variance, and dashboard actuals.
- Relabel Coming Soon as Feature Lab and expose progress photos and AI Insights as available capabilities.
- Add a credential-safe cloud-sync readiness endpoint and migration handoff while keeping cloud writes disabled until external providers are selected and validated.
- Capture Mobbin reference options for legacy pages before redesigning them.

## Impact

- Affected specs: `app-appearance`, `nutrition-logging`, `feature-readiness`
- Affected code: theme context/API/CSS, Settings, dashboard shell, nutrition API/page, photo timeline, cloud readiness, navigation, tests, and design documentation
- External dependency impact: none; managed Postgres and authentication remain unconfigured by design
