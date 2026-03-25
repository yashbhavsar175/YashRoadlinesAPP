# Quick Release Guide

## For Windows Users

### Step 1: Update Version (IMPORTANT!)

Edit `android/app/build.gradle`:

```gradle
versionCode 2        // Increment by 1 (was 1, now 2)
versionName "1.1"    // Update version (was "1.0", now "1.1")
```

### Step 2: Run Release Script

```bash
cd MyApp
release.bat
```

Follow the prompts:
1. Choose build type (APK for testing, AAB for Play Store)
2. Choose clean build (recommended: yes)
3. Wait for build to complete

### Step 3: Test Release Build

If you built APK, install and test:
- Login works
- Push notifications work
- All features work

### Step 4: Upload to Play Store

If you built AAB:
1. Go to [Google Play Console](https://play.google.com/console)
2. Select YashRoadlines app
3. Go to Production → Create new release
4. Upload `android/app/build/outputs/bundle/release/app-release.aab`
5. Add release notes (see below)
6. Review and publish

---

## For Linux/Mac Users

```bash
cd MyApp
chmod +x release.sh
./release.sh
```

---

## Release Notes (Copy-Paste to Play Store)

```
Version 1.1 - Notification Fixes & Improvements

What's New:
✅ Fixed duplicate push notifications for admin users
✅ Notifications now show complete entry details (user, amount, agency, bill number)
✅ Improved FCM token management with automatic cleanup
✅ Better handling of foreground/background notifications
✅ Enhanced notification reliability

Bug Fixes:
- Fixed "New notification" showing instead of actual details
- Fixed duplicate notifications issue
- Improved token refresh handling
- Auto-cleanup of invalid FCM tokens
- Fixed BiometricAuthService export error

Performance:
- Optimized notification delivery
- Better error handling and logging
- Improved app stability
```

---

## Troubleshooting

### "Keystore not found" error
You're using debug keystore (fine for testing). For production:
1. See RELEASE_GUIDE.md → "Generate Release Keystore"
2. Generate keystore once
3. Configure in gradle.properties
4. Update build.gradle signing config

### Build fails
```bash
cd MyApp/android
./gradlew clean
./gradlew bundleRelease
```

### Push notifications not working in release
1. Get SHA-256 from your keystore:
   ```bash
   keytool -list -v -keystore android/app/my-release-key.keystore
   ```
2. Add SHA-256 to Firebase Console → Project Settings → Your App
3. Download new google-services.json
4. Replace in android/app/
5. Rebuild

---

## Quick Commands Reference

### Build APK (Testing)
```bash
cd MyApp/android
./gradlew assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

### Build AAB (Play Store)
```bash
cd MyApp/android
./gradlew bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

### Install APK
```bash
adb install -r MyApp/android/app/build/outputs/apk/release/app-release.apk
```

### Clean Build
```bash
cd MyApp/android
./gradlew clean
```

---

## Current Build Status

✅ All fixes applied and tested
✅ TypeScript errors resolved
✅ Notification system working correctly
✅ Ready for release build

**Changes in this release:**
- Fixed duplicate notifications (3 sources identified and fixed)
- Fixed notification body content
- Improved FCM token management
- Better error handling

See `FINAL_FIXES_SUMMARY.md` for complete technical details.
