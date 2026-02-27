// ActivityNotificationService.ts - Centralized service for all user activity notifications
import NotificationService from './NotificationService';
import PushNotificationService from './PushNotificationService';
import DeviceNotificationService from './DeviceNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActivityData {
  category: string;
  action: 'add' | 'edit' | 'delete';
  details?: string;
  amount?: number;
  date?: string;
  location?: string;
  additionalInfo?: any;
}

class ActivityNotificationService {
  private static instance: ActivityNotificationService;
  private currentUser: any = null;

  private constructor() {}

  static getInstance(): ActivityNotificationService {
    if (!ActivityNotificationService.instance) {
      ActivityNotificationService.instance = new ActivityNotificationService();
    }
    return ActivityNotificationService.instance;
  }

  async initialize() {
    try {
      // Get current user from AsyncStorage
      const userDataString = await AsyncStorage.getItem('user_profile');
      if (userDataString) {
        this.currentUser = JSON.parse(userDataString);
      }
    } catch (error) {
      console.error('❌ Error initializing ActivityNotificationService:', error);
    }
  }

  // Generic method to notify any user activity
  async notifyActivity(activityData: ActivityData) {
    try {
      if (!this.currentUser) {
        await this.initialize();
      }

      const userName = this.currentUser?.name || 'Unknown User';
      const userEmail = this.currentUser?.email || 'unknown@email.com';

      // Create notification title and message
      const { title, message } = this.createNotificationContent(activityData, userName);

      // Send database notification
      await NotificationService.sendAdminNotification({
        title,
        message,
        type: activityData.action,
        severity: this.getSeverity(activityData.action),
        metadata: {
          ...activityData,
          userName,
          userEmail,
          timestamp: new Date().toISOString()
        }
      });

      // Send push notification
      await PushNotificationService.notifyUserAction(
        activityData.action,
        activityData.category,
        userName,
        activityData.details
      );

      // Send device notification (shows in status bar)
      await DeviceNotificationService.sendAdminDeviceNotification({
        title,
        message,
        type: activityData.action,
        screen: activityData.category,
        userName,
        details: activityData
      });

    } catch (error) {
      console.error('❌ Error sending activity notification:', error);
    }
  }

  private createNotificationContent(activityData: ActivityData, userName: string) {
    const { category, action, details, amount, date, location } = activityData;
    
    // Action emojis
    const actionEmojis = {
      add: '➕',
      edit: '✏️',
      delete: '🗑️'
    };

    // Category emojis
    const categoryEmojis: { [key: string]: string } = {
      'Agency Payment': '💳',
      'Agency Majuri': '👥',
      'Driver Transaction': '🚛',
      'Fuel Entry': '⛽',
      'General Entry': '📝',
      'Agency Entry': '🏢',
      'Uppad Jama': '💰',
      'Mumbai Delivery': '🚚',
      'User Profile': '👤',
      'User Registration': '🎉',
      'User Account': '👤'
    };

    const emoji = categoryEmojis[category] || '📋';
    const actionEmoji = actionEmojis[action];
    
    const title = `${actionEmoji} ${category} ${action === 'add' ? 'Added' : action === 'edit' ? 'Updated' : 'Deleted'}`;
    
    let message = `${userName} ${action === 'add' ? 'added' : action === 'edit' ? 'updated' : 'deleted'} ${category.toLowerCase()}`;
    
    // Add additional details
    if (details) {
      message += `: ${details}`;
    } else {
      // Add contextual information
      const additionalInfo = [];
      if (amount) additionalInfo.push(`Amount: ₹${amount}`);
      if (date) additionalInfo.push(`Date: ${date}`);
      if (location) additionalInfo.push(`Location: ${location}`);
      
      if (additionalInfo.length > 0) {
        message += ` (${additionalInfo.join(', ')})`;
      }
    }

    return { title: `${emoji} ${title}`, message };
  }

  private getSeverity(action: 'add' | 'edit' | 'delete'): 'info' | 'warning' | 'success' | 'error' {
    switch (action) {
      case 'add': return 'success';
      case 'edit': return 'info';
      case 'delete': return 'warning';
      default: return 'info';
    }
  }

  // Convenience methods for specific activities
  async notifyAgencyPayment(action: 'add' | 'edit' | 'delete', amount?: number, details?: string) {
    await this.notifyActivity({
      category: 'Agency Payment',
      action,
      amount,
      details
    });
  }

  async notifyAgencyMajuri(action: 'add' | 'edit' | 'delete', details?: string) {
    await this.notifyActivity({
      category: 'Agency Majuri',
      action,
      details
    });
  }

  async notifyDriverTransaction(action: 'add' | 'edit' | 'delete', amount?: number, details?: string) {
    await this.notifyActivity({
      category: 'Driver Transaction',
      action,
      amount,
      details
    });
  }

  async notifyFuelEntry(action: 'add' | 'edit' | 'delete', amount?: number, location?: string, details?: string) {
    await this.notifyActivity({
      category: 'Fuel Entry',
      action,
      amount,
      location,
      details
    });
  }

  async notifyGeneralEntry(action: 'add' | 'edit' | 'delete', details?: string) {
    await this.notifyActivity({
      category: 'General Entry',
      action,
      details
    });
  }

  async notifyAgencyEntry(action: 'add' | 'edit' | 'delete', details?: string) {
    await this.notifyActivity({
      category: 'Agency Entry',
      action,
      details
    });
  }

  async notifyUppadJama(action: 'add' | 'edit' | 'delete', amount?: number, details?: string) {
    await this.notifyActivity({
      category: 'Uppad Jama',
      action,
      amount,
      details
    });
  }

  async notifyMumbaiDelivery(action: 'add' | 'edit' | 'delete', location?: string, details?: string) {
    await this.notifyActivity({
      category: 'Mumbai Delivery',
      action,
      location,
      details
    });
  }

  // Update current user info
  async updateCurrentUser() {
    await this.initialize();
  }
}

export default ActivityNotificationService.getInstance();