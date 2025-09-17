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
      console.error('🔴 AuthLogoutService: Failed to initialize:', error);
    }
  }

  private startListening() {
    if (this.isListening) return;

    console.log('🔐 AuthLogoutService: Starting logout notification listener');

    // Listen for auth events that affect current user
    const channel = supabase
      .channel('auth_events_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auth_events',
          filter: `user_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          console.log('🔐 AuthLogoutService: Received auth event:', payload);
          this.handleAuthEvent(payload);
        }
      )
      .subscribe();

    this.isListening = true;
  }

  private handleAuthEvent(payload: any) {
    // Handle auth events from database
    const eventData = payload.new;
    if (eventData && eventData.user_id === this.currentUserId) {
      console.log('🔐 AuthLogoutService: Processing auth event:', eventData);
      
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
      console.log('🔐 AuthLogoutService: Force logout triggered for current user');
      
      let reason = 'You have been logged out';
      if (notification.action === 'password_changed') {
        reason = 'Your password has been changed by an administrator. Please log in with your new password.';
      }
      
      this.forceLogout(reason);
    }
  }

  private async forceLogout(reason: string) {
    try {
      console.log('🔐 AuthLogoutService: Forcing logout -', reason);

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
      console.error('🔴 AuthLogoutService: Error during force logout:', error);
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

      console.log('🔐 AuthLogoutService: Logout notification sent for user:', targetUserId);
    } catch (error) {
      console.error('🔴 AuthLogoutService: Failed to send logout notification:', error);
    }
  }

  stop() {
    this.isListening = false;
    this.currentUserId = null;
    console.log('🔐 AuthLogoutService: Stopped listening');
  }
}

export default AuthLogoutService;