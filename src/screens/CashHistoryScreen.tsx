import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getCashRecords, CashRecord, deleteCashRecord, revertCashRecordToPending, checkCashVerificationAccess } from '../data/Storage';
import NotificationService from '../services/NotificationService';
import Icon from 'react-native-vector-icons/Ionicons';

const CashHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [cashRecords, setCashRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const access = await checkCashVerificationAccess();
      setHasAccess(access);
      
      if (access) {
        loadCashHistory();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashHistory();
  }, []);

  const loadCashHistory = async () => {
    try {
      setLoading(true);
      const records = await getCashRecords();
      setCashRecords(records);
    } catch (error) {
      console.error('Error loading cash history:', error);
      Alert.alert('Error', 'Failed to load cash history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCashHistory();
    setRefreshing(false);
  };

  const handleRevoke = async (recordId: string) => {
    Alert.alert(
      'Revoke Entry',
      'Are you sure you want to revoke this cash verification entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCashRecord(recordId);
              Alert.alert('Success', 'Cash entry has been revoked');
              loadCashHistory(); // Refresh the list
            } catch (error) {
              console.error('Error revoking entry:', error);
              Alert.alert('Error', 'Failed to revoke entry');
            }
          },
        },
      ]
    );
  };

  const handleReVerify = async (recordId: string) => {
    const record = cashRecords.find(r => r.id === recordId);
    if (!record) return;

    Alert.alert(
      'Re-verify Cash Amount',
      `Do you want to re-verify this cash entry?\n\nExpected: ₹${record.expected_amount.toLocaleString('en-IN')}\nCurrent: ₹${record.actual_amount?.toLocaleString('en-IN') || '0'}\n\nThis will reset the verification and allow you to enter the amount again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-verify',
          onPress: async () => {
            try {
              await revertCashRecordToPending(recordId);
              
              // Send notification about re-verification
              await NotificationService.notifyAdd(
                'general_entry',
                `🔄 CASH ENTRY RE-VERIFICATION\n💰 Amount: ₹${record.expected_amount.toLocaleString('en-IN')}\n⏰ Reset at: ${new Date().toLocaleString()}\n👤 Admin Action: Entry reset for re-verification\n📝 Previous Status: ${record.status === 'verified_correct' ? 'Verified Correct' : 'Verified Incorrect'}\n🔍 Ready for fresh verification`
              );

              Alert.alert(
                'Ready for Re-verification',
                'The entry has been reset. You can now verify the cash amount again.',
                [
                  {
                    text: 'Verify Now',
                    onPress: () => {
                      navigation.navigate('CashVerificationScreen' as never);
                    }
                  },
                  {
                    text: 'Later',
                    style: 'cancel'
                  }
                ]
              );
              loadCashHistory(); // Refresh the list
            } catch (error) {
              console.error('Error reverting entry:', error);
              Alert.alert('Error', 'Failed to reset entry for re-verification');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified_correct':
        return { name: 'checkmark-circle', color: '#27ae60' };
      case 'verified_incorrect':
        return { name: 'warning', color: '#e74c3c' };
      default:
        return { name: 'time', color: '#f39c12' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified_correct':
        return 'Verified ✅';
      case 'verified_incorrect':
        return 'Mismatch ⚠️';
      default:
        return 'Pending 🕐';
    }
  };

  const calculateSummary = () => {
    const total = cashRecords.length;
    const verified = cashRecords.filter(r => r.status === 'verified_correct').length;
    const mismatched = cashRecords.filter(r => r.status === 'verified_incorrect').length;
    const pending = cashRecords.filter(r => r.status === 'pending_verification').length;
    
    return { total, verified, mismatched, pending };
  };

  const summary = calculateSummary();

  // Access control check
  if (hasAccess === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Checking access permissions...</Text>
      </View>
    );
  }

  if (hasAccess === false) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="lock-closed" size={60} color="#e74c3c" style={{ marginBottom: 20 }} />
        <Text style={styles.emptyTitle}>🚫 Access Denied</Text>
        <Text style={styles.emptyText}>
          You don't have permission to access cash verification history.
          Only administrators and authorized users can view cash records.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.addButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading cash history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Cash Verification Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.totalCard]}>
            <Text style={styles.summaryNumber}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.verifiedCard]}>
            <Text style={[styles.summaryNumber, { color: '#27ae60' }]}>{summary.verified}</Text>
            <Text style={styles.summaryLabel}>Verified</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.mismatchCard]}>
            <Text style={[styles.summaryNumber, { color: '#e74c3c' }]}>{summary.mismatched}</Text>
            <Text style={styles.summaryLabel}>Mismatch</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.pendingCard]}>
            <Text style={[styles.summaryNumber, { color: '#f39c12' }]}>{summary.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Records List */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {cashRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={80} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No Cash Records</Text>
            <Text style={styles.emptyText}>No cash verification records found</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('LeaveCashSetupScreen' as never)}
            >
              <Icon name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addButtonText}>Add First Record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cashRecords.map((record, index) => {
            const statusIcon = getStatusIcon(record.status);
            const isVerified = record.status !== 'pending_verification';
            
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.statusContainer}>
                    <Icon 
                      name={statusIcon.name} 
                      size={24} 
                      color={statusIcon.color} 
                    />
                    <Text style={[styles.statusText, { color: statusIcon.color }]}>
                      {getStatusText(record.status)}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    <Text style={styles.dateText}>
                      {formatDate(record.setup_time)}
                    </Text>
                    {isVerified && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.reVerifyButton}
                          onPress={() => handleReVerify(record.id)}
                        >
                          <Icon name="refresh-outline" size={16} color="#3498db" />
                          <Text style={styles.reVerifyButtonText}>Re-verify</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.revokeButton}
                          onPress={() => handleRevoke(record.id)}
                        >
                          <Icon name="trash-outline" size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.amountSection}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Expected Amount:</Text>
                    <Text style={styles.expectedAmount}>
                      ₹{record.expected_amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  
                  {isVerified && (
                    <>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Actual Amount:</Text>
                        <Text style={[
                          styles.actualAmount,
                          { color: record.status === 'verified_correct' ? '#27ae60' : '#e74c3c' }
                        ]}>
                          ₹{record.actual_amount?.toLocaleString('en-IN') || '0'}
                        </Text>
                      </View>
                      
                      {record.difference !== undefined && record.difference !== 0 && (
                        <View style={styles.amountRow}>
                          <Text style={styles.amountLabel}>Difference:</Text>
                          <Text style={[
                            styles.differenceAmount,
                            { color: record.difference > 0 ? '#e74c3c' : '#e67e22' }
                          ]}>
                            {record.difference > 0 ? '+' : ''}₹{record.difference.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {record.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{record.notes}</Text>
                  </View>
                )}

                <View style={styles.timestampContainer}>
                  <View style={styles.timestampRow}>
                    <Icon name="time-outline" size={14} color="#95a5a6" />
                    <Text style={styles.timestampText}>
                      Setup: {formatDate(record.setup_time)} at {formatTime(record.setup_time)}
                    </Text>
                  </View>
                  {record.verification_time && (
                    <View style={styles.timestampRow}>
                      <Icon name="checkmark-circle-outline" size={14} color="#95a5a6" />
                      <Text style={styles.timestampText}>
                        Verified: {formatDate(record.verification_time)} at {formatTime(record.verification_time)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('LeaveCashSetupScreen' as never)}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalCard: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  verifiedCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  mismatchCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  pendingCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 12,
  },
  revokeButton: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  amountSection: {
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  expectedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actualAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  differenceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
  },
  notesLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  timestampContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  reVerifyButtonText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default CashHistoryScreen;