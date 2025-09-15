// NotificationTestHelper.ts - Quick testing utility for notification system
import NotificationService from './NotificationService';

export class NotificationTestHelper {
  /**
   * Test notification system with sample data
   */
  static async runTests() {
    console.log('🧪 Starting Notification System Tests...');
    
    try {
      // Test 1: Send sample notifications
      await NotificationService.notifyAdd('agency_payment', 'Test payment entry: ₹5000 for Test Agency');
      console.log('✅ Test 1: Add notification sent');
      
      await NotificationService.notifyEdit('fuel_entry', 'Test fuel entry updated: ₹3000 Diesel');
      console.log('✅ Test 2: Edit notification sent');
      
      await NotificationService.notifyDelete('general_entry', 'Test general entry deleted: ₹2000');
      console.log('✅ Test 3: Delete notification sent');
      
      // Test 2: Check notification count
      const notifications = await NotificationService.getNotifications();
      console.log(`✅ Test 4: Retrieved ${notifications.length} notifications`);
      
      // Test 3: Check unread count
      const unreadNotifications = notifications.filter(n => !n.is_read);
      console.log(`✅ Test 5: Unread count: ${unreadNotifications.length}`);
      
      console.log('🎉 All notification tests completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Notification test failed:', error);
      return false;
    }
  }
  
  /**
   * Create bulk test notifications for UI testing
   */
  static async createBulkTestData() {
    console.log('📦 Creating bulk test notifications...');
    
    const testNotifications = [
      { type: 'agency_payment', message: 'Payment received: ₹15000 from ABC Logistics' },
      { type: 'fuel_entry', message: 'Fuel entry: ₹8000 Diesel for MH12AB1234' },
      { type: 'agency_majuri', message: 'Majuri entry: ₹12000 for XYZ Transport' },
      { type: 'mumbai_delivery', message: 'Mumbai delivery: ₹25000 - Electronics shipment' },
      { type: 'general_entry', message: 'Office expense: ₹3500 - Stationary and supplies' },
      { type: 'driver_transaction', message: 'Driver advance: ₹5000 to Rajesh Kumar' },
      { type: 'uppad_jama', message: 'Uppad jama entry: ₹18000 collection' },
      { type: 'agency_entry', message: 'Agency entry: ₹22000 from PQR Movers' }
    ];
    
    try {
      for (const notification of testNotifications) {
        await NotificationService.notifyAdd(
          notification.type as any, 
          notification.message
        );
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Created ${testNotifications.length} test notifications`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to create bulk test data:', error);
      return false;
    }
  }
  
  /**
   * Clean up test notifications
   */
  static async cleanupTestData() {
    console.log('🧹 Cleaning up test notifications...');
    
    try {
      const notifications = await NotificationService.getNotifications();
      const testNotifications = notifications.filter(n => 
        n.message.includes('Test') || 
        n.message.includes('test') ||
        n.user_name === 'Test User'
      );
      
      for (const notification of testNotifications) {
        await NotificationService.deleteNotification(notification.id);
      }
      
      console.log(`✅ Cleaned up ${testNotifications.length} test notifications`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error);
      return false;
    }
  }
}

// Usage examples:
// await NotificationTestHelper.runTests();
// await NotificationTestHelper.createBulkTestData();
// await NotificationTestHelper.cleanupTestData();
