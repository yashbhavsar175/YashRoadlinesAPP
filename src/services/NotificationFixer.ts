// NotificationFixer.ts - Comprehensive notification system fixer
import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FixResult {
  component: string;
  success: boolean;
  message: string;
  actions?: string[];
}

class NotificationFixer {
  private fixes: FixResult[] = [];

  async fixAllNotificationIssues(): Promise<FixResult[]> {
    this.fixes = [];
    console.log('🔧 Starting notification system fixes...');

    await this.fixAndroidPermissions();
    await this.fixNotificationChannels();
    await this.fixPushNotificationConfiguration();
    await this.fixSupabaseEdgeFunction();
    await this.fixDeviceTokenRegistration();
    await this.fixNotificationServiceInitialization();

    console.log('🏁 All fixes completed:', this.fixes);
    return this.fixes;
  }

  private addFix(component: string, success: boolean, message: string, actions?: string[]) {
    const fix = { component, success, message, actions };
    this.fixes.push(fix);
    console.log(success ? '✅' : '❌', `[${component}]`, message);
  }

  // Fix 1: Android notification permissions
  async fixAndroidPermissions() {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (!hasPermission) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission Required',
              message: 'YashRoadlines needs notification permission to send important updates about transactions and entries.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
              buttonNeutral: 'Ask Later',
            }
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            this.addFix('Android Permissions', true, 'POST_NOTIFICATIONS permission granted');
          } else {
            this.addFix('Android Permissions', false, 'User denied notification permission', [
              'Go to Settings > Apps > YashRoadlines > Permissions > Notifications',
              'Enable notification permission manually'
            ]);
          }
        } else {
          this.addFix('Android Permissions', true, 'POST_NOTIFICATIONS permission already granted');
        }
      } else {
        this.addFix('Android Permissions', true, 'Permission not required for this Android version');
      }
    } catch (error) {
      this.addFix('Android Permissions', false, `Permission fix failed: ${error}`, [
        'Manually enable notification permission in device settings'
      ]);
    }
  }

  // Fix 2: Create proper notification channels
  async fixNotificationChannels() {
    try {
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
            // ledColor: '#FF0000', // Not supported in current version
            // showBadge: true, // Not supported in current version
          },
          (created) => {
            if (created) {
              console.log('✅ Admin notification channel created');
            }
          }
        );

        // User activity notifications
        PushNotification.createChannel(
          {
            channelId: 'user-activity',
            channelName: 'User Activity',
            channelDescription: 'Notifications about user actions and data entries',
            playSound: true,
            soundName: 'default',
            importance: 3, // IMPORTANCE_DEFAULT
            vibrate: true,
            // showBadge: true, // Not supported in current version
          },
          (created) => console.log(`User activity channel: ${created}`)
        );

        // System notifications
        PushNotification.createChannel(
          {
            channelId: 'system-notifications',
            channelName: 'System Updates',
            channelDescription: 'System updates and maintenance notifications',
            playSound: false,
            importance: 2, // IMPORTANCE_LOW
            vibrate: false,
            // showBadge: false, // Not supported in current version
          },
          (created) => console.log(`System channel: ${created}`)
        );

        this.addFix('Notification Channels', true, 'All notification channels created successfully');
      } else {
        this.addFix('Notification Channels', true, 'iOS channels not required');
      }
    } catch (error) {
      this.addFix('Notification Channels', false, `Channel creation failed: ${error}`);
    }
  }

  // Fix 3: Configure push notifications properly
  async fixPushNotificationConfiguration() {
    try {
      PushNotification.configure({
        // Called when token is generated (iOS and Android)
        onRegister: async function (token) {
          console.log('📱 FCM Token registered:', token.token?.substring(0, 20) + '...');
          
          // Store token locally for debugging
          await AsyncStorage.setItem('fcm_token', token.token || '');
          await AsyncStorage.setItem('fcm_platform', Platform.OS);
          
          // You can add token registration logic here
          console.log('📱 Token stored locally for debugging');
        },

        // Called when a remote notification is received
        onNotification: function (notification) {
          console.log('🔔 Notification received:', notification);
          
          // Required on iOS only
          // if (notification.finish) {
          //   notification.finish(PushNotification.FetchResult.NoData);
          // }
        },

        // Called when a remote notification is received
        onAction: function (notification) {
          console.log('👆 Notification action:', notification.action);
          console.log('🔔 Notification data:', notification);
        },

        // Called when the user fails to register for remote notifications
        onRegistrationError: function(err) {
          console.error('❌ Registration Error:', err.message, err);
        },

        // iOS only
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Request iOS permissions
        requestPermissions: Platform.OS === 'ios',
      });

      this.addFix('Push Configuration', true, 'Push notification configuration completed');
    } catch (error) {
      this.addFix('Push Configuration', false, `Configuration failed: ${error}`);
    }
  }

  // Fix 4: Create Supabase Edge Function for server push
  async fixSupabaseEdgeFunction() {
    try {
      // Test if edge function exists and works
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'test',
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        this.addFix('Supabase Edge Function', false, `Edge function not working: ${error.message}`, [
          'Create quick-processor edge function in Supabase',
          'Add FIREBASE_SA_JSON secret in Supabase dashboard',
          'Deploy edge function with FCM support'
        ]);
      } else {
        this.addFix('Supabase Edge Function', true, 'Edge function is working correctly');
      }
    } catch (error) {
      this.addFix('Supabase Edge Function', false, `Edge function test failed: ${error}`, [
        'Check if quick-processor function is deployed',
        'Verify Supabase project configuration'
      ]);
    }
  }

  // Fix 5: Device token registration
  async fixDeviceTokenRegistration() {
    try {
      // Wait for token registration
      const tokenPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Token timeout')), 10000);
        
        PushNotification.configure({
          onRegister: (token) => {
            clearTimeout(timeout);
            resolve(token.token || '');
          },
          onRegistrationError: (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });

      try {
        const token = await tokenPromise;
        await AsyncStorage.setItem('device_token', token);
        await AsyncStorage.setItem('token_timestamp', Date.now().toString());
        
        this.addFix('Token Registration', true, `Device token registered: ${token.substring(0, 20)}...`);
      } catch (tokenError) {
        this.addFix('Token Registration', false, `Token registration failed: ${tokenError}`, [
          'Check Firebase configuration',
          'Ensure google-services.json is properly configured',
          'Verify app package name matches Firebase project'
        ]);
      }
    } catch (error) {
      this.addFix('Token Registration', false, `Registration setup failed: ${error}`);
    }
  }

  // Fix 6: Notification service initialization
  async fixNotificationServiceInitialization() {
    try {
      // Fix the App.tsx initialization issue
      const initializationCode = `
// In App.tsx, replace the current initialization with:

useEffect(() => {
  if (!isInitialized.current) {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app services...');
        
        // Initialize Supabase storage
        await initializeSupabaseStorage();
        
        // Initialize notification services properly
        console.log('📱 Initializing notification services...');
        await NotificationService.initialize();
        
        // Initialize push notification service
        await PushNotificationService.initialize();
        
        // Initialize device notification service (proper initialization)
        await DeviceNotificationService.initialize?.() || console.log('DeviceNotificationService already initialized');
        
        // Fix notification channels
        await import('./src/services/NotificationFixer').then(module => 
          module.default.fixNotificationChannels()
        );
        
        console.log('✅ All notification services initialized');
        
        await checkSyncStatus();
        await checkActiveUser();
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };
    initializeApp();
    isInitialized.current = true;
  }
}, []);
`;

      // Store the fix code for manual implementation
      await AsyncStorage.setItem('initialization_fix_code', initializationCode);
      
      this.addFix('Service Initialization', true, 'Initialization fix code generated', [
        'Update App.tsx with proper service initialization',
        'Check AsyncStorage for initialization_fix_code',
        'Ensure all services are properly initialized'
      ]);
    } catch (error) {
      this.addFix('Service Initialization', false, `Initialization fix failed: ${error}`);
    }
  }

  // Test immediate notification
  async testImmediateNotification() {
    try {
      console.log('📱 Testing immediate notification...');
      
      PushNotification.localNotification({
        channelId: 'admin-notifications',
        id: 'immediate-test',
        title: '🔥 Immediate Test Notification',
        message: 'If you see this, notifications are working! Check your notification settings if you don\'t see this.',
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        bigText: 'This is an immediate test notification. If you can see this, your notification system is working correctly. If not, check your notification permissions.',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        autoCancel: true,
        ignoreInForeground: false,
        invokeApp: true,
        ongoing: false,
        when: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('❌ Immediate test failed:', error);
      return false;
    }
  }

  // Get FCM token for debugging
  async getStoredTokenInfo() {
    try {
      const token = await AsyncStorage.getItem('fcm_token');
      const platform = await AsyncStorage.getItem('fcm_platform');
      const timestamp = await AsyncStorage.getItem('token_timestamp');
      
      return {
        token: token ? token.substring(0, 50) + '...' : 'No token stored',
        platform: platform || 'Unknown',
        timestamp: timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Unknown'
      };
    } catch (error) {
      return { error: (error as Error).message || 'Unknown error' };
    }
  }

  // Get fix summary
  getFixSummary() {
    const total = this.fixes.length;
    const successful = this.fixes.filter(f => f.success).length;
    const failed = total - successful;
    
    return {
      total,
      successful,
      failed,
      allFixed: failed === 0,
      fixes: this.fixes
    };
  }
}

export default new NotificationFixer();