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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

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

export default function SendScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<PeerDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scanButtonAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;
  const peersAnim = useRef(new Animated.Value(0)).current;
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
      Animated.spring(scanButtonAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Radar animation when scanning
  useEffect(() => {
    if (isScanning) {
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
  }, [isScanning]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  const startScanning = () => {
    setIsScanning(true);
    setPeers([]);

    if (IS_DEMO_MODE) {
      // Demo: gradually show peers
      DEMO_PEERS.forEach((peer, index) => {
        setTimeout(() => {
          setPeers((prev) => [...prev, peer]);
          // Animate new peer
          Animated.spring(peersAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }, (index + 1) * 800);
      });
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const connectToPeer = (peer: PeerDevice) => {
    setSelectedPeer({ ...peer, status: 'connecting' });
    
    if (IS_DEMO_MODE) {
      // Demo: simulate connection
      setTimeout(() => {
        setSelectedPeer({ ...peer, status: 'connected' });
        setConnectionStatus('connected');
        setIsScanning(false);
        
        // Connected animation
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

    if (IS_DEMO_MODE) {
      // Demo: simulate upload progress
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
    }
  };

  const disconnect = () => {
    setConnectionStatus('disconnected');
    setSelectedPeer(null);
    setPeers([]);
    connectedAnim.setValue(0);
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
          onPress={() => connectToPeer(item)}
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
  };

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
                <View style={styles.iconContainer}>
                  <Ionicons name="search" size={40} color="#00D9FF" />
                </View>
              </View>
              <Text style={styles.sectionTitle}>Find Receivers</Text>
              <Text style={styles.sectionDescription}>
                {Platform.OS === 'android'
                  ? 'Scanning for devices with WiFi Direct'
                  : Platform.OS === 'ios'
                    ? 'Scanning for nearby iOS devices'
                    : 'Demo: Tap scan to find nearby devices'}
              </Text>
            </View>

            {/* Scan Button */}
            <Animated.View style={{ transform: [{ scale: scanButtonAnim }] }}>
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                onPress={isScanning ? stopScanning : startScanning}
                activeOpacity={0.8}
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
            </Animated.View>

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
        ) : (
          /* Connected - File Selection */
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
                  <Animated.View
                    key={index}
                    style={{
                      opacity: 1,
                      transform: [{ translateX: 0 }],
                    }}
                  >
                    <View style={styles.fileItem}>
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
                  </Animated.View>
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
  },
  scanHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  radarContainer: {
    width: 100,
    height: 100,
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
    borderColor: '#00D9FF',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
