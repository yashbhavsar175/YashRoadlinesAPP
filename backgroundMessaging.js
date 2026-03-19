/**
 * Background message handler for Firebase Cloud Messaging
 * This file handles notifications when the app is in background or closed.
 * Uses modular Firebase API (v23+).
 */
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

const messagingInstance = getMessaging(getApp());

setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
  console.log('🔔 Background FCM message received:', remoteMessage);

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
      autoCancel: false,
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

export default messagingInstance;
