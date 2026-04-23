#!/bin/bash

# Debug script for splash screen stuck issue
# Run this when the app is stuck on splash screen

echo "🔍 Debugging Splash Screen Issue..."
echo "=================================="
echo ""

# Check if device is connected
echo "📱 Checking connected devices..."
adb devices
echo ""

# Clear app data and restart
echo "🧹 Clearing app data..."
adb shell pm clear com.myapp
echo ""

# Get logcat for the app
echo "📋 Starting logcat (Press Ctrl+C to stop)..."
echo "Looking for splash screen related logs..."
echo ""

# Filter logs for splash screen, auth, and navigation
adb logcat -c  # Clear previous logs
adb logcat | grep -E "SplashScreen|Auth event|animation|navigat|Session|TOKEN_REFRESHED"
