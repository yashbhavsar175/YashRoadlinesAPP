// PaymentConfirmationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { GestureHandlerRootView, TapGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { MumbaiDeliveryTabParamList } from '../navigation/MumbaiDeliveryNavigator';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { DeliveryRecord, PaymentConfirmation, getDeliveryRecords } from '../data/Storage';
import { useOffice } from '../context/OfficeContext';
import { useAlert } from '../context/AlertContext';
import { CommonHeader } from '../components';
import PaymentConfirmationPopup from '../components/PaymentConfirmationPopup';
import { isLegacyRecord, getLegacyRecordTooltip } from '../utils/legacyRecordHelper';
import { logError, logInfo } from '../utils/ErrorLogger';

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

  // State management
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);
  const [popupVisible, setPopupVisible] = useState<boolean>(false);

  // Load delivery records on mount and when office changes
  useEffect(() => {
    loadDeliveryRecords();
  }, [currentOffice]);

  const loadDeliveryRecords = async () => {
    try {
      setLoading(true);
      const officeId = getCurrentOfficeId();
      
      logInfo('Loading delivery records for office', { officeId });
      
      // Fetch all delivery records for the current office
      const records = await getDeliveryRecords(officeId || undefined, 'all');
      
      logInfo('Loaded delivery records', {
        recordCount: records.length,
        officeId,
      });
      
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

  const handleDoubleTap = (record: DeliveryRecord) => {
    setSelectedRecord(record);
    setPopupVisible(true);
  };

  const handleDoubleTapEvent = (event: any, record: DeliveryRecord) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      handleDoubleTap(record);
    }
  // Simplified double-tap handler using onActivated
  const handleDoubleTapActivated = (record: DeliveryRecord) => {
    logInfo('Double tap activated for record', { recordId: record.id, billtyNo: record.billty_no });
    handleDoubleTap(record);
  };

  const handleConfirmPayment = async (confirmation: PaymentConfirmation) => {
    try {
      const { confirmDeliveryPayment } = await import('../data/Storage');
      const { isOnline } = await import('../data/modules/NetworkHelper');
      
      // Check online status - Validates: Requirement 6.3
      const online = await isOnline();
      
      logInfo('Confirming payment', {
        deliveryRecordId: confirmation.delivery_record_id,
        confirmedAmount: confirmation.confirmed_amount,
        online,
      });
      
      // Confirm the payment
      const success = await confirmDeliveryPayment(confirmation);
      
      if (success) {
        logInfo('Payment confirmed successfully', {
          deliveryRecordId: confirmation.delivery_record_id,
          online,
        });
        
        // Show appropriate success message based on online status - Validates: Requirement 6.3, 10.6
        if (!online) {
          showAlert('Working offline - confirmation will sync when connected');
        } else {
          showAlert('Payment confirmed successfully!');
        }
        
        // Send notification (Requirement 3.7)
        try {
          const NotificationService = (await import('../services/NotificationService')).default;
          const billtyNo = selectedRecord?.billty_no || 'Unknown';
          await NotificationService.notifyAdd(
            'mumbai_delivery',
            `Payment confirmed: Billty No ${billtyNo}, Amount ₹${confirmation.confirmed_amount}`
          );
        } catch (notifError) {
          // Log but don't fail the confirmation if notification fails
          logError(notifError instanceof Error ? notifError : new Error('Notification failed'), {
            functionName: 'PaymentConfirmationScreen.handleConfirmPayment',
            additionalInfo: 'Failed to send notification after successful confirmation',
          });
        }
        
        setPopupVisible(false);
        setSelectedRecord(null);
        await loadDeliveryRecords();
      } else {
        logError(new Error('Confirm payment returned false'), {
          functionName: 'PaymentConfirmationScreen.handleConfirmPayment',
          parameters: { confirmation },
          additionalInfo: 'confirmDeliveryPayment returned false',
        });
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

  // Separate records by status
  const pendingRecords = deliveryRecords.filter(
    (r) => r.confirmation_status === 'pending'
  );
  const confirmedRecords = deliveryRecords.filter(
    (r) => r.confirmation_status === 'confirmed'
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
          <Text style={GlobalStyles.title}>Delivery Records</Text>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading delivery records...</Text>
            </View>
          )}

          {/* Empty State */}
          {!loading && deliveryRecords.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No delivery records found</Text>
              <Text style={styles.emptySubtext}>
                Create new delivery records in the Data Entry screen
              </Text>
            </View>
          )}

          {/* Delivery Records Table */}
          {!loading && deliveryRecords.length > 0 && (
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.indexColumn]}>No.</Text>
                <Text style={[styles.tableHeaderText, styles.billtyColumn]}>Billty No</Text>
                <Text style={[styles.tableHeaderText, styles.consigneeColumn]}>Consignee</Text>
                <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.amountColumn]}>Amount</Text>
              </View>
              
              <Text style={styles.sectionTitle}>
                Pending Deliveries ({pendingRecords.length})
              </Text>
              
              {/* Pending Records List */}
              {pendingRecords.map((record, index) => (
                <TapGestureHandler
                  key={record.id}
                  numberOfTaps={2}
                  onHandlerStateChange={(event) => handleDoubleTapEvent(event, record)}
                  onActivated={() => handleDoubleTapActivated(record)}
                >
                  <Animated.View style={styles.tableRow}>
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
                  </Animated.View>
                </TapGestureHandler>
              ))}
              
              {/* Green Separator */}
              {confirmedRecords.length > 0 && (
                <View style={styles.greenSeparator} />
              )}
              
              <Text style={styles.sectionTitle}>
                Confirmed Deliveries ({confirmedRecords.length})
              </Text>
              
              {/* Confirmed Records List */}
              {confirmedRecords.map((record, index) => (
                <TapGestureHandler
                  key={record.id}
                  numberOfTaps={2}
                  onHandlerStateChange={(event) => handleDoubleTapEvent(event, record)}
                  onActivated={() => handleDoubleTapActivated(record)}
                >
                  <Animated.View style={[styles.tableRow, styles.confirmedRow]}>
                    <View style={styles.checkmarkContainer}>
                      <Icon name="checkmark-circle" size={20} color={Colors.success} />
                    </View>
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
                      ₹{record.confirmed_amount?.toFixed(2) || record.amount.toFixed(2)}
                    </Text>
                  </Animated.View>
                </TapGestureHandler>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Confirmation Popup */}
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
  officeIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  indexColumn: {
    width: 40,
  },
  billtyColumn: {
    flex: 1.5,
  },
  consigneeColumn: {
    flex: 2,
  },
  itemColumn: {
    flex: 2,
  },
  amountColumn: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
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
    flex: 1.5,
    flexDirection: 'column',
    alignItems: 'center',
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
