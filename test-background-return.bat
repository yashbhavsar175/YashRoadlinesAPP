@echo off
REM Test script for background return scenario
REM This simulates the main issue: app stuck after being idle for hours

echo 🧪 Background Return Test
echo ========================
echo.
echo This test simulates the main issue:
echo "App stuck on splash after being idle for hours"
echo.

echo Step 1: Checking if app is running...
adb shell "ps | grep com.myapp"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ App is not running. Please start the app first.
    exit /b 1
)
echo ✅ App is running
echo.

echo Step 2: Sending app to background...
adb shell input keyevent KEYCODE_HOME
echo ✅ App sent to background
echo.

echo Step 3: Waiting for token to expire...
echo (In production, wait 2-3 hours. For testing, we'll wait 10 seconds)
echo.
timeout /t 10 /nobreak
echo.

echo Step 4: Clearing logs...
adb logcat -c
echo ✅ Logs cleared
echo.

echo Step 5: Bringing app back to foreground...
adb shell am start -n com.myapp/.MainActivity
echo ✅ App brought to foreground
echo.

echo Step 6: Monitoring splash screen behavior...
echo (Watching for 5 seconds)
echo.
timeout /t 5 /nobreak
echo.

echo Step 7: Checking logs...
echo.
adb logcat -d -v time | findstr /I "SplashScreen animation Session navigat Home"
echo.

echo ========================================
echo Test Complete!
echo.
echo Expected behavior:
echo - 🚀 SplashScreen mounted
echo - ✨ Splash animation complete
echo - ✅ Session active, navigating...
echo - [HOME] Rendered
echo.
echo If you see these logs, the fix is working! ✅
echo If splash is stuck, check TIMING_ANALYSIS.md
echo.
