// Updated LoginScreen.tsx with enhanced OTP security & UX and Waiting Screen
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProfile,
  createProfileIfMissing,
  createLoginRequest,
  checkLoginRequestStatus,
  verifyAdminOtp,
} from '../data/Storage';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { useTheme } from '../theme/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';

// Utility to safely extract a message from unknown errors
const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

function LoginScreen({ navigation }: LoginScreenProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [otpPhase, setOtpPhase] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [loginRequestId, setLoginRequestId] = useState<string | null>(null);
  const [waitingForAdmin, setWaitingForAdmin] = useState<boolean>(false);
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Resume waiting state when screen comes back into focus (e.g. after app backgrounded)
  useFocusEffect(
    useCallback(() => {
      const checkPendingRequest = async () => {
        try {
          const waitingFlag = await AsyncStorage.getItem('waiting_for_admin');
          const savedRequestId = await AsyncStorage.getItem('login_request_id');
          if (waitingFlag === 'true' && savedRequestId) {
            console.log('🔄 Resuming pending login request:', savedRequestId);
            setLoginRequestId(savedRequestId);
            setWaitingForAdmin(true);
            // Only start polling if not already polling
            if (!pollingIntervalRef.current) {
              startPollingForApproval(savedRequestId);
            }
          }
        } catch (e) {
          console.log('Could not restore pending request:', e);
        }
      };
      checkPendingRequest();
    }, [])
  );

  // OTP security & UX controls
  const OTP_MAX_ATTEMPTS = 5;
  const OTP_LOCK_MINUTES = 15;
  const RESEND_COOLDOWN_SEC = 30;
  const [attemptsLeft, setAttemptsLeft] = useState<number>(OTP_MAX_ATTEMPTS);
  const [lockUntil, setLockUntil] = useState<number>(0); // epoch ms
  const [resendSeconds, setResendSeconds] = useState<number>(0);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const keyAttempts = (uid: string) => `otp_attempts:${uid}`;
  const keyLockUntil = (uid: string) => `otp_lock_until:${uid}`;
  const keyResendAt = (uid: string) => `otp_resend_at:${uid}`;

  const clearResendTimer = () => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  };

  const startResendTimer = (seconds: number) => {
    clearResendTimer();
    setResendSeconds(seconds);
    if (seconds <= 0) return;
    resendTimerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          clearResendTimer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // When OTP phase starts, load persisted counters and timers
  useEffect(() => {
    const loadSecurityState = async () => {
      if (!otpPhase || !signedInUserId) return;
      try {
        const [attStr, lockStr, resendAtStr] = await Promise.all([
          AsyncStorage.getItem(keyAttempts(signedInUserId)),
          AsyncStorage.getItem(keyLockUntil(signedInUserId)),
          AsyncStorage.getItem(keyResendAt(signedInUserId)),
        ]);
        const attempts = Math.max(
          0,
          Math.min(OTP_MAX_ATTEMPTS, parseInt(attStr || `${OTP_MAX_ATTEMPTS}`, 10) || OTP_MAX_ATTEMPTS)
        );
        setAttemptsLeft(attempts);
        const lockMs = parseInt(lockStr || '0', 10) || 0;
        setLockUntil(lockMs);
        const now = Date.now();
        const resendAt = parseInt(resendAtStr || '0', 10) || 0;
        const secs = resendAt > now ? Math.ceil((resendAt - now) / 1000) : 0;
        startResendTimer(secs);
      } catch { }
    };
    loadSecurityState();
    return () => {
      clearResendTimer();
    };
  }, [otpPhase, signedInUserId]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Invalid Input', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('🔴 signInWithPassword error:', error);
        
        // Check if it's a network/DNS issue
        if (error.message?.includes('Network request failed')) {
          Alert.alert(
            'Network Connection Issue',
            'Unable to connect to server. This might be due to:\n\n' +
            '1. Your ISP/WiFi blocking the connection\n' +
            '2. DNS resolution issue\n\n' +
            'Solutions:\n' +
            '• Try using mobile data instead of WiFi\n' +
            '• Change DNS: WiFi Settings → Modify Network → DNS: 8.8.8.8\n' +
            '• Use a VPN\n' +
            '• Enable Private DNS: Settings → Network → Private DNS → dns.google'
          );
        } else {
          Alert.alert('Login Failed', error.message || 'Invalid credentials');
        }
        return;
      }

      if (!data.session || !data.user) {
        Alert.alert('Login Failed', 'No session created. Please try again.');
        return;
      }

      console.log('🔍 Starting login process for user:', data.user.id);
      
      // Ensure profile exists
      let profileCreated = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!profileCreated && attempts < maxAttempts) {
        attempts++;
        try {
          await createProfileIfMissing(data.user.id, email.trim());
          profileCreated = true;
        } catch (profileError) {
          console.error(`❌ Profile attempt ${attempts} failed:`, profileError);
          if (attempts >= maxAttempts) {
            await supabase.auth.signOut();
            Alert.alert('Database Error', 'Failed to create user profile. Please try again.');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const profile = await getProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        Alert.alert('Profile Error', 'Unable to retrieve user profile.');
        return;
      }

      const isActive = profile?.is_active !== false;
      if (!isActive) {
        await supabase.auth.signOut();
        Alert.alert('Access Blocked', 'Your account is deactivated. Contact admin.');
        return;
      }

      // Check if user is admin
      const isAdmin = profile?.is_admin === true;

      if (isAdmin) {
        // Admin: Direct login without OTP
        console.log('[AUTH] Login complete, user id:', data.user.id);
        console.log('✅ Admin login - bypassing OTP');
        
        // Save user profile to AsyncStorage
        try {
          const userName = profile.full_name?.trim() || 
                          profile.username?.trim() || 
                          data.user.email?.split('@')[0] || 
                          'Admin';
          
          const userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: userName,
            user_type: profile.user_type || 'normal'
          };
          await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));
          
          // Clear any pending approval flags
          await AsyncStorage.removeItem('waiting_for_admin');
          await AsyncStorage.removeItem('login_request_id');
          await AsyncStorage.removeItem('pending_login_request_id');
          
          // Initialize NotificationService
          const NotificationService = require('../services/NotificationService').default;
          const NotificationSetup = require('../services/NotificationSetup').default;
          await NotificationService.initialize();
          await NotificationSetup.reinitialize();
          console.log('✅ Notification services initialized');
        } catch (error) {
          console.error('❌ Error saving user profile:', error);
        }
        
        // Navigate to home
        navigation.replace('Home');
        return;
      }

      // Normal user: Require admin approval
      const userName = profile.full_name || profile.username || email.split('@')[0];

      // Check if there's already a pending request — avoid creating duplicates
      const savedRequestId = await AsyncStorage.getItem('login_request_id');
      if (savedRequestId) {
        const { data: existingRequest } = await supabase
          .from('login_requests')
          .select('id, status')
          .eq('id', savedRequestId)
          .eq('status', 'pending')
          .maybeSingle();
        if (existingRequest) {
          console.log('🔄 Found existing pending request, resuming:', savedRequestId);
          setLoginRequestId(savedRequestId);
          setSignedInUserId(data.user.id);
          setWaitingForAdmin(true);
          await AsyncStorage.setItem('waiting_for_admin', 'true');
          startPollingForApproval(savedRequestId);
          return;
        }
      }

      const requestId = await createLoginRequest(data.user.id, email.trim(), userName);

      if (!requestId) {
        await supabase.auth.signOut();
        Alert.alert('Error', 'Could not create login request. Please try again.');
        return;
      }

      setLoginRequestId(requestId);
      setSignedInUserId(data.user.id);
      setWaitingForAdmin(true);
      
      // Save state to AsyncStorage to prevent auto-login on app refresh
      await AsyncStorage.setItem('waiting_for_admin', 'true');
      await AsyncStorage.setItem('login_request_id', requestId);
      
      console.log('🔔 Waiting for admin approval - showing waiting screen');
      console.log('State:', { waitingForAdmin: true, otpPhase: false, loginRequestId: requestId });

      // Start polling for admin approval
      startPollingForApproval(requestId);

    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Login Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForApproval = (requestId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('🔄 Starting polling for request:', requestId);

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        console.log('🔍 Polling for approval status...');
        const status = await checkLoginRequestStatus(requestId);
        
        console.log('📊 Status received:', status);
        
        if (!status) {
          console.warn('⚠️ No status returned');
          return;
        }

        if (status.status === 'approved' && status.otp) {
          console.log('✅ Request approved! OTP:', status.otp);
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setWaitingForAdmin(false);
          setOtpPhase(true);
          Alert.alert(
            'Login Approved! ✅',
            'Admin has approved your login request. Please enter the OTP code provided by the admin.'
          );
        } else if (status.status === 'rejected') {
          console.log('❌ Request rejected');
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          Alert.alert(
            'Login Rejected ❌',
            'Your login request was rejected by the admin. Please contact your administrator.',
            [
              {
                text: 'OK',
                onPress: () => handleCancelOtp(),
              },
            ]
          );
        } else if (status.status === 'expired') {
          console.log('⏰ Request expired');
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          Alert.alert(
            'Request Expired ⏰',
            'Your login request has expired. Please try logging in again.',
            [
              {
                text: 'OK',
                onPress: () => handleCancelOtp(),
              },
            ]
          );
        } else {
          console.log('⏳ Still pending, status:', status.status);
        }
      } catch (error) {
        console.error('❌ Error polling for approval:', error);
      }
    }, 3000);
  };

  const handleVerifyOtp = async () => {
    if (!loginRequestId) return;
    if (!otpInput.trim() || otpInput.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP provided by admin.');
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyAdminOtp(loginRequestId, otpInput.trim());
      
      if (!isValid) {
        Alert.alert('Incorrect OTP', 'The OTP code is invalid or the request has expired.');
        return;
      }

      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      try { await AsyncStorage.removeItem('otp_pending'); } catch { }
      
      // Save user profile to AsyncStorage for NotificationService
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          const userName = profile?.full_name?.trim() || 
                          profile?.username?.trim() || 
                          user.email?.split('@')[0] || 
                          'User';
          
          const userProfile = {
            id: user.id,
            email: user.email,
            name: userName,
            user_type: profile?.user_type || 'normal'
          };
          await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));
          console.log('✅ User profile saved to AsyncStorage for notifications');
          
          // Initialize NotificationService
          const NotificationService = require('../services/NotificationService').default;
          const NotificationSetup = require('../services/NotificationSetup').default;
          await NotificationService.initialize();
          await NotificationSetup.reinitialize();
          console.log('✅ All notification services initialized');
        }
      } catch (error) {
        console.error('❌ Error saving user profile for notifications:', error);
      }
      
      setOtpPhase(false);
      setOtpInput('');
      setWaitingForAdmin(false);
      
      // Clear waiting flags from AsyncStorage
      await AsyncStorage.removeItem('waiting_for_admin');
      await AsyncStorage.removeItem('login_request_id');
      await AsyncStorage.removeItem('pending_login_request_id');
      
      navigation.replace('Home');
    } catch (e) {
      console.error('Verify OTP error:', e);
      Alert.alert('Error', 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // Resend OTP logic here (if needed)
    Alert.alert('Info', 'Please wait for admin approval first.');
  };

  const handleCancelOtp = async () => {
    setOtpPhase(false);
    setOtpInput('');
    setSignedInUserId(null);
    setWaitingForAdmin(false);
    try { await AsyncStorage.removeItem('otp_pending'); } catch { }
    try { await AsyncStorage.removeItem('waiting_for_admin'); } catch { }
    try { await AsyncStorage.removeItem('login_request_id'); } catch { }
    try { await AsyncStorage.removeItem('pending_login_request_id'); } catch { }
    try {
      if (signedInUserId) {
        await AsyncStorage.multiRemove([
          keyAttempts(signedInUserId),
          keyLockUntil(signedInUserId),
          keyResendAt(signedInUserId),
        ]);
      }
    } catch { }
    clearResendTimer();
    await supabase.auth.signOut();
  };

  return (
    <KeyboardAvoidingView
      style={[GlobalStyles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Yash Roadlines</Text>
        </View>

        <View style={[GlobalStyles.card, { backgroundColor: colors.card }]}>
          {/* Show waiting screen when waiting for admin approval */}
          {waitingForAdmin ? (
            <View style={styles.waitingContainer}>
              <Icon name="time-outline" size={80} color={colors.primary} />
              <Text style={[styles.waitingTitle, { color: colors.text }]}>Awaiting Admin Approval</Text>
              <Text style={[styles.waitingMessage, { color: colors.textSecondary }]}>
                Your login request has been submitted successfully.
              </Text>
              <Text style={[styles.waitingMessage, { color: colors.textSecondary }]}>
                Please wait while the administrator reviews and approves your access.
              </Text>
              <View style={[styles.waitingInfoBox, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <Icon name="information-circle-outline" size={24} color={colors.primary} />
                <Text style={[styles.waitingInfoText, { color: colors.textSecondary }]}>
                  You will be notified once your request is approved. The admin will provide you with an OTP code to complete the login process.
                </Text>
              </View>
              <View style={[styles.contactBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Need immediate assistance?</Text>
                <Text style={[styles.contactInfo, { color: colors.text }]}>Contact: Yash Bhavsar</Text>
                <Text style={[styles.contactEmail, { color: colors.primary }]}>yashbhavsar175@gmail.com</Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelOtp}
                style={[GlobalStyles.buttonSecondary, { marginTop: 20, backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[GlobalStyles.buttonSecondaryText, { color: colors.text }]}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          ) : otpPhase ? (
            /* OTP Entry Screen */
            <View>
              <Text style={[GlobalStyles.title, { color: colors.text }]}>Enter OTP</Text>
              <Text style={[styles.inputLabel, { color: colors.text }]}>OTP Code</Text>
              <TextInput
                style={[GlobalStyles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="6-digit OTP"
                placeholderTextColor={colors.textSecondary}
                value={otpInput}
                onChangeText={setOtpInput}
                keyboardType="number-pad"
                maxLength={6}
              />
              {lockUntil && lockUntil > Date.now() ? (
                <Text style={styles.lockText}>
                  Too many attempts. Try again later.
                </Text>
              ) : (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>Attempts left: {attemptsLeft}</Text>
              )}
              <Text style={[styles.helperTextSecondary, { color: colors.textSecondary }]}>
                Enter the OTP code provided by the administrator.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading || (lockUntil && lockUntil > Date.now()) || otpInput.trim().length < 6}
                  style={[GlobalStyles.buttonPrimary, { flex: 1, backgroundColor: colors.primary }, loading && styles.disabledButton]}
                >
                  <Text style={[GlobalStyles.buttonPrimaryText, { color: colors.headerText }]}>
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleCancelOtp} style={[GlobalStyles.buttonTextOnly, { marginTop: 12 }]}>
                <Text style={[GlobalStyles.linkText, { textAlign: 'center', color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Login Form */
            <>
              <Text style={[GlobalStyles.title, { color: colors.text }]}>Account Login</Text>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[GlobalStyles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <View style={[styles.passwordInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={[GlobalStyles.buttonPrimary, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
              >
                <Text style={[GlobalStyles.buttonPrimaryText, { color: colors.headerText }]}>
                  {loading ? 'Checking…' : 'Login'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    height: 55,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
  },
  helperTextSecondary: {
    marginTop: 4,
    fontSize: 12,
  },
  lockText: {
    marginTop: 6,
    fontSize: 12,
    color: '#b00020',
    fontWeight: '600',
  },
  // Waiting screen styles
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  waitingMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  waitingInfoBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  waitingInfoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  contactBox: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  contactLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default LoginScreen;
