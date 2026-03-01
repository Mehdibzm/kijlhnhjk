import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SelectedFile {
  name: string;
  uri: string;
  size: number;
  type: string;
}

export default function SendScreen() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deviceId] = useState(() => `sender-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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

  const connectToReceiver = async () => {
    if (sessionCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch(`${API_URL}/api/session/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sessionCode,
          device_id: deviceId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessionId(data.session.id);
        setIsConnected(true);
        Alert.alert('Connected!', 'You can now send files');
      } else {
        Alert.alert('Error', data.detail || 'Failed to connect');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const sendFiles = async () => {
    if (!sessionId || selectedFiles.length === 0) {
      Alert.alert('Error', 'No files selected or not connected');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(((i) / selectedFiles.length) * 100);

        // Read file as base64
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Upload file
        const response = await fetch(`${API_URL}/api/file/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            filename: file.name,
            file_type: file.type,
            file_size: file.size,
            data: base64Data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      Alert.alert(
        'Success!',
        `${selectedFiles.length} file(s) sent successfully`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to send files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Files</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!isConnected ? (
            /* Connection Section */
            <View style={styles.section}>
              <View style={styles.iconContainer}>
                <Ionicons name="qr-code" size={50} color="#00D9FF" />
              </View>
              <Text style={styles.sectionTitle}>Enter Session Code</Text>
              <Text style={styles.sectionDescription}>
                Enter the 6-digit code shown on the receiver's device
              </Text>

              <TextInput
                style={styles.codeInput}
                value={sessionCode}
                onChangeText={(text) => setSessionCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor="#444455"
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />

              <TouchableOpacity
                style={[
                  styles.connectButton,
                  sessionCode.length !== 6 && styles.buttonDisabled,
                ]}
                onPress={connectToReceiver}
                disabled={isConnecting || sessionCode.length !== 6}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#0A0A0F" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="#0A0A0F" />
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* File Selection Section */
            <View style={styles.section}>
              <View style={styles.connectedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
                <Text style={styles.connectedText}>Connected</Text>
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
                      <Ionicons
                        name={getFileIcon(file.type) as any}
                        size={24}
                        color="#00D9FF"
                      />
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
                    <View
                      style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPercent}>{Math.round(uploadProgress)}%</Text>
                </View>
              )}

              {/* Send Button */}
              {selectedFiles.length > 0 && !isUploading && (
                <TouchableOpacity style={styles.sendButton} onPress={sendFiles}>
                  <Ionicons name="send" size={24} color="#0A0A0F" />
                  <Text style={styles.sendButtonText}>Send Files</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  keyboardView: {
    flex: 1,
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
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeInput: {
    width: '100%',
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D9FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 24,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingVertical: 8,
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
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 24,
    width: '100%',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0F',
  },
});
