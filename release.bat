@echo off
REM Release Build Script for YashRoadlines App (Windows)

echo.
echo ========================================
echo YashRoadlines Release Build Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Run this script from MyApp directory.
    exit /b 1
)

REM Check if android directory exists
if not exist "android" (
    echo [ERROR] android directory not found.
    exit /b 1
)

echo [INFO] Pre-flight checks...
echo.

REM Check for release keystore
if not exist "android\app\my-release-key.keystore" (
    echo [WARNING] Release keystore not found at android\app\my-release-key.keystore
    echo           Using debug keystore for this build.
    echo           For production release, generate a release keystore first.
    echo           See RELEASE_GUIDE.md for instructions.
    echo.
    set /p CONTINUE="Continue with debug keystore? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

REM Check for gradle.properties
if not exist "android\gradle.properties" (
    echo [WARNING] android\gradle.properties not found
    echo           Release signing may not work properly.
    echo.
)

REM Ask user what to build
echo What would you like to build?
echo 1) APK (for testing/direct install)
echo 2) AAB (for Google Play Store)
echo 3) Both
echo.
set /p CHOICE="Enter choice (1-3): "

REM Ask if clean build is needed
echo.
set /p CLEAN="Perform clean build? (recommended) (y/n): "

echo.
echo [INFO] Starting build process...
echo.

cd android

REM Clean if requested
if /i "%CLEAN%"=="y" (
    echo [INFO] Cleaning previous builds...
    call gradlew.bat clean
    if errorlevel 1 (
        echo [ERROR] Clean failed
        cd ..
        exit /b 1
    )
    echo [SUCCESS] Clean complete
    echo.
)

REM Build based on choice
if "%CHOICE%"=="1" goto BUILD_APK
if "%CHOICE%"=="2" goto BUILD_AAB
if "%CHOICE%"=="3" goto BUILD_BOTH
echo [ERROR] Invalid choice
cd ..
exit /b 1

:BUILD_APK
echo [INFO] Building APK...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo [ERROR] APK build failed
    cd ..
    exit /b 1
)
echo.
echo [SUCCESS] APK build successful!
echo.
echo [INFO] APK location:
echo        %CD%\app\build\outputs\apk\release\app-release.apk
echo.

REM Check if APK exists
if exist "app\build\outputs\apk\release\app-release.apk" (
    for %%A in ("app\build\outputs\apk\release\app-release.apk") do echo [INFO] APK size: %%~zA bytes
    echo.
    
    set /p INSTALL="Install APK on connected device? (y/n): "
    if /i "!INSTALL!"=="y" (
        echo [INFO] Installing APK...
        adb install -r app\build\outputs\apk\release\app-release.apk
        if errorlevel 1 (
            echo [ERROR] Installation failed
        ) else (
            echo [SUCCESS] APK installed successfully
        )
    )
)
goto END

:BUILD_AAB
echo [INFO] Building AAB...
call gradlew.bat bundleRelease
if errorlevel 1 (
    echo [ERROR] AAB build failed
    cd ..
    exit /b 1
)
echo.
echo [SUCCESS] AAB build successful!
echo.
echo [INFO] AAB location:
echo        %CD%\app\build\outputs\bundle\release\app-release.aab
echo.

REM Check if AAB exists
if exist "app\build\outputs\bundle\release\app-release.aab" (
    for %%A in ("app\build\outputs\bundle\release\app-release.aab") do echo [INFO] AAB size: %%~zA bytes
    echo.
    echo [INFO] Ready to upload to Google Play Console
)
goto END

:BUILD_BOTH
echo [INFO] Building APK...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo [ERROR] APK build failed
    cd ..
    exit /b 1
)
echo [SUCCESS] APK build successful
echo.

echo [INFO] Building AAB...
call gradlew.bat bundleRelease
if errorlevel 1 (
    echo [ERROR] AAB build failed
    cd ..
    exit /b 1
)
echo [SUCCESS] AAB build successful
echo.

echo [SUCCESS] Both builds successful!
echo.
echo [INFO] Build locations:
echo        APK: %CD%\app\build\outputs\apk\release\app-release.apk
echo        AAB: %CD%\app\build\outputs\bundle\release\app-release.aab
echo.

REM Show sizes
if exist "app\build\outputs\apk\release\app-release.apk" (
    for %%A in ("app\build\outputs\apk\release\app-release.apk") do echo [INFO] APK size: %%~zA bytes
)
if exist "app\build\outputs\bundle\release\app-release.aab" (
    for %%A in ("app\build\outputs\bundle\release\app-release.aab") do echo [INFO] AAB size: %%~zA bytes
)
echo.

set /p INSTALL="Install APK on connected device? (y/n): "
if /i "%INSTALL%"=="y" (
    echo [INFO] Installing APK...
    adb install -r app\build\outputs\apk\release\app-release.apk
    if errorlevel 1 (
        echo [ERROR] Installation failed
    ) else (
        echo [SUCCESS] APK installed successfully
    )
)

:END
cd ..
echo.
echo ========================================
echo Build process complete!
echo ========================================
echo.
echo Next steps:
echo    1. Test the release build thoroughly
echo    2. Check RELEASE_GUIDE.md for upload instructions
echo    3. Update version numbers for next release
echo.
pause
