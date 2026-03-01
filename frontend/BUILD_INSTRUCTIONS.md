# QuickShare - Offline P2P File Transfer App

## Build Instructions

Since this app uses native modules for **WiFi Direct (Android)** and **Multipeer Connectivity (iOS)**, you cannot test it in Expo Go or web preview. You need to build the native app.

### Prerequisites

1. **Node.js** (v18+)
2. **Android Studio** (for Android builds)
3. **Xcode** (for iOS builds - macOS only)
4. **Expo CLI**: `npm install -g expo-cli`

---

## Option 1: Local Development Build

### Android

```bash
# Navigate to frontend directory
cd frontend

# Generate native Android project
npx expo prebuild --platform android

# Build and run on connected device/emulator
npx expo run:android

# Or open in Android Studio
cd android && ./gradlew assembleDebug
```

### iOS (macOS only)

```bash
# Navigate to frontend directory
cd frontend

# Generate native iOS project  
npx expo prebuild --platform ios

# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Build and run on simulator/device
npx expo run:ios

# Or open in Xcode
open ios/QuickShare.xcworkspace
```

---

## Option 2: EAS Build (Cloud Build)

If you don't want to set up local build tools, use Expo's cloud build service:

### Setup EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure
```

### Build APK (Android)

```bash
# Development build (includes dev menu)
eas build --platform android --profile development

# Preview build (no dev menu, optimized)
eas build --platform android --profile preview

# Production build (signed, ready for Play Store)
eas build --platform android --profile production
```

### Build IPA (iOS)

```bash
# Development build
eas build --platform ios --profile development

# Production build (requires Apple Developer account)
eas build --platform ios --profile production
```

---

## How the App Works

### Android - WiFi Direct

1. **Receiver** taps "Start Receiving" → Creates WiFi Direct group
2. **Sender** taps "Start Scanning" → Discovers nearby devices
3. **Sender** selects the receiver → Connects via WiFi Direct
4. **Sender** picks files and sends directly (no internet needed)

### iOS - Multipeer Connectivity

1. **Receiver** taps "Start Receiving" → Advertises via Bluetooth/WiFi
2. **Sender** taps "Start Scanning" → Browses for nearby devices
3. **Sender** selects the receiver → Connects via Multipeer
4. **Sender** picks files and sends directly (no internet needed)

---

## Permissions Required

### Android
- `ACCESS_FINE_LOCATION` - Required for WiFi Direct discovery
- `ACCESS_COARSE_LOCATION` - Required for WiFi Direct discovery
- `NEARBY_WIFI_DEVICES` - Required for Android 13+
- `ACCESS_WIFI_STATE` - Check WiFi status
- `CHANGE_WIFI_STATE` - Create WiFi Direct group
- `READ_EXTERNAL_STORAGE` - Access files to share
- `WRITE_EXTERNAL_STORAGE` - Save received files

### iOS
- `NSLocalNetworkUsageDescription` - Access local network for peer discovery
- `NSBonjourServices` - Bonjour service for Multipeer Connectivity

---

## Troubleshooting

### "WiFi Direct not supported"
- Ensure your Android device supports WiFi Direct (most devices since Android 4.0)
- Some budget devices may not have the required hardware

### "Can't find devices"
- Both devices must have the app open
- On Android, ensure Location is enabled (required for WiFi scanning)
- Devices should be within WiFi range (~100m)

### "Connection failed"
- Try stopping and restarting both apps
- On Android, go to Settings > WiFi > WiFi Direct and forget any stuck connections
- On iOS, toggle Bluetooth/WiFi off and on

---

## File Types Supported

- Images (JPG, PNG, GIF, WebP)
- Videos (MP4, MOV, AVI)
- Documents (PDF, DOC, XLS, PPT)
- Archives (ZIP, RAR, 7Z)
- APK files (Android apps)
- Any other file type

---

## Technology Stack

- **Framework**: React Native with Expo
- **Android P2P**: WiFi Direct via `react-native-wifi-p2p`
- **iOS P2P**: Multipeer Connectivity via `react-native-multipeer-connectivity`
- **File System**: `expo-file-system`, `expo-document-picker`
- **UI**: Custom components with Expo Vector Icons
