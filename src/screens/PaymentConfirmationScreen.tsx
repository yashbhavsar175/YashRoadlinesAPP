// PaymentConfirmationScreen.tsx
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
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
  const diff = now - lastTap;
  
  console.log('TAP detected:', record.id, '| diff:', diff, 'ms | threshold:', DOUBLE_TAP_DELAY);
  
  if (now - lastTap < DOUBLE_TAP_DELAY) {
    lastTapRef.current[record.id] = 0;
    console.log('DOUBLE TAP! Setting selectedRecord and popupVisible=true');
    setSelectedRecord(record);
    setPopupVisible(true);
    console.log('State set done. selectedRecord:', record.id, 'popupVisible: true');
  } else {
    lastTapRef.current[record.id] = now;
    console.log('Single tap, waiting for second tap...');
  }
};
useEffect(() => {
  console.log('=== STATE CHANGE ===');
  console.log('popupVisible:', popupVisible);
  console.log('selectedRecord:', selectedRecord?.id || 'null');
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
          const NotificationService = (await import('../services/NotificationService')).default;
          const billtyNo = selectedRecord?.billty_no || 'Unknown';
          await NotificationService.notifyAdd(
            'mumbai_delivery',
            `Payment confirmed: Billty No ${billtyNo}, Amount ₹${confirmation.confirmed_amount}`
          );
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
          <Text style={GlobalStyles.title}>Delivery Records</Text>

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
                <Text style={[styles.tableHeaderText, styles.billtyColumn]}>Billty No</Text>
                <Text style={[styles.tableHeaderText, styles.consigneeColumn]}>Consignee</Text>
                <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.amountColumn]}>Amount</Text>
              </View>

              <Text style={styles.sectionTitle}>
                Pending Deliveries ({pendingRecords.length})
              </Text>

              {pendingRecords.map((record, index) => (
                <TouchableOpacity
                  key={record.id}
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
                  </View>
                </TouchableOpacity>
              ))}

              {confirmedRecords.length > 0 && (
                <View style={styles.greenSeparator} />
              )}

              <Text style={styles.sectionTitle}>
                Confirmed Deliveries ({confirmedRecords.length})
              </Text>

              {confirmedRecords.map((record, index) => (
                <TouchableOpacity
                  key={record.id}
                  onPress={() => handleTap(record)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tableRow, styles.confirmedRow]}>
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
                  </View>
                </TouchableOpacity>
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