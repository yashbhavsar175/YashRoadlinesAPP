@echo off
REM Quick check if app is running and recent logs

echo 📱 App Status Check
echo ==================
echo.

echo 1. Checking connected devices...
adb devices
echo.

echo 2. Checking if app is running...
adb shell "ps | grep com.myapp"
echo.

echo 3. Recent app logs (last 20 lines)...
adb logcat -d -v time | findstr /I "ReactNativeJS" | powershell -Command "$input | Select-Object -Last 20"
echo.

echo 4. Splash screen specific logs...
adb logcat -d -v time | findstr /I "SplashScreen animation Session" | powershell -Command "$input | Select-Object -Last 10"
echo.

echo ✅ Status check complete!
