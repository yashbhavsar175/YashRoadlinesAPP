import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPendingCashRecord, verifyCashAmount, CashRecord, deleteCashRecord, checkCashVerificationAccess } from '../data/Storage';
import NotificationService from '../services/NotificationService';
import Icon from 'react-native-vector-icons/Ionicons';

const CashVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [actualAmount, setActualAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<CashRecord | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = checking, false = denied, true = allowed

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const access = await checkCashVerificationAccess();
      setHasAccess(access);
      
      if (access) {
        loadPendingCashRecord();
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    loadPendingCashRecord();
  }, []);

  const loadPendingCashRecord = async () => {
    try {
      const record = await getPendingCashRecord();
      setCurrentRecord(record);
    } catch (error) {
      console.error('Error loading cash record:', error);
    }
  };

  const handleVerifyCash = async () => {
    if (!actualAmount.trim()) {
      Alert.alert('Error', 'Please enter the actual cash amount received');
      return;
    }

    if (!currentRecord) {
      Alert.alert('Error', 'No pending cash record found');
      return;
    }

    const amount = parseFloat(actualAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const expectedAmount = currentRecord.expected_amount;
    const isCorrect = amount === expectedAmount;
    const difference = amount - expectedAmount;

    let alertTitle = isCorrect ? '✅ Cash Verified Successfully!' : '⚠️ Cash Amount Mismatch!';
    let alertMessage = `Expected: ₹${expectedAmount.toFixed(2)}\nActual: ₹${amount.toFixed(2)}`;
    
    if (!isCorrect) {
      const diffText = difference > 0 ? `+₹${difference.toFixed(2)} Extra` : `₹${Math.abs(difference).toFixed(2)} Short`;
      alertMessage += `\nDifference: ${diffText}`;
    }

    Alert.alert(
      alertTitle,
      alertMessage + '\n\nSave this verification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setLoading(true);
            try {
              // Verify cash amount using storage function
              const result = await verifyCashAmount(currentRecord.id, amount);

              // Send detailed notification
              await sendCashVerificationNotification(currentRecord, amount, result.isCorrect, result.difference);

              Alert.alert(
                'Verification Saved',
                result.isCorrect 
                  ? 'Cash amount verified successfully! ✅' 
                  : `Cash verification completed. Mismatch recorded: ${result.difference > 0 ? '+' : ''}₹${result.difference.toFixed(2)} ⚠️`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setActualAmount('');
                      navigation.goBack();
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Error saving verification:', error);
              Alert.alert('Error', 'Failed to save verification. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRevokeCashRecord = async () => {
    if (!currentRecord) return;

    Alert.alert(
      'Revoke Cash Entry',
      'Are you sure you want to revoke this cash entry? This action cannot be undone and will remove all verification data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteCashRecord(currentRecord.id);
              
              // Send revocation notification
              await NotificationService.notifyAdd(
                'general_entry',
                `🗑️ CASH ENTRY REVOKED\n💰 Amount: ₹${currentRecord.expected_amount.toFixed(2)}\n⏰ Revoked at: ${new Date().toLocaleString()}\n👤 Admin Action: Entry deleted\n📝 Original Notes: ${currentRecord.notes || 'None'}`
              );

              Alert.alert(
                'Entry Revoked',
                'Cash entry has been successfully revoked.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.navigate('HomeScreen' as never);
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error revoking entry:', error);
              Alert.alert('Error', 'Failed to revoke entry. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const sendCashVerificationNotification = async (record: CashRecord, actualAmount: number, isCorrect: boolean, difference: number) => {
    try {
      const timestamp = new Date().toLocaleString();
      
      if (isCorrect) {
        // Success notification
        const successMessage = `✅ CASH VERIFIED SUCCESSFULLY\n💰 Amount: ₹${actualAmount.toFixed(2)}\n⏰ Verified at: ${timestamp}\n📝 Notes: ${record.notes || 'None'}\n✨ Status: Perfect Match!`;
        
        await NotificationService.notifyAdd(
          'general_entry',
          successMessage
        );
      } else {
        // Mismatch notification with detailed audit trail
        const status = difference > 0 ? 'EXCESS CASH' : 'SHORT CASH';
        const diffAmount = Math.abs(difference);
        
        const mismatchMessage = `⚠️ CASH VERIFICATION MISMATCH\n📊 Expected: ₹${record.expected_amount.toFixed(2)}\n💰 Actual: ₹${actualAmount.toFixed(2)}\n❌ Difference: ${difference > 0 ? '+' : '-'}₹${diffAmount.toFixed(2)}\n🚨 Status: ${status}\n⏰ Verified at: ${timestamp}\n📝 Notes: ${record.notes || 'None'}\n🔍 AUDIT REQUIRED!`;
        
        await NotificationService.notifyAdd(
          'general_entry',
          mismatchMessage
        );
      }
    } catch (error) {
      console.warn('Failed to send notification:', error);
    }
  };

  // Access control check
  if (hasAccess === null) {
    // Still checking access
    return (
      <View style={styles.container}>
        <View style={styles.noRecordContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.noRecordTitle}>🔐 Checking Access...</Text>
          <Text style={styles.noRecordText}>
            Verifying your permissions to access cash verification.
          </Text>
        </View>
      </View>
    );
  }

  if (hasAccess === false) {
    // Access denied
    return (
      <View style={styles.container}>
        <View style={styles.noRecordContainer}>
          <Icon name="lock-closed" size={60} color="#e74c3c" style={{ marginBottom: 20 }} />
          <Text style={styles.noRecordTitle}>🚫 Access Denied</Text>
          <Text style={styles.noRecordText}>
            You don't have permission to access the cash verification screen.
            Only administrators and authorized users can verify cash amounts.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentRecord) {
    return (
      <View style={styles.container}>
        <View style={styles.noRecordContainer}>
          <Text style={styles.noRecordTitle}>📝 No Pending Cash Record</Text>
          <Text style={styles.noRecordText}>
            Please set up a cash amount first before verification.
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('LeaveCashSetupScreen' as never)}
          >
            <Text style={styles.setupButtonText}>💰 Setup Cash Amount</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 Cash Verification</Text>
          <Text style={styles.subtitle}>Enter actual cash amount received</Text>
          
          {/* Admin Revoke Button */}
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={handleRevokeCashRecord}
            disabled={loading}
          >
            <Icon name="trash-outline" size={16} color="#fff" />
            <Text style={styles.revokeButtonText}>Revoke Entry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expectedCard}>
          <Text style={styles.expectedTitle}>💰 Expected Amount</Text>
          <Text style={styles.expectedAmount}>₹{currentRecord.expected_amount.toFixed(2)}</Text>
          {currentRecord.notes && (
            <>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{currentRecord.notes}</Text>
            </>
          )}
          <Text style={styles.setupTime}>
            Set up at: {new Date(currentRecord.setup_time).toLocaleString()}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Actual Cash Amount Received *</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={actualAmount}
                onChangeText={setActualAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ Important:</Text>
            <Text style={styles.warningText}>
              • Enter the EXACT amount you received{'\n'}
              • Double-check the amount before submitting{'\n'}
              • Any mismatch will be recorded for audit{'\n'}
              • This verification cannot be changed later
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.disabledButton]}
            onPress={handleVerifyCash}
            disabled={loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : '✅ Verify Cash Amount'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>❌ Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
  expectedCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  expectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 10,
    textAlign: 'center',
  },
  expectedAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 15,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a3d',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#2d5a3d',
    marginBottom: 10,
  },
  setupTime: {
    fontSize: 12,
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
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    height: 50,
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  verifyButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  noRecordContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRecordTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
  },
  noRecordText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  setupButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  revokeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revokeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CashVerificationScreen;