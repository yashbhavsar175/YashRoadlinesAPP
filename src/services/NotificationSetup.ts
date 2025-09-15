// NotificationSetup.ts - Initialize all notification services
import NotificationService from './NotificationService';
import PushNotificationService from './PushNotificationService';
import ActivityNotificationService from './ActivityNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationSetup {
  private static isInitialized = false;

  static async initialize() {
    if (NotificationSetup.isInitialized) {
      console.log('ℹ️ Notification services already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing all notification services...');

      // Initialize core notification service
      await NotificationService.initialize();

      // Initialize push notification service (only for admin)
      await PushNotificationService.initialize();

      // Initialize activity notification service
      await ActivityNotificationService.initialize();

      NotificationSetup.isInitialized = true;
      console.log('✅ All notification services initialized successfully');

      // Test notification for admin
      await NotificationSetup.sendTestNotification();

    } catch (error) {
      console.error('❌ Error initializing notification services:', error);
    }
  }

  // Send a test notification to verify everything works
  private static async sendTestNotification() {
    try {
      const userDataString = await AsyncStorage.getItem('user_profile');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        
        // Only send test notification for admin
        if (userData.email === 'yashbhavsar175@gmail.com') {
          console.log('📧 Sending test notification for admin...');
          
          await NotificationService.sendAdminNotification({
            title: '🎉 Notification System Active',
            message: 'Real-time notifications are now working! You will receive notifications when users add, edit, or delete entries.',
            type: 'system',
            severity: 'success',
            metadata: {
              testNotification: true,
              timestamp: new Date().toISOString(),
              version: '1.0'
            }
          });

          // Also send push notification
          PushNotificationService.showPushNotification({
            title: '🎉 Push Notifications Ready',
            message: 'You will now receive real-time push notifications on your device!',
            type: 'system',
            severity: 'success'
          });
        }
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  }

  // Reinitialize services (useful after login/logout)
  static async reinitialize() {
    NotificationSetup.isInitialized = false;
    await NotificationSetup.initialize();
  }

  // Check if services are initialized
  static isReady(): boolean {
    return NotificationSetup.isInitialized;
  }
}

export default NotificationSetup;