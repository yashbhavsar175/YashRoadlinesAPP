import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { saveLeaveCashRecord } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';

const LeaveCashSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expectedAmount, setExpectedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (message: string) => {
    Alert.alert('Info', message);
  };

  const handleSetCashAmount = async () => {
    if (!expectedAmount.trim()) {
      showAlert('Please enter expected cash amount');
      return;
    }

    const amount = parseFloat(expectedAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }

    Alert.alert(
      'Confirm Cash Amount',
      `Set expected cash amount: ₹${amount.toFixed(2)}\n\nNotes: ${notes || 'None'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await saveLeaveCashRecord({
                expected_amount: amount,
                notes: notes.trim(),
                setup_time: new Date().toISOString(),
                status: 'pending_verification',
                admin_id: 'admin', // Will be replaced with actual admin ID
              });

              showAlert('Cash amount set successfully!');
              setExpectedAmount('');
              setNotes('');
              
              // Navigate to verification screen
              navigation.navigate('CashVerificationScreen' as never);
            } catch (error) {
              console.error('Error setting cash amount:', error);
              showAlert('Failed to set cash amount. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Cash Setup</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentHeader}>
            <Text style={styles.title}>💰 Leave with Cash Setup</Text>
            <Text style={styles.subtitle}>Set expected cash amount when leaving office</Text>
          </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Cash Amount *</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={expectedAmount}
                onChangeText={setExpectedAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about the cash..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 Instructions:</Text>
            <Text style={styles.infoText}>
              • Enter the exact cash amount you expect to receive{'\n'}
              • This will be used for verification later{'\n'}
              • Make sure the amount is accurate{'\n'}
              • You can add notes for reference
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.setupButton, loading && styles.disabledButton]}
            onPress={handleSetCashAmount}
            disabled={loading}
          >
            <Text style={styles.setupButtonText}>
              {loading ? 'Setting up...' : '✅ Set Cash Amount'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewHistoryButton}
            onPress={() => navigation.navigate('CashHistoryScreen' as never)}
          >
            <Text style={styles.viewHistoryText}>📊 View Cash History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 + 10 : 50,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginRight: 40, // To center properly with back button
  },
  headerRight: {
    width: 40, // Same width as back button for balance
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  contentHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2d5a3d',
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewHistoryButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  viewHistoryText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LeaveCashSetupScreen;