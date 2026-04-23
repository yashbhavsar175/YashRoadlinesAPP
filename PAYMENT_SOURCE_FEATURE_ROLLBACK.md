# Payment Source Feature - Temporarily Disabled

## Issue
Database migration for `payment_source` column was not run, causing save errors:
```
Could not find the 'payment_source' column of 'uppad_jama_entries' in the schema cache
```

## Temporary Fix Applied
Payment source feature ko temporarily disable kar diya hai:

### Files Modified:
1. **src/data/Storage.ts**
   - `payment_source` field commented out in `saveUppadJamaEntry`

2. **src/screens/UppadJamaScreen.tsx**
   - Payment source state variables commented out
   - Payment source dropdown hidden from UI
   - `payment_source` parameter removed from save call

## To Re-enable This Feature

### Step 1: Run Database Migration
Supabase SQL Editor mein yeh query run karo:

```sql
-- Add payment_source column
ALTER TABLE uppad_jama_entries 
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'business_cash' 
CHECK (payment_source IN ('business_cash', 'personal_wallet'));

-- Add column comment
COMMENT ON COLUMN uppad_jama_entries.payment_source IS 
'Source of payment: business_cash (shows in daily report) or personal_wallet (does not show in daily report)';

-- Set default for existing entries
UPDATE uppad_jama_entries 
SET payment_source = 'business_cash' 
WHERE payment_source IS NULL;
```

### Step 2: Verify Column Created
```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'uppad_jama_entries' 
AND column_name = 'payment_source';
```

### Step 3: Uncomment Code

**In src/data/Storage.ts:**
```typescript
// UNCOMMENT THIS LINE:
payment_source: entry.payment_source || 'business_cash',
```

**In src/screens/UppadJamaScreen.tsx:**
```typescript
// UNCOMMENT THESE LINES:
const [paymentSource, setPaymentSource] = useState<'business_cash' | 'personal_wallet'>('business_cash');
const paymentSourceOptions = [
  { label: 'Business Cash (Daily Report में दिखेगा)', value: 'business_cash' },
  { label: 'Personal Wallet (Daily Report में नहीं दिखेगा)', value: 'personal_wallet' },
];

// In handleSave:
payment_source: paymentSource,

// In UI:
<Text style={styles.inputLabel}>Payment Source</Text>
<Dropdown
  options={paymentSourceOptions}
  selectedValue={paymentSource}
  onValueChange={(v) => setPaymentSource(v as 'business_cash' | 'personal_wallet')}
  placeholder="Select payment source"
/>
```

### Step 4: Test
1. App reload karo
2. Uppad/Jama entry create karo
3. Payment source dropdown dikhna chahiye
4. Entry save honi chahiye without errors

## Current Behavior (After Rollback)

✅ Uppad/Jama entries save ho rahi hain
✅ Statement properly kaam kar raha hai
✅ No database errors
❌ Payment source selection available nahi hai (temporarily)
❌ All entries treated as "business_cash" by default

## Files to Watch

When re-enabling, check these files:
- `src/data/Storage.ts` - Line ~810 (saveUppadJamaEntry)
- `src/screens/UppadJamaScreen.tsx` - Lines ~186, ~280, ~413
- `src/screens/DailyReportScreen.tsx` - Line ~483 (filter logic)
- `supabase/migrations/20260325_add_payment_source_to_uppad_jama.sql`

## Related Documents
- `UPPAD_JAMA_PAYMENT_SOURCE_FIX.md` - Original feature documentation
- `UPPAD_JAMA_OFFICE_FILTER_FIX.md` - Office filter fix
