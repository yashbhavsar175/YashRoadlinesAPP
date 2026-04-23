# Splash Screen Stuck Issue - Fix & Testing Guide

## Problem
Jab app kuch ghante baad kholta hai, splash screen chipak jata hai aur aage nahi badhta.

## Root Cause
1. **Token Refresh**: Jab app background se wapas aata hai, Supabase automatically token refresh karta hai
2. **Race Condition**: Auth event listener aur animation completion ke beech race condition thi
3. **Multiple Navigation**: Multiple navigation attempts ho rahe the simultaneously

## Fixes Applied

### 1. Animation Duration Reduced
- **Before**: 3 seconds animation + 500ms delay = 3.5s total
- **After**: 2 seconds animation + 300ms delay = 2.3s total
- **Why**: Faster response when app opens

### 2. Better Navigation Guard
```typescript
// Now checks hasNavigated FIRST before doing anything
if (hasNavigated.current) {
  console.log('⏭️ Already navigated, ignoring auth event');
  return;
}
```

### 3. Proper Cleanup
- Added `navigationTimer` ref to track and clear timeouts
- Proper cleanup in useEffect return function
- Prevents memory leaks and stuck states

### 4. Timeout Reduced
- **Before**: 5 seconds
- **After**: 4 seconds
- **Why**: Faster fallback if something goes wrong

## Testing Steps

### Test 1: Fresh App Open
1. Close app completely (swipe away from recent apps)
2. Open app
3. **Expected**: Splash screen shows for ~2 seconds, then navigates

### Test 2: Background Return (Main Issue)
1. Open app and login
2. Press home button (don't close app)
3. Wait 2-3 hours
4. Open app again
5. **Expected**: Splash screen shows briefly, then navigates to home/biometric

### Test 3: Token Refresh Simulation
1. Open app and login
2. Put app in background for 1 hour
3. Open app
4. **Expected**: Token refreshes in background, splash navigates properly

### Test 4: Network Issues
1. Turn off WiFi/Data
2. Open app
3. **Expected**: After 4 seconds timeout, navigates to login screen

## Debug Commands

### Windows (PowerShell/CMD)
```bash
# Run the debug script
cd MyApp
debug-splash.bat
```

### Linux/Mac
```bash
# Run the debug script
cd MyApp
chmod +x debug-splash.sh
./debug-splash.sh
```

### Manual ADB Commands
```bash
# Check connected devices
adb devices

# Clear app data (forces fresh start)
adb shell pm clear com.myapp

# Watch logs in real-time
adb logcat | grep -E "SplashScreen|Auth|navigation"

# Check specific logs
adb logcat | grep "🚀\|✨\|🔐\|⏭️\|⏳"
```

## Log Messages to Look For

### Good Flow (Working)
```
🚀 SplashScreen mounted
✨ Splash animation complete
🔐 Auth event on splash: INITIAL_SESSION hasNavigated: false
✅ Session active, navigating from splash...
```

### Bad Flow (Stuck)
```
🚀 SplashScreen mounted
✨ Splash animation complete
🔐 Auth event on splash: TOKEN_REFRESHED hasNavigated: false
⏳ Animation not complete, waiting...
(No further logs - STUCK!)
```

### Fixed Flow
```
🚀 SplashScreen mounted
✨ Splash animation complete
🔐 Auth event on splash: TOKEN_REFRESHED hasNavigated: false
✅ Session active, navigating from splash...
(Navigation happens successfully)
```

## If Still Stuck

### Quick Fix
```bash
# Rebuild the app
cd MyApp
npm run android
```

### Nuclear Option
```bash
# Clean everything and rebuild
cd MyApp
cd android
./gradlew clean
cd ..
npm run android
```

## Monitoring in Production

Add these logs to your monitoring:
- `SplashScreen mounted` - App started
- `Splash animation complete` - Animation done
- `Already navigated` - Multiple navigation attempts (should be rare)
- `Splash timeout` - Fallback triggered (investigate if frequent)

## Additional Notes

- Animation ab 2 seconds hai instead of 3 seconds
- Timeout ab 4 seconds hai instead of 5 seconds
- Better cleanup prevents memory leaks
- hasNavigated check prevents multiple navigation attempts
