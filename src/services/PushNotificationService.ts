// PushNotificationService.ts - Real-time push notifications for admin
import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';
import { supabase } from '../supabase';
import { AppState, AppStateStatus } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export interface PushNotificationData {
  title: string;
  message: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  severity?: 'info' | 'warning' | 'success' | 'error';
  data?: any;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private isAdmin = false;
  private readonly ADMIN_EMAIL = 'yashbhavsar175@gmail.com';

  private constructor() {}

  private appState: AppStateStatus = 'active';

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('ℹ️ PushNotificationService already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing PushNotificationService...');
      
      // Check if current user is admin
      await this.checkAdminStatus();
      
      if (!this.isAdmin) {
        console.log('👤 User is not admin, skipping push notification setup');
        return;
      }

      // Request permissions
      const permissionGranted = await this.requestPermissions();
      
      if (!permissionGranted) {
        console.log('⚠️ Notification permission not granted, but continuing setup...');
      }
      
      // Configure push notifications
      this.configurePushNotifications();
      
      // Get and register FCM token
      await this.setupFirebaseMessaging();
      
      // Set up real-time subscription for admin
      this.setupRealtimeSubscription();
      
      this.isInitialized = true;
  // Listen to app state changes to re-register token on resume
  AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      console.log('✅ PushNotificationService initialized successfully for admin');
    } catch (error) {
      console.error('❌ Error initializing PushNotificationService:', error);
    }
  }

  private async handleAppStateChange(nextAppState: AppStateStatus) {
    try {
      if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔁 App resumed — re-checking push registration and subscription');
        await this.checkAdminStatus();
        // Attempt to re-register stored token
        const stored = await AsyncStorage.getItem('fcm_token');
        if (stored) {
          console.log('🔁 Found stored token, attempting re-register');
          await this.registerTokenWithServer(stored);
        }
        // If admin, ensure subscriptions are active
        if (this.isAdmin) {
          try {
            this.setupRealtimeSubscription();
          } catch (e) {
            console.warn('⚠️ Failed to re-setup realtime subscription:', e);
          }
        }
      }
      this.appState = nextAppState;
    } catch (err) {
      console.error('❌ Error handling app state change:', err);
    }
  }

  private async registerTokenWithServer(tokenValue: string) {
    try {
      const res = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'register_token',
          token: tokenValue,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        },
      });

      if ((res as any)?.error) {
        console.warn('⚠️ register_token re-register returned error:', (res as any).error);
      } else {
        console.log('🔁 register_token re-register succeeded', (res as any).data || null);
      }
    } catch (err) {
      console.warn('⚠️ Failed to re-invoke register_token function:', err);
    }
  }

  private async checkAdminStatus() {
    try {
      const userDataString = await AsyncStorage.getItem('user_profile');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        this.isAdmin = userData.email === this.ADMIN_EMAIL;
        console.log('👤 Admin status checked:', { 
          email: userData.email, 
          isAdmin: this.isAdmin 
        });
      }
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
    }
  }

  private async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'YashRoadlines needs notification permission to send you important updates about user activities.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('✅ Android notification permission granted');
            return true;
          } else {
            console.log('❌ Android notification permission denied');
            return false;
          }
        } else {
          // For older Android versions, notifications are enabled by default
          console.log('✅ Android notification permission not required for this version');
          return true;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  private configurePushNotifications() {
    PushNotification.configure({
      // Called when token is generated
      onRegister: async (token) => {
        try {
          console.log('📱 Push notification token:', token);
          const tokenValue = (token && (token.token || token.os)) ? (token.token || token.os) : '';
          if (tokenValue) {
            // Save locally for debugging
            await AsyncStorage.setItem('fcm_token', tokenValue);

            // Fire-and-forget: register token with Supabase function so server can target this device
            try {
              const res = await supabase.functions.invoke('quick-processor', {
                body: {
                  action: 'register_token',
                  token: tokenValue,
                  platform: Platform.OS === 'ios' ? 'ios' : 'android',
                },
              });

              // Supabase Functions returns an object with `.error` when failing
              if ((res as any)?.error) {
                console.warn('⚠️ register_token function returned error:', (res as any).error);
              } else {
                console.log('🔁 register_token succeeded', (res as any).data || null);
              }
            } catch (err) {
              console.warn('⚠️ Failed to invoke register_token function:', err);
            }
          }
        } catch (err) {
          console.error('❌ Error handling onRegister token:', err);
        }
      },

      // Called when a remote or local notification is opened or received
      onNotification: function (notification: any) {
        console.log('🔔 Push notification received:', notification);
        console.log('🔍 Notification details:', {
          foreground: notification.foreground,
          userInteraction: notification.userInteraction,
          remote: notification.remote || false,
          data: notification.data
        });

        // Handle notification tap (defensive check)
        if (notification && (notification as any).userInteraction) {
          console.log('👆 User tapped notification');
          // You can navigate to specific screen here
        }
      },

      // FCM Configuration for remote notifications (background/closed app)
      // Note: senderID not supported in current library typings
      // Remote notifications require proper FCM setup in google-services.json
      
      // iOS only
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios', // Only request on iOS, Android handled separately
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: "admin-notifications",
          channelName: "Admin Notifications",
          channelDescription: "Notifications for admin about user activities",
          playSound: true,
          soundName: "default",
          importance: 4, // High importance
          vibrate: true,
          // showBadge: true, // Not supported in library typings
        },
        (created) => console.log(`✅ Notification channel created: ${created}`)
      );
    }
  }

  private async setupFirebaseMessaging() {
    try {
      // Request permission for FCM
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Authorization status:', authStatus);

        // Get FCM token
        const token = await messaging().getToken();
        if (token) {
          console.log('📱 FCM Token:', token);
          await AsyncStorage.setItem('fcm_token', token);
          await this.registerTokenWithServer(token);
        }

        // Listen for token refresh
        messaging().onTokenRefresh(async (newToken) => {
          console.log('🔄 FCM Token refreshed:', newToken);
          await AsyncStorage.setItem('fcm_token', newToken);
          await this.registerTokenWithServer(newToken);
        });

        // Handle foreground messages
        messaging().onMessage(async (remoteMessage) => {
          console.log('🔔 FCM foreground message:', remoteMessage);
          
          if (remoteMessage.notification) {
            // Show local notification for foreground messages
            PushNotification.localNotification({
              channelId: 'admin-notifications',
              title: remoteMessage.notification.title || 'YashRoadlines',
              message: remoteMessage.notification.body || 'New notification',
              playSound: true,
              soundName: 'default',
              importance: 'high',
              priority: 'high',
              vibrate: true,
              autoCancel: false,
              largeIcon: 'ic_launcher',
              smallIcon: 'ic_notification',
              bigText: remoteMessage.notification.body,
              subText: `YashRoadlines - ${new Date().toLocaleTimeString()}`,
              color: '#2196F3',
              group: 'admin-notifications',
              when: Date.now(),
              userInfo: {
                ...remoteMessage.data,
                remote: true,
                timestamp: Date.now(),
              },
            });
          }
        });
      } else {
        console.log('❌ FCM permission denied');
      }
    } catch (error) {
      console.error('❌ Error setting up Firebase messaging:', error);
    }
  }

  private setupRealtimeSubscription() {
    if (!this.isAdmin) {
      console.log('🚫 Not admin, skipping real-time subscription');
      return;
    }

    console.log('🔗 Setting up real-time subscription for push notifications...');
    
    NotificationService.subscribeToNotifications((notification) => {
      console.log('📬 New notification received for push:', notification);
      this.showPushNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        severity: notification.severity,
        data: notification
      });
    });
  }

  // Show local push notification
  showPushNotification(data: PushNotificationData) {
    if (!this.isAdmin) {
      console.log('🚫 Not admin, skipping push notification');
      return;
    }

    console.log('📱 Showing push notification:', data);

    try {
      PushNotification.localNotification({
        channelId: "admin-notifications",
        title: data.title,
        message: data.message,
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        // 'vibration' is not included in the library typings; the platform will vibrate when appropriate
        ongoing: false,
        autoCancel: false, // Don't auto-dismiss - user must swipe
        largeIcon: "ic_launcher",
        smallIcon: "ic_notification", // Use simple icon name
        bigText: data.message,
        subText: `YashRoadlines - ${new Date().toLocaleTimeString()}`,
        color: '#2196F3',
        group: "admin-notifications",
        // groupSummary not present in typings; leaving default behavior
        when: Date.now(),
        usesChronometer: false,
        timeoutAfter: undefined, // Don't auto dismiss - keep until user action
        userInfo: {
          type: data.type,
          severity: data.severity,
          timestamp: Date.now(),
          ...data.data
        },
      });

      console.log('✅ Push notification sent successfully');
      
      // Update badge count
      this.updateBadgeCount();
    } catch (error) {
      console.error('❌ Error showing push notification:', error);
    }
  }

  // Update app badge count with unread notifications
  private async updateBadgeCount() {
    try {
      const unreadCount = await NotificationService.getUnreadNotificationCount();
  // typings for react-native-push-notification may not expose badge methods -> cast to any
  (PushNotification as any).setApplicationIconBadgeNumber(unreadCount);
      console.log('🔢 Badge count updated:', unreadCount);
    } catch (error) {
      console.error('❌ Error updating badge count:', error);
    }
  }

  // Clear all notifications
  clearAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  (PushNotification as any).setApplicationIconBadgeNumber(0);
    console.log('🧹 All notifications cleared');
  }

  // Send immediate notification for user actions
  async notifyUserAction(action: 'add' | 'edit' | 'delete', category: string, userName: string, details?: string) {
    if (!this.isAdmin) {
      return;
    }

    const titles = {
      add: `➕ New ${category} Added`,
      edit: `✏️ ${category} Updated`, 
      delete: `🗑️ ${category} Deleted`
    };

    const messages = {
      add: `${userName} added a new ${category}${details ? `: ${details}` : ''}`,
      edit: `${userName} updated a ${category}${details ? `: ${details}` : ''}`,
      delete: `${userName} deleted a ${category}${details ? `: ${details}` : ''}`
    };

    const severities = {
      add: 'success' as const,
      edit: 'info' as const,
      delete: 'warning' as const
    };

    this.showPushNotification({
      title: titles[action],
      message: messages[action],
      type: action,
      severity: severities[action],
      data: {
        category,
        userName,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Check if user is admin
  getIsAdmin(): boolean {
    console.log('🔍 getIsAdmin called, current status:', this.isAdmin);
    return this.isAdmin;
  }

  // Get admin status async (for components)
  async getIsAdminAsync(): Promise<boolean> {
    await this.checkAdminStatus();
    return this.isAdmin;
  }

  // Refresh admin status
  async refreshAdminStatus() {
    await this.checkAdminStatus();
    
    if (this.isAdmin && !this.isInitialized) {
      await this.initialize();
    }
  }

  // Manual permission request (call this from UI)
  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isAdmin) {
      console.log('🚫 Not admin, no need for notification permission');
      return false;
    }

    try {
      const permissionGranted = await this.requestPermissions();
      
      if (permissionGranted) {
        // Reinitialize if permission was granted
        await this.initialize();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }
}

export default PushNotificationService.getInstance();