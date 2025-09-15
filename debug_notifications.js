// Add this to any screen to debug notifications
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

// Debug function - call this from any button
const debugNotifications = async () => {
  console.log('🔍 === NOTIFICATION DEBUG START ===');
  
  // Check 1: User profile in AsyncStorage
  try {
    const userProfile = await AsyncStorage.getItem('user_profile');
    console.log('👤 User profile in AsyncStorage:', userProfile);
  } catch (error) {
    console.log('❌ Error reading user profile:', error);
  }
  
  // Check 2: Initialize service
  try {
    await NotificationService.initialize();
    console.log('✅ NotificationService initialized');
  } catch (error) {
    console.log('❌ Error initializing service:', error);
  }
  
  // Check 3: Send test notification
  try {
    const result = await NotificationService.sendAdminNotification({
      title: '🧪 Manual Test',
      message: 'This is a manual test notification',
      type: 'system',
      severity: 'info'
    });
    console.log('📤 Test notification result:', result);
  } catch (error) {
    console.log('❌ Error sending test notification:', error);
  }
  
  // Check 4: Get unread count
  try {
    const count = await NotificationService.getUnreadNotificationCount();
    console.log('📊 Unread count:', count);
  } catch (error) {
    console.log('❌ Error getting unread count:', error);
  }
  
  console.log('🔍 === NOTIFICATION DEBUG END ===');
};

// Call this function: debugNotifications();