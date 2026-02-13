# Task 2 Execution Checklist

Use this checklist to execute Task 2 step by step.

## Pre-Execution Checklist

- [ ] I have access to Supabase Dashboard
- [ ] I know my project URL: https://app.supabase.com/project/rejkocbdaeyvsxdiamhu
- [ ] I have admin/owner permissions on the project
- [ ] I have reviewed the migration script: `apply_migration_009_dashboard.sql`

## Execution Steps

### Step 1: Open Supabase Dashboard
- [ ] Navigate to: https://app.supabase.com/project/rejkocbdaeyvsxdiamhu
- [ ] Log in successfully
- [ ] Dashboard loads without errors

### Step 2: Open SQL Editor
- [ ] Click "SQL Editor" in the left sidebar
- [ ] Click "New Query" button
- [ ] Empty SQL editor window appears

### Step 3: Load Migration Script
- [ ] Open file: `supabase/migrations/apply_migration_009_dashboard.sql`
- [ ] Select ALL contents (Ctrl+A / Cmd+A)
- [ ] Copy to clipboard (Ctrl+C / Cmd+C)

### Step 4: Execute Migration
- [ ] Paste script into SQL editor (Ctrl+V / Cmd+V)
- [ ] Review the script (optional - it's safe)
- [ ] Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
- [ ] Wait for execution to complete (5-10 seconds)

### Step 5: Verify Results
- [ ] Results panel shows multiple queries executed
- [ ] See "✓ PASS" for "offices table"
- [ ] See "✓ PASS (9/9 columns found)" for "office_id columns"
- [ ] See "✓ PASS" for "Default office exists"
- [ ] See "✓ PASS (4/4 policies found)" for "RLS policies"
- [ ] See table with "Prem Darvaja Office" entry

### Step 6: Visual Verification in Table Editor
- [ ] Click "Table Editor" in left sidebar
- [ ] Scroll down to find "offices" table
- [ ] Click on "offices" table
- [ ] See 1 row with:
  - name: "Prem Darvaja Office"
  - address: "Prem Darvaja, Ahmedabad"
  - is_active: true

### Step 7: Verify Schema Changes
- [ ] In Table Editor, check "user_profiles" table
- [ ] Scroll right to see "office_id" column exists
- [ ] Check any transaction table (e.g., "agency_payments")
- [ ] Verify "office_id" column exists

## Post-Execution Checklist

- [ ] All verification checks passed
- [ ] Default office visible in offices table
- [ ] office_id columns exist in all required tables
- [ ] No error messages in results panel
- [ ] Mark Task 2 as complete in tasks.md

## Troubleshooting

### ❌ If you see "relation 'offices' already exists"
**Action:** This is OK! The migration is idempotent. Continue to next query.

### ❌ If you see "column 'office_id' already exists"
**Action:** This is OK! The migration is idempotent. Continue to next query.

### ❌ If you see "duplicate key value violates unique constraint"
**Action:** This is OK! The default office already exists. Check verification queries.

### ❌ If you see "permission denied"
**Action:** 
1. Verify you're logged in as admin/owner
2. Try using the service role key
3. Contact project administrator

### ❌ If verification shows "✗ FAIL"
**Action:**
1. Note which check failed
2. Review the detailed results
3. Check if tables/columns exist manually in Table Editor
4. Re-run the specific failed section

## Success Criteria

✅ Task is complete when ALL of these are true:

1. `offices` table exists
2. Default office "Prem Darvaja Office" exists in offices table
3. `office_id` column exists in 9 tables (user_profiles + 8 transaction tables)
4. All verification queries show "✓ PASS"
5. No critical errors in execution

## Time Tracking

- **Expected Duration:** 2-3 minutes
- **Actual Start Time:** ___________
- **Actual End Time:** ___________
- **Total Time:** ___________

## Notes

Use this space to record any issues, observations, or deviations:

```
[Your notes here]
```

## Next Task

After completing this checklist:
- [ ] Mark Task 2 as complete
- [ ] Review Task 3: Database Security and RLS Policies for Transaction Tables
- [ ] Prepare for Task 4: Data Migration Script

---

**Remember:** This migration does NOT update existing data. That happens in Task 4.
