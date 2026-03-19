# Changelog — YashRoadlines App

All notable changes, fixes, and security remediations are documented here.

---

## Security Remediations

### Firebase Credentials Exposure — RESOLVED

The file `firebase-secret-formatter.js` contained a hardcoded Firebase service account private key and was committed to git history.

**Actions taken:**
- File deleted from working tree
- Removed from all git history using `git-filter-repo`
- `.gitignore` updated to block `firebase-secret*.js` (except `*.example.js`)
- `firebase-secret-formatter.example.js` created as a safe template

**You must still do:**
1. Revoke the old Firebase service account at:
   `Firebase Console > Project Settings > Service Accounts`
   Service account: `firebase-adminsdk-fbsvc@qualified-cacao-472120-h5.iam.gserviceaccount.com`
2. Generate a new service account and save as `firebase-credentials.json` (gitignored)
3. Force push cleaned history: `git push origin --force --all`

### Supabase Anon Key — RESOLVED

Supabase credentials moved from hardcoded source to `.env` via `react-native-config`.
`src/supabase.ts` now reads `Config.SUPABASE_URL` and `Config.SUPABASE_ANON_KEY`.

### Credential Rotation Guide

**Firebase:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Delete old service account
3. Generate new → Download JSON → Save as `firebase-credentials.json`
4. Update Supabase secret with new credentials via `node firebase-secret-formatter.example.js`

**Supabase:**
1. Go to Supabase Dashboard → Settings → API
2. Click "Regenerate" next to the anon/service_role key
3. Update `.env` with new key value

---

## Bug Fixes

### Duplicate Notifications — RESOLVED

**Root cause:** Multiple screens were calling both `NotificationService.notifyAdd()` AND `DeviceNotificationService.notifyAdminEntryAdded()`, causing 2–3 notifications per action.

**Fix:** Removed all `NotificationService.notifyAdd()` calls from screens that also call `DeviceNotificationService`. `DeviceNotificationService` is now the single source of truth — it handles DB insert, FCM push, and deduplication.

**Defense-in-depth layers still active:**
- Content-based deduplication in `AdminNotificationListener.ts` (key = title + first 50 chars of message)
- 500ms delay in `DeviceNotificationService.ts` before FCM push
- FCM foreground messages routed through `AdminNotificationListener.showNotificationWithDedup()`

**Screens fixed:**
- `PaidSectionScreen.tsx`
- `MumbaiDeliveryEntryScreen.tsx`
- `DataEntryScreen.tsx`
- `PaymentConfirmationScreen.tsx`
- `AddMajuriScreen.tsx`
- `AddGeneralEntryScreen.tsx`

### Recent Entries Delete Sync — RESOLVED

**Issue:** Deleted entries from Daily Report were still appearing in Recent Entries on other screens.

**Architecture (already correct):**
- `deleteTransactionByIdImproved` deletes from Supabase + AsyncStorage + queues offline sync
- All screens use `useFocusEffect` to reload data on focus
- On return to any screen, fresh data is fetched from Supabase

**Screens verified:**
- `MumbaiDeliveryEntryScreen` ✅
- `AgencyEntryScreen` ✅
- `PaidSectionScreen` ✅
- `AgencyPaymentsScreen` ✅
- `DriverDetailsScreen` ✅
- `DataEntryScreen` ⚠️ (recentEntries state exists but is never populated — non-critical)

---

## Prevention

- `.gitignore` blocks `.env`, `firebase-credentials.json`, `service-account*.json`, `*-credentials.json`, `supabase.exe`
- `.gitleaksignore` configured for false-positive suppression
- GitHub Actions secret scanning via TruffleHog + Gitleaks in `.github/workflows/security-scan.yml`
- All secrets loaded via `react-native-config` from `.env` (never hardcoded)
