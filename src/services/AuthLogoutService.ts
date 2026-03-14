// AuthLogoutService.ts - Handle real-time logout notifications
import { supabase } from '../supabase';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogoutNotification {
  user_id: string;
  action: string;
  timestamp: number;
}

class AuthLogoutService {
  private static instance: AuthLogoutService;
  private isListening = false;
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: number | null = null;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  private constructor() {}

  static getInstance(): AuthLogoutService {
    if (!AuthLogoutService.instance) {
      AuthLogoutService.instance = new AuthLogoutService();
    }
    return AuthLogoutService.instance;
  }

  async initialize() {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;

      if (this.currentUserId && !this.isListening) {
        this.startListening();
      }
    } catch (error) {
      // Silent error handling
    }
  }

  private channel: any = null;

  private startListening() {
    if (this.isListening || this.channel) {
      return;
    }

    // Listen for auth events that affect current user
    this.channel = supabase
      .channel(`auth_events_${this.currentUserId}`) // Unique channel name per user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auth_events',
          filter: `user_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          this.handleAuthEvent(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isListening = true;
          this.reconnectAttempts = 0; // Reset on successful connection          // console.log('✅ AuthLogoutService: Subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          this.isListening = false;
          this.handleReconnection(); // console.log('⚠️ AuthLogoutService: Channel error');
        } else if (status === 'CLOSED') {
          this.isListening = false;
          // Only reconnect if we didn't manually close it
          if (this.channel) {
            this.handleReconnection();
          }
        } else if (status === 'TIMED_OUT') {
          this.isListening = false;
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
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000;
    const delay = exponentialDelay + jitter;
    // console.log(`🔄 Reconnecting AuthLogoutService ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Clean up old channel first
        if (this.channel) {
          await supabase.removeChannel(this.channel);
          this.channel = null;
        }
        
        // Verify user is still authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== this.currentUserId) {
          return;
        }
        
        this.startListening();
      } catch (error) {
        // Only retry if we haven't hit max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
      }
    }, delay);
  }

  private handleAuthEvent(payload: any) {
    // Handle auth events from database
    const eventData = payload.new;
    if (eventData && eventData.user_id === this.currentUserId) {
      if (eventData.event_type === 'forced_logout') {
        const details = eventData.details || {};
        let reason = 'You have been logged out by an administrator';
        
        if (details.reason === 'password_changed_by_admin') {
          reason = 'Your password has been changed by an administrator. Please log in with your new password.';
        }
        
        this.forceLogout(reason);
      }
    }
  }

  private handleLogoutNotification(notification: LogoutNotification) {
    if (notification.user_id === this.currentUserId) {
      let reason = 'You have been logged out';
      if (notification.action === 'password_changed') {
        reason = 'Your password has been changed by an administrator. Please log in with your new password.';
      }
      
      this.forceLogout(reason);
    }
  }

  private async forceLogout(reason: string) {
    try {
      // Show alert to user
      Alert.alert(
        'Session Ended',
        reason,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Clear local storage
              await AsyncStorage.clear();
              
              // Sign out from Supabase
              await supabase.auth.signOut();
              
              // Navigation will be handled by auth state change
            },
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      // Silent error handling
    }
  }

  async sendLogoutNotification(targetUserId: string, action: string = 'admin_logout') {
    try {
      // Send broadcast notification
      const notification: LogoutNotification = {
        user_id: targetUserId,
        action,
        timestamp: Date.now(),
      };

      await supabase
        .channel('logout_channel')
        .send({
          type: 'broadcast',
          event: 'user_logout',
          payload: notification,
        });
    } catch (error) {
      // Silent error handling
    }
  }

  stop() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.channel) {
      const channelToRemove = this.channel;
      this.channel = null; // Clear reference first to prevent reconnection
      supabase.removeChannel(channelToRemove);
    }
    
    this.isListening = false;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }
}

export default AuthLogoutService;