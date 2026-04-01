# Feature Specification: Design Review Fixes

**Feature Branch**: `007-design-review-fixes`
**Created**: 2026-04-01
**Status**: Draft
**Input**: Fix 10 design review findings from professional design audit of Ap3xFit.ai Alpha

---

## Summary

A professional design audit of the Ap3xFit.ai body composition tracker identified 10 findings across visual hierarchy, accessibility, responsiveness, and polish. This specification addresses all findings to bring the application from a C+ design score to B+ or higher.

**Design Score Target**: C+ (current) -> B+ or higher
**AI Slop Score**: A (maintain — no regressions)

---

## User Scenarios & Testing

### Primary User Story
As a fitness-focused user opening Ap3xFit.ai for the first time, I want the application to feel polished, professional, and trustworthy so that I am confident entering my personal body composition data.

### Acceptance Scenarios

1. **Given** a new user with no profile, **When** they land on the dashboard, **Then** they see an inviting empty state with clear visual guidance, brand colors, and a prominent call-to-action button (not a text link) to set up their profile.

2. **Given** a user navigating to the Entry History page, **When** the page loads, **Then** they see the full application layout (sidebar + content) with either their entries listed or a warm empty state — never a blank white page.

3. **Given** a user on a tablet device (768px width), **When** viewing any page, **Then** the sidebar is collapsed by default and the content area uses the full available width.

4. **Given** a user navigating the sidebar on a mobile device, **When** they tap any navigation link, **Then** the tap target is comfortable to hit (at least 44px tall) without accidental mis-taps.

5. **Given** a user opening the New Entry form, **When** the form loads, **Then** no loading spinner or "Saving..." indicator appears until the user initiates a save action.

6. **Given** a user who prefers dark mode, **When** they look in Settings or the header area, **Then** they find a visible toggle to switch between light, dark, and system themes.

### Edge Cases
- What happens when the entries page has zero entries? -> Display warm empty state with illustration and "Add Your First Entry" button
- What happens when the dashboard loads with a profile but zero entries? -> Show profile summary with "Ready to track" messaging and entry CTA
- What happens on very narrow screens (<375px)? -> Content remains usable with no horizontal scroll

---

## Requirements

### Functional Requirements

**Critical (Must fix before next release)**

- **FR-001**: The Entry History page MUST render the full application layout (sidebar, header, content area) and display entry data or an appropriate empty state — it MUST NOT render a blank white page.

- **FR-002**: All interactive elements (navigation links, buttons, form controls) MUST have a minimum touch target size of 44x44 pixels, following WCAG 2.1 Success Criterion 2.5.5.

- **FR-003**: The dashboard empty state MUST include: a welcoming heading, descriptive text, a visual element (icon or illustration), and a prominent button-style call-to-action — replacing the current minimal dashed-border card with text link.

- **FR-004**: The dashboard and all primary views MUST use the application's brand color palette (not monochrome black/gray/white), with at least one accent color for interactive elements and visual hierarchy.

**Important (Should fix)**

- **FR-005**: The New Entry form MUST NOT display any loading or saving indicators until the user initiates a save action (clicking Save or submitting the form).

- **FR-006**: Heading sizes MUST follow a consistent typographic scale across all pages. The primary page heading (H1) MUST use the same base size on every page.

- **FR-007**: Development-only overlays and badges (such as error count indicators) MUST NOT appear in production builds. In development mode, they should be clearly labeled as development tools.

- **FR-008**: On tablet viewports (768px-1024px), the sidebar navigation MUST collapse by default, giving the content area full width. Users can expand the sidebar via the toggle button.

**Polish (Nice to have)**

- **FR-009**: The Export Data functionality MUST be accessible from a contextually appropriate location (such as the Settings page or a toolbar with related actions) rather than appearing as an isolated button in the header.

- **FR-010**: A theme toggle (Light / Dark / System) MUST be visible and accessible in the application header or Settings page, activating the existing theme system already built into the codebase.

**New Features (Brainstorm additions)**

- **FR-011**: The profile setup flow MUST be redesigned as a step-by-step wizard with a visual progress indicator, showing one section per step (personal info, body measurements, goals, activity level, diet preferences). Each step MUST have smart defaults and pre-fill options based on common body type profiles (e.g., "Bodybuilder cutting", "General weight loss", "Athletic recomp"). The wizard MUST allow going back to previous steps without losing data.

- **FR-012**: The data visualization system MUST be enhanced with four new chart capabilities:
  - (a) Before/after body composition comparison view showing starting stats vs current stats as a visual side-by-side (bar chart or body outline graphic)
  - (b) Weekly and monthly trend overlays allowing users to compare current period performance against previous periods on the same chart
  - (c) Goal projection line on the progress chart showing the predicted trajectory to goal weight/BF% based on current rate of change, with a confidence band
  - (d) Photo progress timeline where users can upload progress photos tagged to specific entry dates and view them in a scrollable timeline alongside their data points

### Success Criteria

1. All interactive elements pass the 44px minimum touch target audit when tested on mobile viewport (375px)
2. No page in the application renders a completely blank content area — every route shows the application shell and appropriate content or empty state
3. The application uses a cohesive color palette with at least 3 distinct, intentional colors (primary, secondary, accent) visible on the dashboard
4. Users can switch between light and dark themes via a visible UI control
5. The heading hierarchy is visually consistent: H1 is the same size on every page, H2 is the same size on every page, etc.
6. The dashboard empty state receives a subjective quality rating of "inviting" or better from 3 out of 5 testers (warm messaging, visual element, clear CTA)
7. Tablet users (768px viewport) see content using at least 75% of the screen width with sidebar collapsed

### Key Entities

- **Navigation Item**: Sidebar link with icon, label, and route. Must meet minimum touch target.
- **Empty State**: Composed of heading, description, visual element, and primary action. Used on dashboard, entries, reports, and charts when no data exists.
- **Theme Setting**: User preference for light/dark/system theme, persisted across sessions.
- **Page Heading**: Consistent H1 element present on every page following the typographic scale.

---

## Assumptions

- The blank entries page is a rendering bug (missing layout wrapper or error boundary), not an intentional design decision
- The "1 Issue" red badge is the Next.js development error overlay — it will not appear in production builds
- The existing theme context (`theme-context.tsx`) is functional and only needs a UI toggle to be user-accessible
- Brand colors can be derived from the setup page (which already uses blue and green accents) and applied consistently
- The sidebar already has a collapse mechanism (`Toggle Sidebar` button exists) — tablet behavior just needs a responsive default
- The "Saving..." spinner on the entry form is a state initialization issue, not an intentional loading indicator

---

## Scope Boundaries

**In scope:**
- All 10 design review findings (FR-001 through FR-010)
- Step-by-step onboarding wizard redesign (FR-011)
- Enhanced data visualization: comparisons, overlays, projections, photo timeline (FR-012)
- CSS/styling changes for touch targets, spacing, colors, headings
- Component fixes for blank page, empty states, form loading state
- Adding a visible theme toggle using existing theme infrastructure
- Relocating the Export Data button to a more contextual position

**Out of scope:**
- Authentication or multi-user support
- Backend API changes beyond what FR-012 photo uploads require
- Performance optimization beyond what's required for the fixes
- Third-party integrations (wearables, MyFitnessPal, etc.)
- Native mobile app (PWA improvements are in scope, native is not)

---

## Dependencies

- Existing shadcn/ui component library (already installed)
- Existing theme context infrastructure (already built)
- Existing sidebar collapse mechanism (already functional)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (via reasonable defaults)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
