# Test Data Seeding

This directory contains scripts for seeding test data required by contract tests.

## Purpose

The contract tests require specific test data to be present in the database:

1. **Report Verification Tests** (5 tests) - Require a report with specific ID
2. **Entry History Tests** (1 test) - Require 12+ body fat entries

## Files

- `seed-test-data.ts` - Main seeding script that creates test data

## Usage

### Automatic Seeding (Recommended)

Test data is automatically seeded before all tests run via `vitest.setup.ts`:

```bash
npm test
```

### Manual Seeding

To manually seed test data (useful for debugging):

```bash
npm run test:seed
```

### Verify Seeded Data

Check the seeded data:

```bash
# Check report exists
cat data/apexfit-data.json | jq '.reports[] | select(.id == "550e8400-e29b-41d4-a716-446655440000")'

# Check entries count
cat data/apexfit-data.json | jq '.entries | map(select(.user_id == "test-user")) | length'
```

## Test Data Structure

### Report for Verification Tests

- **ID**: `550e8400-e29b-41d4-a716-446655440000`
- **user_id**: `test-user`
- **title**: "Test Report for Verification"
- Contains full PRIME calculation result with 26 weeks of progression data
- Includes mock HTML content

### Body Fat Entries for History Tests

- **Count**: 12 entries
- **user_id**: `test-user`
- **Date Range**: Bi-weekly entries starting from 2025-01-01
- **Weight Range**: 200 lbs decreasing to ~183.5 lbs
- **Body Fat Range**: 20% decreasing to ~14.5%

## Idempotency

The seeding script is idempotent - it checks for existing data before creating new records:

- If report with target ID exists, it skips report creation
- If 12+ entries exist for test-user, it skips entry creation
- Safe to run multiple times without duplicating data

## Implementation Notes

The seeding script bypasses the normal `server-storage` functions and writes directly to the data file. This is necessary because:

1. `server-storage` functions convert numeric user IDs to strings (e.g., `1` → `"1"`)
2. Tests expect `user_id: "test-user"`, not `user_id: "1"`
3. Direct file manipulation allows us to set the exact user_id values needed by tests

## Troubleshooting

### Tests still failing after seeding

1. Verify test server is running on port 3000
2. Check that data was created with correct user_id:
   ```bash
   cat data/apexfit-data.json | jq '.reports[0].user_id'
   # Should output: "test-user"
   ```

### Data not persisting

1. Ensure `data/` directory exists and is writable
2. Check for errors in seeding output
3. Verify no competing processes are modifying the data file

### Need to reset test data

```bash
# Remove data file and re-seed
rm data/apexfit-data.json
npm run test:seed
```
