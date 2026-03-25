# Release Build Guide - YashRoadlines App

## Current Version
- Version Code: 1
- Version Name: 1.0

## Pre-Release Checklist

### 1. Update Version Numbers
Before building, update version in `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.myapp"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2        // ← Increment this (must be higher than previous)
    versionName "1.1"    // ← Update this (e.g., 1.0 → 1.1)
}
```

### 2. Generate Release Keystore (First Time Only)

If you don't have a release keystore yet, generate one:

```bash
cd MyApp/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**IMPORTANT**: 
- Save the password securely (you'll need it for every release)
- Backup the keystore file (if you lose it, you can't update the app on Play Store)
- Never commit the keystore to git

### 3. Configure Release Signing

Create/edit `android/gradle.properties` and add:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

**IMPORTANT**: Add `gradle.properties` to `.gitignore` to keep passwords secure!

### 4. Update build.gradle Signing Config

Edit `android/app/build.gradle` and update the signingConfigs section:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
}

buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release  // ← Change from debug to release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

## Build Commands

### Option 1: Build APK (For Testing/Direct Install)

```bash
cd MyApp/android
./gradlew assembleRelease
```

APK location: `MyApp/android/app/build/outputs/apk/release/app-release.apk`

### Option 2: Build AAB (For Google Play Store)

```bash
cd MyApp/android
./gradlew bundleRelease
```

AAB location: `MyApp/android/app/build/outputs/bundle/release/app-release.aab`

**Note**: Google Play Store requires AAB format (not APK) for new apps.

## Clean Build (If Issues)

If you face build errors, try cleaning first:

```bash
cd MyApp/android
./gradlew clean
./gradlew bundleRelease
```

## Testing Release Build

Before uploading to Play Store, test the release APK:

```bash
# Install release APK on connected device
adb install MyApp/android/app/build/outputs/apk/release/app-release.apk
```

Test checklist:
- [ ] App launches successfully
- [ ] Login works
- [ ] Push notifications work (add entry from another device)
- [ ] All features work as expected
- [ ] No crashes or errors

## Upload to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to "Production" → "Create new release"
4. Upload the AAB file: `app-release.aab`
5. Add release notes (see below)
6. Review and roll out

## Release Notes Template

```
Version 1.1 - Bug Fixes & Improvements

✅ Fixed duplicate push notifications issue
✅ Fixed notification body showing "New notification" instead of details
✅ Improved FCM token management and cleanup
✅ Enhanced notification display with full entry details
✅ Fixed BiometricAuthService export error
✅ Better handling of foreground/background notifications

Bug Fixes:
- Notifications now show complete entry details (user, amount, agency, etc.)
- Fixed duplicate notifications for admin users
- Improved token refresh handling
- Auto-cleanup of invalid FCM tokens

Performance:
- Optimized notification delivery
- Better error handling and logging
```

## Troubleshooting

### Build Fails with "Keystore not found"
- Make sure keystore file exists in `android/app/` directory
- Check `gradle.properties` has correct file path

### Build Fails with "Wrong password"
- Verify passwords in `gradle.properties` are correct
- Try regenerating keystore if password is lost

### APK/AAB Size Too Large
- Enable ProGuard: Set `enableProguardInReleaseBuilds = true` in build.gradle
- Enable code shrinking in build.gradle

### Push Notifications Not Working in Release
- Verify `google-services.json` is present in `android/app/`
- Check Firebase console has correct SHA-256 certificate fingerprint
- Get SHA-256 from release keystore:
  ```bash
  keytool -list -v -keystore my-release-key.keystore -alias my-key-alias
  ```
- Add SHA-256 to Firebase Console → Project Settings → Your App

## Post-Release

After successful release:
1. Tag the release in git:
   ```bash
   git tag -a v1.1 -m "Release version 1.1"
   git push origin v1.1
   ```

2. Update version numbers for next release

3. Monitor crash reports in Play Console

4. Monitor Firebase Analytics for any issues

## Important Files to Backup

- `android/app/my-release-key.keystore` (CRITICAL - can't update app without this!)
- `android/gradle.properties` (contains passwords)
- `google-services.json` (Firebase config)

## Security Notes

**Never commit these files to git:**
- `*.keystore` files
- `gradle.properties` (if it contains passwords)
- Any file with passwords or API keys

Add to `.gitignore`:
```
# Release keystore
*.keystore
!debug.keystore

# Gradle properties with passwords
gradle.properties
```
