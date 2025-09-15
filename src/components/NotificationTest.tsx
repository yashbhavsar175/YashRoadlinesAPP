// NotificationTest.tsx - Component to test notification system
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import NotificationService from '../services/NotificationService';

export const NotificationTest: React.FC = () => {
  const testNotification = async () => {
    try {
      console.log('🧪 Testing notification system...');
      
      // Initialize service first
      await NotificationService.initialize();
      
      // Send a test notification
      const result = await NotificationService.sendAdminNotification({
        title: '🧪 Test Notification',
        message: 'This is a test notification to verify the system is working',
        type: 'system',
        severity: 'info',
        metadata: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (result) {
        Alert.alert('Success', 'Test notification sent successfully!');
        console.log('✅ Test notification result:', result);
      } else {
        Alert.alert('Error', 'Failed to send test notification');
        console.log('❌ Test notification failed');
      }
    } catch (error) {
      console.error('❌ Test notification error:', error);
      Alert.alert('Error', `Test failed: ${error}`);
    }
  };

  const checkUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      Alert.alert('Unread Count', `You have ${count} unread notifications`);
      console.log('📊 Unread count:', count);
    } catch (error) {
      console.error('❌ Error checking unread count:', error);
      Alert.alert('Error', `Failed to check unread count: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification System Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testNotification}>
        <Text style={styles.buttonText}>Send Test Notification</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={checkUnreadCount}>
        <Text style={styles.buttonText}>Check Unread Count</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});