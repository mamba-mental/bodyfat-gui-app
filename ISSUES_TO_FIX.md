# Ap³𝘅Fit.ai - Outstanding Issues to Fix

## Date: 2025-07-07
## Session Summary: Multiple critical issues remain unresolved despite attempted fixes

### 1. Report Generation Issues
- **Problem**: Generate report hangs indefinitely (waited 5+ minutes)
- **Expected**: Should generate within seconds
- **Root Cause**: Unknown - Python API is running but request may be timing out
- **Fix Needed**: Add proper timeout handling and progress indicators

### 2. Profile Update Not Pre-populating
- **Problem**: "Update Profile" button doesn't pre-populate with existing user data
- **Expected**: All fields should show current user settings when updating
- **Code Location**: `/src/app/setup/custom/page.tsx`
- **Note**: Code was updated but changes not reflecting in browser

### 3. Theme Preference Not Persisting
- **Problem**: Theme preference doesn't change/save after clicking save in settings
- **Expected**: Theme should immediately apply and persist across sessions
- **Fix Needed**: Implement proper theme switching mechanism

### 4. AI Settings Not Persisting (CRITICAL)
- **Problem**: API keys are lost when opening new browser
- **Expected**: API keys should persist on server (ai-settings.json)
- **Current State**: ai-settings.json was cleared (all API keys blank)
- **Note**: This was supposedly fixed multiple iterations ago but still broken

### 5. AI Coach Chat Using Prefab Responses
- **Problem**: AI chat not using configured AI providers, only showing template responses
- **Evidence**: Logs show "AI provider chutes failed, using fallback"
- **Expected**: Should use real AI responses from configured providers
- **Fix Needed**: Debug why AI providers are failing and fix integration

### 6. Progress Report Calculation
- **Problem**: Report shows summary instead of complete recalculation from new entry date
- **Expected**: When new entry added, entire program should recalculate from that date
- **Fix Needed**: Update calculation logic to use latest entry as starting point

### 7. Missing Sidebar Features
**Not Implemented:**
- Changelog link in Tools sidebar (component created but not showing)
- Direct link to AI Settings in sidebar
- Direct link to Report Generation in sidebar
- Full page for AI Chat/Insights (currently only widgets)

### 8. Additional Issues from Logs
- AI insights showing null provider after settings were saved
- Chutes AI provider consistently failing
- JSON parsing errors in insights endpoint

## Technical Notes

### Server Logs Show Pattern:
1. Initial requests have AI settings (provider, model, apiKey)
2. After some time, requests show null values
3. This suggests settings are being lost/cleared

### File Locations for Fixes:
- AI Settings Service: `/src/lib/ai-settings-service.ts`
- AI Settings Storage: `/ai-settings.json`
- Profile Update: `/src/app/setup/custom/page.tsx`
- Sidebar: `/src/components/layout/main-layout.tsx`
- Theme: Need to implement theme context
- Report Generation: `/src/app/api/generate-report/route.ts`
- AI Chat: `/src/app/api/ai/chat/route.ts`

## How to Retrieve This Information

This file is saved at:
```
/mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/ISSUES_TO_FIX.md
```

To retrieve in future Claude sessions:
1. Ask Claude to read the file: "Please read ISSUES_TO_FIX.md"
2. Or provide the full path above
3. The file will persist in your project directory

## Recommended Fix Priority
1. **CRITICAL**: AI Settings persistence (breaks all AI features)
2. **HIGH**: Report generation hanging
3. **HIGH**: Profile update pre-population
4. **MEDIUM**: AI Chat real responses
5. **MEDIUM**: Progress report calculation logic
6. **LOW**: Theme persistence
7. **LOW**: Sidebar UI improvements

## Session Context
- Multiple attempts to fix these issues were made
- Changes were implemented in code but not reflecting in browser
- Possible caching issues or state management problems
- Need comprehensive debugging session to identify root causes