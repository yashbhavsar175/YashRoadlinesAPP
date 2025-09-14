// src/services/BiometricAuthService.ts
import ReactNativeBiometrics from 'react-native-biometrics';
import Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

const SERVICE_NAME = 'YashRoadlines';
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const PASSWORD_STORED_KEY = 'password_auth_stored';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  data?: {
    email?: string;
    password?: string;
  };
}

export interface BiometricCapability {
  isAvailable: boolean;
  biometryType: 'TouchID' | 'FaceID' | 'Biometrics' | null;
  error?: string;
}

class BiometricAuthServiceClass {
  private biometrics = new ReactNativeBiometrics();

  /**
   * Check if biometric authentication is available on device
   */
  async checkBiometricCapability(): Promise<BiometricCapability> {
    try {
      const { available, biometryType, error } = await this.biometrics.isSensorAvailable();
      
      return {
        isAvailable: available,
        biometryType,
        error: error || undefined
      };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return {
        isAvailable: false,
        biometryType: null,
        error: String(error)
      };
    }
  }

  /**
   * Store user credentials securely in keychain
   */
  async storeCredentials(email: string, password: string): Promise<boolean> {
    try {
      await Keychain.setInternetCredentials(
        SERVICE_NAME,
        email,
        password,
        {
          storage: Keychain.STORAGE_TYPE.AES,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          authenticatePrompt: 'Please authenticate to access your saved credentials',
          accessGroup: undefined,
          showModal: true,
          kLocalizedFallbackTitle: 'Use Password'
        }
      );
      
      await AsyncStorage.setItem(PASSWORD_STORED_KEY, 'true');
      console.log('✅ Credentials stored successfully');
      return true;
    } catch (error) {
      console.error('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve stored credentials using biometric authentication
   */
  async getStoredCredentials(): Promise<BiometricAuthResult> {
    try {
      // Check if we have stored credentials
      const hasStored = await AsyncStorage.getItem(PASSWORD_STORED_KEY);
      if (!hasStored) {
        return { success: false, error: 'No credentials stored' };
      }

      const credentials = await Keychain.getInternetCredentials(SERVICE_NAME, {
        showModal: true,
        promptMessage: 'Authenticate to login',
        fallbackPromptMessage: 'Use your device password to continue',
        descriptionMessage: 'Access your saved login credentials',
        cancelButtonText: 'Cancel'
      });

      if (credentials && credentials.username && credentials.password) {
        return {
          success: true,
          data: {
            email: credentials.username,
            password: credentials.password
          }
        };
      } else {
        return { success: false, error: 'Authentication cancelled' };
      }
    } catch (error: any) {
      console.error('Error retrieving credentials:', error);
      
      // Handle specific error cases
      if (error.message?.includes('User cancel') || 
          error.message?.includes('Authentication was canceled') ||
          error.message?.includes('Cancel')) {
        return { success: false, error: 'Authentication cancelled' };
      }
      
      return { success: false, error: String(error.message || error) };
    }
  }

  /**
   * Enable biometric authentication for the user
   */
  async enableBiometricAuth(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(PASSWORD_STORED_KEY);
      await Keychain.resetInternetCredentials(SERVICE_NAME);
      return true;
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is enabled by user
   */
  async isBiometricAuthEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const hasStored = await AsyncStorage.getItem(PASSWORD_STORED_KEY);
      return enabled === 'true' && hasStored === 'true';
    } catch (error) {
      console.error('Error checking biometric auth status:', error);
      return false;
    }
  }

  /**
   * Show setup dialog to enable biometric authentication
   */
  async showBiometricSetupDialog(onEnable: (email: string, password: string) => void): Promise<void> {
    const capability = await this.checkBiometricCapability();
    
    if (!capability.isAvailable) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Your device does not support biometric authentication or it is not set up. You can still use your regular login.',
        [{ text: 'OK' }]
      );
      return;
    }

    const biometricName = this.getBiometricTypeName(capability.biometryType);

    Alert.alert(
      `Enable ${biometricName}?`,
      `Would you like to enable ${biometricName} for quick login? Your credentials will be stored securely on your device.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: () => {
            // This will be handled by the calling component
            // They need to provide email and password
          }
        }
      ]
    );
  }

  /**
   * Get friendly name for biometric type
   */
  private getBiometricTypeName(biometryType: string | null): string {
    switch (biometryType) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Biometrics':
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
      default:
        return 'Biometric Authentication';
    }
  }

  /**
   * Test biometric authentication without storing credentials
   */
  async testBiometricAuth(): Promise<boolean> {
    try {
      const capability = await this.checkBiometricCapability();
      if (!capability.isAvailable) {
        return false;
      }

      // Create a temporary biometric key for testing
      const { success } = await this.biometrics.createKeys();
      if (!success) {
        return false;
      }

      // Test biometric prompt
      const { success: authSuccess } = await this.biometrics.simplePrompt({
        promptMessage: 'Test biometric authentication',
        cancelButtonText: 'Cancel'
      });

      // Clean up test key
      await this.biometrics.deleteKeys();

      return authSuccess;
    } catch (error) {
      console.error('Error testing biometric auth:', error);
      return false;
    }
  }
}

export const BiometricAuthService = new BiometricAuthServiceClass();
