import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import PushGateway from './PushGateway';

export interface DeviceNotificationData {
  title: string;
  message: string;
  type: 'add' | 'edit' | 'delete';
  screen: string;
  userName: string;
  details: any;
}

class DeviceNotificationService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  // Public initialize method for explicit initialization
  async initializeAsync() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }

  private initialize() {
    if (this.initialized) return;

    console.log('📱 [DeviceNotificationService] Starting initialization...');

    PushNotification.configure({
      onRegister: async (token) => {
        console.log('📱 [DeviceNotificationService] FCM Token received:', token);
        // token.os is not standard in this lib; infer from Platform
        const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'unknown';
        console.log('📱 [DeviceNotificationService] Platform:', platform);
        // Best-effort register with backend (FCM token used on Android/iOS)
        if (token?.token) {
          console.log('📱 [DeviceNotificationService] Registering token with backend...');
          const result = await PushGateway.registerDeviceToken(token.token, platform as any);
          console.log('📱 [DeviceNotificationService] Token registration result:', result);
        } else {
          console.warn('⚠️ [DeviceNotificationService] No token received');
        }
      },

      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },

      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
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
        (created) => {
          console.log(`📱 Notification channel created: ${created}`);
          if (created) {
            console.log('✅ Admin notification channel ready');
          }
        }
      );
      // DO NOT call requestPermissions on Android (causes Firebase error)
    }

    this.initialized = true;
  }

  async sendAdminDeviceNotification(data: DeviceNotificationData) {
    try {
      console.log('🔔 [1/4] Starting admin notification flow:', data.title);
      console.log('   - Data:', JSON.stringify(data, null, 2));
      
      // First try server push (works when app is closed and shows in status bar)
      let serverPushSuccess = false;
      try {
        console.log('📡 [2/4] Attempting server push via PushGateway...');
        const result = await PushGateway.sendPushToAdmin({
          title: data.title,
          body: data.message,
          data: {
            type: data.type,
            screen: data.screen,
            userName: data.userName,
            details: data.details,
          },
        });
        
        console.log('📡 [3/4] Server push result:', result);
        
        if (result.ok) {
          serverPushSuccess = true;
          console.log('✅ [4/4] Server push sent successfully!');
        } else {
          console.warn('⚠️ [4/4] Server push failed. See PushGateway logs for details.');
        }
      } catch (e) {
        console.error('❌ [DeviceNotificationService] Server push exception:', e);
      }

      // Fallback to local notification if server push failed
      if (!serverPushSuccess) {
        console.log('🔄 Using local notification as fallback...');
        PushNotification.localNotification({
          channelId: 'admin-notifications',
          id: Math.floor(Math.random() * 1000000).toString(),
          title: `(Local) ${data.title}`,
          message: data.message,
          // ... (rest of the properties)
        });
      }
    } catch (error) {
      console.error('❌ [DeviceNotificationService] Main error:', error);
    }
  }

  // Helper methods for specific actions
  async notifyAdminEntryAdded(entryType: string, userName: string, details: any) {
    await this.sendAdminDeviceNotification({
      title: `New ${entryType} Added`,
      message: `${userName} added a new ${entryType} entry`,
      type: 'add',
      screen: entryType,
      userName,
      details,
    });
  }

  async notifyAdminEntryUpdated(entryType: string, userName: string, details: any) {
    await this.sendAdminDeviceNotification({
      title: `${entryType} Updated`,
      message: `${userName} updated a ${entryType} entry`,
      type: 'edit',
      screen: entryType,
      userName,
      details,
    });
  }

  async notifyAdminEntryDeleted(entryType: string, userName: string, details: any) {
    await this.sendAdminDeviceNotification({
      title: `${entryType} Deleted`,
      message: `${userName} deleted a ${entryType} entry`,
      type: 'delete',
      screen: entryType,
      userName,
      details,
    });
  }

  // Clear all notifications
  clearAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  // Request permissions (mainly for iOS)
  requestPermissions() {
    PushNotification.requestPermissions();
  }

  // Test notification function for debugging
  sendTestNotification() {
    console.log('🧪 Sending test notification...');
    PushNotification.localNotification({
      channelId: 'admin-notifications',
      id: 'test-notification',
      title: 'Test Notification',
      message: 'This is a test notification to verify the setup is working',
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      vibrate: true,
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_launcher',
      bigText: 'This is a test notification to verify the setup is working. If you can see this, the notification system is configured correctly.',
      subText: 'Test • System',
      color: '#2196F3',
      group: 'admin-notifications',
      ongoing: false,
      invokeApp: true,
      when: Date.now(),
      usesChronometer: false,
    });
    console.log('✅ Test notification sent');
  }
}

export default new DeviceNotificationService();