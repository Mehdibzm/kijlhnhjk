import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

// Demo mode for web preview
const IS_DEMO_MODE = Platform.OS === 'web';

interface PeerDevice {
  id: string;
  name: string;
  status: 'available' | 'connecting' | 'connected';
}

interface SelectedFile {
  name: string;
  uri: string;
  size: number;
  type: string;
}

// Demo peers for preview
const DEMO_PEERS: PeerDevice[] = [
  { id: '1', name: 'Samsung Galaxy S24', status: 'available' },
  { id: '2', name: 'iPhone 15 Pro', status: 'available' },
  { id: '3', name: 'Pixel 8 Pro', status: 'available' },
];

type ScanMethod = 'choose' | 'qr' | 'discover';

// PeerItem Component
function PeerItem({ 
  item, 
  index, 
  selectedPeer, 
  connectionStatus,
  onConnect 
}: { 
  item: PeerDevice; 
  index: number;
  selectedPeer: PeerDevice | null;
  connectionStatus: string;
  onConnect: (peer: PeerDevice) => void;
}) {
  const itemAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(itemAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [
          { scale: itemAnim },
          { translateX: itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          })},
        ],
        opacity: itemAnim,
      }}
    >
      <TouchableOpacity
        style={[
          styles.peerItem,
          selectedPeer?.id === item.id && styles.peerItemSelected,
        ]}
        onPress={() => onConnect(item)}
        disabled={connectionStatus === 'connected'}
      >
        <View style={styles.peerIcon}>
          <Ionicons name="phone-portrait" size={24} color="#00D9FF" />
        </View>
        <View style={styles.peerInfo}>
          <Text style={styles.peerName}>{item.name}</Text>
          <Text style={styles.peerStatus}>
            {selectedPeer?.id === item.id && selectedPeer?.status === 'connecting' 
              ? 'Connecting...' 
              : 'Available'}
          </Text>
        </View>
        {selectedPeer?.id === item.id && selectedPeer?.status === 'connecting' && (
          <ActivityIndicator size="small" color="#00D9FF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SendScreen() {
  const router = useRouter();
  const [scanMethod, setScanMethod] = useState<ScanMethod>('choose');
  const [isScanning, setIsScanning] = useState(false);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<PeerDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const methodAnim = useRef(new Animated.Value(0)).current;
  const scanButtonAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;
  const connectedAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(methodAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Radar animation when scanning
  useEffect(() => {
    if (isScanning && scanMethod === 'discover') {
      Animated.loop(
        Animated.parallel([
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity, {
            toValue: 0,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      radarAnim.setValue(0);
      radarOpacity.setValue(1);
    }
  }, [isScanning, scanMethod]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  const selectMethod = (method: ScanMethod) => {
    setScanMethod(method);
    Animated.spring(scanButtonAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    if (scannedCode) return; // Prevent multiple scans
    
    setScannedCode(data);
    
    // Demo: simulate connection
    if (IS_DEMO_MODE || true) {
      setTimeout(() => {
        setConnectionStatus('connected');
        setSelectedPeer({
          id: 'qr-device',
          name: `Device (${data.substring(0, 6)})`,
          status: 'connected',
        });
        
        Animated.spring(connectedAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 1000);
    }
  };

  const startDiscovery = () => {
    setIsScanning(true);
    setPeers([]);

    if (IS_DEMO_MODE) {
      // Demo: gradually show peers
      DEMO_PEERS.forEach((peer, index) => {
        setTimeout(() => {
          setPeers((prev) => [...prev, peer]);
        }, (index + 1) * 800);
      });
    }
  };

  const stopDiscovery = () => {
    setIsScanning(false);
  };

  const connectToPeer = (peer: PeerDevice) => {
    setSelectedPeer({ ...peer, status: 'connecting' });
    
    if (IS_DEMO_MODE) {
      setTimeout(() => {
        setSelectedPeer({ ...peer, status: 'connected' });
        setConnectionStatus('connected');
        setIsScanning(false);
        
        Animated.spring(connectedAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 1500);
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const files = result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
          type: asset.mimeType || 'application/octet-stream',
        }));
        setSelectedFiles((prev) => [...prev, ...files]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          Alert.alert('Success!', `${selectedFiles.length} file(s) sent successfully`);
          setSelectedFiles([]);
          setUploadProgress(0);
        }, 500);
      }
      setUploadProgress(progress);
    }, 200);
  };

  const disconnect = () => {
    setConnectionStatus('disconnected');
    setSelectedPeer(null);
    setPeers([]);
    setScannedCode(null);
    setScanMethod('choose');
    connectedAnim.setValue(0);
    scanButtonAnim.setValue(0);
  };

  const goBack = () => {
    if (scanMethod !== 'choose' && connectionStatus !== 'connected') {
      setScanMethod('choose');
      scanButtonAnim.setValue(0);
    } else {
      router.back();
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

  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const renderPeerItem = ({ item, index }: { item: PeerDevice; index: number }) => {
    return (
      <PeerItem 
        item={item} 
        index={index} 
        selectedPeer={selectedPeer}
        connectionStatus={connectionStatus}
        onConnect={connectToPeer}
      />
    );
  };

  // Connected State - File Selection
  if (connectionStatus === 'connected') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={disconnect} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Files</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: connectedAnim,
                transform: [{ scale: connectedAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })}],
              },
            ]}
          >
            {/* Connected Badge */}
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
              <Text style={styles.connectedText}>
                Connected to {selectedPeer?.name || 'Device'}
              </Text>
            </View>

            {/* Select Files Button */}
            <TouchableOpacity style={styles.selectFilesButton} onPress={pickFiles}>
              <Ionicons name="add-circle" size={32} color="#00D9FF" />
              <Text style={styles.selectFilesText}>Select Files</Text>
              <Text style={styles.selectFilesHint}>Images, Videos, Documents, APKs...</Text>
            </TouchableOpacity>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <View style={styles.filesList}>
                <Text style={styles.filesListTitle}>
                  Selected Files ({selectedFiles.length})
                </Text>
                {selectedFiles.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Ionicons name={getFileIcon(file.type)} size={24} color="#00D9FF" />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFile(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Sending files...</Text>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>{Math.round(uploadProgress)}%</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {selectedFiles.length > 0 && !isUploading && (
                <TouchableOpacity style={styles.sendButton} onPress={sendFiles}>
                  <Ionicons name="send" size={24} color="#0A0A0F" />
                  <Text style={styles.sendButtonText}>Send Files</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
                <Ionicons name="close-circle" size={20} color="#FF4444" />
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Files</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {scanMethod === 'choose' ? (
          /* Method Selection */
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
              <Ionicons name="link" size={50} color="#00D9FF" />
            </View>
            <Text style={styles.sectionTitle}>Connect to Receiver</Text>
            <Text style={styles.sectionDescription}>
              Choose how you want to find the receiver device
            </Text>

            {/* Method Cards */}
            <Animated.View 
              style={[
                styles.methodCards,
                { transform: [{ scale: methodAnim }] },
              ]}
            >
              {/* QR Code Method */}
              <TouchableOpacity
                style={styles.methodCard}
                onPress={() => selectMethod('qr')}
                activeOpacity={0.8}
              >
                <View style={styles.methodIconContainer}>
                  <Ionicons name="qr-code" size={40} color="#00D9FF" />
                </View>
                <Text style={styles.methodTitle}>Scan QR Code</Text>
                <Text style={styles.methodDescription}>
                  Quick & easy - scan the QR code shown on receiver's screen
                </Text>
                <View style={styles.methodBadge}>
                  <Ionicons name="flash" size={14} color="#FFB800" />
                  <Text style={styles.methodBadgeText}>Fastest</Text>
                </View>
              </TouchableOpacity>

              {/* Discover Method */}
              <TouchableOpacity
                style={styles.methodCard}
                onPress={() => selectMethod('discover')}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconContainer, { backgroundColor: 'rgba(0, 255, 136, 0.1)' }]}>
                  <Ionicons name="wifi" size={40} color="#00FF88" />
                </View>
                <Text style={styles.methodTitle}>Discover Devices</Text>
                <Text style={styles.methodDescription}>
                  {Platform.OS === 'android' 
                    ? 'Find nearby devices via WiFi Direct'
                    : Platform.OS === 'ios'
                      ? 'Find nearby iOS devices'
                      : 'Search for available devices'}
                </Text>
                <View style={[styles.methodBadge, { backgroundColor: 'rgba(0, 255, 136, 0.15)' }]}>
                  <Ionicons name="search" size={14} color="#00FF88" />
                  <Text style={[styles.methodBadgeText, { color: '#00FF88' }]}>Auto</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        ) : scanMethod === 'qr' ? (
          /* QR Code Scanner */
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: scanButtonAnim,
                transform: [{ scale: scanButtonAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Scan QR Code</Text>
            <Text style={styles.sectionDescription}>
              Point your camera at the QR code on the receiver's screen
            </Text>

            {/* Camera View */}
            <View style={styles.cameraContainer}>
              {Platform.OS === 'web' || IS_DEMO_MODE ? (
                /* Demo QR Scanner for Web */
                <View style={styles.demoCameraView}>
                  <View style={styles.qrFrame}>
                    <View style={[styles.qrCorner, styles.qrCornerTL]} />
                    <View style={[styles.qrCorner, styles.qrCornerTR]} />
                    <View style={[styles.qrCorner, styles.qrCornerBL]} />
                    <View style={[styles.qrCorner, styles.qrCornerBR]} />
                  </View>
                  <Text style={styles.demoText}>Camera Preview</Text>
                  <Text style={styles.demoSubtext}>(Demo Mode)</Text>
                  
                  {/* Demo: Simulate scan button */}
                  <TouchableOpacity
                    style={styles.demoScanButton}
                    onPress={() => handleQRCodeScanned({ data: 'DEMO-123456' })}
                  >
                    <Ionicons name="scan" size={20} color="#0A0A0F" />
                    <Text style={styles.demoScanButtonText}>Simulate Scan</Text>
                  </TouchableOpacity>
                </View>
              ) : permission?.granted ? (
                <CameraView
                  style={styles.cameraView}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scannedCode ? undefined : handleQRCodeScanned}
                >
                  <View style={styles.qrOverlay}>
                    <View style={styles.qrFrame}>
                      <View style={[styles.qrCorner, styles.qrCornerTL]} />
                      <View style={[styles.qrCorner, styles.qrCornerTR]} />
                      <View style={[styles.qrCorner, styles.qrCornerBL]} />
                      <View style={[styles.qrCorner, styles.qrCornerBR]} />
                    </View>
                  </View>
                </CameraView>
              ) : (
                <View style={styles.permissionView}>
                  <Ionicons name="camera-outline" size={50} color="#666680" />
                  <Text style={styles.permissionText}>Camera permission required</Text>
                  <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {scannedCode && (
              <View style={styles.scannedInfo}>
                <ActivityIndicator color="#00D9FF" />
                <Text style={styles.scannedText}>Connecting...</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          /* Device Discovery */
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: scanButtonAnim,
                transform: [{ translateY: scanButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })}],
              },
            ]}
          >
            <View style={styles.scanHeader}>
              <View style={styles.radarContainer}>
                {isScanning && (
                  <Animated.View
                    style={[
                      styles.radarWave,
                      {
                        transform: [{ scale: radarScale }],
                        opacity: radarOpacity,
                      },
                    ]}
                  />
                )}
                <View style={[styles.iconContainer, { marginBottom: 0 }]}>
                  <Ionicons name="wifi" size={40} color="#00FF88" />
                </View>
              </View>
              <Text style={styles.sectionTitle}>Discover Devices</Text>
              <Text style={styles.sectionDescription}>
                {Platform.OS === 'android'
                  ? 'Scanning for devices with WiFi Direct'
                  : Platform.OS === 'ios'
                    ? 'Scanning for nearby iOS devices'
                    : 'Demo: Tap scan to find nearby devices'}
              </Text>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={isScanning ? stopDiscovery : startDiscovery}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator color="#0A0A0F" />
                  <Text style={styles.scanButtonText}>Stop Scanning</Text>
                </>
              ) : (
                <>
                  <Ionicons name="scan" size={24} color="#0A0A0F" />
                  <Text style={styles.scanButtonText}>Start Scanning</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Peers List */}
            {peers.length > 0 && (
              <View style={styles.peersSection}>
                <Text style={styles.peersSectionTitle}>
                  Available Devices ({peers.length})
                </Text>
                <FlatList
                  data={peers}
                  renderItem={renderPeerItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {isScanning && peers.length === 0 && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#666680" />
                <Text style={styles.scanningText}>Looking for devices...</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  methodCards: {
    width: '100%',
    gap: 16,
  },
  methodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  methodIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666680',
    lineHeight: 20,
    marginBottom: 12,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB800',
  },
  // QR Scanner styles
  cameraContainer: {
    width: 300,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    marginBottom: 24,
    alignSelf: 'center',
  },
  cameraView: {
    flex: 1,
  },
  demoCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 20,
  },
  qrOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  qrFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00D9FF',
  },
  qrCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  qrCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  qrCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  qrCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  demoText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 24,
  },
  demoSubtext: {
    fontSize: 12,
    color: '#666680',
    marginTop: 4,
  },
  demoScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00D9FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 24,
  },
  demoScanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  permissionView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#666680',
    marginTop: 12,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#00D9FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  scannedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scannedText: {
    fontSize: 16,
    color: '#00D9FF',
  },
  // Discovery styles
  scanHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  radarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  radarWave: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  scanButton: {
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
  scanButtonActive: {
    backgroundColor: '#FFB800',
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  peersSection: {
    width: '100%',
    marginTop: 32,
  },
  peersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  peerItemSelected: {
    borderColor: '#00D9FF',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  peerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  peerStatus: {
    fontSize: 12,
    color: '#00FF88',
    marginTop: 2,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  scanningText: {
    fontSize: 14,
    color: '#666680',
  },
  // Connected state styles
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  connectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
  },
  selectFilesButton: {
    width: '100%',
    padding: 32,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectFilesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  selectFilesHint: {
    fontSize: 12,
    color: '#666680',
    marginTop: 4,
  },
  filesList: {
    width: '100%',
    marginTop: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  removeButton: {
    padding: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D9FF',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D9FF',
    marginTop: 8,
  },
  actionButtons: {
    width: '100%',
    marginTop: 24,
    gap: 12,
    paddingBottom: 40,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
});
