# Apply Migration 017 - Mumbai Delivery Redesign

## Error
```
Could not find the 'billty_no' column of 'agency_entries' in the schema cache
```

This error occurs because migration 017 has not been applied to your Supabase database yet.

## Solution

You need to apply migration 017 which adds the required columns for Mumbai Delivery redesign.

### Option 1: Using Supabase CLI (Recommended)

1. Make sure you have Supabase CLI installed
2. Run the migration:
```bash
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `017_mumbai_delivery_redesign.sql`
4. Click "Run" to execute the migration

### Option 3: Direct SQL Execution

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy the entire content from supabase/migrations/017_mumbai_delivery_redesign.sql
-- and paste it here, then click Run
```

## Verification

After applying the migration, verify that the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agency_entries' 
AND column_name IN (
    'billty_no', 
    'consignee_name', 
    'item_description', 
    'confirmation_status',
    'confirmed_at',
    'confirmed_amount',
    'bilty_photo_id',
    'signature_photo_id',
    'taken_from_godown',
    'payment_received'
);
```

You should see all 10 columns listed.

## After Migration

Once the migration is applied:
1. Restart your React Native app
2. Try creating a new Mumbai delivery entry
3. Check the "Confirm Payment" tab to see the entry

The data should now save and display correctly!
