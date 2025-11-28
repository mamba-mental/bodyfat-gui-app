# Theme Persistence E2E Test Documentation

## Test ID: T025 [P] - Theme Persistence E2E Test

### Overview
This E2E test verifies that theme preferences persist correctly across browser sessions, page reloads, and navigation using Playwright. It validates the hybrid storage strategy (localStorage + cookie + database) implemented in the theme system.

### Test File
`tests/e2e/theme-persistence.spec.ts`

### Expected Outcome
✅ **PASS** - This is a regression test. Theme persistence is already implemented and should work correctly.

### Architecture References
- **Constitutional Requirement**: Article III - Frontend Stability (hybrid theme persistence)
- **API Contract**: `/api/theme` (theme-persistence.openapi.yaml)
- **Implementation Files**:
  - `src/contexts/theme-context.tsx` - Theme context provider
  - `src/app/api/theme/route.ts` - Theme API endpoint
  - `src/app/settings/page.tsx` - Settings UI with theme toggles

### Test Coverage

#### 1. **Default Theme Loading** (`should load default theme on first visit`)
- Verifies initial theme state
- Checks localStorage initialization
- Validates DOM class application

#### 2. **Theme Toggle** (`should toggle theme from light to dark and persist`)
- Tests UI theme toggle interaction
- Verifies DOM class changes
- Validates localStorage updates
- Confirms save operation with visual feedback

#### 3. **Browser Refresh Persistence** (`should persist theme after browser refresh`)
- Sets theme to dark
- Reloads page
- Verifies theme persists across reload
- Checks both DOM and localStorage consistency

#### 4. **Bidirectional Toggle** (`should toggle from dark to light and persist across reload`)
- Tests dark → light transition
- Verifies persistence after reload
- Ensures theme changes work in both directions

#### 5. **Cross-Route Persistence** (`should persist theme across different routes`)
- Sets theme on settings page
- Navigates to home and reports pages
- Verifies theme persists across all routes

#### 6. **System Theme Handling** (`should handle system theme preference`)
- Tests 'system' theme option
- Verifies system theme respects OS preference
- Checks persistence of system theme setting

#### 7. **Visual State Testing** (`should verify theme button visual states`)
- Validates active button states (border-primary class)
- Ensures only selected theme shows active state
- Tests UI feedback for theme selection

#### 8. **Cookie Verification** (`should verify cookie is set for SSR compatibility`)
- Checks theme cookie creation
- Validates cookie value matches selected theme
- Ensures SSR compatibility

#### 9. **Multi-Tab Consistency** (`should maintain theme consistency across new tab/window simulation`)
- Simulates opening new tab
- Verifies localStorage sharing across tabs
- Ensures theme consistency in new contexts

#### 10. **Navigation Persistence** (`should not lose theme on navigation and back button`)
- Tests browser back/forward navigation
- Verifies theme persists through navigation history

#### 11. **Full Theme Cycle** (`should complete full theme cycle: light → dark → system → light`)
- Comprehensive test of all theme transitions
- Validates each theme option
- Ensures no state corruption during cycles

### Storage Validation

The test verifies all three storage layers:

1. **localStorage** (`userSettings` key)
   ```json
   {
     "display": {
       "theme": "light" | "dark" | "system"
     }
   }
   ```

2. **Cookie** (`theme` cookie)
   - Set via `/api/theme` PUT endpoint
   - Used for SSR compatibility
   - Max age: 1 year

3. **DOM State** (html element class)
   - `<html class="light">` or `<html class="dark">`
   - Applied dynamically by ThemeProvider

### Test Execution

#### Run Single Test
```bash
npx playwright test tests/e2e/theme-persistence.spec.ts
```

#### Run with UI Mode
```bash
npx playwright test tests/e2e/theme-persistence.spec.ts --ui
```

#### Run in Debug Mode
```bash
npx playwright test tests/e2e/theme-persistence.spec.ts --debug
```

#### Run Specific Test
```bash
npx playwright test tests/e2e/theme-persistence.spec.ts -g "should persist theme after browser refresh"
```

### Test Selectors

The test uses the following selectors based on the settings page implementation:

- **Dark Theme Button**: `button` with text matching `/🌙\s*Dark/`
- **Light Theme Button**: `button` with text matching `/☀️\s*Light/`
- **System Theme Button**: `button` with text matching `/🖥️\s*System/`
- **Save Button**: `button` with text matching `/Save Settings/`
- **HTML Element**: `html` tag for class inspection
- **Saved Badge**: `text=Saved` for save confirmation

### Theme Implementation Details

#### Theme Context Flow
1. **Initial Load**: ThemeProvider checks localStorage → server storage → default
2. **Theme Change**: User clicks theme button → setTheme called → localStorage + server updated
3. **DOM Update**: useEffect applies class to html element
4. **Persistence**: Data saved to multiple layers for redundancy

#### Theme Application Logic
```typescript
// From theme-context.tsx
if (theme === 'system') {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  root.classList.add(systemTheme)
} else {
  root.classList.add(theme)
}
```

### Known Behaviors

1. **System Theme**: When set to 'system', the actual class applied depends on OS preference
2. **Save Required**: Theme changes require clicking "Save Settings" for full persistence
3. **Timing**: Small delays (300-500ms) needed for async theme application
4. **Cookie**: May not always be present if API endpoint not called

### Debugging

If tests fail, check:

1. **Theme Provider Mounting**: Ensure ThemeProvider renders correctly
2. **localStorage Access**: Verify localStorage is enabled in test browser
3. **Selector Updates**: If UI changes, update button text selectors
4. **Timing Issues**: Increase `waitForTimeout` values if needed
5. **Class Application**: Verify html element gets correct class

### Future Enhancements

Potential additions to this test suite:

- [ ] Test theme persistence with browser storage cleared
- [ ] Verify theme API endpoint responses directly
- [ ] Test theme changes from multiple tabs simultaneously
- [ ] Add visual regression testing for theme appearance
- [ ] Test theme preferences in different browsers
- [ ] Validate accessibility in different themes

### Related Tests

- `banner-aspect-ratio.spec.ts` - Visual regression testing
- `ai-settings-route.spec.ts` - Settings page testing

### Success Criteria

All 11 test cases should pass:
- ✅ Default theme loads correctly
- ✅ Theme toggles work (light/dark/system)
- ✅ Theme persists across page reloads
- ✅ Theme persists across route navigation
- ✅ Theme persists in new tabs/windows
- ✅ Visual states update correctly
- ✅ localStorage updates on theme change
- ✅ Cookie set for SSR compatibility
- ✅ Browser navigation preserves theme
- ✅ Full theme cycle works without issues

---

**Test Status**: ✅ Ready for execution
**Last Updated**: 2025-10-06
**Playwright Version**: As specified in package.json
