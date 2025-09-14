// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { NavigationProp, CommonActions } from '@react-navigation/native';
import { supabase } from '../supabase';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthService } from '../services/BiometricAuthService';

type SplashScreenNavigationProp = NavigationProp<RootStackParamList, 'Splash'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen = ({ navigation }: SplashScreenProps): React.JSX.Element => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animation for the main content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 3000, // 3-second fade-in
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animation, navigate to the correct screen with a small delay
      setTimeout(() => {
        checkSessionAndNavigate();
      }, 500);
    });
  }, [fadeAnim, scaleAnim]);

  const checkSessionAndNavigate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let screen: keyof RootStackParamList = 'Login';
    try {
      const otpPending = await AsyncStorage.getItem('otp_pending');
      if (session && otpPending === '1') {
        // If a previous login had pending OTP, do not auto-login on restart
        await supabase.auth.signOut();
        screen = 'Login';
      } else if (session) {
        const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
        screen = biometricEnabled ? 'BiometricAuth' : 'Home';
      } else {
        screen = 'Login';
      }
    } catch {
      if (session) {
        const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
        screen = biometricEnabled ? 'BiometricAuth' : 'Home';
      } else {
        screen = 'Login';
      }
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screen }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.appName}>Yash Roadlines</Text>
        <Text style={styles.tagline}>Financial Management</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
  },
  mainContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: Colors.surface,
    opacity: 0.7,
  },
});

export default SplashScreen;