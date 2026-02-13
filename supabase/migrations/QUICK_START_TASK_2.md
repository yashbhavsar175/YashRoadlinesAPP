# Quick Start: Apply Migration 009

## TL;DR - Fastest Method

1. Go to: https://app.supabase.com/project/rejkocbdaeyvsxdiamhu
2. Click "SQL Editor" → "New Query"
3. Copy ALL contents from: `supabase/migrations/apply_migration_009_dashboard.sql`
4. Paste and click "Run"
5. Verify you see "✓ PASS" messages

**Done!** ✅

## What You Just Did

- ✅ Created `offices` table
- ✅ Added `office_id` column to 9 tables
- ✅ Created database indexes for performance
- ✅ Set up security policies (RLS)
- ✅ Inserted default office "Prem Darvaja Office"

## Verify It Worked

Go to "Table Editor" → Look for "offices" table → Should see 1 row with "Prem Darvaja Office"

## Next Task

Task 3: Database Security and RLS Policies for Transaction Tables

---

**Need more details?** See `TASK_2_INSTRUCTIONS.md`
