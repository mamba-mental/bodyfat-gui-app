# Change: Convert Changelog from Popup to Dedicated Page

## Why

The application currently uses a popup Dialog component for displaying the changelog (src/components/changelog.tsx line 190 in main-layout.tsx), which creates UX limitations:

- **Limited Viewport**: ScrollArea with 400px height limit truncates content visibility
- **Modal Interaction**: Blocks background interaction, preventing users from referencing changelog while navigating
- **Inconsistent Navigation**: All other content areas use proper routing, but changelog uses popup pattern
- **SEO Limitations**: Popup content not accessible via direct URL for sharing/bookmarking
- **Mobile Experience**: Popup dialogs are suboptimal on small screens compared to full-page layouts

**Root Cause**: The sidebar uses `<ChangelogDialog />` component (imported from src/components/changelog.tsx) instead of linking to the existing `/changelog` page route.

**Discovery**: A dedicated changelog page ALREADY EXISTS at `src/app/changelog/page.tsx` with superior features:
- Full-page Card-based layout
- Better typography and spacing
- Includes "deployment" change type (not in popup version)
- Proper page semantics and routing
- Mobile-responsive design

**User Impact**:
- Users cannot share changelog URL with others
- Limited space makes it difficult to read full release notes
- No browser history tracking for changelog views
- Cannot open changelog in new tab/window
- Mobile users face cramped popup experience

## What Changes

This change **migrates from popup Dialog to dedicated page route** for changelog display:

1. **Update sidebar navigation**:
   - Replace `<ChangelogDialog />` component with standard Link to `/changelog`
   - Add changelog to `toolItems` navigation array
   - Use proper History icon from lucide-react
   - Maintain consistent navigation pattern with other routes

2. **Remove legacy popup component**:
   - Delete `src/components/changelog.tsx` (176 lines)
   - Remove ChangelogDialog import from main-layout.tsx
   - Clean up unused Dialog component dependencies

3. **Enhance existing changelog page** (optional improvements):
   - Add filtering by change type (feature/bug/deployment)
   - Add search functionality for release notes
   - Add "Coming Soon" section for planned features
   - Improve mobile responsiveness for small screens
   - Add lazy-loading for entries beyond 5 latest versions

4. **Preserve changelog data**:
   - Keep existing changelog entries in page.tsx
   - Maintain changelog data structure
   - Ensure no data loss during migration

5. **Update routing expectations**:
   - `/changelog` becomes primary changelog access point
   - Remove Dialog component from component library
   - Update any documentation referencing changelog popup

## Impact

**Affected specs**:
- `changelog-display` - New capability spec for dedicated page routing
- `navigation` - Updated to include /changelog route in sidebar

**Affected code**:
- `src/components/layout/main-layout.tsx` - Replace ChangelogDialog with Link (lines 19, 190)
- `src/components/changelog.tsx` - DELETE entire file (legacy)
- `src/app/changelog/page.tsx` - Already exists, minor enhancements only

**Breaking Changes**: None - this is a UX improvement migration

**Migration Strategy**:
- Phase 1: Add `/changelog` link to sidebar alongside existing Dialog
- Phase 2: Monitor usage, confirm page works correctly
- Phase 3: Remove Dialog component
- Phase 4: Delete legacy component file

**Backward Compatibility**: No API changes, purely frontend navigation pattern shift
