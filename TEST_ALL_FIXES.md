# Comprehensive Test Plan for All Fixes

> **Historical test plan.** Routes, ports, and expected behavior must be reconciled with the August 2026 documentation before reuse. The latest focused gates are in [`docs/VERIFICATION-2026-08-11.md`](docs/VERIFICATION-2026-08-11.md).

## Date: 2025-07-07
## Purpose: Verify all fixes implemented in this session

### Test Environment Setup
1. Ensure Python API is running on port 8000
2. Clear browser cache and localStorage
3. Use a fresh browser session

## 1. AI Settings Persistence (CRITICAL) ✅

### Test Steps:
1. Navigate to `/settings/ai`
2. Configure multiple AI providers with API keys
3. Select different providers for different areas (chat, insights, etc.)
4. Click "Save Settings"
5. Refresh the page
6. Open a new browser tab and navigate to `/settings/ai`

### Expected Results:
- [ ] All API keys remain saved after refresh
- [ ] Selected providers for each area are preserved
- [ ] Settings persist across browser sessions
- [ ] ai-settings.json file on server contains saved data

### Verification:
```bash
# Check server file
cat ai-settings.json
```

## 2. Report Generation Hanging Issue ✅

### Test Steps:
1. Navigate to `/reports`
2. Click "Generate New Report"
3. Wait for report generation

### Expected Results:
- [ ] Loading indicator shows with progress messages
- [ ] Report generates within 30-45 seconds
- [ ] If Python API is down, fallback report generates immediately
- [ ] No indefinite hanging
- [ ] Clear error message if generation fails

## 3. Profile Update Pre-population ✅

### Test Steps:
1. Complete initial profile setup
2. Navigate to Dashboard
3. Click "Update Profile" button
4. Also test from `/settings` page "Update Profile" button

### Expected Results:
- [ ] Form redirects to `/setup/custom`
- [ ] All fields are pre-populated with existing user data
- [ ] Height, weight, goals, and all settings show current values
- [ ] Changes save correctly when submitted

## 4. Theme Preference Persistence ✅

### Test Steps:
1. Navigate to `/settings`
2. Click on different theme options (Light/Dark/System)
3. Click "Save Settings"
4. Refresh the page
5. Close and reopen browser

### Expected Results:
- [ ] Theme changes immediately when selected
- [ ] Theme persists after page refresh
- [ ] Theme persists after browser restart
- [ ] System theme follows OS preference

## 5. AI Coach Chat Real Responses ✅

### Test Steps:
1. Configure AI settings with valid API key
2. Navigate to `/ai/chat` or use dashboard widget
3. Type various questions:
   - "How am I doing with my progress?"
   - "What should my daily calories be?"
   - "Give me workout recommendations"
4. Test with AI settings cleared

### Expected Results:
- [ ] With AI configured: Real AI responses from selected provider
- [ ] Without AI: Context-aware fallback responses
- [ ] No "prefab" template responses
- [ ] Error handling shows appropriate messages

## 6. Progress Report Calculation (Backend Issue) ⚠️

### Test Steps:
1. Add a new entry
2. Check if calculation recalculates from new entry date
3. Generate a report

### Expected Results:
- [ ] New calculations start from latest entry date
- [ ] Report shows updated progression
- [ ] (This requires Python API fix)

## 7. Missing Sidebar Features ✅

### Test Steps:
1. Check main sidebar for new items

### Expected Results:
- [ ] "AI Settings" link in Tools section → `/settings/ai`
- [ ] "AI Chat" link in AI Features section → `/ai/chat`
- [ ] "AI Insights" link in AI Features section → `/ai/insights`
- [ ] Changelog dialog works in Tools section
- [ ] All links navigate correctly

## Additional Tests

### AI Chat Full Page (`/ai/chat`)
- [ ] Full-screen chat interface loads
- [ ] Messages persist during session
- [ ] Quick action buttons work
- [ ] Responsive design on mobile

### AI Insights Full Page (`/ai/insights`)
- [ ] All insight categories load
- [ ] Tabs switch correctly
- [ ] Refresh button works
- [ ] Progress metrics display correctly

### Theme Context Provider
- [ ] No hydration errors on page load
- [ ] Theme applies to all components
- [ ] No flash of unstyled content

## Manual Verification Commands

```bash
# Check if theme provider is working
# In browser console:
localStorage.getItem('userSettings')

# Check AI settings persistence
# In browser console:
localStorage.getItem('ai_settings')

# Verify API endpoints
curl http://localhost:3000/api/ai/settings
curl http://localhost:3000/api/generate-report -X POST -H "Content-Type: application/json" -d '{...}'
```

## Known Issues Requiring Backend Fix
1. Progress Report Calculation - Requires Python API update to properly recalculate from new entry date

## Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| AI Settings Persistence | ✅ Fixed | Saves to localStorage and server |
| Report Generation Timeout | ✅ Fixed | 45s timeout with fallback |
| Profile Update Pre-populate | ✅ Fixed | Redirects to correct page |
| Theme Persistence | ✅ Fixed | Uses ThemeProvider context |
| AI Chat Real Responses | ✅ Fixed | Uses configured AI providers |
| Progress Calculation | ⚠️ Backend | Needs Python API fix |
| Sidebar Features | ✅ Fixed | All links added |

## How to Run Tests

1. Start the application:
```bash
npm run dev
```

2. Start Python API:
```bash
cd python-api
python main.py
```

3. Go through each test section above
4. Check off completed items
5. Note any failures or issues

## Regression Testing
After all fixes, ensure:
- [ ] Dashboard loads without errors
- [ ] All existing features still work
- [ ] No console errors in browser
- [ ] No network request failures
- [ ] Performance is acceptable
