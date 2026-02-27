// AdminNotificationListener.ts - Real-time notification listener for Admin
import { supabase } from '../supabase';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdminNotificationListener {
  private subscription: any = null;
  private isListening = false;
  private shownNotifications = new Set<string>(); // Track shown notifications to prevent duplicates
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private baseReconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  async start() {
    if (this.isListening) {
      console.log('👂 Admin notification listener already running');
      return;
    }

    try {
      // Check if current user is admin from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ No authenticated user, skipping notification listener');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !profile?.is_admin) {
        console.log('⚠️ Not admin user, skipping notification listener');
        return;
      }

      console.log('👂 Starting admin notification listener for:', user.email);

      // Subscribe to new notifications in real-time
      this.subscription = supabase
        .channel('admin-notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications',
          },
          (payload) => {
            console.log('🔔 New notification received via realtime:', payload.new);
            this.showLocalNotification(payload.new);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isListening = true;
            this.reconnectAttempts = 0; // Reset on successful connection
            console.log('✅ Admin notification listener subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Admin notification listener subscription error');
            this.isListening = false;
            this.handleReconnection();
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Admin notification channel closed');
            this.isListening = false;
            this.handleReconnection();
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ Admin notification subscription timed out');
            this.isListening = false;
            this.handleReconnection();
          }
        });

    } catch (error) {
      console.error('❌ Error starting admin notification listener:', error);
    }
  }

  private showLocalNotification(notification: any) {
    try {
      const title = notification.title || '';
      
      // Skip database trigger notifications by title pattern
      const triggerTitles = ['💳 New Payment Added', '🗑️ General Entry Deleted', '✏️ Entry Updated'];
      if (triggerTitles.some(t => title.includes(t) || title.startsWith('💳') || title.startsWith('🗑️') || title.startsWith('✏️'))) {
        console.log('⏭️ Skipping database trigger notification:', title);
        return;
      }
      
      // Prevent duplicate notifications
      const notificationKey = `${notification.id}_${notification.created_at}`;
      if (this.shownNotifications.has(notificationKey)) {
        console.log('⏭️ Skipping duplicate notification:', notification.id);
        return;
      }
      this.shownNotifications.add(notificationKey);
      
      console.log('📱 Showing local notification for admin:', title);
      
      // Force notification to show even in foreground
      PushNotification.localNotification({
        channelId: 'admin-notifications',
        id: notification.id || Math.floor(Math.random() * 1000000).toString(),
        title: notification.title || 'New Activity',
        message: notification.message || 'A user performed an action',
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_launcher',
        bigText: notification.message,
        subText: notification.user_name || 'User Activity',
        color: '#2196F3',
        group: 'admin-notifications',
        ongoing: false,
        invokeApp: false, // Changed to false so it shows in status bar
        when: Date.now(),
        usesChronometer: false,
        visibility: 'public', // Make notification visible on lock screen
        ignoreInForeground: false, // Force show in foreground
        userInfo: {
          notificationId: notification.id,
          type: notification.type,
          severity: notification.severity
        }
      });

      console.log('✅ Local notification shown successfully');
    } catch (error) {
      console.error('❌ Error showing local notification:', error);
    }
  }

  private handleReconnection() {
    // Clear any existing reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: delay = baseDelay * 2^(attempts-1)
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Clean up old subscription
        if (this.subscription) {
          await supabase.removeChannel(this.subscription);
          this.subscription = null;
        }
        
        // Attempt to restart
        this.isListening = false;
        await this.start();
      } catch (error) {
        console.error('❌ Reconnection attempt failed:', error);
        this.handleReconnection(); // Try again
      }
    }, delay);
  }

  stop() {
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.subscription) {
      console.log('🛑 Stopping admin notification listener...');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      this.isListening = false;
      this.reconnectAttempts = 0;
      console.log('✅ Admin notification listener stopped');
    }
  }

  isActive() {
    return this.isListening;
  }

  // Manual reconnect method for external use
  async reconnect() {
    console.log('🔄 Manual reconnection requested...');
    this.reconnectAttempts = 0;
    await this.stop();
    await this.start();
  }
}

export default new AdminNotificationListener();
