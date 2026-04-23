@echo off
REM Debug script for splash screen stuck issue (Windows)
REM Run this when the app is stuck on splash screen

echo 🔍 Debugging Splash Screen Issue...
echo ==================================
echo.

REM Check if device is connected
echo 📱 Checking connected devices...
adb devices
echo.

REM Clear app data and restart
echo 🧹 Clearing app data...
adb shell pm clear com.myapp
echo.

REM Get logcat for the app
echo 📋 Starting logcat (Press Ctrl+C to stop)...
echo Looking for splash screen related logs...
echo.

REM Filter logs for splash screen, auth, and navigation
adb logcat -c
adb logcat | findstr /I "SplashScreen Auth animation navigat Session TOKEN_REFRESHED"
