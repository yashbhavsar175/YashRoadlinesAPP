// Updated LoginScreen.tsx with enhanced OTP security & UX
import React, { useEffect, useRef, useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProfile,
  createProfileIfMissing,
  generateAndStoreOtp,
  verifyOtpCode,
  deliverOtpAlternative,
  debugEdgeFunctionStatus,
  comprehensiveEdgeFunctionDebug,
  deliverOtpWithDetailedDebug
} from '../data/Storage';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
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
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [otpPhase, setOtpPhase] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(__DEV__); // Enable debug mode in development

  // OTP security & UX controls
  const OTP_MAX_ATTEMPTS = 5;
  const OTP_LOCK_MINUTES = 15;
  const RESEND_COOLDOWN_SEC = 30;
  const [attemptsLeft, setAttemptsLeft] = useState<number>(OTP_MAX_ATTEMPTS);
  const [lockUntil, setLockUntil] = useState<number>(0); // epoch ms
  const [resendSeconds, setResendSeconds] = useState<number>(0);
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
      } catch {}
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
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (!data.session || !data.user) {
        Alert.alert('Login Failed', 'No session created. Please try again.');
        return;
      }

      // Ensure profile exists
      await createProfileIfMissing(data.user.id, email.trim());
      const profile = await getProfile(data.user.id);
      const isActive = profile?.is_active !== false;

      if (!isActive) {
        await supabase.auth.signOut();
        Alert.alert('Access Blocked', 'Your account is deactivated. Contact admin.');
        return;
      }

      // Diagnostics disabled to reduce noise during normal login

      // Generate OTP
      setOtpSending(true);
      const otpResult = await generateAndStoreOtp(data.user.id);

      if (!otpResult) {
        setOtpSending(false);
        await supabase.auth.signOut();
        Alert.alert('OTP Error', 'Could not generate OTP. Please try again.');
        return;
      }

      console.log('🔄 Attempting to send OTP to:', email.trim());

      // Try to deliver OTP using enhanced method
      const deliverySuccess = await deliverOtpAlternative({
        email: email.trim(),
        code: otpResult.code
      });

      setOtpSending(false);

      if (deliverySuccess) {
        Alert.alert(
          'OTP Sent Successfully! 📧',
          `A 6-digit verification code has been sent to ${email.trim()}. Please check your inbox and enter the code below.\n\nIf you don't see it, also check your Spam/Junk folder.`
        );
        console.log('✅ OTP sent successfully');
      } else {
        Alert.alert(
          'Email Service Issue ⚠️',
          `Could not send OTP to ${email.trim()}. Please check:\n\n1. Your email address is correct\n2. Check spam/junk folder\n3. Email service may be temporarily unavailable\n\nContact support if this continues.`
        );
        console.log('⚠️ OTP email delivery failed');
      }

      // Set OTP phase regardless of email success (for testing)
      try { await AsyncStorage.setItem('otp_pending', '1'); } catch {}
      setSignedInUserId(data.user.id);
      setOtpPhase(true);
      // Initialize OTP attempt counters and cooldowns
      try {
        await AsyncStorage.setItem(keyAttempts(data.user.id), `${OTP_MAX_ATTEMPTS}`);
        await AsyncStorage.removeItem(keyLockUntil(data.user.id));
        await AsyncStorage.removeItem(keyResendAt(data.user.id));
        setAttemptsLeft(OTP_MAX_ATTEMPTS);
        setLockUntil(0);
        startResendTimer(0);
      } catch {}

    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!signedInUserId) return;
    if (!otpInput.trim()) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    // Lockout check
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const remainingMs = lockUntil - now;
      const remMin = Math.floor(remainingMs / 60000);
      const remSec = Math.ceil((remainingMs % 60000) / 1000);
      Alert.alert('Temporarily Locked', `Too many incorrect attempts. Try again in ${remMin}m ${remSec}s.`);
      return;
    }
    setLoading(true);
    try {
      const ok = await verifyOtpCode(signedInUserId, otpInput.trim());
      if (!ok) {
        const nextAttempts = Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(nextAttempts);
        try { await AsyncStorage.setItem(keyAttempts(signedInUserId), `${nextAttempts}`); } catch {}
        if (nextAttempts <= 0) {
          const lockMs = Date.now() + OTP_LOCK_MINUTES * 60 * 1000;
          setLockUntil(lockMs);
          try { await AsyncStorage.setItem(keyLockUntil(signedInUserId), `${lockMs}`); } catch {}
          Alert.alert('Too Many Attempts', `You are locked for ${OTP_LOCK_MINUTES} minutes.`);
        } else {
          Alert.alert('Incorrect OTP', `The OTP is invalid or expired. Attempts left: ${nextAttempts}`);
        }
        return;
      }
      try { await AsyncStorage.removeItem('otp_pending'); } catch {}
      // Clear security state on success
      try {
        await AsyncStorage.multiRemove([
          keyAttempts(signedInUserId),
          keyLockUntil(signedInUserId),
          keyResendAt(signedInUserId),
        ]);
      } catch {}
      setOtpPhase(false);
      setOtpInput('');
      navigation.replace('Home');
    } catch (e) {
      console.error('Verify OTP error:', e);
      Alert.alert('Error', 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };
  // Add this method to your LoginScreen.tsx component

  const handleComprehensiveDebug = async () => {
    try {
      console.log('🔍 Starting comprehensive debug...');
      const debugResult = await comprehensiveEdgeFunctionDebug();

      const healthEmojis = {
        healthy: '✅',
        degraded: '⚠️',
        critical: '❌'
      };

      const healthIcon = healthEmojis[debugResult.summary.overallHealth];

      Alert.alert(
        `System Health ${healthIcon}`,
        `Overall Status: ${debugResult.summary.overallHealth.toUpperCase()}\n\n` +
        `Authentication: ${debugResult.summary.authentication ? '✅' : '❌'}\n` +
        `Edge Function: ${debugResult.summary.edgeFunction ? '✅' : '❌'}\n` +
        `Email Service: ${debugResult.summary.emailService ? '✅' : '❌'}\n\n` +
        `Check console for detailed results.`,
        [
          { text: 'OK' },
          {
            text: 'Test OTP Delivery',
            onPress: () => handleTestOtpDelivery()
          }
        ]
      );

    } catch (error) {
      console.error('Debug failed:', error);
      Alert.alert('Debug Error', getErrorMessage(error));
    }
  };

  const handleTestOtpDelivery = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address first');
      return;
    }

    try {
      console.log('🧪 Testing OTP delivery...');
      setOtpSending(true);

      const testResult = await deliverOtpWithDetailedDebug({
        email: email.trim(),
        code: '123456' // Test OTP
      });

      console.log('🎯 Test result:', testResult);

      Alert.alert(
        testResult.success ? 'OTP Test Successful! ✅' : 'OTP Test Failed ❌',
        testResult.success
          ? `Test OTP sent successfully via ${testResult.method}\n\nCheck your email for the test message.`
          : `Failed via ${testResult.method}\n\nError: ${testResult.error}\n\nCheck console for debug details.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Test OTP delivery failed:', error); // Cast to any
      Alert.alert('Test Failed', getErrorMessage(error));
    } finally {
      setOtpSending(false);
    }
  };
  const handleResendOtp = async () => { // Renamed to avoid redeclaration
    if (!signedInUserId) return;
    // Cooldown check
    if (resendSeconds > 0) return;
    setOtpSending(true);
    try {
      const otpResult = await generateAndStoreOtp(signedInUserId);

      if (!otpResult) {
        Alert.alert('OTP Error', 'Could not generate new OTP. Try again later.');
        return;
      }

      console.log('🔄 Resending OTP to:', email.trim());
if (__DEV__) {
  console.log('OTP generation request processed');
}

      const deliverySuccess = await deliverOtpAlternative({
        email: email.trim(),
        code: otpResult.code
      });

      if (deliverySuccess) {
        Alert.alert(
          'OTP Resent! 📧',
          'New verification code sent to your email.\n\nIf not found, check your Spam/Junk folder.'
        );
        console.log('✅ OTP resent successfully');
        // Start cooldown
        const nextAt = Date.now() + RESEND_COOLDOWN_SEC * 1000;
        try { await AsyncStorage.setItem(keyResendAt(signedInUserId), `${nextAt}`); } catch {}
        startResendTimer(RESEND_COOLDOWN_SEC);
      } else {
        Alert.alert(
          'Resend Failed ❌',
          'Could not resend OTP. Please try again or contact support.'
        );
        console.log('⚠️ OTP resend failed');
      }

    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleCancelOtp = async () => {
    setOtpPhase(false);
    setOtpInput('');
    setSignedInUserId(null);
    try { await AsyncStorage.removeItem('otp_pending'); } catch {}
    try {
      if (signedInUserId) {
        await AsyncStorage.multiRemove([
          keyAttempts(signedInUserId),
          keyLockUntil(signedInUserId),
          keyResendAt(signedInUserId),
        ]);
      }
    } catch {}
    clearResendTimer();
    await supabase.auth.signOut();
  };

  // Debug function for testing Edge Function
  const handleDebugEdgeFunction = async () => {
    console.log('🔍 Running manual Edge Function debug...');
    await debugEdgeFunctionStatus();
    Alert.alert('Debug', 'Check console for Edge Function debug information.');
  };
  const handleAdvancedDebug = async () => {
    try {
      console.log('🔍 Starting advanced debug...');

      // First import the new debug functions
      const { debugEdgeFunctionDetailed } = require('../data/Storage');
      const debugResult = await debugEdgeFunctionDetailed();

      console.log('📊 Debug Results:', debugResult);

      const recommendationsText = debugResult.recommendations.join('\n• ');

      Alert.alert(
        debugResult.success ? 'Debug Results ✅' : 'Issues Found ⚠️',
        `Overall Status: ${debugResult.success ? 'HEALTHY' : 'NEEDS ATTENTION'}\n\nRecommendations:\n• ${recommendationsText}\n\nCheck console for detailed results.`,
        [
          { text: 'OK' },
          {
            text: 'Test Function',
            onPress: () => handleTestEdgeFunctionWithLogs()
          }
        ]
      );

    } catch (error) {
      console.error('Advanced debug failed:', error);
      Alert.alert('Debug Error', getErrorMessage(error));
    }
  };

  const handleTestEdgeFunctionWithLogs = async () => {
    try {
      console.log('🧪 Testing Edge Function with logs...');

      const { testEdgeFunctionWithLogs } = require('../data/Storage');
      const testResult = await testEdgeFunctionWithLogs();

      console.log('📋 Test Logs:', testResult.logs);
      console.log('🎯 Test Result:', testResult);

      const logsText = testResult.logs.join('\n');

      Alert.alert(
        testResult.success ? 'Test Successful! 🎉' : 'Test Failed ❌',
        `${testResult.success ? 'Edge Function is working!' : 'Edge Function has issues'}\n\nLogs:\n${logsText}`,
        [
          { text: 'OK' },
          {
            text: 'Validate Environment',
            onPress: () => handleValidateEnvironment()
          }
        ]
      );

    } catch (error) {
      console.error('Function test failed:', error);
      Alert.alert('Test Failed', getErrorMessage(error));
    }
  };

  const handleValidateEnvironment = async () => {
    try {
      console.log('🔧 Validating environment...');

      const { validateEdgeFunctionEnvironment } = require('../data/Storage');
      const validation = await validateEdgeFunctionEnvironment();

      console.log('🌍 Environment Validation:', validation);

      const issuesText = validation.issues.length > 0
        ? validation.issues.join('\n• ')
        : 'No issues found';

      Alert.alert(
        validation.valid ? 'Environment Valid ✅' : 'Environment Issues ⚠️',
        `Status: ${validation.valid ? 'READY' : 'NEEDS ATTENTION'}\n\n${validation.valid ? 'All systems ready!' : `Issues:\n• ${issuesText}`}\n\nCheck console for full environment details.`
      );

    } catch (error) {
      console.error('Environment validation failed:', error);
      Alert.alert('Validation Failed', getErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView
      style={GlobalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Yash Roadlines</Text>
        </View>

        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title}>Account Login</Text>

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={GlobalStyles.input}
            placeholder="Enter your email"
            placeholderTextColor={Colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={Colors.placeholder}
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
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!otpPhase && (
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[GlobalStyles.buttonPrimary, loading && styles.disabledButton]}
            >
              <Text style={GlobalStyles.buttonPrimaryText}>
                {loading ? 'Checking…' : 'Login'}
              </Text>
            </TouchableOpacity>
          )}

          {otpPhase && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Enter OTP</Text>
              <TextInput
                style={GlobalStyles.input}
                placeholder="6-digit OTP"
                placeholderTextColor={Colors.placeholder}
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
                <Text style={styles.helperText}>Attempts left: {attemptsLeft}</Text>
              )}
              <Text style={styles.helperTextSecondary}>
                Didn’t get the email? Check your Spam/Junk folder or tap Resend.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading || (lockUntil && lockUntil > Date.now()) || otpInput.trim().length < 6}
                  style={[GlobalStyles.buttonPrimary, { flex: 1 }, loading && styles.disabledButton]}
                >
                  <Text style={GlobalStyles.buttonPrimaryText}>
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={otpSending || resendSeconds > 0}
                  style={[GlobalStyles.buttonSecondary, { flex: 1 }]}
                >
                  <Text style={GlobalStyles.buttonSecondaryText}>
                    {otpSending ? 'Sending…' : (resendSeconds > 0 ? `Resend (${resendSeconds}s)` : 'Resend')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleCancelOtp} style={[GlobalStyles.buttonTextOnly, { marginTop: 8 }]}>
                <Text style={[GlobalStyles.linkText, { textAlign: 'center' }]}>Cancel</Text>
              </TouchableOpacity>

              
            </View>
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
    color: Colors.textPrimary,
  },
  debugButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.textSecondary,
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 12,
    color: Colors.background,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginBottom: 16,
    height: 55,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: 10,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  helperTextSecondary: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lockText: {
    marginTop: 6,
    fontSize: 12,
    color: '#b00020',
    fontWeight: '600',
  },
});

const additionalStyles = StyleSheet.create({ // Renamed to avoid redeclaration
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
    color: Colors.textPrimary,
  },
  debugButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.textSecondary,
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 12,
    color: Colors.background,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginBottom: 16,
    height: 55,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: 10,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default LoginScreen;