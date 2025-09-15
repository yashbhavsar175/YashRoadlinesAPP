/**
 * Background message handler for Firebase Cloud Messaging
 * This file handles notifications when the app is in background or closed
 */
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Background message handler (app closed/background)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔔 Background FCM message received:', remoteMessage);
  
  // Show local notification for background messages
  if (remoteMessage.notification) {
    PushNotification.localNotification({
      channelId: 'admin-notifications',
      title: remoteMessage.notification.title || 'YashRoadlines',
      message: remoteMessage.notification.body || 'New notification',
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      vibrate: true,
      autoCancel: false, // Keep until user dismisses
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: remoteMessage.notification.body,
      subText: `YashRoadlines - ${new Date().toLocaleTimeString()}`,
      color: '#2196F3',
      group: 'admin-notifications',
      when: Date.now(),
      userInfo: {
        ...remoteMessage.data,
        remote: true,
        timestamp: Date.now(),
      },
    });
  }
});

export default messaging;