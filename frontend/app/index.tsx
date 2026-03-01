import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="swap-horizontal" size={40} color="#00D9FF" />
          </View>
          <Text style={styles.title}>QuickShare</Text>
          <Text style={styles.subtitle}>Transfer files instantly</Text>
        </View>

        {/* Main Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Send Button */}
          <TouchableOpacity
            style={[styles.mainButton, styles.sendButton]}
            onPress={() => router.push('/send')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="arrow-up-circle" size={60} color="#00D9FF" />
            </View>
            <Text style={styles.buttonTitle}>Send</Text>
            <Text style={styles.buttonDescription}>Share files to nearby devices</Text>
          </TouchableOpacity>

          {/* Receive Button */}
          <TouchableOpacity
            style={[styles.mainButton, styles.receiveButton]}
            onPress={() => router.push('/receive')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="arrow-down-circle" size={60} color="#00FF88" />
            </View>
            <Text style={styles.buttonTitle}>Receive</Text>
            <Text style={styles.buttonDescription}>Get files from other devices</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Secure & Fast File Transfer</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666680',
    marginTop: 8,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  mainButton: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  sendButton: {
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  receiveButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  buttonIconContainer: {
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666680',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#444455',
  },
});
