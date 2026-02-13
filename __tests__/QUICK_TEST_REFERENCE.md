# Quick Test Reference - Multi-Office Integration

## Quick Start

### Run All Automated Tests
```bash
npm test -- MultiOfficeIntegration.test.tsx
```

### Run Specific Test Suite
```bash
# Office creation tests
npm test -- MultiOfficeIntegration.test.tsx -t "Office Creation"

# User assignment tests
npm test -- MultiOfficeIntegration.test.tsx -t "User Assignment"

# Data segregation tests
npm test -- MultiOfficeIntegration.test.tsx -t "Data Segregation"

# Admin flow tests
npm test -- MultiOfficeIntegration.test.tsx -t "Admin"

# Migration tests
npm test -- MultiOfficeIntegration.test.tsx -t "Migration"
```

### Use Test Runner
```bash
node __tests__/runIntegrationTests.js
```

## Quick Manual Test

### Test Regular User (5 minutes)

1. Login as regular user
2. Check header shows office name (no dropdown)
3. Create a general entry
4. Verify entry appears in daily report
5. Logout

**Expected:** User sees only their assigned office data

### Test Admin User (10 minutes)

1. Login as admin
2. Check header shows office dropdown
3. Note current office
4. Create a general entry "Test A"
5. Switch to different office
6. Verify "Test A" does NOT appear
7. Create entry "Test B"
8. Switch back to first office
9. Verify "Test A" appears, "Test B" does not
10. Select "All Offices"
11. Verify both entries appear

**Expected:** Admin can switch offices and see different data

## Quick Database Check

```sql
-- Check if all transactions have office_id
SELECT 
  'general_entries' as table_name,
  COUNT(*) as total,
  COUNT(office_id) as with_office_id,
  COUNT(*) - COUNT(office_id) as missing
FROM general_entries;

-- Check if default office exists
SELECT * FROM offices WHERE name = 'Prem Darvaja Office';

-- Check if users have office assignments
SELECT COUNT(*) as total, COUNT(office_id) as assigned
FROM user_profiles;
```

## Common Issues

### Tests Won't Run
- Check Supabase credentials in `src/supabase.ts`
- Verify internet connection
- Run `npm install` to ensure dependencies

### Tests Fail
- Verify migrations 009, 010, 011, 012 are applied
- Check Supabase project is active
- Review error messages for specific issues

### Office Switching Not Working
- Clear AsyncStorage: Delete app and reinstall
- Check OfficeContext is initialized
- Verify screens consume OfficeContext

## Full Documentation

For complete testing instructions, see:
- `__tests__/MULTI_OFFICE_INTEGRATION_TEST_GUIDE.md` - Detailed manual testing
- `TASK_28_INTEGRATION_TESTING_SUMMARY.md` - Implementation summary

## Test Coverage

✅ 40+ automated test cases
✅ 10 manual test scenarios
✅ All requirements covered (1.1 - 11.5)
✅ Database verification queries
✅ Performance testing procedures

## Support

If tests fail or you encounter issues:
1. Check troubleshooting section in test guide
2. Review error messages carefully
3. Verify database migrations are applied
4. Check Supabase connection is active
