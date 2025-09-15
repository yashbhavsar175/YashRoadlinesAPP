import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import { supabase } from '../supabase';
import PushNotification from 'react-native-push-notification';

const PushDiagnosticsScreen = ({ navigation }: any) => {
  const [currentToken, setCurrentToken] = useState<string>('');
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testMessage, setTestMessage] = useState('Hello from diagnostics!');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Get current FCM token
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
        setCurrentToken(token.token || 'No token');
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: false, // we handle this separately
    });

    loadTokenCount();
  }, []);

  const loadTokenCount = async () => {
    try {
      const { count, error } = await supabase
        .from('device_tokens')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error loading token count:', error);
      } else {
        setTokenCount(count || 0);
      }
    } catch (err) {
      console.error('Token count error:', err);
    }
  };

  const sendTestPush = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_push',
          title: testTitle,
          body: testMessage,
          target_email: 'yashbhavsar175@gmail.com', // admin email
        },
      });

      if (error) {
        Alert.alert('Error', `Failed to send push: ${error.message}`);
      } else {
        Alert.alert('Success', `Push sent! Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      Alert.alert('Error', `Exception: ${err}`);
    } finally {
      setIsSending(false);
    }
  };

  const sendLocalNotification = () => {
    PushNotification.localNotification({
      channelId: 'admin-notifications',
      title: testTitle,
      message: testMessage,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      vibrate: true,
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_launcher',
      bigText: testMessage,
      subText: 'Push Diagnostics • Test',
      color: '#2196F3',
      group: 'admin-notifications',
    });
    Alert.alert('Local Notification', 'Local notification sent!');
  };

  const registerToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'register_token',
          token: currentToken,
          platform: 'android',
        },
      });

      if (error) {
        Alert.alert('Error', `Failed to register token: ${error.message}`);
      } else {
        Alert.alert('Success', 'Token registered successfully!');
        loadTokenCount(); // refresh count
      }
    } catch (err) {
      Alert.alert('Error', `Exception: ${err}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Push Diagnostics</Text>
        <Text style={styles.subtitle}>Debug push notifications</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Device Token</Text>
        <Text style={styles.tokenText} selectable>
          {currentToken || 'Loading...'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={registerToken}>
          <Text style={styles.buttonText}>Register Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Database Info</Text>
        <Text style={styles.infoText}>Registered Tokens: {tokenCount}</Text>
        <TouchableOpacity style={styles.button} onPress={loadTokenCount}>
          <Text style={styles.buttonText}>Refresh Count</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Notifications</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Notification Title"
          value={testTitle}
          onChangeText={setTestTitle}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Notification Message"
          value={testMessage}
          onChangeText={setTestMessage}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={sendLocalNotification}>
          <Text style={styles.buttonText}>Send Local Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={sendTestPush}
          disabled={isSending}
        >
          <Text style={styles.buttonText}>
            {isSending ? 'Sending...' : 'Send Server Push (to Admin)'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Instructions</Text>
        <Text style={styles.instructionText}>
          1. Ensure you're logged in as admin to register token{'\n'}
          2. "Send Local" tests device notifications{'\n'}
          3. "Send Server Push" tests full FCM pipeline{'\n'}
          4. Check device_tokens table in Supabase{'\n'}
          5. Admin receives pushes at: yashbhavsar175@gmail.com
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  infoText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PushDiagnosticsScreen;