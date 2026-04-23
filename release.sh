#!/bin/bash
# Release Build Script for YashRoadlines App

set -e  # Exit on error

echo "🚀 YashRoadlines Release Build Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Run this script from MyApp directory.${NC}"
    exit 1
fi

# Check if android directory exists
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: android directory not found.${NC}"
    exit 1
fi

echo "📋 Pre-flight checks..."
echo ""

# Check for release keystore
if [ ! -f "android/app/my-release-key.keystore" ]; then
    echo -e "${YELLOW}⚠️  Warning: Release keystore not found at android/app/my-release-key.keystore${NC}"
    echo "   Using debug keystore for this build."
    echo "   For production release, generate a release keystore first."
    echo "   See RELEASE_GUIDE.md for instructions."
    echo ""
    read -p "Continue with debug keystore? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for gradle.properties
if [ ! -f "android/gradle.properties" ]; then
    echo -e "${YELLOW}⚠️  Warning: android/gradle.properties not found${NC}"
    echo "   Release signing may not work properly."
    echo ""
fi

# Ask user what to build
echo "What would you like to build?"
echo "1) APK (for testing/direct install)"
echo "2) AAB (for Google Play Store)"
echo "3) Both"
echo ""
read -p "Enter choice (1-3): " choice

# Ask if clean build is needed
echo ""
read -p "Perform clean build? (recommended) (y/n) " -n 1 -r
echo ""
CLEAN_BUILD=$REPLY

echo ""
echo "🔨 Starting build process..."
echo ""

cd android

# Clean if requested
if [[ $CLEAN_BUILD =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning previous builds..."
    ./gradlew clean
    echo -e "${GREEN}✅ Clean complete${NC}"
    echo ""
fi

# Build based on choice 
case $choice in
    1)
        echo "📦 Building APK..."
        ./gradlew assembleRelease
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ APK build successful!${NC}"
            echo ""
            echo "📍 APK location:"
            echo "   $(pwd)/app/build/outputs/apk/release/app-release.apk"
            echo ""
            
            # Check if APK exists and show size
            if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
                SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
                echo "📊 APK size: $SIZE"
                echo ""
                
                # Ask if user wants to install
                read -p "Install APK on connected device? (y/n) " -n 1 -r
                echo ""
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    echo "📲 Installing APK..."
                    adb install -r app/build/outputs/apk/release/app-release.apk
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ APK installed successfully${NC}"
                    else
                        echo -e "${RED}❌ Installation failed${NC}"
                    fi
                fi
            fi
        else
            echo -e "${RED}❌ APK build failed${NC}"
            exit 1
        fi
        ;;
    2)
        echo "📦 Building AAB..."
        ./gradlew bundleRelease
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ AAB build successful!${NC}"
            echo ""
            echo "📍 AAB location:"
            echo "   $(pwd)/app/build/outputs/bundle/release/app-release.aab"
            echo ""
            
            # Check if AAB exists and show size
            if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
                SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
                echo "📊 AAB size: $SIZE"
                echo ""
                echo "📤 Ready to upload to Google Play Console"
            fi
        else
            echo -e "${RED}❌ AAB build failed${NC}"
            exit 1
        fi
        ;;
    3)
        echo "📦 Building APK..."
        ./gradlew assembleRelease
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ APK build successful${NC}"
        else
            echo -e "${RED}❌ APK build failed${NC}"
            exit 1
        fi
        
        echo ""
        echo "📦 Building AAB..."
        ./gradlew bundleRelease
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ AAB build successful${NC}"
        else
            echo -e "${RED}❌ AAB build failed${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${GREEN}✅ Both builds successful!${NC}"
        echo ""
        echo "📍 Build locations:"
        echo "   APK: $(pwd)/app/build/outputs/apk/release/app-release.apk"
        echo "   AAB: $(pwd)/app/build/outputs/bundle/release/app-release.aab"
        echo ""
        
        # Show sizes
        if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
            APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
            echo "📊 APK size: $APK_SIZE"
        fi
        if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
            AAB_SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
            echo "📊 AAB size: $AAB_SIZE"
        fi
        
        echo ""
        # Ask if user wants to install APK
        read -p "Install APK on connected device? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📲 Installing APK..."
            adb install -r app/build/outputs/apk/release/app-release.apk
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ APK installed successfully${NC}"
            else
                echo -e "${RED}❌ Installation failed${NC}"
            fi
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

cd ..

echo ""
echo "🎉 Build process complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Test the release build thoroughly"
echo "   2. Check RELEASE_GUIDE.md for upload instructions"
echo "   3. Update version numbers for next release"
echo ""
