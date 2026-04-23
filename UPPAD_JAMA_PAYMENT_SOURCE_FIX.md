# Uppad/Jama Payment Source Fix

## Problem
Jab papa udhaar (credit) entry karte the, to kabhi kabhi wo apni personal wallet se amount dete the, lekin wo amount daily report mein automatically add ho jata tha. Yeh galat tha kyunki personal wallet se diya gaya paisa business cash nahi hai.

## Solution
Ab Uppad/Jama entry form mein ek naya dropdown add kiya gaya hai: **Payment Source**

### Options:
1. **Business Cash (Daily Report में दिखेगा)** - Default option
   - Jab business ke cash se payment ho
   - Yeh entries daily report mein dikhegi
   
2. **Personal Wallet (Daily Report में नहीं दिखेगा)**
   - Jab apni personal wallet se payment ho
   - Yeh entries daily report mein NAHI dikhegi
   - Sirf Uppad/Jama statement mein dikhegi

## Changes Made

### 1. Database Migration
- File: `supabase/migrations/20260325_add_payment_source_to_uppad_jama.sql`
- Added `payment_source` column to `uppad_jama_entries` table
- Default value: `'business_cash'`
- Allowed values: `'business_cash'` or `'personal_wallet'`

### 2. TypeScript Interface Update
- File: `src/data/Storage.ts`
- Updated `UppadJamaEntry` interface to include `payment_source` field
- Updated `saveUppadJamaEntry` function to save payment source

### 3. UI Changes
- File: `src/screens/UppadJamaScreen.tsx`
- Added payment source dropdown in entry form
- Options clearly labeled in Hindi for better understanding
- Default selection: Business Cash

### 4. Daily Report Filter
- File: `src/screens/DailyReportScreen.tsx`
- Added filter to exclude entries with `payment_source = 'personal_wallet'`
- Only `business_cash` entries will appear in daily report

## How to Use

### For New Entries:
1. Uppad/Jama screen par jao
2. Person select karo
3. Type select karo (Uppad/Jama)
4. **Payment Source select karo:**
   - Agar business cash se payment hai → "Business Cash" select karo
   - Agar personal wallet se payment hai → "Personal Wallet" select karo
5. Amount aur description enter karo
6. Save karo

### For Existing Entries:
- Purani saari entries automatically "Business Cash" mark ho gayi hain
- Wo sab daily report mein dikhti rahegi (pehle jaisa)

## Migration Steps

1. **Database Migration Run Karo:**
   ```bash
   cd MyApp
   npx supabase db push
   ```

2. **App Rebuild Karo:**
   ```bash
   # Android
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   
   # iOS
   cd ios
   pod install
   cd ..
   npx react-native run-ios
   ```

## Testing

1. Uppad/Jama screen par jao
2. Ek entry create karo with "Business Cash" → Daily report mein dikhni chahiye
3. Ek entry create karo with "Personal Wallet" → Daily report mein NAHI dikhni chahiye
4. Dono entries Uppad/Jama statement mein dikhni chahiye

## Benefits

✅ Personal wallet payments ab daily report mein nahi aayenge
✅ Business cash tracking accurate ho gaya
✅ Daily report calculations sahi honge
✅ Purani entries affected nahi hongi (backward compatible)
✅ Clear Hindi labels se confusion nahi hoga

## Notes

- Default selection "Business Cash" hai to accidentally personal wallet select nahi hoga
- Purani saari entries "Business Cash" mark hain (backward compatibility)
- Personal wallet entries sirf statement mein dikhegi, daily report mein nahi
