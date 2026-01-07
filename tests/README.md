# PRIME Report Generator Tests

## Overview

This test suite verifies the functionality of the PRIME Report Generator, ensuring that:
1. The report generation process works correctly
2. All expected sections are included in the generated report
3. User data is correctly incorporated into the report

## Running Tests

### Prerequisites

- Python 3.8+
- Install dependencies: `pip install -r requirements.txt`

### Executing Tests

```bash
# From the project root directory
python -m pytest tests/test_prime_report_generator.py
```

## Test Scenarios

The test script `test_prime_report_generator.py` covers:

- Report generation with sample user data
- Verification of 14 report sections
- Checking key user information is present
- Handling of different user profiles
- Performance of fast report generation

## Sections Verified

1. Current Profile
2. Target Goals
3. Current Activity Profile
4. Current Metabolic Profile
5. Workout Analysis
6. Predicted Progress Charts
7. Weekly Progress Forecast
8. Body Composition Changes
9. Expected Results
10. Metabolic Adaptation Forecast
11. Final Phase Targets
12. Input Parameter Analysis
13. AI Confidence Analysis
14. Comprehensive Parameter Reference Guide

## Notes

- The test uses a sample user profile with comprehensive data
- Temporary directories are used to prevent file system clutter
- Multiple test runs will generate unique report files

## Troubleshooting

If tests fail:
1. Ensure all dependencies are installed
2. Check that Python path includes the project root
3. Verify no conflicts with existing report generation code