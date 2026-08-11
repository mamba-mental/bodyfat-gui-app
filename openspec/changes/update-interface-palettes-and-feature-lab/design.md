## Context

The app contains a legacy token system and newer prototype screens with green/brown hex values. The member wants the newer information architecture and banner retained but needs multiple modern palette choices. Nutrition and cloud-sync roadmap cards also need to reflect their actual implementation state.

## Goals / Non-Goals

- Goals: seven durable palettes, WCAG-aware semantics, retained banner, working nutrition actuals, accurate Feature Lab statuses, safe cloud-readiness boundary, and reference options for legacy page redesign.
- Non-goals: automatic MyFitnessPal account access, enabling remote cloud writes, selecting a managed database/auth vendor, or redesigning every legacy page before the member chooses a reference lane.

## Decisions

### Palette is independent from brightness

`palette` is persisted beside `theme` and `font`. The root receives `data-palette`; Light/Dark/System continues to control the `.light`/`.dark` class. Each palette owns semantic OKLCH values rather than introducing per-component accent props.

### Prototype colors use a bounded compatibility layer

New challenge/dashboard surfaces keep their current component structure while prototype hex classes are mapped to semantic variables under `.apex-theme`. Shared and legacy components continue using the core semantic tokens. This avoids a high-risk simultaneous rewrite while making every palette immediately functional.

### Nutrition imports remain member-controlled

CSV parsing occurs in the browser. Validated records are sent to a bounded local API and stored in the app data directory. MyFitnessPal imports use deterministic fingerprints so importing the same export updates matching rows. Manual records receive unique IDs. Daily summaries compare actual intake with the active PRIME calculation.

### Cloud status is readiness, not pretend sync

The app reports only the presence/absence of database, authentication, and enablement configuration classes. It never returns connection values. SQLite remains authoritative until an externally approved provider and migration rehearsal succeed.

## Risks / Trade-offs

- The compatibility layer temporarily recognizes prototype class values. Mitigation: scope it to `.apex-theme` and retire mappings as each page is converted to semantic classes.
- CSV formats vary. Mitigation: support common header aliases, validate Date/Calories, expose a sample, and fail with a specific error instead of importing ambiguous rows.
- Static PRIME targets can differ by day type. Mitigation: label the comparison against the active calculation and continue using challenge day targets inside the 14-day Command Center.
- Cloud configuration can expose secrets if surfaced carelessly. Mitigation: readiness booleans only; no values, hosts, tokens, or connection strings in responses.

## Migration Plan

1. Default missing palette preferences to Voltage without changing brightness or font.
2. Persist palette in existing theme-preferences JSON; older records remain valid.
3. Create nutrition storage lazily on first write; no existing data migration is required.
4. Keep SQLite authoritative and cloud writes off.
5. Verify every palette in Light/Dark modes, navigation parity, banner rendering, CSV/manual logging, dashboard actuals, and existing challenge/report paths.
