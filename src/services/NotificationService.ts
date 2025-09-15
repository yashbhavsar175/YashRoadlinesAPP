// NotificationService.ts - Simplified Admin Notification System
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  severity: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  user_name: string;
  user_id: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  title: string;
  message: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  severity?: 'info' | 'warning' | 'success' | 'error';
  metadata?: any;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private currentUser: any = null;
  private readonly ADMIN_EMAIL = 'yashbhavsar175@gmail.com';

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('ℹ️ NotificationService already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing NotificationService...');
      
      // Get current user from AsyncStorage
      const userDataString = await AsyncStorage.getItem('user_profile');
      if (userDataString) {
        this.currentUser = JSON.parse(userDataString);
        console.log('👤 User profile loaded:', {
          name: this.currentUser.name,
          email: this.currentUser.email,
          user_type: this.currentUser.user_type
        });
      } else {
        console.log('⚠️ No user profile found in AsyncStorage');
      }
      
      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
    }
  }

  // Send notification to admin
  async sendAdminNotification(notificationData: NotificationData) {
    try {
      console.log('📤 Attempting to send admin notification...');
      
      // Get current user if not available
      if (!this.currentUser) {
        const userDataString = await AsyncStorage.getItem('user_profile');
        if (userDataString) {
          this.currentUser = JSON.parse(userDataString);
          console.log('👤 Current user loaded from AsyncStorage:', this.currentUser);
        } else {
          console.log('⚠️ No user profile found in AsyncStorage');
        }
      }

      // Don't send notification if current user is admin
      if (this.currentUser?.email === this.ADMIN_EMAIL) {
        console.log('🚫 Skipping notification - current user is admin');
        return;
      }

      const notification = {
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        severity: notificationData.severity || 'info',
        user_name: this.currentUser?.name || 'Unknown User',
        user_id: this.currentUser?.email || 'unknown@email.com',
        metadata: notificationData.metadata || {},
      };

      console.log('📝 Notification data to be saved:', notification);

      // Save notification to database
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving notification:', error);
        console.error('❌ Error details:', error.message, error.details, error.hint);
        return;
      }

      console.log('✅ Notification saved to database:', data);
      
      // Trigger immediate refresh via broadcast
      try {
        await supabase
          .channel('notification-refresh')
          .send({
            type: 'broadcast',
            event: 'new-notification',
            payload: { notification: data }
          });
        console.log('📡 Broadcast sent for immediate refresh');
      } catch (broadcastError) {
        console.error('❌ Broadcast error:', broadcastError);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
    }
  }

  // Get unread notification count
  async getUnreadNotificationCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      return count || 0;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // Get all notifications with pagination
  async getNotifications(limit = 50, offset = 0): Promise<AdminNotification[]> {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return false;
    }
  }

  // Delete notification (permanently remove from database)
  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      return false;
    }
  }

  // Permanently delete notification (if needed)
  async permanentlyDeleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error permanently deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error permanently deleting notification:', error);
      return false;
    }
  }

  // Helper methods for different operation types
  async notifyAdd(category: 'agency_payment' | 'agency_majuri' | 'driver_transaction' | 'fuel_entry' | 'general_entry' | 'agency_entry' | 'uppad_jama' | 'mumbai_delivery', customMessage?: string) {
    const titles = {
      agency_payment: '💳 New Payment Added',
      agency_majuri: '👥 New Majuri Entry',
      driver_transaction: '🚛 New Driver Transaction',
      fuel_entry: '⛽ New Fuel Entry',
      general_entry: '📝 New General Entry',
      agency_entry: '🏢 New Agency Entry',
      uppad_jama: '💰 New Uppad/Jama Entry',
      mumbai_delivery: '🚚 New Mumbai Delivery',
    };

    const message = customMessage || `${this.currentUser?.name || 'User'} added a new ${category.replace('_', ' ')}`;

    await this.sendAdminNotification({
      title: titles[category],
      message,
      type: 'add',
      severity: 'success',
      metadata: { category, action: 'add' }
    });
  }

  async notifyEdit(category: 'agency_payment' | 'agency_majuri' | 'driver_transaction' | 'fuel_entry' | 'general_entry' | 'agency_entry' | 'uppad_jama' | 'mumbai_delivery', customMessage?: string) {
    const titles = {
      agency_payment: '✏️ Payment Updated',
      agency_majuri: '✏️ Majuri Entry Updated',
      driver_transaction: '✏️ Driver Transaction Updated',
      fuel_entry: '✏️ Fuel Entry Updated',
      general_entry: '✏️ General Entry Updated',
      agency_entry: '✏️ Agency Entry Updated',
      uppad_jama: '✏️ Uppad/Jama Updated',
      mumbai_delivery: '✏️ Mumbai Delivery Updated',
    };

    const message = customMessage || `${this.currentUser?.name || 'User'} updated a ${category.replace('_', ' ')}`;

    await this.sendAdminNotification({
      title: titles[category],
      message,
      type: 'edit',
      severity: 'info',
      metadata: { category, action: 'edit' }
    });
  }

  async notifyDelete(category: 'agency_payment' | 'agency_majuri' | 'driver_transaction' | 'fuel_entry' | 'general_entry' | 'agency_entry' | 'uppad_jama' | 'mumbai_delivery', customMessage?: string) {
    const titles = {
      agency_payment: '🗑️ Payment Deleted',
      agency_majuri: '🗑️ Majuri Entry Deleted',
      driver_transaction: '🗑️ Driver Transaction Deleted',
      fuel_entry: '🗑️ Fuel Entry Deleted',
      general_entry: '🗑️ General Entry Deleted',
      agency_entry: '🗑️ Agency Entry Deleted',
      uppad_jama: '🗑️ Uppad/Jama Deleted',
      mumbai_delivery: '🗑️ Mumbai Delivery Deleted',
    };

    const message = customMessage || `${this.currentUser?.name || 'User'} deleted a ${category.replace('_', ' ')}`;

    await this.sendAdminNotification({
      title: titles[category],
      message,
      type: 'delete',
      severity: 'warning',
      metadata: { category, action: 'delete' }
    });
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: AdminNotification) => void) {
    console.log('🔗 Setting up real-time notification subscription...');
    
    const subscription = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          console.log('📬 Real-time notification received:', payload);
          console.log('🔔 Triggering notification callback...');
          callback(payload.new as AdminNotification);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Real-time subscription error:', err);
        } else {
          console.log('✅ Real-time subscription status:', status);
        }
      });

    return subscription;
  }
}

export default NotificationService.getInstance();
