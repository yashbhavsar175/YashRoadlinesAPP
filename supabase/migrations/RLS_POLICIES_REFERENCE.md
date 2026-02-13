# RLS Policies Reference Guide

## Overview

This document provides a quick reference for the Row Level Security (RLS) policies implemented for multi-office support.

## Policy Structure

Each transaction table has **4 policies**:

1. **SELECT Policy** - Controls who can read data
2. **INSERT Policy** - Controls who can create data
3. **UPDATE Policy** - Controls who can modify data
4. **DELETE Policy** - Controls who can remove data

## Policy Logic

### For Admin Users (is_admin = true)

```sql
-- Admins can access ALL data from ALL offices
EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE id = auth.uid() AND is_admin = true
)
```

### For Regular Users (is_admin = false)

```sql
-- Users can only access data from their assigned office
office_id IN (
  SELECT office_id FROM user_profiles WHERE id = auth.uid()
)
```

## Tables Protected by RLS

| Table Name | Policies | Description |
|------------|----------|-------------|
| agency_payments | 4 | Agency payment transactions |
| agency_majuri | 4 | Agency majuri entries |
| driver_transactions | 4 | Driver transaction records |
| truck_fuel_entries | 4 | Truck fuel entries |
| general_entries | 4 | General ledger entries |
| agency_entries | 4 | Agency-specific entries |
| uppad_jama_entries | 4 | Uppad/Jama entries |
| cash_records | 4 | Cash management records |
| **TOTAL** | **32** | All transaction tables |

## Policy Names

### Agency Payments
- `Users can view agency_payments from their office` (SELECT)
- `Users can insert agency_payments for their office` (INSERT)
- `Users can update agency_payments from their office` (UPDATE)
- `Users can delete agency_payments from their office` (DELETE)

### Agency Majuri
- `Users can view agency_majuri from their office` (SELECT)
- `Users can insert agency_majuri for their office` (INSERT)
- `Users can update agency_majuri from their office` (UPDATE)
- `Users can delete agency_majuri from their office` (DELETE)

### Driver Transactions
- `Users can view driver_transactions from their office` (SELECT)
- `Users can insert driver_transactions for their office` (INSERT)
- `Users can update driver_transactions from their office` (UPDATE)
- `Users can delete driver_transactions from their office` (DELETE)

### Truck Fuel Entries
- `Users can view truck_fuel_entries from their office` (SELECT)
- `Users can insert truck_fuel_entries for their office` (INSERT)
- `Users can update truck_fuel_entries from their office` (UPDATE)
- `Users can delete truck_fuel_entries from their office` (DELETE)

### General Entries
- `Users can view general_entries from their office` (SELECT)
- `Users can insert general_entries for their office` (INSERT)
- `Users can update general_entries from their office` (UPDATE)
- `Users can delete general_entries from their office` (DELETE)

### Agency Entries
- `Users can view agency_entries from their office` (SELECT)
- `Users can insert agency_entries for their office` (INSERT)
- `Users can update agency_entries from their office` (UPDATE)
- `Users can delete agency_entries from their office` (DELETE)

### Uppad Jama Entries
- `Users can view uppad_jama_entries from their office` (SELECT)
- `Users can insert uppad_jama_entries for their office` (INSERT)
- `Users can update uppad_jama_entries from their office` (UPDATE)
- `Users can delete uppad_jama_entries from their office` (DELETE)

### Cash Records
- `Users can view cash_records from their office` (SELECT)
- `Users can insert cash_records for their office` (INSERT)
- `Users can update cash_records from their office` (UPDATE)
- `Users can delete cash_records from their office` (DELETE)

## Access Matrix

| User Type | Can View Own Office | Can View All Offices | Can Modify Own Office | Can Modify All Offices |
|-----------|---------------------|----------------------|-----------------------|------------------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Regular User | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| Majur User | ✅ Yes | ❌ No | ✅ Yes | ❌ No |

## How RLS Works

### 1. User Authentication
```
User logs in → Supabase sets auth.uid() → RLS policies check this ID
```

### 2. Policy Evaluation
```
Query → RLS checks user_profiles → Determines office_id → Filters results
```

### 3. Data Access Flow

**For SELECT queries:**
```sql
-- User queries: SELECT * FROM agency_payments;
-- RLS automatically adds: WHERE office_id = (user's office_id)
-- OR allows all if user is admin
```

**For INSERT queries:**
```sql
-- User inserts: INSERT INTO agency_payments (office_id, ...) VALUES ('office-x', ...);
-- RLS checks: Is 'office-x' the user's office? OR Is user admin?
-- If no → Reject; If yes → Allow
```

## Quick Verification Commands

### Check if RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'agency_payments';
```

### List all policies for a table
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'agency_payments';
```

### Check user's office assignment
```sql
SELECT id, full_name, office_id, is_admin 
FROM user_profiles 
WHERE id = auth.uid();
```

### Test data visibility
```sql
-- As current user, see what you can access
SELECT COUNT(*) FROM agency_payments;

-- Check which offices you can see
SELECT DISTINCT office_id FROM agency_payments;
```

## Common Scenarios

### Scenario 1: New User Created
1. User is created in auth.users
2. User profile created in user_profiles
3. **office_id MUST be assigned** during creation
4. User can now access only that office's data

### Scenario 2: User Switches Office (Admin Only)
1. Admin selects different office from dropdown
2. App updates current office context
3. All queries now filter by new office_id
4. Data reloads for new office

### Scenario 3: Transaction Created
1. User creates transaction in app
2. App includes current office_id
3. RLS INSERT policy checks if office_id matches user's office
4. If match (or admin) → Allow; else → Reject

### Scenario 4: User Tries to Access Other Office
1. User attempts to query another office's data
2. RLS SELECT policy filters results
3. Only user's office data returned
4. Other offices' data invisible

## Security Benefits

✅ **Database-Level Security** - Even if app has bugs, data is protected
✅ **Automatic Filtering** - No need to add WHERE clauses in app code
✅ **Audit Trail** - All access attempts logged by Supabase
✅ **Zero Trust** - Every query validated against policies
✅ **Admin Override** - Admins can access all data when needed

## Performance Considerations

### Indexes Created
```sql
-- These indexes speed up RLS policy checks
CREATE INDEX idx_user_profiles_office_id ON user_profiles(office_id);
CREATE INDEX idx_agency_payments_office_id ON agency_payments(office_id);
-- (Similar indexes on all transaction tables)
```

### Query Performance
- RLS adds a JOIN to user_profiles on every query
- Indexes minimize performance impact
- Typical overhead: < 5ms per query
- Caching in app layer further reduces impact

## Troubleshooting

### Problem: User can't see any data
**Check:**
1. Is office_id assigned? `SELECT office_id FROM user_profiles WHERE id = auth.uid();`
2. Is RLS enabled? `SELECT rowsecurity FROM pg_tables WHERE tablename = 'agency_payments';`
3. Do transactions have office_id? `SELECT COUNT(*) FROM agency_payments WHERE office_id IS NULL;`

### Problem: Admin can't see all offices
**Check:**
1. Is is_admin = true? `SELECT is_admin FROM user_profiles WHERE id = auth.uid();`
2. Are policies correct? `SELECT policyname FROM pg_policies WHERE tablename = 'agency_payments';`

### Problem: User sees data from other offices
**Check:**
1. Are policies applied? `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'agency_payments';`
2. Is RLS enabled? `ALTER TABLE agency_payments ENABLE ROW LEVEL SECURITY;`

## Maintenance

### Adding New Transaction Table
If you add a new transaction table, you must:

1. Add office_id column
2. Create index on office_id
3. Enable RLS
4. Create 4 policies (SELECT, INSERT, UPDATE, DELETE)
5. Test with admin and regular users

### Modifying Policies
To modify a policy:

```sql
-- Drop existing policy
DROP POLICY "policy_name" ON table_name;

-- Create new policy
CREATE POLICY "policy_name" ON table_name
FOR SELECT
USING (your_new_logic_here);
```

## Related Files

- `010_add_rls_policies_for_offices.sql` - Migration file
- `APPLY_MIGRATION_010.md` - Application guide
- `test_rls_policies.sql` - Test script
- `RLS_POLICIES_REFERENCE.md` - This file

## Support

For issues or questions:
1. Check verification queries in test_rls_policies.sql
2. Review APPLY_MIGRATION_010.md troubleshooting section
3. Check Supabase logs for policy violations
4. Verify user_profiles.office_id assignments
