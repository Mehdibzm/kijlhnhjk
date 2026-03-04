# QuickShare - Local Deployment Guide

## Prerequisites

### For Android Development:
1. **Android Studio** (latest version)
   - Download: https://developer.android.com/studio
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform-Tools
     - Android Emulator (optional)

2. **Java Development Kit (JDK) 17+**
   - Usually comes with Android Studio

3. **Environment Variables** (Windows/Mac/Linux):
   ```bash
   # Add to your shell profile (.bashrc, .zshrc, etc.)
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### For iOS Development (macOS only):
1. **Xcode** (from App Store)
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```

### For Both Platforms:
1. **Node.js 18+**: https://nodejs.org/
2. **Yarn** (optional but recommended):
   ```bash
   npm install -g yarn
   ```

---

## Step 1: Clone/Download the Project

If you downloaded from Emergent, extract the ZIP file:
```bash
unzip quickshare.zip
cd quickshare/frontend
```

---

## Step 2: Install Dependencies

```bash
# Using yarn (recommended)
yarn install

# Or using npm
npm install
```

---

## Step 3: Generate Native Projects

This creates the `android/` and `ios/` folders with native code:

```bash
# For Android only
npx expo prebuild --platform android

# For iOS only (macOS required)
npx expo prebuild --platform ios

# For both platforms
npx expo prebuild
```

---

## Step 4: Build and Run

### Android

**Option A: Run on Connected Device/Emulator**
```bash
# Make sure device is connected (check with: adb devices)
npx expo run:android
```

**Option B: Build APK manually**
```bash
cd android

# Debug APK (for testing)
./gradlew assembleDebug

# The APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Option C: Build Release APK**
```bash
cd android

# First, create a signing key (only once)
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Add to android/gradle.properties:
# MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
# MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
# MYAPP_UPLOAD_STORE_PASSWORD=*****
# MYAPP_UPLOAD_KEY_PASSWORD=*****

# Build release
./gradlew assembleRelease

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### iOS (macOS only)

**Option A: Run on Simulator**
```bash
npx expo run:ios
```

**Option B: Run on Device**
```bash
# Open in Xcode
open ios/QuickShare.xcworkspace

# Then:
# 1. Select your device from the dropdown
# 2. Sign with your Apple Developer account (free or paid)
# 3. Click the Play button
```

**Option C: Build IPA for Distribution**
1. Open `ios/QuickShare.xcworkspace` in Xcode
2. Product → Archive
3. Window → Organizer
4. Distribute App

---

## Step 5: Install on Device

### Android
1. Enable **Developer Options** on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Transfer and install APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### iOS
- Use Xcode to install directly on connected device
- Or use TestFlight for distribution (requires Apple Developer Program $99/year)

---

## Troubleshooting

### "SDK location not found"
Create `android/local.properties` with:
```
sdk.dir=/path/to/Android/Sdk
```

### "Could not find tools.jar"
Make sure JDK is properly installed and JAVA_HOME is set.

### Build fails with memory error
Add to `android/gradle.properties`:
```
org.gradle.jvmargs=-Xmx4096m
```

### iOS Pod install fails
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
```

### WiFi Direct not working
- Ensure Location permission is granted
- Ensure WiFi is enabled
- Some devices may not support WiFi Direct

---

## Testing P2P Transfer

### Android to Android:
1. Install app on both devices
2. Device A: Tap "Receive" → "Start Receiving"
3. Device B: Tap "Send" → "Start Scanning"
4. Device B: Select Device A from the list
5. Device B: Pick files and tap "Send Files"

### iOS to iOS:
1. Install app on both devices
2. Device A: Tap "Receive" → "Start Receiving"
3. Device B: Tap "Send" → "Start Scanning"
4. Device B: Select Device A from the list
5. Device B: Pick files and tap "Send Files"

Note: Android and iOS cannot connect to each other (different P2P protocols).

---

## Project Structure

```
frontend/
├── app/                    # Screen files (expo-router)
│   ├── _layout.tsx        # Root layout with navigation
│   ├── index.tsx          # Home screen
│   ├── send.tsx           # Send files screen
│   └── receive.tsx        # Receive files screen
├── src/
│   └── services/
│       └── P2PService.ts  # Platform-specific P2P logic
├── android/               # Generated Android project
├── ios/                   # Generated iOS project
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

---

## Need Help?

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Android Studio**: https://developer.android.com/studio/intro
- **Xcode**: https://developer.apple.com/xcode/
