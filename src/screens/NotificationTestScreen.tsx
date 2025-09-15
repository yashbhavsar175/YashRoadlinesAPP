import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import { supabase } from '../supabase';
import PushGateway from '../services/PushGateway';

export default function NotificationTestScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const sendTestNotification = () => {
    console.log('📱 Sending local notification...');
    PushNotification.localNotification({
      channelId: 'admin-notifications',
      title: 'Local Test Notification',
      message: 'This is a local notification (only works when app is running)',
      smallIcon: 'ic_launcher',
      importance: 'high',
      priority: 'high',
      ignoreInForeground: false,
    });
  };

  const testServerPush = async () => {
    setLoading(true);
    try {
      console.log('📡 Testing server push...');
      const result = await PushGateway.sendPushToAdmin({
        title: 'Server Push Test',
        body: 'This should appear in status bar even when app is closed!',
        data: { test: true, timestamp: Date.now() },
      });
      
      if (result.ok) {
        Alert.alert('Success!', 'Server push sent! Check your status bar and close the app to test.');
      } else {
        Alert.alert('Failed', `Server push failed: ${JSON.stringify(result.error)}`);
      }
    } catch (error) {
      Alert.alert('Error', `Exception: ${error}`);
    }
    setLoading(false);
  };

  const testDirectEdgeFunction = async () => {
    setLoading(true);
    try {
      console.log('🚀 Testing edge function directly...');
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_push',
          title: 'Direct Edge Function Test',
          body: 'Testing FCM directly from edge function!',
          target_email: 'yashbhavsar175@gmail.com',
          data: { direct_test: true }
        }
      });

      if (error) {
        Alert.alert('Failed', `Edge function error: ${JSON.stringify(error)}`);
        console.error('Edge function error:', error);
      } else {
        Alert.alert('Success!', `Edge function result: ${JSON.stringify(data)}`);
        console.log('Edge function success:', data);
      }
    } catch (error) {
      Alert.alert('Error', `Exception: ${error}`);
      console.error('Exception:', error);
    }
    setLoading(false);
  };

  const testEntryAddFlow = async () => {
    setLoading(true);
    try {
      console.log('🧪 [TEST] Testing entry add notification flow...');
      
      // Import DeviceNotificationService here to test the exact same flow
      const DeviceNotificationService = (await import('../services/DeviceNotificationService')).default;
      
      // Simulate the exact call made when adding an entry
      await DeviceNotificationService.notifyAdminEntryAdded(
        'Test General Entry', 
        'Test User', 
        {
          type: 'Income',
          amount: 5000,
          description: 'Test entry from notification test screen',
          agency: 'Test Agency'
        }
      );
      
      Alert.alert('Test Complete!', 'Entry add notification flow tested. Check logs and status bar!');
    } catch (error) {
      Alert.alert('Error', `Entry add test failed: ${error}`);
      console.error('❌ [TEST] Entry add test error:', error);
    }
    setLoading(false);
  };

  const checkSecrets = async () => {
    try {
      console.log('🔍 Checking if secrets are configured...');
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_push',
          title: 'Config Test',
          body: 'Testing if secrets are configured',
          target_email: 'test@example.com', // Dummy email
        }
      });

      if (error) {
        console.error('Secrets check error:', error);
        if (error.message?.includes('FIREBASE_SA_JSON')) {
          Alert.alert('Missing Secret', 'FIREBASE_SA_JSON secret not configured in Supabase!\n\nGo to: Dashboard → Project → Settings → Secrets');
        } else if (error.message?.includes('SERVICE_ROLE_KEY')) {
          Alert.alert('Missing Secret', 'SERVICE_ROLE_KEY secret not configured in Supabase!');
        } else {
          Alert.alert('Error', `Function error: ${JSON.stringify(error)}`);
        }
      } else {
        Alert.alert('Config OK', 'Supabase secrets appear to be configured correctly!');
      }
    } catch (error) {
      Alert.alert('Error', `Exception: ${error}`);
      console.error('Exception:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notification Test</Text>
        <Text style={styles.subtitle}>
          User: {user?.email || 'Not logged in'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Check Configuration</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={checkSecrets}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            🔍 Check Supabase Secrets
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Test Server Push (Status Bar)</Text>
        <Text style={styles.description}>
          These should appear in status bar even when app is closed
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testServerPush}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            📡 Test Server Push (PushGateway)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testDirectEdgeFunction}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            🚀 Test Direct Edge Function
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Test Entry Add Flow</Text>
        <Text style={styles.description}>
          This simulates exactly what happens when you add an entry
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9800' }]}
          onPress={testEntryAddFlow}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            📝 Test Entry Add Notification
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Test Local Notification</Text>
        <Text style={styles.description}>
          This only works when app is running (in-app notification)
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={sendTestNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            📱 Test Local Notification
          </Text>
        </TouchableOpacity>
      </View>

      {navigation && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#666',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
