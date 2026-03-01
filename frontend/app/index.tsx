import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  
  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const sendButtonScale = useRef(new Animated.Value(0)).current;
  const receiveButtonScale = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // Title animation
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslate, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Buttons animation
      Animated.stagger(150, [
        Animated.spring(sendButtonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(receiveButtonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Footer fade in
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSendPress = () => {
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    router.push('/send');
  };

  const handleReceivePress = () => {
    Animated.sequence([
      Animated.timing(receiveButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(receiveButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    router.push('/receive');
  };

  const getPlatformInfo = () => {
    if (Platform.OS === 'android') {
      return { method: 'WiFi Direct', icon: 'wifi' as const };
    } else if (Platform.OS === 'ios') {
      return { method: 'Multipeer', icon: 'bluetooth' as const };
    }
    return { method: 'Demo Mode', icon: 'globe' as const };
  };

  const platformInfo = getPlatformInfo();
  
  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: titleOpacity }]}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: Animated.multiply(logoScale, pulseAnim) },
                  { rotate: logoRotateInterpolate },
                ],
              },
            ]}
          >
            <Ionicons name="swap-horizontal" size={40} color="#00D9FF" />
          </Animated.View>
          <Animated.Text 
            style={[
              styles.title,
              { 
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
          >
            QuickShare
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.subtitle,
              { 
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
          >
            Transfer files offline
          </Animated.Text>
          
          {/* Platform Badge */}
          <Animated.View 
            style={[
              styles.platformBadge,
              { opacity: titleOpacity },
            ]}
          >
            <Ionicons name={platformInfo.icon} size={14} color="#00D9FF" />
            <Text style={styles.platformText}>
              {Platform.OS === 'web' ? 'Demo Preview' : `${Platform.OS.toUpperCase()} - ${platformInfo.method}`}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Main Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Send Button */}
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              style={[styles.mainButton, styles.sendButton]}
              onPress={handleSendPress}
              activeOpacity={0.9}
            >
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-up-circle" size={60} color="#00D9FF" />
              </View>
              <Text style={styles.buttonTitle}>Send</Text>
              <Text style={styles.buttonDescription}>
                {Platform.OS === 'android' 
                  ? 'Find nearby devices via WiFi Direct' 
                  : Platform.OS === 'ios'
                    ? 'Find nearby iOS devices'
                    : 'Share files to nearby devices'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Receive Button */}
          <Animated.View style={{ transform: [{ scale: receiveButtonScale }] }}>
            <TouchableOpacity
              style={[styles.mainButton, styles.receiveButton]}
              onPress={handleReceivePress}
              activeOpacity={0.9}
            >
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-down-circle" size={60} color="#00FF88" />
              </View>
              <Text style={styles.buttonTitle}>Receive</Text>
              <Text style={styles.buttonDescription}>
                {Platform.OS === 'android' 
                  ? 'Make device discoverable' 
                  : Platform.OS === 'ios'
                    ? 'Advertise to nearby devices'
                    : 'Get files from other devices'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Ionicons name="shield-checkmark" size={16} color="#444455" />
          <Text style={styles.footerText}>No Internet Required - Direct P2P Transfer</Text>
        </Animated.View>
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
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  platformText: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '500',
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
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#444455',
  },
});
