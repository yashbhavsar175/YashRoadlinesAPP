// NotificationListener.ts - Listen for incoming notifications for current user
import { supabase } from '../supabase';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationListener {
  private static instance: NotificationListener;
  private subscription: any = null;
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3; // Stop after 3 consecutive immediate failures

  private constructor() {}

  static getInstance(): NotificationListener {
    if (!NotificationListener.instance) {
      NotificationListener.instance = new NotificationListener();
    }
    return NotificationListener.instance;
  }

  async initialize() {
    try {
      // Get current user ID
      await this.getCurrentUserId();
      
      if (!this.currentUserId) {
        console.log('🚫 No current user, skipping notification listener');
        return;
      }

      // Setup real-time subscription for notifications
      this.setupNotificationSubscription();
      console.log('✅ Notification listener initialized for user:', this.currentUserId);
    } catch (error) {
      console.error('❌ Error initializing notification listener:', error);
    }
  }

  private async getCurrentUserId() {
    try {
      // Try to get from AsyncStorage first
      const userProfile = await AsyncStorage.getItem('user_profile');
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        console.log('📱 User profile from storage:', userData);
        
        // Try to match with database users by email
        if (userData.email) {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id')
            .eq('username', userData.email)
            .single();
          
          if (dbUser && !error) {
            this.currentUserId = dbUser.id;
            console.log('✅ Found matching database user ID:', this.currentUserId);
            return;
          }
        }
        
        // Fallback to stored ID
        this.currentUserId = userData.id || userData.user_id;
        return;
      }

      // Fallback: check auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUserId = user.id;
      }
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
    }
  }

  private setupNotificationSubscription() {
    if (!this.currentUserId) {
      console.log('🚫 No user ID, cannot setup notification subscription');
      return;
    }

    // Prevent duplicate subscriptions
    if (this.subscription) {
      console.log('⚠️ Subscription already exists, cleaning up first');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    console.log('🔗 Setting up notification subscription for user:', this.currentUserId);

    // Subscribe to new notifications for current user
    this.subscription = supabase
      .channel(`user_notifications_${this.currentUserId}`) // Unique channel name per user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `recipient_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          console.log('📬 New notification received:', payload);
          this.showNotificationToUser(payload.new);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0; // Reset on successful connection
          this.consecutiveFailures = 0; // Reset consecutive failures
          console.log('✅ Notification subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Notification subscription error:', err);
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.error(`❌ Too many consecutive failures (${this.consecutiveFailures}). Stopping reconnection.`);
            return;
          }
          this.handleReconnection();
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Notification channel closed');
          this.consecutiveFailures++;
          // Only reconnect if we didn't manually close it and haven't failed too many times
          if (this.subscription && this.consecutiveFailures < this.maxConsecutiveFailures) {
            this.handleReconnection();
          } else if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.error(`❌ Too many consecutive failures (${this.consecutiveFailures}). Stopping reconnection.`);
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Notification subscription timed out');
          this.handleReconnection();
        }
      });
  }

  private handleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached for NotificationListener. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter to prevent thundering herd
    const exponentialDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000; // Add up to 1 second random jitter
    const delay = exponentialDelay + jitter;

    console.log(`🔄 Reconnecting NotificationListener ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Clean up old subscription first
        if (this.subscription) {
          await supabase.removeChannel(this.subscription);
          this.subscription = null;
        }
        
        // Verify user ID is still valid before reconnecting
        await this.getCurrentUserId();
        if (!this.currentUserId) {
          console.error('❌ No valid user ID, stopping reconnection');
          return;
        }
        
        this.setupNotificationSubscription();
      } catch (error) {
        console.error('❌ Reconnection attempt failed:', error);
        // Only retry if we haven't hit max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
      }
    }, delay);
  }

  private showNotificationToUser(notification: any) {
    try {
      console.log('📱 Showing notification to recipient (User ID: ' + this.currentUserId + '):', notification);

      // Only show if this notification is actually for the current user
      if (notification.recipient_id !== this.currentUserId) {
        console.log('🚫 Notification not for current user, skipping');
        return;
      }

      PushNotification.localNotification({
        channelId: "user-notifications",
        title: notification.title || 'New Message',
        message: notification.description || 'You have a new notification',
        playSound: true,
        soundName: 'default',
        vibrate: true,
        importance: 'high',
        priority: 'high',
        autoCancel: true,
        largeIcon: "ic_launcher",
        smallIcon: "ic_notification",
        bigText: notification.description,
        subText: `YashRoadlines - ${new Date().toLocaleTimeString()}`,
        color: '#2196F3',
        userInfo: {
          notificationId: notification.id,
          type: notification.type,
          timestamp: Date.now(),
        },
      });

      console.log('✅ Notification shown to recipient');
    } catch (error) {
      console.error('❌ Error showing notification to user:', error);
    }
  }

  async updateUserId(newUserId: string) {
    if (this.currentUserId === newUserId) {
      return; // No change needed
    }

    // Cleanup old subscription
    this.cleanup();

    // Set new user and reinitialize
    this.currentUserId = newUserId;
    this.setupNotificationSubscription();
    
    console.log('✅ Notification listener updated for new user:', newUserId);
  }

  cleanup() {
    console.log('🧹 Cleaning up NotificationListener...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.subscription) {
      const channelToRemove = this.subscription;
      this.subscription = null; // Clear reference first to prevent reconnection
      supabase.removeChannel(channelToRemove);
      this.reconnectAttempts = 0;
      this.consecutiveFailures = 0;
      console.log('✅ Notification subscription cleaned up');
    }
  }
}

export default NotificationListener;