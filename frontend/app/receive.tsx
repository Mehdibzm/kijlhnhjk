import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Share,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

// Demo mode for web preview
const IS_DEMO_MODE = Platform.OS === 'web';

interface ReceivedFile {
  id: string;
  fileName: string;
  fileSize: number;
  receivedAt: Date;
  type: string;
}

// Demo files for preview
const DEMO_FILES: ReceivedFile[] = [
  { id: '1', fileName: 'vacation_photo.jpg', fileSize: 2456000, receivedAt: new Date(), type: 'image/jpeg' },
  { id: '2', fileName: 'presentation.pdf', fileSize: 1234000, receivedAt: new Date(), type: 'application/pdf' },
  { id: '3', fileName: 'app_update.apk', fileSize: 45600000, receivedAt: new Date(), type: 'application/vnd.android.package-archive' },
];

export default function ReceiveScreen() {
  const router = useRouter();
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('idle');
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [sessionCode] = useState(() => Math.random().toString().substring(2, 8));
  const [deviceName] = useState(`QuickShare-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const startButtonAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const deviceCardAnim = useRef(new Animated.Value(0)).current;
  const qrAnim = useRef(new Animated.Value(0)).current;
  const filesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(startButtonAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation when advertising
  useEffect(() => {
    if (isAdvertising) {
      // Continuous pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animations
      const createWave = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      createWave(waveAnim1, 0).start();
      createWave(waveAnim2, 600).start();
      createWave(waveAnim3, 1200).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
    }
  }, [isAdvertising]);

  const startAdvertising = () => {
    setIsAdvertising(true);
    setConnectionStatus('waiting');

    // Animations
    Animated.parallel([
      Animated.spring(deviceCardAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(qrAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    if (IS_DEMO_MODE) {
      // Demo: simulate connection after 4 seconds
      setTimeout(() => {
        setConnectionStatus('connected');
        setConnectedDevice('Samsung Galaxy S24');
        
        // Demo: simulate receiving files
        setTimeout(() => {
          DEMO_FILES.forEach((file, index) => {
            setTimeout(() => {
              setReceivedFiles((prev) => [...prev, file]);
              
              // Animate files list
              Animated.spring(filesAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
              }).start();
            }, index * 1000);
          });
        }, 1500);
      }, 4000);
    }
  };

  const stopAdvertising = () => {
    setIsAdvertising(false);
    setConnectionStatus('idle');
    setConnectedDevice(null);
    setReceivedFiles([]);
    deviceCardAnim.setValue(0);
    qrAnim.setValue(0);
    filesAnim.setValue(0);
  };

  const shareFile = async (file: ReceivedFile) => {
    try {
      if (Platform.OS !== 'web') {
        await Share.share({
          title: file.fileName,
          message: `Sharing ${file.fileName}`,
        });
      } else {
        Alert.alert('Share', `Would share: ${file.fileName}`);
      }
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('audio/')) return 'musical-notes';
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('zip') || type.includes('rar')) return 'archive';
    if (type.includes('apk') || type.includes('android')) return 'logo-android';
    return 'document';
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#00FF88';
      case 'waiting':
        return '#FFB800';
      default:
        return '#666680';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'waiting':
        return 'Waiting for sender...';
      case 'connected':
        return `Connected to ${connectedDevice}`;
      default:
        return 'Not advertising';
    }
  };

  const createWaveStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.5],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Files</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAdvertising ? (
          /* Start Advertising Section */
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })}],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={50} color="#00FF88" />
            </View>
            <Text style={styles.sectionTitle}>Ready to Receive</Text>
            <Text style={styles.sectionDescription}>
              Start receiving to show your QR code and make your device discoverable
            </Text>

            {/* Device Name */}
            <View style={styles.deviceNameContainer}>
              <Ionicons name="phone-portrait" size={20} color="#00D9FF" />
              <Text style={styles.deviceNameLabel}>Your device:</Text>
              <Text style={styles.deviceName}>{deviceName}</Text>
            </View>

            {/* Connection Methods Info */}
            <View style={styles.methodsInfo}>
              <Text style={styles.methodsTitle}>Senders can connect via:</Text>
              <View style={styles.methodItem}>
                <Ionicons name="qr-code" size={18} color="#00D9FF" />
                <Text style={styles.methodText}>Scan QR Code (fastest)</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="wifi" size={18} color="#00FF88" />
                <Text style={styles.methodText}>Device Discovery (auto)</Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: startButtonAnim }], width: '100%' }}>
              <TouchableOpacity style={styles.startButton} onPress={startAdvertising}>
                <Ionicons name="radio-outline" size={24} color="#0A0A0F" />
                <Text style={styles.startButtonText}>Start Receiving</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        ) : (
          /* Advertising Active Section */
          <View style={styles.section}>
            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor()}15` },
              ]}
            >
              <Animated.View 
                style={[
                  styles.statusDot, 
                  { 
                    backgroundColor: getStatusColor(),
                    transform: [{ scale: connectionStatus === 'waiting' ? pulseAnim : 1 }],
                  },
                ]} 
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* QR Code Card */}
            <Animated.View 
              style={[
                styles.qrCard,
                {
                  opacity: qrAnim,
                  transform: [{ scale: qrAnim }],
                },
              ]}
            >
              <Text style={styles.qrTitle}>Scan to Connect</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={`quickshare://${sessionCode}`}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color="#0A0A0F"
                />
              </View>
              <View style={styles.sessionCodeContainer}>
                <Text style={styles.sessionCodeLabel}>Session Code</Text>
                <Text style={styles.sessionCode}>{sessionCode}</Text>
              </View>
            </Animated.View>

            {/* OR Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Device Discovery Card */}
            <Animated.View 
              style={[
                styles.deviceCard,
                {
                  opacity: deviceCardAnim,
                  transform: [{ scale: deviceCardAnim }],
                },
              ]}
            >
              <View style={styles.waveContainer}>
                {connectionStatus === 'waiting' && (
                  <>
                    <Animated.View style={[styles.wave, createWaveStyle(waveAnim1)]} />
                    <Animated.View style={[styles.wave, createWaveStyle(waveAnim2)]} />
                    <Animated.View style={[styles.wave, createWaveStyle(waveAnim3)]} />
                  </>
                )}
                <Animated.View 
                  style={[
                    styles.deviceCardIcon,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons
                    name={Platform.OS === 'android' ? 'wifi' : 'bluetooth'}
                    size={32}
                    color="#00FF88"
                  />
                </Animated.View>
              </View>
              <Text style={styles.deviceCardName}>{deviceName}</Text>
              <Text style={styles.deviceCardHint}>
                {connectionStatus === 'waiting'
                  ? 'Discoverable via device search'
                  : 'Receiving files...'}
              </Text>
            </Animated.View>

            {/* Received Files */}
            {receivedFiles.length > 0 && (
              <Animated.View 
                style={[
                  styles.filesList,
                  {
                    opacity: filesAnim,
                    transform: [{ translateY: filesAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })}],
                  },
                ]}
              >
                <Text style={styles.filesListTitle}>
                  Received Files ({receivedFiles.length})
                </Text>
                {receivedFiles.map((file, index) => (
                  <FileItem 
                    key={file.id} 
                    file={file} 
                    index={index}
                    onShare={() => shareFile(file)}
                    formatFileSize={formatFileSize}
                    getFileIcon={getFileIcon}
                  />
                ))}
              </Animated.View>
            )}

            {/* Stop Button */}
            <TouchableOpacity style={styles.stopButton} onPress={stopAdvertising}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={styles.stopButtonText}>Stop Receiving</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Animated file item component
function FileItem({ 
  file, 
  index, 
  onShare, 
  formatFileSize, 
  getFileIcon 
}: { 
  file: ReceivedFile; 
  index: number;
  onShare: () => void;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (type: string) => keyof typeof Ionicons.glyphMap;
}) {
  const itemAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 200),
      Animated.spring(itemAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    onShare();
  };

  return (
    <Animated.View
      style={{
        transform: [
          { scale: Animated.multiply(itemAnim, scaleAnim) },
          { translateX: itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          })},
        ],
        opacity: itemAnim,
      }}
    >
      <View style={styles.fileItem}>
        <View style={styles.fileIconContainer}>
          <Ionicons name={getFileIcon(file.type)} size={28} color="#00FF88" />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.fileName}
          </Text>
          <Text style={styles.fileSize}>{formatFileSize(file.fileSize)}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handlePress}>
          <Ionicons name="share-outline" size={24} color="#00D9FF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    paddingTop: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  deviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  deviceNameLabel: {
    fontSize: 14,
    color: '#666680',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D9FF',
  },
  methodsInfo: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  methodsTitle: {
    fontSize: 14,
    color: '#666680',
    marginBottom: 12,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  methodText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D9FF',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  sessionCodeContainer: {
    alignItems: 'center',
  },
  sessionCodeLabel: {
    fontSize: 12,
    color: '#666680',
    marginBottom: 4,
  },
  sessionCode: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 12,
    color: '#666680',
    paddingHorizontal: 16,
  },
  deviceCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    marginBottom: 24,
  },
  waveContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  wave: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  deviceCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceCardHint: {
    fontSize: 12,
    color: '#666680',
    marginTop: 4,
    textAlign: 'center',
  },
  filesList: {
    width: '100%',
    marginBottom: 24,
  },
  filesListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  fileSize: {
    fontSize: 12,
    color: '#666680',
    marginTop: 2,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginBottom: 40,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
});
