// UnifiedNotificationManager.ts - Single entry point for all notifications
import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../supabase';
import NotificationService from './NotificationService';
import PushGateway from './PushGateway';

interface NotificationConfig {
  title: string;
  message: string;
  type: 'add' | 'edit' | 'delete' | 'system' | 'login_request';
  severity?: 'info' | 'warning' | 'success' | 'error';
  data?: any;
}

class UnifiedNotificationManager {
  private static instance: UnifiedNotificationManager;
  private isInitialized = false;
  private isAdmin = false;
  private currentUserId: string | null = null;
  private realtimeSubscription: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  private constructor() {}

  static getInstance(): UnifiedNotificationManager {
    if (!UnifiedNotificationManager.instance) {
      UnifiedNotificationManager.instance = new UnifiedNotificationManager();
    }
    return UnifiedNotificationManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing UnifiedNotificationManager...');
      
      await this.loadUserInfo();
      await this.requestPermissions();
      this.configurePushNotifications();
      await this.setupFirebaseMessaging();
      this.setupRealtimeSubscriptions();
      
      this.isInitialized = true;
      console.log('✅ UnifiedNotificationManager initialized');
    } catch (error) {
      console.error('❌ Error initializing UnifiedNotificationManager:', error);
    }
  }

  private async loadUserInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        this.isAdmin = false;
        return;
      }

      // Check is_admin flag from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        this.isAdmin = false;
        return;
      }

      this.isAdmin = profile?.is_admin === true;
      this.currentUserId = user.id;
      console.log('👤 User loaded:', { isAdmin: this.isAdmin, userId: this.currentUserId });
    } catch (error) {
      console.error('❌ Error loading user info:', error);
      this.isAdmin = false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  private configurePushNotifications() {
    PushNotification.configure({
      onRegister: async (token) => {
        console.log('📱 Token received:', token);
        if (token?.token) {
          await AsyncStorage.setItem('fcm_token', token.token);
          await this.registerToken(token.token);
        }
      },
      onNotification: (notification) => {
        console.log('🔔 Notification received:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create channels
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'admin-notifications',
          channelName: 'Admin Notifications',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`✅ Admin channel: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'user-notifications',
          channelName: 'User Notifications',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`✅ User channel: ${created}`)
      );
    }
  }

  private async setupFirebaseMessaging() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        if (token) {
          await AsyncStorage.setItem('fcm_token', token);
          await this.registerToken(token);
        }

        messaging().onTokenRefresh(async (newToken) => {
          await AsyncStorage.setItem('fcm_token', newToken);
          await this.registerToken(newToken);
        });

        messaging().onMessage(async (remoteMessage) => {
          console.log('🔔 FCM foreground message:', remoteMessage);
          if (remoteMessage.notification) {
            this.showLocalNotification({
              title: remoteMessage.notification.title || 'Notification',
              message: remoteMessage.notification.body || '',
              type: 'system',
              data: remoteMessage.data,
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Error setting up Firebase messaging:', error);
    }
  }

  private async registerToken(token: string) {
    try {
      await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'register_token',
          token,
          platform: Platform.OS,
        },
      });
      console.log('✅ Token registered');
    } catch (error) {
      console.warn('⚠️ Token registration failed:', error);
    }
  }

  private setupRealtimeSubscriptions() {
    // Admin subscription
    if (this.isAdmin) {
      NotificationService.subscribeToNotifications((notification) => {
        this.showLocalNotification({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          severity: notification.severity,
          data: notification,
        });
      });
    }

    // User subscription
    if (this.currentUserId) {
      this.realtimeSubscription = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `recipient_id=eq.${this.currentUserId}`,
          },
          (payload) => {
            this.showLocalNotification({
              title: payload.new.title || 'New Message',
              message: payload.new.description || '',
              type: 'system',
              data: payload.new,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.reconnectAttempts = 0;
            console.log('✅ User notification subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ User notification subscription error');
            this.handleReconnection();
          } else if (status === 'CLOSED') {
            console.warn('⚠️ User notification channel closed');
            this.handleReconnection();
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ User notification subscription timed out');
            this.handleReconnection();
          }
        });
    }
  }

  private handleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached for UnifiedNotificationManager');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 Reconnecting UnifiedNotificationManager ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (this.realtimeSubscription) {
          await supabase.removeChannel(this.realtimeSubscription);
          this.realtimeSubscription = null;
        }
        this.setupRealtimeSubscriptions();
      } catch (error) {
        console.error('❌ Reconnection attempt failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  showLocalNotification(config: NotificationConfig) {
    const channelId = this.isAdmin ? 'admin-notifications' : 'user-notifications';
    
    PushNotification.localNotification({
      channelId,
      title: config.title,
      message: config.message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      vibrate: true,
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: config.message,
      subText: `YashRoadlines - ${new Date().toLocaleTimeString()}`,
      color: '#2196F3',
      userInfo: {
        type: config.type,
        severity: config.severity,
        ...config.data,
      },
    });
  }

  async sendToAdmin(config: NotificationConfig) {
    try {
      // Save to database
      await NotificationService.sendAdminNotification({
        title: config.title,
        message: config.message,
        type: config.type,
        severity: config.severity,
        metadata: config.data,
      });

      // Send push notification
      await PushGateway.sendPushToAdmin({
        title: config.title,
        body: config.message,
        data: config.data,
      });
    } catch (error) {
      console.error('❌ Error sending to admin:', error);
    }
  }

  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
      this.reconnectAttempts = 0;
    }
  }
}

export default UnifiedNotificationManager.getInstance();
