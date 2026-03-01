import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getP2PService, PeerDevice, TransferProgress } from '../src/services/P2PService';

interface SelectedFile {
  name: string;
  uri: string;
  size: number;
  type: string;
}

export default function SendScreen() {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<PeerDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const p2pService = getP2PService();

  // Check support and initialize
  useEffect(() => {
    const init = async () => {
      const supported = await p2pService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const initialized = await p2pService.initialize();
        setIsInitialized(initialized);

        if (initialized) {
          // Setup callbacks
          p2pService.onPeersFound((foundPeers) => {
            setPeers((prev) => {
              // Merge new peers with existing, avoiding duplicates
              const merged = [...prev];
              foundPeers.forEach((newPeer) => {
                const existingIndex = merged.findIndex((p) => p.id === newPeer.id);
                if (existingIndex >= 0) {
                  merged[existingIndex] = newPeer;
                } else {
                  merged.push(newPeer);
                }
              });
              return merged;
            });
          });

          p2pService.onConnectionChange((status, peer) => {
            setConnectionStatus(status);
            if (status === 'connected' && peer) {
              setSelectedPeer(peer);
              setIsConnecting(false);
            } else if (status === 'disconnected') {
              setIsConnecting(false);
            }
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

  const startScanning = async () => {
    if (!isInitialized) return;

    setIsScanning(true);
    setPeers([]);
    try {
      await p2pService.startDiscovery();
    } catch (e) {
      Alert.alert('Error', 'Failed to start scanning for devices');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      await p2pService.stopDiscovery();
    } catch (e) {
      console.log('Stop scanning error:', e);
    }
    setIsScanning(false);
  };

  const connectToPeer = async (peer: PeerDevice) => {
    setIsConnecting(true);
    setSelectedPeer(peer);

    try {
      const success = await p2pService.connectToPeer(peer.id);
      if (!success) {
        Alert.alert('Connection Failed', 'Could not connect to the device');
        setIsConnecting(false);
        setSelectedPeer(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
      setIsConnecting(false);
      setSelectedPeer(null);
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
      Alert.alert('Error', 'Failed to pick files');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendFiles = async () => {
    if (connectionStatus !== 'connected' || selectedFiles.length === 0) {
      Alert.alert('Error', 'Not connected or no files selected');
      return;
    }

    try {
      for (const file of selectedFiles) {
        await p2pService.sendFile(file.uri, file.name, file.size);
      }
      Alert.alert('Success', 'Files sent successfully!');
      setSelectedFiles([]);
    } catch (e) {
      Alert.alert('Error', 'Failed to send files');
    }
  };

  const disconnect = async () => {
    await p2pService.disconnect();
    setConnectionStatus('disconnected');
    setSelectedPeer(null);
    setPeers([]);
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

  const renderPeerItem = ({ item }: { item: PeerDevice }) => (
    <TouchableOpacity
      style={[
        styles.peerItem,
        selectedPeer?.id === item.id && styles.peerItemSelected,
      ]}
      onPress={() => connectToPeer(item)}
      disabled={isConnecting || connectionStatus === 'connected'}
    >
      <View style={styles.peerIcon}>
        <Ionicons
          name={Platform.OS === 'android' ? 'phone-portrait' : 'tablet-portrait'}
          size={24}
          color="#00D9FF"
        />
      </View>
      <View style={styles.peerInfo}>
        <Text style={styles.peerName}>{item.name}</Text>
        <Text style={styles.peerStatus}>
          {item.status === 'connected' ? 'Connected' : 'Available'}
        </Text>
      </View>
      {isConnecting && selectedPeer?.id === item.id && (
        <ActivityIndicator size="small" color="#00D9FF" />
      )}
    </TouchableOpacity>
  );

  // Not supported view
  if (isSupported === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Files</Text>
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
          <Text style={styles.headerTitle}>Send Files</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00D9FF" />
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
        <Text style={styles.headerTitle}>Send Files</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {connectionStatus !== 'connected' ? (
          /* Scanning / Peer Selection */
          <View style={styles.section}>
            <View style={styles.scanHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="search" size={40} color="#00D9FF" />
              </View>
              <Text style={styles.sectionTitle}>Find Receivers</Text>
              <Text style={styles.sectionDescription}>
                {Platform.OS === 'android'
                  ? 'Scanning for devices with WiFi Direct'
                  : 'Scanning for nearby iOS devices'}
              </Text>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={isScanning ? stopScanning : startScanning}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator color="#0A0A0F" />
                  <Text style={styles.scanButtonText}>Stop Scanning</Text>
                </>
              ) : (
                <>
                  <Ionicons name="radar" size={24} color="#0A0A0F" />
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
          </View>
        ) : (
          /* Connected - File Selection */
          <View style={styles.section}>
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

            {/* Transfer Progress */}
            {transferProgress && transferProgress.status === 'transferring' && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Sending: {transferProgress.fileName}
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

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {selectedFiles.length > 0 && (
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
  },
  scanHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D9FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
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
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
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
    marginTop: 24,
    gap: 12,
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
