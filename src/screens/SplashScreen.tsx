// src/screens/SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, TouchableOpacity } from 'react-native';
import { NavigationProp, CommonActions } from '@react-navigation/native';
import { supabase } from '../supabase';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthService } from '../services/BiometricAuthService';
import { responsiveFontSize, responsiveSpacing } from '../utils/responsive';
import SplashDiag from '../services/SplashDiagnosticsService';

type SplashScreenNavigationProp = NavigationProp<RootStackParamList, 'Splash'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen = ({ navigation }: SplashScreenProps): React.JSX.Element => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const hasNavigated = useRef(false);
  const animationComplete = useRef(false);
  const navigationTimer = useRef<NodeJS.Timeout | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Start diagnostics session for this launch
    SplashDiag.startSession();

    // Start animation
    SplashDiag.beginStep('animation');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      animationComplete.current = true;
      SplashDiag.endStep('animation');

      navigationTimer.current = setTimeout(() => {
        checkSessionAndNavigate();
      }, 300);
    });

    // Auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (hasNavigated.current) return;
      if (!animationComplete.current) return;

      SplashDiag.info(`authStateChange event: ${event}`);

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          await checkSessionAndNavigate();
        }
      }

      if (event === 'SIGNED_OUT') {
        hasNavigated.current = true;
        await SplashDiag.finishSession('Login (SIGNED_OUT event)');
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
      }
    });

    // 4s fallback — checkSessionAndNavigate call karo if not navigated
    const fallbackId = setTimeout(() => {
      if (!hasNavigated.current) {
        SplashDiag.info('4s fallback triggered');
        checkSessionAndNavigate();
      }
    }, 4000);

    // Show retry button after 8 seconds if still not navigated
    const retryBtnId = setTimeout(() => {
      if (!hasNavigated.current) {
        setShowRetry(true);
        SplashDiag.info('Stuck detected — showing Retry button');
      }
    }, 8000);

    // Hard fallback — agar checkSessionAndNavigate bhi hang ho, 12s pe force navigate
    const hardResetId = setTimeout(async () => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        await SplashDiag.forceFinishSession('Hard 12s fallback — everything hung');
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
      }
    }, 12000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(fallbackId);
      clearTimeout(retryBtnId);
      clearTimeout(hardResetId);
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    };
  }, [fadeAnim, scaleAnim, navigation]);

  // Helper: Promise with timeout — returns fallback if ms exceeded
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
    ]);

  const checkSessionAndNavigate = async () => {
    if (hasNavigated.current) return;

    let screen: keyof RootStackParamList = 'Login';

    try {
      // Step 1: getSession - try local cache first (instant), then network
      SplashDiag.beginStep('getSession');
      
      let finalSession = null;
      
      try {
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          10000, // Increased to 10s - Supabase cold start can take time
          { data: { session: null }, error: null } as any
        );
        finalSession = sessionResult.data?.session ?? null;
        
        if (!finalSession) {
          SplashDiag.timeoutStep('getSession', 'No session on first attempt, retrying...');
          // Retry once more
          try {
            const retryResult = await withTimeout(
              supabase.auth.getSession(),
              5000,
              { data: { session: null }, error: null } as any
            );
            finalSession = retryResult.data?.session ?? null;
            SplashDiag.info(finalSession ? `Retry succeeded: user ${finalSession.user.id}` : 'Retry also no session');
          } catch {
            SplashDiag.info('Retry failed');
          }
        } else {
          SplashDiag.endStep('getSession', `user: ${finalSession.user.id}`);
        }
      } catch (e) {
        SplashDiag.timeoutStep('getSession', `getSession threw: ${e}`);
      }

      // Step 2: AsyncStorage checks
      SplashDiag.beginStep('asyncStorage_checks');
      const otpPending = await AsyncStorage.getItem('otp_pending');
      SplashDiag.endStep('asyncStorage_checks', `otp_pending: ${otpPending}`);

      if (finalSession && otpPending === '1') {
        SplashDiag.info('OTP pending — signing out');
        await withTimeout(supabase.auth.signOut(), 3000, null);
        screen = 'Login';
      } else if (finalSession) {
        // Step 3: Profile fetch with 4s timeout
        SplashDiag.beginStep('fetchProfile');
        let isAdmin = false;
        try {
          const profileResult = await withTimeout(
            supabase
              .from('user_profiles')
              .select('is_admin')
              .eq('id', finalSession.user.id)
              .single() as any,
            4000,
            { data: null, error: null }
          );
          
          if (!profileResult.data) {
            SplashDiag.timeoutStep('fetchProfile', 'user_profiles fetch timed out — treating as non-admin');
          } else {
            isAdmin = (profileResult.data as any)?.is_admin === true;
            SplashDiag.endStep('fetchProfile', `is_admin: ${isAdmin}`);
          }
        } catch {
          SplashDiag.timeoutStep('fetchProfile', 'fetchProfile threw — treating as non-admin');
        }

        if (!isAdmin) {
          SplashDiag.beginStep('loginRequest_check');
          const loginRequestId = await AsyncStorage.getItem('login_request_id');
          const waitingForAdmin = await AsyncStorage.getItem('waiting_for_admin');
          SplashDiag.endStep('loginRequest_check',
            `waitingForAdmin: ${waitingForAdmin}, loginRequestId: ${loginRequestId ? 'exists' : 'null'}`);

          if (waitingForAdmin === 'true' || loginRequestId) {
            SplashDiag.info('Non-admin waiting for approval — signing out');
            await withTimeout(supabase.auth.signOut(), 3000, null);
            await AsyncStorage.removeItem('login_request_id');
            await AsyncStorage.removeItem('waiting_for_admin');
            screen = 'Login';
          } else {
            SplashDiag.beginStep('biometric_check');
            const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
            SplashDiag.endStep('biometric_check', `enabled: ${biometricEnabled}`);
            screen = biometricEnabled ? 'BiometricAuth' : 'Home';
          }
        } else {
          SplashDiag.beginStep('biometric_check');
          const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
          SplashDiag.endStep('biometric_check', `enabled: ${biometricEnabled}`);
          screen = biometricEnabled ? 'BiometricAuth' : 'Home';
        }
      } else {
        SplashDiag.info('No session — going to Login');
        screen = 'Login';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      SplashDiag.errorStep('checkSessionAndNavigate', error);
      console.error('Error checking session:', msg);
      screen = 'Login';
    }

    hasNavigated.current = true;
    await SplashDiag.finishSession(screen);
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: screen }] })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.titleContainer}>
          <Text
            style={styles.appName}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.6}
          >
            Yash Roadlines
          </Text>
        </View>
        <Text style={styles.tagline}>Financial Management</Text>
        
        {showRetry && (
          <Animated.View style={styles.retryContainer}>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))}
            >
              <Text style={styles.retryText}>Proceed to Login</Text>
            </TouchableOpacity>
            <Text style={styles.retryHint}>Taking longer than usual...</Text>
          </Animated.View>
        )}
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
    paddingHorizontal: responsiveSpacing(10),
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(15),
    width: '100%',
  },
  appName: {
    fontSize: responsiveFontSize(34),
    fontWeight: 'bold',
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: 0.5,
    width: '100%',
  },
  tagline: {
    fontSize: responsiveFontSize(14),
    color: Colors.surface,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: responsiveSpacing(5),
  },
  retryContainer: {
    marginTop: responsiveSpacing(40),
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: responsiveSpacing(10),
    paddingHorizontal: responsiveSpacing(20),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  retryText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: responsiveFontSize(16),
  },
  retryHint: {
    color: Colors.surface,
    opacity: 0.5,
    fontSize: responsiveFontSize(12),
    marginTop: responsiveSpacing(8),
  },
});

export default SplashScreen;
