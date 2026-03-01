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
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ReceivedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  downloaded: boolean;
}

export default function ReceiveScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deviceId] = useState(() => `receiver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const createSession = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessionId(data.session.id);
        setSessionCode(data.session.code);
        setSessionStatus('waiting');
      } else {
        Alert.alert('Error', 'Failed to create session');
      }
    } catch (error) {
      console.error('Session creation error:', error);
      Alert.alert('Error', 'Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const checkSessionStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_URL}/api/session/${sessionId}/status`);
      const data = await response.json();

      if (response.ok) {
        setSessionStatus(data.status);

        // Fetch files if session is connected or transferring
        if (data.status === 'connected' || data.status === 'transferring') {
          fetchFiles();
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  }, [sessionId]);

  const fetchFiles = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_URL}/api/session/${sessionId}/files`);
      const data = await response.json();

      if (response.ok && data.files) {
        setReceivedFiles(data.files);
      }
    } catch (error) {
      console.error('Fetch files error:', error);
    }
  };

  const downloadFile = async (file: ReceivedFile) => {
    setDownloadingFile(file.id);
    try {
      const response = await fetch(`${API_URL}/api/file/${file.id}`);
      const data = await response.json();

      if (response.ok && data.data) {
        // Save file locally
        const fileUri = `${FileSystem.documentDirectory}${file.filename}`;
        await FileSystem.writeAsStringAsync(fileUri, data.data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Update local state
        setReceivedFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, downloaded: true } : f))
        );

        // Share option
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Download Complete',
            `${file.filename} has been saved`,
            [
              { text: 'OK' },
              {
                text: 'Share',
                onPress: () => Share.share({ url: fileUri }),
              },
            ]
          );
        } else {
          Alert.alert('Success', `${file.filename} downloaded`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const endSession = async () => {
    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/session/${sessionId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('End session error:', error);
      }
    }
    router.back();
  };

  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(checkSessionStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionId, checkSessionStatus]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('audio/')) return 'musical-notes';
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('zip') || type.includes('rar')) return 'archive';
    if (type.includes('apk') || type.includes('android')) return 'logo-android';
    return 'document';
  };

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'connected':
      case 'transferring':
        return '#00FF88';
      case 'completed':
        return '#00D9FF';
      default:
        return '#FFB800';
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case 'waiting':
        return 'Waiting for sender...';
      case 'connected':
        return 'Sender connected!';
      case 'transferring':
        return 'Receiving files...';
      case 'completed':
        return 'Transfer complete';
      default:
        return sessionStatus;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={endSession} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Files</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!sessionCode ? (
          /* Create Session Section */
          <View style={styles.section}>
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={50} color="#00FF88" />
            </View>
            <Text style={styles.sectionTitle}>Ready to Receive</Text>
            <Text style={styles.sectionDescription}>
              Create a session and share the code with the sender
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={createSession}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#0A0A0F" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="#0A0A0F" />
                  <Text style={styles.createButtonText}>Create Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Session Active Section */
          <View style={styles.section}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <QRCode
                value={sessionCode}
                size={180}
                backgroundColor="#FFFFFF"
                color="#0A0A0F"
              />
            </View>

            {/* Session Code */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Session Code</Text>
              <Text style={styles.codeValue}>{sessionCode}</Text>
              <Text style={styles.codeHint}>Share this code with the sender</Text>
            </View>

            {/* Received Files */}
            {receivedFiles.length > 0 && (
              <View style={styles.filesList}>
                <Text style={styles.filesListTitle}>
                  Received Files ({receivedFiles.length})
                </Text>
                {receivedFiles.map((file) => (
                  <View key={file.id} style={styles.fileItem}>
                    <Ionicons
                      name={getFileIcon(file.file_type) as any}
                      size={28}
                      color="#00FF88"
                    />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.filename}
                      </Text>
                      <Text style={styles.fileSize}>{formatFileSize(file.file_size)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.downloadButton,
                        file.downloaded && styles.downloadedButton,
                      ]}
                      onPress={() => downloadFile(file)}
                      disabled={downloadingFile === file.id}
                    >
                      {downloadingFile === file.id ? (
                        <ActivityIndicator size="small" color="#00FF88" />
                      ) : (
                        <Ionicons
                          name={file.downloaded ? 'checkmark-circle' : 'download'}
                          size={24}
                          color={file.downloaded ? '#00FF88' : '#FFFFFF'}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* End Session Button */}
            <TouchableOpacity style={styles.endButton} onPress={endSession}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={styles.endButtonText}>End Session</Text>
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
  section: {
    paddingTop: 40,
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
    marginBottom: 32,
  },
  createButton: {
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
  createButtonText: {
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
  qrContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666680',
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: 12,
    color: '#666680',
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
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginTop: 16,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
});
