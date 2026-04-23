@echo off
REM Monitor splash screen timing in real-time
REM This will show you exactly how long the app takes to open

echo ⏱️  Splash Screen Timing Monitor
echo ================================
echo.
echo Waiting for app to start...
echo Press Ctrl+C to stop monitoring
echo.

REM Clear old logs
adb logcat -c

REM Monitor with timestamps
adb logcat -v time | findstr /I "SplashScreen mounted animation complete Session navigat ReactNativeJS"
