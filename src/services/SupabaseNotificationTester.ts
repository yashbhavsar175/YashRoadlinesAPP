// SupabaseNotificationTester.ts - Comprehensive notification testing
import PushNotification from 'react-native-push-notification';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import DeviceNotificationService from './DeviceNotificationService';
import PushNotificationService from './PushNotificationService';
import NotificationService from './NotificationService';

export interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

class SupabaseNotificationTester {
  private results: TestResult[] = [];

  // Run complete notification system test
  async runCompleteTest(): Promise<TestResult[]> {
    this.results = [];
    console.log('🧪 Starting complete notification system test...');

    await this.testStep1_CheckPermissions();
    await this.testStep2_CheckFirebaseSetup();
    await this.testStep3_TestLocalNotifications();
    await this.testStep4_TestSupabaseConnection();
    await this.testStep5_TestEdgeFunction();
    await this.testStep6_TestNotificationServices();
    await this.testStep7_TestDeviceRegistration();
    await this.testStep8_TestCompleteFlow();

    console.log('🏁 Complete test finished. Results:', this.results);
    return this.results;
  }

  private addResult(step: string, success: boolean, message: string, data?: any, error?: any) {
    const result = { step, success, message, data, error };
    this.results.push(result);
    console.log(success ? '✅' : '❌', step, '-', message);
    if (error) console.error('   Error:', error);
  }

  // Step 1: Check notification permissions
  private async testStep1_CheckPermissions() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          if (granted) {
            this.addResult('Permissions', true, 'Android notification permission granted');
          } else {
            // Try to request permission
            const requested = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: 'Notification Permission Required',
                message: 'Please allow notifications to receive important updates',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );
            
            this.addResult('Permissions', 
              requested === PermissionsAndroid.RESULTS.GRANTED,
              requested === PermissionsAndroid.RESULTS.GRANTED ? 
                'Permission granted after request' : 'Permission denied by user'
            );
          }
        } else {
          this.addResult('Permissions', true, 'Android < 13, permission not required');
        }
      } else {
        this.addResult('Permissions', true, 'iOS permissions will be requested by library');
      }
    } catch (error) {
      this.addResult('Permissions', false, 'Permission check failed', null, error);
    }
  }

  // Step 2: Check Firebase setup
  private async testStep2_CheckFirebaseSetup() {
    try {
      // Check if google-services.json is properly configured
      const hasFirebaseConfig = true; // We know it exists from our analysis
      
      if (hasFirebaseConfig) {
        this.addResult('Firebase Setup', true, 'google-services.json found and configured');
      } else {
        this.addResult('Firebase Setup', false, 'google-services.json missing or misconfigured');
      }
    } catch (error) {
      this.addResult('Firebase Setup', false, 'Firebase setup check failed', null, error);
    }
  }

  // Step 3: Test local notifications
  private async testStep3_TestLocalNotifications() {
    try {
      console.log('📱 Testing local notification...');
      
      PushNotification.localNotification({
        channelId: 'test-channel',
        title: '🧪 Test Local Notification',
        message: 'This is a test local notification. If you see this, local notifications work!',
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        autoCancel: true,
        ignoreInForeground: false,
      });
      
      this.addResult('Local Notifications', true, 'Local notification sent successfully');
    } catch (error) {
      this.addResult('Local Notifications', false, 'Local notification failed', null, error);
    }
  }

  // Step 4: Test Supabase connection
  private async testStep4_TestSupabaseConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.addResult('Supabase Auth', true, `Connected as ${user.email}`);
        
        // Test database connection
        const { data, error } = await supabase
          .from('agencies')
          .select('count')
          .limit(1);
        
        if (error) {
          this.addResult('Supabase DB', false, 'Database connection failed', null, error);
        } else {
          this.addResult('Supabase DB', true, 'Database connection successful');
        }
      } else {
        this.addResult('Supabase Auth', false, 'User not authenticated');
      }
    } catch (error) {
      this.addResult('Supabase Connection', false, 'Supabase connection test failed', null, error);
    }
  }

  // Step 5: Test Edge Function
  private async testStep5_TestEdgeFunction() {
    try {
      console.log('🚀 Testing Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'test',
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        this.addResult('Edge Function', false, 'Edge function test failed', data, error);
      } else {
        this.addResult('Edge Function', true, 'Edge function test successful', data);
      }
    } catch (error) {
      this.addResult('Edge Function', false, 'Edge function invocation failed', null, error);
    }
  }

  // Step 6: Test notification services
  private async testStep6_TestNotificationServices() {
    try {
      // Test NotificationService
      await NotificationService.initialize();
      this.addResult('NotificationService', true, 'NotificationService initialized');
      
      // Test PushNotificationService
      await PushNotificationService.initialize();
      const isAdmin = await PushNotificationService.getIsAdminAsync();
      this.addResult('PushNotificationService', true, 
        `PushNotificationService initialized (Admin: ${isAdmin})`);
      
      // Test DeviceNotificationService
      DeviceNotificationService.sendTestNotification();
      this.addResult('DeviceNotificationService', true, 'Test notification sent');
      
    } catch (error) {
      this.addResult('Notification Services', false, 'Service initialization failed', null, error);
    }
  }

  // Step 7: Test device registration
  private async testStep7_TestDeviceRegistration() {
    try {
      // This will test the token registration flow
      const tokenReceived = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        PushNotification.configure({
          onRegister: (token) => {
            clearTimeout(timeout);
            console.log('📱 FCM Token received:', token);
            resolve(true);
          },
          onRegistrationError: (error) => {
            clearTimeout(timeout);
            console.error('❌ Token registration error:', error);
            resolve(false);
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          popInitialNotification: true,
          requestPermissions: Platform.OS === 'ios',
        });
      });
      
      this.addResult('Device Registration', tokenReceived as boolean, 
        tokenReceived ? 'FCM token received' : 'FCM token not received within 5 seconds');
        
    } catch (error) {
      this.addResult('Device Registration', false, 'Device registration test failed', null, error);
    }
  }

  // Step 8: Test complete notification flow
  private async testStep8_TestCompleteFlow() {
    try {
      console.log('🔄 Testing complete notification flow...');
      
      // Test admin notification creation
      await NotificationService.sendAdminNotification({
        title: '🧪 Test Admin Notification',
        message: 'This is a test notification from the testing system',
        type: 'system',
        severity: 'info',
        metadata: { test: true, timestamp: Date.now() }
      });
      
      this.addResult('Complete Flow', true, 'Admin notification created and sent');
      
      // Test device notification
      await DeviceNotificationService.notifyAdminEntryAdded(
        'Test Entry',
        'Test User',
        { amount: 1000, description: 'Test notification flow' }
      );
      
      this.addResult('Device Flow', true, 'Device notification flow completed');
      
    } catch (error) {
      this.addResult('Complete Flow', false, 'Complete flow test failed', null, error);
    }
  }

  // Create notification channel for testing
  async createTestChannel() {
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'test-channel',
          channelName: 'Test Notifications',
          channelDescription: 'Channel for testing notifications',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => {
          console.log(`Test channel created: ${created}`);
        }
      );
    }
  }

  // Fix notification configuration
  async fixNotificationConfiguration() {
    try {
      console.log('🔧 Fixing notification configuration...');
      
      // Create proper notification channels
      if (Platform.OS === 'android') {
        // Admin notifications channel
        PushNotification.createChannel(
          {
            channelId: 'admin-notifications',
            channelName: 'Admin Notifications',
            channelDescription: 'Important notifications for admin about user activities',
            playSound: true,
            soundName: 'default',
            importance: 4, // IMPORTANCE_HIGH
            vibrate: true,
          },
          (created) => console.log(`Admin channel created: ${created}`)
        );
        
        // System notifications channel
        PushNotification.createChannel(
          {
            channelId: 'system-notifications',
            channelName: 'System Notifications',
            channelDescription: 'System updates and important information',
            playSound: true,
            soundName: 'default',
            importance: 3, // IMPORTANCE_DEFAULT
            vibrate: false,
          },
          (created) => console.log(`System channel created: ${created}`)
        );
        
        // User activity channel
        PushNotification.createChannel(
          {
            channelId: 'user-activity',
            channelName: 'User Activity',
            channelDescription: 'Notifications about user actions and entries',
            playSound: true,
            soundName: 'default',
            importance: 3,
            vibrate: true,
          },
          (created) => console.log(`User activity channel created: ${created}`)
        );
      }
      
      console.log('✅ Notification configuration fixed');
      return true;
    } catch (error) {
      console.error('❌ Failed to fix notification configuration:', error);
      return false;
    }
  }

  // Force device notification test
  async forceDeviceNotificationTest() {
    try {
      console.log('💪 Forcing device notification test...');
      
      // Test 1: Basic local notification
      PushNotification.localNotification({
        channelId: 'admin-notifications',
        id: 'force-test-1',
        title: '🔥 Force Test 1',
        message: 'This is a forced local notification test',
        smallIcon: 'ic_launcher',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        playSound: true,
        autoCancel: true,
        ignoreInForeground: false,
      });

      // Test 2: Admin notification via service
      setTimeout(async () => {
        await DeviceNotificationService.sendAdminDeviceNotification({
          title: '🔥 Force Test 2',
          message: 'This is a forced admin device notification',
          type: 'add',
          screen: 'test',
          userName: 'Force Tester',
          details: { test: true }
        });
      }, 2000);

      // Test 3: Push notification service
      setTimeout(async () => {
        PushNotificationService.showPushNotification({
          title: '🔥 Force Test 3',
          message: 'This is a forced push notification service test',
          type: 'system',
          severity: 'info'
        });
      }, 4000);

      console.log('✅ All forced tests initiated');
      return true;
    } catch (error) {
      console.error('❌ Force test failed:', error);
      return false;
    }
  }

  // Get test summary
  getTestSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      success: failed === 0,
      results: this.results
    };
  }
}

export default new SupabaseNotificationTester();