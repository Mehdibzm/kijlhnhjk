#!/bin/bash

# QuickShare - Quick Setup Script
# Run this after cloning/downloading the project

echo "=========================================="
echo "QuickShare - Quick Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm/yarn is available
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    echo "✅ Using Yarn: $(yarn --version)"
else
    PKG_MANAGER="npm"
    echo "✅ Using npm: $(npm --version)"
fi

echo ""
echo "📦 Installing dependencies..."
$PKG_MANAGER install

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. For Android APK:"
echo "   npx expo prebuild --platform android"
echo "   cd android && ./gradlew assembleDebug"
echo "   APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "2. For iOS (macOS only):"
echo "   npx expo prebuild --platform ios"
echo "   cd ios && pod install && cd .."
echo "   npx expo run:ios"
echo ""
echo "3. Run on connected Android device:"
echo "   npx expo run:android"
echo ""
echo "See LOCAL_DEPLOYMENT.md for detailed instructions."
echo "=========================================="
