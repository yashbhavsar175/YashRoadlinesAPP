// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { NavigationProp, CommonActions } from '@react-navigation/native';
import { supabase } from '../supabase';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthService } from '../services/BiometricAuthService';
import { responsiveFontSize, responsiveSpacing } from '../utils/responsive';

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

  useEffect(() => {
    console.log('🚀 SplashScreen mounted');
    
    // Start animation for the main content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000, // Reduced to 2 seconds for faster response
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Mark animation as complete
      animationComplete.current = true;
      console.log('✨ Splash animation complete');
      
      // After animation, navigate to the correct screen with a small delay
      navigationTimer.current = setTimeout(() => {
        checkSessionAndNavigate();
      }, 300); // Reduced delay for faster navigation
    });

    // ✅ FIX: Listen for auth state changes including TOKEN_REFRESHED
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event on splash:', event, 'hasNavigated:', hasNavigated.current);
      
      // Ignore auth events if we've already navigated
      if (hasNavigated.current) {
        console.log('⏭️ Already navigated, ignoring auth event');
        return;
      }
      
      // Don't navigate until animation is complete
      if (!animationComplete.current) {
        console.log('⏳ Animation not complete, waiting...');
        return;
      }
      
      // Handle TOKEN_REFRESHED, SIGNED_IN, and INITIAL_SESSION
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          console.log('✅ Session active, navigating from splash...');
          await checkSessionAndNavigate();
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 Signed out, navigating to login...');
        hasNavigated.current = true;
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    });

    // ✅ FIX: Timeout fallback with proper cleanup
    const timeoutId = setTimeout(async () => {
      if (hasNavigated.current) {
        console.log('⏭️ Already navigated, skipping timeout');
        return;
      }
      
      // Wait for animation if it's still running
      if (!animationComplete.current) {
        console.log('⏳ Timeout triggered but waiting for animation...');
        // Wait up to 2.5s for animation (2s animation + 0.5s buffer)
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      
      if (!hasNavigated.current) {
        console.log('⏱️ Splash timeout - forcing session check...');
        await checkSessionAndNavigate();
      }
    }, 4000); // 4 second timeout (reduced from 5s)

    return () => {
      console.log('🧹 SplashScreen cleanup');
      authListener.subscription.unsubscribe();
      clearTimeout(timeoutId);
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, [fadeAnim, scaleAnim, navigation]);

  const checkSessionAndNavigate = async () => {
    // Prevent multiple navigations
    if (hasNavigated.current) {
      console.log('⏭️ Already navigated, skipping...');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    let screen: keyof RootStackParamList = 'Login';
    try {
      const otpPending = await AsyncStorage.getItem('otp_pending');
      if (session && otpPending === '1') {
        // If a previous login had pending OTP, do not auto-login on restart
        await supabase.auth.signOut();
        screen = 'Login';
      } else if (session) {
        // Check if user is admin or has completed approval process
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        const isAdmin = profile?.is_admin === true;

        if (!isAdmin) {
          // For non-admin users, check if they have a completed login
          // If they have a session but no completed approval, sign them out
          const loginRequestId = await AsyncStorage.getItem('login_request_id');
          const waitingForAdmin = await AsyncStorage.getItem('waiting_for_admin');
          
          if (waitingForAdmin === 'true' || loginRequestId) {
            // User was waiting for approval, don't auto-login
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('login_request_id');
            await AsyncStorage.removeItem('waiting_for_admin');
            screen = 'Login';
          } else {
            // User has completed approval process
            const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
            screen = biometricEnabled ? 'BiometricAuth' : 'Home';
          }
        } else {
          // Admin user - allow direct login
          const biometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
          screen = biometricEnabled ? 'BiometricAuth' : 'Home';
        }
      } else {
        screen = 'Login';
      }
    } catch (error) {
      console.error('Error checking session:', error);
      if (session) {
        // Fallback: sign out on error to be safe
        await supabase.auth.signOut();
      }
      screen = 'Login';
    }

    hasNavigated.current = true;
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
});

export default SplashScreen;