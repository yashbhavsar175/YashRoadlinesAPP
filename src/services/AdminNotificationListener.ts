// AdminNotificationListener.ts - Real-time notification listener for Admin
// ⚠️ IMPORTANT: This listener is ONLY for in-app UI updates (badge count, notification list refresh)
// It does NOT show push notifications - those are handled by FCM via AdminEntryNotificationService
import { supabase } from '../supabase';

class AdminNotificationListener {
  private subscription: any = null;
  private isListening = false;
  private shownNotifications = new Set<string>(); // Track shown notifications to prevent duplicates
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
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
            console.log('🔔 Realtime DB insert detected:', payload.new?.title);
            console.log('ℹ️  FCM push already sent by AdminEntryNotificationService');
            console.log('ℹ️  This listener is for in-app UI updates only');
            
            // Track notification to prevent duplicates
            this.showLocalNotification(payload.new);
            
            // If you need to update UI (badge count, notification list), do it here
            // Example: EventEmitter.emit('newNotification', payload.new);
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
      
      // Prevent duplicate notifications
      const notificationKey = `${notification.id}_${notification.created_at}`;
      if (this.shownNotifications.has(notificationKey)) {
        console.log('⏭️ Skipping duplicate notification:', notification.id);
        return;
      }
      this.shownNotifications.add(notificationKey);
      
      // ✅ CRITICAL FIX: Don't show local notification here!
      // FCM push notification is already sent by AdminEntryNotificationService
      // This realtime listener is ONLY for in-app UI updates (badge count, notification list refresh)
      // Showing local notification here causes DUPLICATE notifications
      
      console.log('📱 Realtime notification received from DB:', title);
      console.log('✅ FCM push already handled by AdminEntryNotificationService');
      console.log('ℹ️  This listener is for in-app UI updates only (not push notifications)');
      
      // If you have a callback for UI updates (badge count, notification list), call it here
      // Example: this.onNewNotification?.(notification);
      
      // DO NOT show local notification - it duplicates the FCM push
      // PushNotification.localNotification({ ... }); // ❌ REMOVED - causes duplicates
      
    } catch (error) {
      console.error('❌ Error in showLocalNotification:', error);
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
    this.stop();
    await this.start();
  }
}

export default new AdminNotificationListener();
