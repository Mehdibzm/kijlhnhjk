import React, { useState, useEffect } from 'react';
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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { getP2PService, PeerDevice, TransferProgress } from '../src/services/P2PService';

interface ReceivedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  receivedAt: Date;
}

export default function ReceiveScreen() {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('idle');
  const [connectedPeer, setConnectedPeer] = useState<PeerDevice | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [deviceName] = useState(`QuickShare-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);

  const p2pService = getP2PService();

  useEffect(() => {
    const init = async () => {
      const supported = await p2pService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const initialized = await p2pService.initialize();
        setIsInitialized(initialized);

        if (initialized) {
          // Setup callbacks
          p2pService.onConnectionChange((status, peer) => {
            setConnectionStatus(status);
            if (status === 'connected' && peer) {
              setConnectedPeer(peer);
            } else if (status === 'disconnected') {
              setConnectedPeer(null);
            }
          });

          p2pService.onFileReceived((fileName, filePath, fileSize) => {
            setReceivedFiles((prev) => [
              ...prev,
              {
                fileName,
                filePath,
                fileSize,
                receivedAt: new Date(),
              },
            ]);
            Alert.alert('File Received', `${fileName} has been received!`);
          });

          p2pService.onTransferProgress((progress) => {
            setTransferProgress(progress);
          });
        }
      }
    };

    init();

    return () => {
      p2pService.cleanup();
    };
  }, []);

  const startAdvertising = async () => {
    if (!isInitialized) return;

    try {
      await p2pService.startAdvertising(deviceName);
      setIsAdvertising(true);
      setConnectionStatus('waiting');
    } catch (e) {
      Alert.alert('Error', 'Failed to start advertising');
    }
  };

  const stopAdvertising = async () => {
    try {
      await p2pService.stopAdvertising();
      await p2pService.disconnect();
    } catch (e) {
      console.log('Stop advertising error:', e);
    }
    setIsAdvertising(false);
    setConnectionStatus('idle');
    setConnectedPeer(null);
  };

  const shareFile = async (file: ReceivedFile) => {
    try {
      if (Platform.OS !== 'web') {
        await Share.share({
          url: file.filePath,
          title: file.fileName,
        });
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

  const getFileIcon = (fileName: string): keyof typeof Ionicons.glyphMap => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'videocam';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) return 'musical-notes';
    if (ext === 'pdf') return 'document-text';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    if (ext === 'apk') return 'logo-android';
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
        return `Connected to ${connectedPeer?.name || 'device'}`;
      case 'host':
        return 'Ready to receive';
      default:
        return 'Not advertising';
    }
  };

  // Not supported view
  if (isSupported === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Files</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="warning" size={60} color="#FFB800" />
          <Text style={styles.unsupportedTitle}>Not Supported</Text>
          <Text style={styles.unsupportedText}>
            {Platform.OS === 'web'
              ? 'P2P transfer is not available on web. Please use the mobile app.'
              : 'Your device does not support WiFi Direct / Multipeer Connectivity.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading view
  if (isSupported === null || (isSupported && !isInitialized)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Files</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00FF88" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.section}>
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={50} color="#00FF88" />
            </View>
            <Text style={styles.sectionTitle}>Ready to Receive</Text>
            <Text style={styles.sectionDescription}>
              {Platform.OS === 'android'
                ? 'Make your device discoverable via WiFi Direct'
                : 'Make your device visible to nearby iOS devices'}
            </Text>

            {/* Device Name */}
            <View style={styles.deviceNameContainer}>
              <Ionicons name="phone-portrait" size={20} color="#00D9FF" />
              <Text style={styles.deviceNameLabel}>Your device name:</Text>
              <Text style={styles.deviceName}>{deviceName}</Text>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startAdvertising}>
              <Ionicons name="radio" size={24} color="#0A0A0F" />
              <Text style={styles.startButtonText}>Start Receiving</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              {Platform.OS === 'android'
                ? 'This will create a WiFi Direct group for P2P transfer'
                : 'This will advertise your device via Multipeer Connectivity'}
            </Text>
          </View>
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
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* Device Info */}
            <View style={styles.deviceCard}>
              <View style={styles.deviceCardIcon}>
                <Ionicons
                  name={Platform.OS === 'android' ? 'wifi' : 'bluetooth'}
                  size={40}
                  color="#00FF88"
                />
              </View>
              <Text style={styles.deviceCardName}>{deviceName}</Text>
              <Text style={styles.deviceCardHint}>
                {Platform.OS === 'android'
                  ? 'Senders should search for this device name'
                  : 'Visible to nearby iOS devices'}
              </Text>
            </View>

            {/* Transfer Progress */}
            {transferProgress && transferProgress.status === 'transferring' && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Receiving: {transferProgress.fileName}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${transferProgress.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>
                  {Math.round(transferProgress.progress)}%
                </Text>
              </View>
            )}

            {/* Received Files */}
            {receivedFiles.length > 0 && (
              <View style={styles.filesList}>
                <Text style={styles.filesListTitle}>
                  Received Files ({receivedFiles.length})
                </Text>
                {receivedFiles.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Ionicons
                      name={getFileIcon(file.fileName)}
                      size={28}
                      color="#00FF88"
                    />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.fileName}
                      </Text>
                      <Text style={styles.fileSize}>{formatFileSize(file.fileSize)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => shareFile(file)}
                    >
                      <Ionicons name="share-outline" size={24} color="#00D9FF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666680',
  },
  unsupportedTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unsupportedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
    lineHeight: 20,
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
  },
  deviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  hint: {
    fontSize: 12,
    color: '#444455',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
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
  deviceCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    marginBottom: 24,
  },
  deviceCardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceCardName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  deviceCardHint: {
    fontSize: 12,
    color: '#666680',
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
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
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
    marginTop: 8,
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
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
});
