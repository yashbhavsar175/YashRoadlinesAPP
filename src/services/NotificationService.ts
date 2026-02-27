// NotificationService.ts - Complete notification management with Supabase
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
  deleted?: boolean;
  user_name: string;
  user_id: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  title: string;
  description: string;
  sender_id: string;
  recipient_id: string;
  type: string;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  requires_password: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata: any;
  sent_at: string;
  read_at?: string;
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

export interface UserNotificationData {
  title: string;
  description: string;
  recipient_id: string;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requires_password?: boolean;
  metadata?: any;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private currentUser: any = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get current user from AsyncStorage
      const userDataString = await AsyncStorage.getItem('user_profile');
      if (userDataString) {
        this.currentUser = JSON.parse(userDataString);
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
      // Get current user if not available
      if (!this.currentUser) {
        const userDataString = await AsyncStorage.getItem('user_profile');
        if (userDataString) {
          this.currentUser = JSON.parse(userDataString);
        }
      }

      // Check if current user is admin from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        // Don't send notification if current user is admin
        if (profile?.is_admin === true) {
          console.log('🚫 Current user is admin, skipping notification');
          return;
        }
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

      // Save notification to database
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving notification:', error);
        return;
      }

      console.log('✅ Notification saved to database:', data);
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

  // Soft delete notification (mark as deleted instead of removing)
  // TODO: Add 'deleted' column to admin_notifications table first
  async deleteNotification(notificationId: string) {
    try {
      // Temporarily use hard delete until 'deleted' column is added
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

    // Format detailed edit message with better structure
    let message = customMessage || `${this.currentUser?.name || 'User'} updated a ${category.replace('_', ' ')}`;
    
    // If it's a detailed audit message, format it properly
    if (customMessage && customMessage.includes('Changes:')) {
      message = customMessage.replace(/Changes:/g, '\n📝 Changes Made:\n');
    }

    await this.sendAdminNotification({
      title: titles[category],
      message,
      type: 'edit',
      severity: 'info',
      metadata: { category, action: 'edit', timestamp: new Date().toISOString() }
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

    // Format detailed message with better structure
    let message = customMessage || `${this.currentUser?.name || 'User'} deleted a ${category.replace('_', ' ')}`;
    
    // If it's a detailed audit message, format it properly
    if (customMessage && customMessage.includes('DELETED:')) {
      message = customMessage.replace(/DELETED:/g, '🚨 AUDIT TRAIL:\n📋');
    } else if (customMessage && customMessage.includes('BULK DELETE')) {
      message = customMessage.replace(/BULK DELETE/g, '🚨 BULK DELETE AUDIT:\n📋');
    }

    await this.sendAdminNotification({
      title: titles[category],
      message,
      type: 'delete',
      severity: 'warning',
      metadata: { category, action: 'delete', timestamp: new Date().toISOString() }
    });
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: AdminNotification) => void) {
    const subscription = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          console.log('📬 Real-time notification received:', payload);
          callback(payload.new as AdminNotification);
        }
      )
      .subscribe();

    return subscription;
  }

  // Get notifications for specific user
  async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<AdminNotification[]> {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('target_user_id', userId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error fetching user notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getUserNotifications:', error);
      return [];
    }
  }

  // Get all users who have received notifications
  async getNotificationUsers(): Promise<{ id: string; name: string; email: string }[]> {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('target_user_id, user_name')
        .not('target_user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notification users:', error);
        return [];
      }

      // Remove duplicates and format
      const uniqueUsers = data?.reduce((acc: any[], curr) => {
        if (!acc.find(u => u.id === curr.target_user_id)) {
          acc.push({
            id: curr.target_user_id,
            name: curr.user_name || 'Unknown User',
            email: curr.target_user_id,
          });
        }
        return acc;
      }, []) || [];

      return uniqueUsers;
    } catch (error) {
      console.error('❌ Error in getNotificationUsers:', error);
      return [];
    }
  }

  // Send notification to specific user
  async sendUserNotification(notificationData: UserNotificationData, senderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .insert([{
          title: notificationData.title,
          description: notificationData.description,
          sender_id: senderId,
          recipient_id: notificationData.recipient_id,
          type: notificationData.type || 'general',
          priority: notificationData.priority || 'normal',
          requires_password: notificationData.requires_password !== false,
          metadata: notificationData.metadata || {},
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending user notification:', error);
        return false;
      }

      console.log('✅ User notification sent successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error in sendUserNotification:', error);
      return false;
    }
  }

  // Get notifications for specific user
  async getUserNotificationsByRecipient(recipientId: string, limit = 50): Promise<UserNotification[]> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          *,
          sender:sender_id(name, email),
          recipient:recipient_id(name, email)
        `)
        .eq('recipient_id', recipientId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching user notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getUserNotificationsByRecipient:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error in markNotificationAsRead:', error);
      return false;
    }
  }

  // Get all active users for notification sending
  async getActiveUsers(): Promise<{ id: string; name: string; email: string; role: string }[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('name');

      if (error) {
        console.error('❌ Error fetching active users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getActiveUsers:', error);
      return [];
    }
  }
}

export default NotificationService.getInstance();
