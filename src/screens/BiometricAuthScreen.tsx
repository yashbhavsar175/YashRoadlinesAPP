// src/screens/BiometricAuthScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  ActivityIndicator,
  Platform,
  TextInput
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../supabase';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';
import { BiometricAuthService, BiometricCapability } from '../services/BiometricAuthService';
import { getProfile } from '../data/Storage';

type BiometricAuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BiometricAuth'>;

interface BiometricAuthScreenProps {
  navigation: BiometricAuthScreenNavigationProp;
}

const BiometricAuthScreen = ({ navigation }: BiometricAuthScreenProps): React.JSX.Element => {
  const [loading, setLoading] = useState<boolean>(false);
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Check biometric capability
    const biometricCapability = await BiometricAuthService.checkBiometricCapability();
    setCapability(biometricCapability);

    // Get current user's email for display
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Error getting user email:', error);
    }

    // Automatically attempt biometric authentication if available and enabled
    const isBiometricEnabled = await BiometricAuthService.isBiometricAuthEnabled();
    if (biometricCapability.isAvailable && isBiometricEnabled) {
      // Small delay for better UX
      setTimeout(() => {
        handleBiometricAuth();
      }, 1000);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setLoading(true);
      const result = await BiometricAuthService.getStoredCredentials();
      
      if (result.success && result.data) {
        // Verify the stored credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: result.data.email!,
          password: result.data.password!
        });

        if (error) {
          Alert.alert(
            'Authentication Failed',
            'Stored credentials are no longer valid. Please login manually.',
            [
              {
                text: 'Login Manually',
                onPress: () => navigation.replace('Login')
              }
            ]
          );
          return;
        }

        if (data.session && data.user) {
          // Check if user is still active
          const profile = await getProfile(data.user.id);
          const isActive = profile?.is_active !== false;

          if (!isActive) {
            await supabase.auth.signOut();
            Alert.alert('Access Blocked', 'Your account has been deactivated. Contact admin.');
            navigation.replace('Login');
            return;
          }

          // Success - navigate to home
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        }
      } else if (result.error === 'Authentication cancelled') {
        // User cancelled biometric auth - show options
        showAlternativeOptions();
      } else {
        // Other error - show alternative options
        console.log('Biometric auth failed:', result.error);
        showAlternativeOptions();
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      showAlternativeOptions();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async () => {
    if (!password.trim()) {
      Alert.alert('Invalid Input', 'Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password.trim()
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (data.session && data.user) {
        // Check if user is still active
        const profile = await getProfile(data.user.id);
        const isActive = profile?.is_active !== false;

        if (!isActive) {
          await supabase.auth.signOut();
          Alert.alert('Access Blocked', 'Your account has been deactivated. Contact admin.');
          navigation.replace('Login');
          return;
        }

        // Offer to enable biometric auth for future
        if (capability?.isAvailable) {
          Alert.alert(
            `Enable ${getBiometricName()}?`,
            'Would you like to enable biometric authentication for faster login next time?',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: async () => {
                  const stored = await BiometricAuthService.storeCredentials(userEmail, password.trim());
                  if (stored) {
                    await BiometricAuthService.enableBiometricAuth();
                    Alert.alert('Success', `${getBiometricName()} has been enabled for future logins.`);
                  }
                }
              }
            ]
          );
        }

        // Success - navigate to home
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
      }
    } catch (error) {
      console.error('Password authentication error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showAlternativeOptions = () => {
    Alert.alert(
      'Authentication Options',
      'Choose how you would like to authenticate:',
      [
        {
          text: 'Use Password',
          onPress: () => setShowPasswordInput(true)
        },
        capability?.isAvailable ? {
          text: `Try ${getBiometricName()} Again`,
          onPress: () => handleBiometricAuth()
        } : null,
        {
          text: 'Login Screen',
          style: 'cancel',
          onPress: () => navigation.replace('Login')
        }
      ].filter(Boolean) as any
    );
  };

  const getBiometricName = (): string => {
    if (!capability) return 'Biometric';
    
    switch (capability.biometryType) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Biometrics':
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometric';
      default:
        return 'Biometric';
    }
  };

  const getBiometricIcon = (): string => {
    if (!capability) return 'finger-print-outline';
    
    switch (capability.biometryType) {
      case 'TouchID':
        return 'finger-print-outline';
      case 'FaceID':
        return 'scan-outline';
      case 'Biometrics':
        return 'finger-print-outline';
      default:
        return 'finger-print-outline';
    }
  };

  if (showPasswordInput) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.header}>
            <Icon name="shield-checkmark-outline" size={60} color={Colors.primary} />
            <Text style={styles.title}>Enter Password</Text>
            <Text style={styles.subtitle}>
              Enter your password to continue as {userEmail}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={GlobalStyles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoFocus={true}
            />

            <TouchableOpacity
              onPress={handlePasswordAuth}
              disabled={loading}
              style={[GlobalStyles.buttonPrimary, loading && styles.disabledButton]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={GlobalStyles.buttonPrimaryText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPasswordInput(false)}
              style={[GlobalStyles.buttonTextOnly, { marginTop: 16 }]}
            >
              <Text style={GlobalStyles.linkText}>Back</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.header}>
          <Icon name="shield-checkmark-outline" size={60} color={Colors.primary} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            {userEmail ? `Logged in as ${userEmail}` : 'Please authenticate to continue'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Authenticating...</Text>
          </View>
        ) : (
          <View style={styles.authOptions}>
            {capability?.isAvailable && (
              <TouchableOpacity
                onPress={handleBiometricAuth}
                style={styles.biometricButton}
              >
                <Icon name={getBiometricIcon()} size={50} color={Colors.primary} />
                <Text style={styles.biometricButtonText}>
                  Use {getBiometricName()}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowPasswordInput(true)}
              style={styles.passwordButton}
            >
              <Icon name="key-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.passwordButtonText}>Use Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={[GlobalStyles.buttonTextOnly, { marginTop: 20 }]}
            >
              <Text style={GlobalStyles.linkText}>Switch Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  authOptions: {
    alignItems: 'center',
    width: '100%',
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 40,
    marginBottom: 16,
    minWidth: 200,
  },
  biometricButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 8,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 200,
  },
  passwordButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
  },
});

export default BiometricAuthScreen;
