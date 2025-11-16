# Task 19: Implement React Lifecycle Guards for Chart Components

## Change Metadata
- **Date:** 2025-11-16
- **Type:** Bug Fix / Stability Improvement
- **Priority:** High
- **TaskMaster ID:** Task #19
- **Related Commits:** TBD (to be added after implementation)

---

## Problem Statement

Chart components and other widgets with async operations can trigger React warnings:
```
Warning: Can't perform a React state update on an unmounted component.
```

This occurs when:
- Components unmount before async operations complete
- Fetch requests return after component cleanup
- Timers/intervals fire after component destruction
- Event listeners trigger on destroyed components

---

## Important Context (Learned from Commit 8eaec05)

⚠️ **CRITICAL:** `useMountedRef` guards were **removed** from `generateNewReport()` in `app-context.tsx` because they were **blocking report generation**.

**Key Learning:** Mounted guards should **ONLY** be applied to:
- Non-critical async operations
- Chart animations and visual updates
- Widget data refreshes
- Event handlers that don't affect core functionality

**DO NOT apply to:**
- Report generation flows
- User profile updates
- Data persistence operations
- Any critical business logic

---

## Scope of Changes

### Components to Update

1. **Chart Components** (Primary Focus)
   - `src/components/charts/calorie-management-widget.tsx`
   - `src/components/charts/metabolic-insights-widget.tsx`
   - `src/components/charts/progress-trend-chart.tsx`

2. **Profile Components** (If async operations exist)
   - `src/components/profile/profile-header.tsx` (image uploads)
   - `src/components/profile/profile-settings.tsx`

3. **Dashboard Widgets** (Careful review needed)
   - Review `src/components/dashboard.tsx` for any new async ops
   - Check widget subscription patterns

### Components to SKIP
- ❌ `src/contexts/app-context.tsx` - Already handled, critical flows
- ❌ `src/app/api/*` - Server-side, no React lifecycle
- ❌ Core data mutation functions

---

## Implementation Pattern

### Create Shared Hook

**File:** `src/hooks/use-mounted-ref.ts` (NEW)

```typescript
import { useEffect, useRef } from 'react'

/**
 * Track if component is mounted to prevent setState on unmounted components
 * 
 * @warning Only use for non-critical async operations like animations,
 * data fetching for display, etc. Do NOT use for critical business logic
 * that must complete (e.g., report generation, data persistence).
 * 
 * @example
 * const mountedRef = useMountedRef()
 * 
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (mountedRef.current) {
 *       setState(data)
 *     }
 *   })
 * }, [])
 */
export function useMountedRef() {
  const mountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  return mountedRef
}
```

### Usage Pattern for Charts

**Before:**
```typescript
useEffect(() => {
  const subscription = subscribeToDataChanges((newData) => {
    setChartData(newData)
  })
  
  return () => subscription.unsubscribe()
}, [])
```

**After:**
```typescript
import { useMountedRef } from '@/hooks/use-mounted-ref'

const Component = () => {
  const mountedRef = useMountedRef()
  
  useEffect(() => {
    const subscription = subscribeToDataChanges((newData) => {
      if (mountedRef.current) {
        setChartData(newData)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
}
```

### Usage Pattern for Timers

**Before:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setAnimationComplete(true)
  }, 300)
  
  return () => clearTimeout(timer)
}, [])
```

**After:**
```typescript
const mountedRef = useMountedRef()

useEffect(() => {
  const timer = setTimeout(() => {
    if (mountedRef.current) {
      setAnimationComplete(true)
    }
  }, 300)
  
  return () => clearTimeout(timer)
}, [])
```

---

## Testing Strategy

### 1. Unit Tests
Create test file: `tests/unit/use-mounted-ref.test.ts`

```typescript
import { renderHook } from '@testing-library/react'
import { useMountedRef } from '@/hooks/use-mounted-ref'

describe('useMountedRef', () => {
  it('should be true when mounted', () => {
    const { result } = renderHook(() => useMountedRef())
    expect(result.current.current).toBe(true)
  })
  
  it('should be false after unmount', () => {
    const { result, unmount } = renderHook(() => useMountedRef())
    unmount()
    expect(result.current.current).toBe(false)
  })
})
```

### 2. Component Tests
For each updated chart component:
- Mount component and trigger async operation
- Unmount before operation completes
- Verify no console warnings
- Verify setState is not called after unmount

### 3. Manual Testing
1. Navigate to Dashboard page
2. Wait for charts to load
3. Quickly navigate away (before all data loads)
4. Check console for warnings
5. Repeat with rapid navigation

### 4. Integration Tests
- Test with data subscriptions
- Test with rapid component mounting/unmounting
- Verify chart animations still work correctly
- Ensure no performance degradation

---

## Files to Modify

### New Files
1. `src/hooks/use-mounted-ref.ts` - Shared hook
2. `tests/unit/use-mounted-ref.test.ts` - Unit tests

### Modified Files
1. `src/components/charts/calorie-management-widget.tsx`
2. `src/components/charts/metabolic-insights-widget.tsx`
3. `src/components/charts/progress-trend-chart.tsx`
4. `src/components/profile/profile-header.tsx` (if needed)

---

## Success Criteria

✅ No "setState on unmounted component" warnings in console  
✅ All chart animations work correctly  
✅ No performance degradation  
✅ Report generation still works (regression test)  
✅ Profile updates still work (regression test)  
✅ All unit tests pass  
✅ Manual testing shows no issues  

---

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Remove `useMountedRef` from problematic components
3. Keep the hook for future use
4. Document which components had issues

---

## Related Documentation

- Task #49: Report generation fixes (removed guards from critical path)
- Task #17: Animation completion guards
- Task #18: Refresh subscription system audit

---

## Implementation Checklist

- [ ] Create `use-mounted-ref.ts` hook
- [ ] Add unit tests for hook
- [ ] Update `calorie-management-widget.tsx`
- [ ] Update `metabolic-insights-widget.tsx`
- [ ] Update `progress-trend-chart.tsx`
- [ ] Review `profile-header.tsx` for async ops
- [ ] Run all tests
- [ ] Manual testing in browser
- [ ] Regression test report generation
- [ ] Regression test profile updates
- [ ] Update CHANGELOG.md
- [ ] Commit changes
- [ ] Update TaskMaster Task #19 to "done"

---

**Status:** Ready for implementation  
**Estimated Time:** 1-2 hours  
**Risk Level:** Low (learned from previous mistakes)
