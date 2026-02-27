// AdminNotificationListener.ts - Real-time notification listener for Admin
import { supabase } from '../supabase';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdminNotificationListener {
  private subscription: any = null;
  private isListening = false;
  private shownNotifications = new Set<string>(); // Track shown notifications to prevent duplicates

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
            console.log('✅ Admin notification listener subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Admin notification listener subscription error');
            this.isListening = false;
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

  stop() {
    if (this.subscription) {
      console.log('🛑 Stopping admin notification listener...');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      this.isListening = false;
      console.log('✅ Admin notification listener stopped');
    }
  }

  isActive() {
    return this.isListening;
  }
}

export default new AdminNotificationListener();
