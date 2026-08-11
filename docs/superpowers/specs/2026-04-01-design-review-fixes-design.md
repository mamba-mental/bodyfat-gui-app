# Design: Design Review Fixes

> **Historical April design artifact.** Current visual/product decisions are governed by `PRODUCT.md`, the palette/Feature Lab OpenSpec change, and the August 11 flow review.

**Date**: 2026-04-01
**Branch**: 007-design-review-fixes
**Spec**: specs/007-design-review-fixes/spec.md

## Summary

Fix 10 design review findings to bring the Ap3xFit.ai Alpha from C+ to B+ design score. All changes are frontend-only. No backend API changes required.

## Architecture

The fixes are organized into 3 batches by change type, executed in dependency order:

### Batch 1: CSS/Styling Fixes (parallel-safe, no component logic changes)

**FR-002: Touch targets** — Add `min-h-[44px]` and appropriate padding to all sidebar navigation links in `main-layout.tsx`. Increase the "Set Up Profile" CTA from text link to a proper Button component.

**FR-006: Heading scale** — Define a consistent heading scale in `globals.css` or Tailwind config. H1=2rem (32px), H2=1.5rem (24px), H3=1.25rem (20px). Apply across all pages. The dashboard H1 currently at 18px is the outlier — it needs to match.

**FR-004: Color palette** — The setup page already uses blue (`bg-blue-600`) for CTA and green for Custom Setup accents. Carry these forward to the dashboard. Define CSS custom properties: `--color-primary: hsl(221.2 83.2% 53.3%)` (shadcn blue), `--color-accent: hsl(142.1 76.2% 36.3%)` (shadcn green). Apply primary color to dashboard welcome card CTA and key interactive elements.

**FR-008: Sidebar tablet collapse** — In `main-layout.tsx`, the sidebar should default to collapsed at `md` breakpoint (768px). The existing `Toggle Sidebar` button already works. Add a Tailwind responsive class or useMediaQuery hook to set initial collapsed state based on viewport.

**FR-009: Export button relocation** — Move "Export Data" from the orphaned header position into the Settings page as a section. Add a small export icon-button in the toolbar alongside the sidebar toggle if quick access is needed.

### Batch 2: Component Fixes (sequential, logic changes)

**FR-001: Blank entries page** — The `/entries` route likely renders outside the MainLayout wrapper. Wrap it in the same layout component used by other pages, or fix the missing import/layout nesting. This is a bug fix, not a design change.

**FR-003: Dashboard empty state** — Replace the minimal dashed-border card with a rich empty state component:
- Lucide icon (e.g., `Activity` or `TrendingUp`) at 48px, using primary color
- "Welcome to Ap3xFit.ai" heading at H1 scale
- "Track your body composition journey with AI-powered insights" description
- Primary Button: "Set Up Profile" (not a text link)
- Secondary text: "Takes about 2 minutes"

**FR-005: Saving spinner** — In `entry-form.tsx`, the "Saving..." state is likely tied to a `loading` or `isSubmitting` state that initializes as `true` or triggers on mount. Fix: initialize as `false`, only set to `true` after form submission begins.

**FR-007: Dev overlay** — The red "1 Issue" badge is Next.js error overlay. This only appears in development mode. For production builds it's already hidden. For dev: either fix the underlying error, or note this is expected behavior in development. Not a code change — document it.

### Batch 3: Feature Addition

**FR-010: Dark mode toggle** — The `theme-context.tsx` already supports light/dark/system. Add a toggle component to the sidebar footer or header:
- Use shadcn `DropdownMenu` with Sun/Moon/Monitor icons
- Three options: Light, Dark, System
- Persist via the existing theme context (which uses localStorage)

## Components Affected

| Component | File | Changes |
|-----------|------|---------|
| MainLayout | `src/components/layout/main-layout.tsx` | Touch targets, sidebar collapse, export button |
| Dashboard | `src/components/dashboard/index.tsx` | Empty state redesign, color |
| EntryForm | `src/components/forms/entry-form.tsx` | Fix saving spinner |
| Entries Page | `src/app/entries/page.tsx` | Fix blank render |
| Globals | `src/app/globals.css` | Heading scale, color variables |
| Theme Toggle | New: `src/components/ui/theme-toggle.tsx` | Dark mode UI control |

## Data Flow

No data flow changes. All fixes are presentational except:
- FR-001 (entries page): routing/layout fix
- FR-005 (spinner): form state initialization fix
- FR-010 (theme toggle): wires existing theme context to new UI component

## Error Handling

No new error handling needed. FR-001 fix may reveal underlying errors that were being swallowed by the blank render.

## Testing Strategy

- Visual regression: screenshot before/after for each fix
- Touch target audit: programmatic check that all interactive elements >= 44px
- Responsive: verify sidebar collapse at 768px
- Theme toggle: verify light/dark/system all apply correctly
- Entries page: verify page renders with sidebar and content

## Implementation Order

**Phase 1: Bug fixes + CSS (can be parallelized)**
1. FR-001 (blank entries page) — unblocks testing of other fixes on that page
2. FR-002 (touch targets) — CSS only, global impact
3. FR-004 (color palette) — CSS variables, global impact
4. FR-006 (heading scale) — CSS only, global impact
5. FR-005 (saving spinner) — component fix, isolated
6. FR-007 (dev overlay) — documentation only

**Phase 2: Component enhancements (depends on Phase 1 CSS)**
7. FR-003 (dashboard empty state) — component change, depends on color palette
8. FR-008 (sidebar tablet) — layout change, CSS + hook
9. FR-009 (export button) — layout change, small
10. FR-010 (dark mode toggle) — new component, depends on layout

**Phase 3: Onboarding wizard (FR-011)**
11. Step-by-step wizard component with progress indicator
12. Profile templates (Bodybuilder cutting, General weight loss, Athletic recomp)
13. Smart defaults and pre-fill logic
14. Back/forward navigation with state preservation

**Phase 4: Data visualization enhancements (FR-012)**
15. Before/after body composition comparison chart
16. Weekly/monthly trend overlay on progress chart
17. Goal projection line with confidence band
18. Photo progress timeline (upload, tag to date, scrollable view)

### FR-011: Onboarding Wizard Design

Replace the current two-card setup page with a multi-step wizard:

**Steps:**
1. **Welcome** — Name, age, gender, DOB (pre-filled from demo if available)
2. **Body Measurements** — Height, current weight, current BF%, optional waist/hip/neck
3. **Goals** — Goal weight, goal BF%, timeline (with visual slider showing realistic ranges)
4. **Activity & Training** — Activity level, workout type, workout days, resistance training (with profile templates: "I'm a bodybuilder cutting", "General fitness", "Just tracking")
5. **Diet & Lifestyle** — Diet type, eating pattern, protein intake, sleep quality
6. **Review & Start** — Summary card showing all entered data, "Start Tracking" CTA

**UX Details:**
- Progress bar at top showing current step (1/6, 2/6, etc.)
- Each step is one screen — no scrolling on desktop, minimal scroll on mobile
- Back button preserves all entered data
- Profile templates on Step 4 pre-fill Steps 2-5 with common configurations
- "Skip to defaults" option on steps 3-5 for users who want to get started fast
- Animated transitions between steps (subtle slide)

### FR-012: Data Visualization Design

**12a: Before/After Comparison**
- Side-by-side bar chart: Starting weight/BF% vs Current weight/BF%
- Color-coded: starting values in muted gray, current values in primary color
- Delta labels showing change (+/- lbs, +/- % BF)
- Placed on the dashboard as a summary widget when user has 2+ entries

**12b: Trend Overlays**
- Toggle on the existing progress-trend-chart: "Compare to: Last week | Last month | Last program"
- Overlay line in lighter/dashed style on same axes
- Highlight delta in tooltip on hover

**12c: Goal Projection Line**
- Dashed line extending from latest data point to projected goal date
- Based on linear regression of last 14 days of data (or all data if < 14 days)
- Confidence band (shaded area) showing optimistic/pessimistic scenarios (+/- 1 std dev)
- If projected date exceeds end_date, show a warning: "At current pace, goal will be reached on [date]"

**12d: Photo Progress Timeline**
- Horizontal scrollable strip below the main chart
- Each photo tagged to a date (same date as an entry)
- Click to expand to full view with overlay of that day's stats
- Upload via drag-and-drop or file picker on the New Entry form
- Photos stored locally (base64 in entry data) with optional server sync
- Maximum 5MB per photo, auto-compressed to 1920px max width
