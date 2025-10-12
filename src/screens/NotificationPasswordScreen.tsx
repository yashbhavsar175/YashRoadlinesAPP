import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import UserPasswordService from '../services/UserPasswordService';

// Temporary navigation type - will be updated when integrated
type RootStackParamList = {
  NotificationPassword: { 
    notificationId?: string;
    title?: string;
    message?: string;
  };
  [key: string]: undefined | object;
};

type NotificationPasswordScreenNavigationProp = NavigationProp<RootStackParamList, 'NotificationPassword'>;
type NotificationPasswordScreenRouteProp = RouteProp<RootStackParamList, 'NotificationPassword'>;

interface NotificationPasswordScreenProps {
  navigation: NotificationPasswordScreenNavigationProp;
  route: NotificationPasswordScreenRouteProp;
}

const NotificationPasswordScreen = ({ navigation, route }: NotificationPasswordScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  const { notificationId, title, message } = route.params || {};
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    checkIfFirstTime();
  }, []);

  const checkIfFirstTime = async () => {
    try {
      // Mock check - replace with actual API call
      const hasPassword = false; // Get from storage or API
      setIsFirstTime(!hasPassword);
    } catch (error) {
      console.error('❌ Error checking password status:', error);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    if (isFirstTime) {
      if (!confirmPassword.trim()) {
        Alert.alert('Error', 'Please confirm your password');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      if (password.length < 4) {
        Alert.alert('Error', 'Password must be at least 4 characters long');
        return;
      }
    }

    setLoading(true);
    try {
      if (isFirstTime) {
        // Save new password
        await new Promise(resolve => setTimeout(resolve, 1500));
        Alert.alert(
          'Password Set Successfully',
          'Your notification password has been set. You can now access notifications with this password.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to notification content or back
                goBack();
              }
            }
          ]
        );
      } else {
        // Verify existing password
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isValid = true; // Mock validation - replace with actual verification
        
        if (isValid) {
          Alert.alert(
            'Access Granted',
            'Password verified successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to notification content or back
                  goBack();
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Incorrect password. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Error with password:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Contact your administrator to reset your notification password.',
      [
        { text: 'OK' },
        {
          text: 'Contact Admin',
          onPress: () => {
            // Navigate to admin contact or phone dialer
            Alert.alert('Contact Admin', 'Please contact your system administrator for password reset.');
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Access</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Preview */}
        {title && message && (
          <View style={styles.notificationPreview}>
            <View style={styles.notificationHeader}>
              <Icon name="notifications" size={24} color="#2196F3" />
              <Text style={styles.notificationTitle}>{title}</Text>
            </View>
            <Text style={styles.notificationMessage}>{message}</Text>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Icon name="shield-checkmark" size={48} color="#2196F3" />
          <Text style={styles.securityTitle}>
            {isFirstTime ? 'Set Your Notification Password' : 'Enter Your Password'}
          </Text>
          <Text style={styles.securityDescription}>
            {isFirstTime 
              ? 'Create a secure password to access your notifications. This password will be required every time you view notification details.'
              : 'Please enter your notification password to view the details.'
            }
          </Text>
        </View>

        {/* Password Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {isFirstTime ? 'Create Password' : 'Password'}
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={isFirstTime ? 'Enter new password' : 'Enter your password'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={20}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Icon 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {isFirstTime && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  maxLength={20}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Icon 
                    name={showConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isFirstTime && (
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <Text style={styles.requirementItem}>• At least 4 characters long</Text>
              <Text style={styles.requirementItem}>• Easy to remember for you</Text>
              <Text style={styles.requirementItem}>• Can be reset by admin if forgotten</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              !password.trim() && styles.submitButtonDisabled
            ]}
            onPress={handlePasswordSubmit}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon 
                  name={isFirstTime ? 'checkmark-circle' : 'unlock'} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.submitButtonText}>
                  {isFirstTime ? 'Set Password' : 'Access Notification'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!isFirstTime && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Note */}
        <View style={styles.adminNote}>
          <Icon name="information-circle" size={16} color="#999" />
          <Text style={styles.adminNoteText}>
            If you have issues with your password, contact your administrator for assistance.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  securityInfo: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  securityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  securityDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  passwordRequirements: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 12,
    color: '#2196F3',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  adminNoteText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default NotificationPasswordScreen;