// Quick test script to verify notification system
// You can call this from any screen to test notifications

import NotificationService from '../services/NotificationService';

export const testNotificationSystem = async () => {
  try {
    console.log('🧪 Testing notification system...');
    
    // Test 1: Add notification
    await NotificationService.notifyAdd('fuel_entry', 'Test notification: ₹5000 fuel entry for MH12AB1234');
    console.log('✅ Test 1: Add notification sent');
    
    // Test 2: Edit notification  
    await NotificationService.notifyEdit('agency_majuri', 'Test notification: Updated majuri entry for ABC Transport');
    console.log('✅ Test 2: Edit notification sent');
    
    // Test 3: Delete notification
    await NotificationService.notifyDelete('general_entry', 'Test notification: Deleted office expense entry');
    console.log('✅ Test 3: Delete notification sent');
    
    // Test 4: Get notification count
    const count = await NotificationService.getUnreadNotificationCount();
    console.log(`✅ Test 4: Current unread count: ${count}`);
    
    console.log('🎉 Notification system test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Notification test failed:', error);
    return false;
  }
};

// Usage: Add this to any screen and call it
// import { testNotificationSystem } from '../utils/testNotifications';
// await testNotificationSystem();
