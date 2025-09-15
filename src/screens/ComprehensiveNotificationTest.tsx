// ComprehensiveNotificationTest.tsx - Complete notification testing screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import SupabaseNotificationTester from '../services/SupabaseNotificationTester';
import NotificationFixer from '../services/NotificationFixer';
import DeviceNotificationService from '../services/DeviceNotificationService';
import PushNotificationService from '../services/PushNotificationService';
import NotificationService from '../services/NotificationService';

export default function ComprehensiveNotificationTest({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [fixResults, setFixResults] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    getTokenInfo();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const getTokenInfo = async () => {
    const info = await NotificationFixer.getStoredTokenInfo();
    setTokenInfo(info);
  };

  // Run all fixes
  const runAllFixes = async () => {
    setLoading(true);
    try {
      console.log('🔧 Running all notification fixes...');
      
      const fixes = await NotificationFixer.fixAllNotificationIssues();
      setFixResults(fixes);
      
      const summary = NotificationFixer.getFixSummary();
      
      Alert.alert(
        'Fix Complete!',
        `Fixed: ${summary.successful}/${summary.total} components\n${summary.allFixed ? '✅ All issues fixed!' : '⚠️ Some issues remain'}`,
        [{ text: 'OK' }]
      );
      
      // Refresh token info after fixes
      await getTokenInfo();
      
    } catch (error) {
      Alert.alert('Error', `Fix failed: ${error}`);
    }
    setLoading(false);
  };

  // Run comprehensive tests
  const runAllTests = async () => {
    setLoading(true);
    try {
      console.log('🧪 Running comprehensive notification tests...');
      
      const results = await SupabaseNotificationTester.runCompleteTest();
      setTestResults(results);
      
      const summary = SupabaseNotificationTester.getTestSummary();
      
      Alert.alert(
        'Test Complete!',
        `Passed: ${summary.passed}/${summary.total} tests\n${summary.success ? '✅ All tests passed!' : '❌ Some tests failed'}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
    }
    setLoading(false);
  };

  // Test immediate notification
  const testImmediateNotification = async () => {
    try {
      console.log('📱 Testing immediate notification...');
      
      const success = await NotificationFixer.testImmediateNotification();
      
      if (success) {
        Alert.alert(
          'Test Sent!', 
          'Check your notification panel. If you don\'t see the notification:\n\n' +
          '1. Check notification permissions\n' +
          '2. Check notification channels\n' +
          '3. Ensure app is not in battery optimization'
        );
      } else {
        Alert.alert('Test Failed', 'Could not send test notification');
      }
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
    }
  };

  // Force multiple notifications
  const forceMultipleNotifications = async () => {
    try {
      console.log('💪 Forcing multiple notifications...');
      
      const success = await SupabaseNotificationTester.forceDeviceNotificationTest();
      
      if (success) {
        Alert.alert(
          'Multiple Tests Sent!',
          'Check your notification panel for 3 different test notifications over 6 seconds'
        );
      } else {
        Alert.alert('Test Failed', 'Could not send multiple notifications');
      }
    } catch (error) {
      Alert.alert('Error', `Multiple test failed: ${error}`);
    }
  };

  // Request permissions manually
  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'YashRoadlines needs notification permission to send you updates',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Success!', 'Notification permission granted');
        } else {
          Alert.alert(
            'Permission Denied',
            'Please enable notification permission in Settings > Apps > YashRoadlines > Permissions'
          );
        }
      } else {
        PushNotification.requestPermissions();
        Alert.alert('Requested', 'Permission request sent');
      }
    } catch (error) {
      Alert.alert('Error', `Permission request failed: ${error}`);
    }
  };

  // Test Supabase Edge Function
  const testEdgeFunction = async () => {
    setLoading(true);
    try {
      console.log('🚀 Testing Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_push',
          title: 'Edge Function Test',
          body: 'Testing push notification from Supabase Edge Function',
          target_email: user?.email || 'yashbhavsar175@gmail.com',
          data: { test: true, timestamp: Date.now() }
        }
      });

      if (error) {
        Alert.alert('Edge Function Failed', `Error: ${JSON.stringify(error)}`);
      } else {
        Alert.alert('Edge Function Success!', `Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      Alert.alert('Error', `Edge function test failed: ${error}`);
    }
    setLoading(false);
  };

  // Test complete flow simulation
  const testCompleteFlow = async () => {
    setLoading(true);
    try {
      console.log('🔄 Testing complete notification flow...');
      
      // Simulate adding an entry (what happens in real app)
      await DeviceNotificationService.notifyAdminEntryAdded(
        'Test Entry',
        user?.email || 'Test User',
        {
          type: 'General Entry',
          amount: 5000,
          description: 'Test entry from notification test'
        }
      );
      
      // Also test the notification service
      await NotificationService.sendAdminNotification({
        title: '🧪 Complete Flow Test',
        message: 'Testing the complete notification flow from entry addition',
        type: 'add',
        severity: 'success',
        metadata: { test: true, flow: 'complete' }
      });
      
      Alert.alert(
        'Complete Flow Tested!',
        'Simulated adding an entry. Check:\n\n' +
        '1. Local notifications\n' +
        '2. Admin notifications in database\n' +
        '3. Server push notifications\n' +
        '4. Console logs for detailed info'
      );
      
    } catch (error) {
      Alert.alert('Error', `Complete flow test failed: ${error}`);
    }
    setLoading(false);
  };

  // Open notification settings
  const openNotificationSettings = () => {
    Alert.alert(
      'Notification Settings',
      'To manually check/fix notification settings:\n\n' +
      'Android:\n' +
      '1. Settings > Apps > YashRoadlines\n' +
      '2. Permissions > Notifications\n' +
      '3. Battery > Don\'t optimize\n\n' +
      'Also check notification channels in app settings.'
    );
  };

  // Clear all data and reset
  const clearAndReset = async () => {
    try {
      PushNotification.cancelAllLocalNotifications();
      await AsyncStorage.multiRemove(['fcm_token', 'device_token', 'token_timestamp']);
      setTokenInfo(null);
      setTestResults([]);
      setFixResults([]);
      
      Alert.alert('Cleared', 'All notification data cleared and reset');
    } catch (error) {
      Alert.alert('Error', `Clear failed: ${error}`);
    }
  };

  const renderResults = (results: any[], title: string) => (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTitle}>{title}</Text>
      {results.map((result, index) => (
        <View key={index} style={[styles.resultItem, { backgroundColor: result.success ? '#e8f5e8' : '#fee8e8' }]}>
          <Text style={styles.resultStep}>{result.success ? '✅' : '❌'} {result.step || result.component}</Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.actions && result.actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {result.actions.map((action: string, i: number) => (
                <Text key={i} style={styles.actionText}>• {action}</Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Complete Notification Test</Text>
        <Text style={styles.subtitle}>User: {user?.email || 'Not logged in'}</Text>
        
        {tokenInfo && (
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenText}>Token: {tokenInfo.token}</Text>
            <Text style={styles.tokenText}>Platform: {tokenInfo.platform}</Text>
            <Text style={styles.tokenText}>Time: {tokenInfo.timestamp}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Fix Notification Issues</Text>
        <TouchableOpacity
          style={[styles.button, styles.fixButton]}
          onPress={runAllFixes}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔧 Fix All Issues</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📱 Request Permissions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Notifications</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🧪 Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testImmediateNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📱 Test Immediate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={forceMultipleNotifications}
          disabled={loading}
        >
          <Text style={styles.buttonText}>💪 Force Multiple</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testEdgeFunction}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🚀 Test Edge Function</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testCompleteFlow}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔄 Test Complete Flow</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Utilities</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={openNotificationSettings}
        >
          <Text style={styles.buttonText}>⚙️ Settings Guide</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={clearAndReset}
        >
          <Text style={styles.buttonText}>🧹 Clear & Reset</Text>
        </TouchableOpacity>
      </View>

      {fixResults.length > 0 && renderResults(fixResults, '🔧 Fix Results')}
      {testResults.length > 0 && renderResults(testResults, '🧪 Test Results')}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          If notifications still don't work after running fixes and tests, 
          check device notification settings and battery optimization.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  tokenInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    width: '100%',
  },
  tokenText: {
    color: '#fff',
    fontSize: 12,
    marginVertical: 2,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  fixButton: {
    backgroundColor: '#4CAF50',
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  resultItem: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  resultStep: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#888',
    marginVertical: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});