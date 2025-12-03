# Report Generation Fixes

## Issue
Reports were using the fallback HTML generator instead of the full PRIME calculations because:
1. The Python API was timing out during complex PRIME calculations
2. The timeout was set to only 30 seconds, but PRIME calculations with chart generation can take longer

## Fixes Applied

### 1. Increased API Timeout
- **File**: `/src/app/api/generate-report/route.ts`
- **Change**: Increased timeout from 30 seconds to 5 minutes (300 seconds)
- **Reason**: PRIME calculations include:
  - Complex mathematical modeling
  - Professional chart generation with matplotlib
  - AI confidence analysis
  - Comprehensive weekly progression calculations

### 2. Increased Frontend Timeout
- **File**: `/src/contexts/app-context.tsx`
- **Change**: Increased timeout from 45 seconds to 5 minutes (300 seconds)
- **Reason**: Frontend timeout must match or exceed API timeout

## What to Expect

### During Report Generation
1. Click "Generate New Report"
2. **Wait up to 5 minutes** - The loading spinner will continue during PRIME calculations
3. The Python API is performing:
   - Full PRIME calculations for your entire timeline
   - Generating professional charts and visualizations
   - Running AI confidence analysis
   - Creating a comprehensive HTML report

### Report Contents
When successful, you'll receive:
- Full PRIME calculation results (NOT a summary)
- Professional charts showing:
  - Weight progression
  - Body fat percentage changes
  - Lean mass preservation
  - Caloric intake recommendations
- Weekly breakdown with exact numbers
- AI confidence score
- Detailed metabolic calculations

### If It Still Times Out
If report generation still times out after 5 minutes:
1. Check that the Python API is running: `curl http://127.0.0.1:8000/`
2. Try with a shorter timeline (e.g., 8-12 weeks instead of 16+)
3. The fallback report will be generated as a last resort

## Fallback Report
The fallback report is a simple HTML summary and is **NOT** the full PRIME report. It only shows:
- Basic stats (current/goal weight, body fat)
- Simple progress calculations
- No charts or AI analysis

To get the full PRIME report, ensure the Python API completes successfully within the 5-minute timeout.