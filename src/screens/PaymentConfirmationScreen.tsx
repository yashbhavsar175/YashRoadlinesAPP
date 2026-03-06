import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { MumbaiDeliveryTabParamList } from '../navigation/MumbaiDeliveryNavigator';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { DeliveryRecord, PaymentConfirmation, getDeliveryRecords, deleteTransactionByIdImproved, OFFLINE_KEYS } from '../data/Storage';
import { useOffice } from '../context/OfficeContext';
import { useAlert } from '../context/AlertContext';
import { CommonHeader } from '../components';
import PaymentConfirmationPopup from '../components/PaymentConfirmationPopup';
import { isLegacyRecord, getLegacyRecordTooltip } from '../utils/legacyRecordHelper';
import { logError, logInfo } from '../utils/ErrorLogger';
import NotificationService from '../services/NotificationService';

type PaymentConfirmationScreenNavigationProp = NavigationProp<
  MumbaiDeliveryTabParamList,
  'PaymentConfirmation'
>;

interface PaymentConfirmationScreenProps {
  navigation: PaymentConfirmationScreenNavigationProp;
}

function PaymentConfirmationScreen({
  navigation,
}: PaymentConfirmationScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { currentOffice, getCurrentOfficeId } = useOffice();
  const { showAlert } = useAlert();

  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);
  const [popupVisible, setPopupVisible] = useState<boolean>(false);

  // Double tap tracking
  const lastTapRef = useRef<{ [key: string]: number }>({});
  const DOUBLE_TAP_DELAY = 350;

  useEffect(() => {
    loadDeliveryRecords();
  }, [currentOffice]);

  const loadDeliveryRecords = async () => {
    try {
      setLoading(true);
      const officeId = getCurrentOfficeId();
      logInfo('Loading delivery records for office', { officeId });
      const records = await getDeliveryRecords(officeId || undefined, 'all');
      logInfo('Loaded delivery records', { recordCount: records.length, officeId });
      setDeliveryRecords(records);
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to load delivery records'), {
        functionName: 'PaymentConfirmationScreen.loadDeliveryRecords',
        parameters: { officeId: getCurrentOfficeId() },
        additionalInfo: 'Error loading delivery records from storage',
      });
      showAlert('Failed to load delivery records');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeliveryRecords();
    setRefreshing(false);
  };

  // Custom double tap — reliable on Android
 const handleTap = (record: DeliveryRecord) => {
  const now = Date.now();
  const lastTap = lastTapRef.current[record.id] || 0;
  
  if (now - lastTap < DOUBLE_TAP_DELAY) {
    lastTapRef.current[record.id] = 0;
    setSelectedRecord(record);
    setPopupVisible(true);
  } else {
    lastTapRef.current[record.id] = now;
  }
};
useEffect(() => {
}, [popupVisible, selectedRecord]);
  const handleConfirmPayment = async (confirmation: PaymentConfirmation) => {
    try {
      const { confirmDeliveryPayment } = await import('../data/Storage');
      const { isOnline } = await import('../data/modules/NetworkHelper');
      const online = await isOnline();

      logInfo('Confirming payment', {
        deliveryRecordId: confirmation.delivery_record_id,
        confirmedAmount: confirmation.confirmed_amount,
        online,
      });

      const success = await confirmDeliveryPayment(confirmation);

      if (success) {
        logInfo('Payment confirmed successfully', {
          deliveryRecordId: confirmation.delivery_record_id,
          online,
        });

        if (!online) {
          showAlert('Working offline - confirmation will sync when connected');
        } else {
          showAlert('Payment confirmed successfully!');
        }

        try {
          // Get current user info for notifications
          const userDataString = await AsyncStorage.getItem('user_profile');
          const userData = userDataString ? JSON.parse(userDataString) : null;
          const userName = userData?.name || 'User';
          
          // Send in-app notification
          const NotificationService = (await import('../services/NotificationService')).default;
          const billtyNo = selectedRecord?.billty_no || 'Unknown';
          await NotificationService.notifyAdd(
            'mumbai_delivery',
            `Payment confirmed: Billty No ${billtyNo}, Amount ₹${confirmation.confirmed_amount}`
          );
          
          // Send device notification to admin
          const DeviceNotificationService = (await import('../services/DeviceNotificationService')).default;
          await DeviceNotificationService.notifyAdminPaymentConfirmed(
            'Mumbai Delivery',
            userName,
            {
              billtyNo: billtyNo,
              amount: confirmation.confirmed_amount,
              consigneeName: selectedRecord?.consignee_name || 'N/A',
            }
          );
          
          console.log('✅ Notifications sent to admin');
        } catch (notifError) {
          logError(notifError instanceof Error ? notifError : new Error('Notification failed'), {
            functionName: 'PaymentConfirmationScreen.handleConfirmPayment',
            additionalInfo: 'Failed to send notification after successful confirmation',
          });
        }

        setPopupVisible(false);
        setSelectedRecord(null);
        await loadDeliveryRecords();
      } else {
        showAlert('Failed to confirm payment');
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to confirm payment'), {
        functionName: 'PaymentConfirmationScreen.handleConfirmPayment',
        parameters: { confirmation },
        additionalInfo: 'Error during payment confirmation',
      });
      showAlert('Failed to confirm payment');
    }
  };

  const handleCancelPopup = () => {
    setPopupVisible(false);
    setSelectedRecord(null);
  };

  const handleDeleteEntry = (record: DeliveryRecord) => {
    const isConfirmed = record.confirmation_status === 'confirmed';
    
    const title = isConfirmed ? "Delete Confirmed Payment?" : "Confirm Delete";
    const message = isConfirmed 
      ? "This payment has been confirmed with photos. Deleting it will also remove the credit entry from Daily Report. Are you sure?"
      : "Are you sure you want to permanently delete this delivery record?";

    Alert.alert(
      title,
      message,
      [
        { 
          text: "Cancel", 
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTransactionByIdImproved(record.id, OFFLINE_KEYS.AGENCY_ENTRIES);
              
              if (success) {
                await NotificationService.notifyDelete(
                  'mumbai_delivery', 
                  `Deleted Mumbai delivery: Billty ${record.billty_no} - ₹${record.amount}`
                );

                await loadDeliveryRecords();
                showAlert('Entry deleted successfully!');
              } else {
                showAlert('Failed to delete entry');
              }
            } catch (error) {
              showAlert('Error deleting entry');
            }
          }
        }
      ]
    );
  };

  const pendingRecords = deliveryRecords.filter(
    (r) => r.confirmation_status === 'pending' && r.billty_no && r.billty_no.trim() !== ''
  );
  const confirmedRecords = deliveryRecords.filter(
    (r) => r.confirmation_status === 'confirmed' && r.billty_no && r.billty_no.trim() !== ''
  );

  return (
    <GestureHandlerRootView style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <CommonHeader title="Payment Confirmation" onBackPress={goBack} />

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={GlobalStyles.card}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading delivery records...</Text>
            </View>
          )}

          {!loading && deliveryRecords.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No delivery records found</Text>
              <Text style={styles.emptySubtext}>
                Create new delivery records in the Data Entry screen
              </Text>
            </View>
          )}

          {!loading && deliveryRecords.length > 0 && (
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.indexColumn]}>No.</Text>
                <Text style={[styles.tableHeaderText, styles.billtyColumn]} numberOfLines={1}>Billty</Text>
                <Text style={[styles.tableHeaderText, styles.consigneeColumn]} numberOfLines={1}>Consignee</Text>
                <Text style={[styles.tableHeaderText, styles.itemColumn]} numberOfLines={1}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.amountColumn]} numberOfLines={1}>Amount</Text>
                <Text style={[styles.tableHeaderText, styles.cashTypeColumn]} numberOfLines={1}>Cash Type</Text>
              </View>

              <Text style={styles.sectionTitle}>
                Pending Deliveries ({pendingRecords.length})
              </Text>

              {pendingRecords.map((record, index) => (
                <LongPressGestureHandler
                  key={record.id}
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.ACTIVE) {
                      console.log('🔴 Long press detected on pending record:', record.id);
                      handleDeleteEntry(record);
                    }
                  }}
                  minDurationMs={800}
                >
                  <TouchableOpacity
                    onPress={() => handleTap(record)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.indexColumn]}>{index + 1}</Text>
                      <View style={styles.billtyColumnContainer}>
                        <Text style={[styles.tableCell, styles.billtyColumn]} numberOfLines={1}>
                          {record.billty_no || 'N/A'}
                        </Text>
                        {isLegacyRecord(record) && (
                          <View style={styles.legacyBadge}>
                            <Text style={styles.legacyBadgeText}>LEGACY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tableCell, styles.consigneeColumn]} numberOfLines={1}>
                        {record.consignee_name || 'N/A'}
                      </Text>
                      <Text style={[styles.tableCell, styles.itemColumn]} numberOfLines={2}>
                        {record.item_description || record.description || 'N/A'}
                      </Text>
                      <Text style={[styles.tableCell, styles.amountColumn]}>
                        ₹{record.amount.toFixed(2)}
                      </Text>
                      <Text style={[styles.tableCell, styles.cashTypeColumn]} numberOfLines={1}>
                        {record.payment_type === 'cash' ? 'Cash' : 
                         record.payment_type === 'gpay_sapan' ? 'GPay (S)' :
                         record.payment_type === 'gpay_yash' ? 'GPay (Y)' : '-'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </LongPressGestureHandler>
              ))}

              {confirmedRecords.length > 0 && (
                <View style={styles.greenSeparator} />
              )}

              <Text style={styles.sectionTitle}>
                Confirmed Deliveries ({confirmedRecords.length})
              </Text>

              {confirmedRecords.map((record, index) => (
                <LongPressGestureHandler
                  key={record.id}
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.ACTIVE) {
                      console.log('🔴 Long press detected on confirmed record:', record.id);
                      handleDeleteEntry(record);
                    }
                  }}
                  minDurationMs={800}
                >
                  <TouchableOpacity
                    onPress={() => handleTap(record)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.tableRow, styles.confirmedRow]}>
                      <Text style={[styles.tableCell, styles.indexColumn]}>{index + 1}</Text>
                      <View style={styles.billtyColumnContainer}>
                        <Text style={[styles.tableCell, styles.billtyColumn]} numberOfLines={1}>
                          {record.billty_no || 'N/A'}
                        </Text>
                        {isLegacyRecord(record) && (
                          <View style={styles.legacyBadge}>
                            <Text style={styles.legacyBadgeText}>LEGACY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tableCell, styles.consigneeColumn]} numberOfLines={1}>
                        {record.consignee_name || 'N/A'}
                      </Text>
                      <Text style={[styles.tableCell, styles.itemColumn]} numberOfLines={2}>
                        {record.item_description || record.description || 'N/A'}
                      </Text>
                      <View style={styles.amountWithCheckContainer}>
                        <Icon name="checkmark-circle" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.tableCell, styles.amountColumn]}>
                          ₹{record.confirmed_amount?.toFixed(2) || record.amount.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={[styles.tableCell, styles.cashTypeColumn]} numberOfLines={1}>
                        {record.payment_type === 'cash' ? 'Cash' : 
                         record.payment_type === 'gpay_sapan' ? 'GPay (S)' :
                         record.payment_type === 'gpay_yash' ? 'GPay (Y)' : '-'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </LongPressGestureHandler>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Popup — ScrollView ke bahar, screen level pe */}
      {selectedRecord && (
        <PaymentConfirmationPopup
          visible={popupVisible}
          deliveryRecord={selectedRecord}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPopup}
          readOnly={selectedRecord.confirmation_status === 'confirmed'}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tableContainer: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'left',
    paddingHorizontal: 2,
  },
  indexColumn: {
    flex: 1,
    minWidth: 40,
  },
  billtyColumn: {
    flex: 1,
    minWidth: 60,
  },
  consigneeColumn: {
    flex: 1,
    minWidth: 70,
  },
  itemColumn: {
    flex: 1,
    minWidth: 50,
  },
  amountColumn: {
    flex: 1,
    minWidth: 65,
  },
  cashTypeColumn: {
    flex: 0.8,
    minWidth: 55,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: 'left',
    paddingHorizontal: 2,
  },
  confirmedRow: {
    backgroundColor: '#f0f9f4',
    position: 'relative',
  },
  checkmarkContainer: {
    position: 'absolute',
    left: 4,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  amountWithCheckContainer: {
    flex: 1,
    minWidth: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  greenSeparator: {
    height: 3,
    backgroundColor: Colors.success,
    marginVertical: 20,
    borderRadius: 2,
  },
  billtyColumnContainer: {
    flex: 1,
    minWidth: 60,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  legacyBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  legacyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

export default PaymentConfirmationScreen;