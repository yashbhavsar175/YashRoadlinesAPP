// src/screens/MumbaiDeliveryEntryScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { saveAgencyEntry, getAgencyEntry, deleteTransactionByIdImproved, OFFLINE_KEYS, AgencyEntry, PaymentConfirmation, DeliveryRecord, confirmDeliveryPayment } from '../data/Storage';
import { useAlert } from '../context/AlertContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView, LongPressGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import NotificationService from '../services/NotificationService';
import DeviceNotificationService from '../services/DeviceNotificationService';
import { supabase } from '../supabase';
import { useOffice } from '../context/OfficeContext';
import PaymentConfirmationPopup from '../components/PaymentConfirmationPopup';
type MumbaiDeliveryEntryScreenNavigationProp = NavigationProp<RootStackParamList, 'MumbaiDelivery'>;

interface MumbaiDeliveryEntryScreenProps {
  navigation: MumbaiDeliveryEntryScreenNavigationProp;
}

function MumbaiDeliveryEntryScreen({ navigation }: MumbaiDeliveryEntryScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const { getCurrentOfficeId } = useOffice();

  // Form states
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<AgencyEntry | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  // List states
  const [recentEntries, setRecentEntries] = useState<AgencyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const currentOfficeId = getCurrentOfficeId();
      const allEntries = await getAgencyEntry(currentOfficeId || undefined);
      // Filter only Mumbai entries
      const mumbaiEntries = allEntries
        .filter(entry => entry.agency_name === 'Mumbai')
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
        .slice(0, 20); // Show last 20 entries

      setRecentEntries(mumbaiEntries);
    } catch (error) {
      console.error('Error loading Mumbai entries:', error);
      showAlert('Failed to load entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert, getCurrentOfficeId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => { };
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      showAlert('Enter description');
      return;
    }
    if (!amount.trim()) {
      showAlert('Enter amount');
      return;
    }
    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert('Enter valid amount');
      return;
    }

    setSaving(true);
    try {
      const entryData = {
        agency_name: 'Mumbai',
        description: description.trim(),
        amount: numericAmount,
        entry_type: 'credit' as 'credit', // Always credit for Mumbai delivery
        entry_date: date.toISOString(),
        delivery_status: 'yes' as 'yes', // Always yes for Mumbai delivery
      };

      const success = await saveAgencyEntry(entryData);
      if (success) {
        // Get current user info for notifications from AsyncStorage
        const userDataString = await AsyncStorage.getItem('user_profile');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        const userName = userData?.name || 'User';
        
        // Send notification to admin
        await NotificationService.notifyAdd('mumbai_delivery', `New Mumbai delivery: ₹${numericAmount} - ${description.trim().slice(0, 30)}${description.trim().length > 30 ? '...' : ''}`);

        // Send device notification to admin
        await DeviceNotificationService.notifyAdminEntryAdded(
          'Mumbai Delivery',
          userName,
          {
            amount: numericAmount,
            description: description.trim(),
            office: getCurrentOfficeId()
          }
        );

        setTimeout(() => {
          showAlert('Mumbai delivery entry saved successfully!');
        }, 100);
        setDescription('');
        setAmount('');
        await loadData(false);
      } else {
        showAlert('Failed to save entry');
      }
    } catch (error) {
      console.error('Save entry error:', error);
      showAlert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeliveryStatus = async (id: string) => {
    const entry = recentEntries.find(e => e.id === id);
    if (!entry) return;

    const newStatus: 'yes' | 'no' = entry.delivery_status === 'yes' ? 'no' : 'yes';
    const statusText = newStatus === 'yes' ? 'Delivered' : 'Not Delivered';

    try {
      // Update the entry with new status
      const updatedEntry = {
        ...entry,
        delivery_status: newStatus,
      } as AgencyEntry;

      const success = await saveAgencyEntry(updatedEntry as any);
      if (success) {
        // Update local state
        const updatedEntries = recentEntries.map(e =>
          e.id === id ? { ...e, delivery_status: newStatus } : e
        );
        setRecentEntries(updatedEntries);
        showAlert(`Status updated to: ${statusText}`);
      } else {
        showAlert('Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      showAlert('Error updating status');
    }
  };
  const convertToDeliveryRecord = (entry: AgencyEntry): DeliveryRecord => ({
    id: entry.id,
    billty_no: entry.description?.slice(0, 20) || 'N/A',
    consignee_name: 'Mumbai Delivery',
    item_description: entry.description || '',
    amount: entry.amount,
    delivery_status: entry.delivery_status || 'no',
    entry_date: entry.entry_date,
    confirmation_status: 'pending',
    taken_from_godown: false,
    payment_received: false,
    agency_id: '',
    agency_name: '',
    description: '',
    entry_type: 'credit',
    created_at: '',
    updated_at: ''
  });
  const handleDeleteEntry = (id: string) => {
    console.log('🗑️ handleDeleteEntry called for ID:', id);
    
    const entryToDelete = recentEntries.find(entry => entry.id === id);
    
    if (!entryToDelete) {
      console.log('❌ Entry not found in recentEntries');
      return;
    }

    console.log('📋 Entry to delete:', {
      id: entryToDelete.id,
      description: entryToDelete.description,
      amount: entryToDelete.amount,
      confirmation_status: entryToDelete.confirmation_status
    });

    // Check if entry is confirmed
    const isConfirmed = entryToDelete.confirmation_status === 'confirmed';
    
    console.log('✅ Is confirmed?', isConfirmed);
    
    const title = isConfirmed ? "Delete Confirmed Payment?" : "Confirm Delete";
    const message = isConfirmed 
      ? "This payment has been confirmed with photos. Deleting it will also remove the credit entry from Daily Report. Are you sure?"
      : "Are you sure you want to permanently delete this Mumbai delivery entry?";

    console.log('🔔 Showing alert dialog:', title);

    Alert.alert(
      title,
      message,
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => console.log('❌ Delete cancelled')
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log('🔄 Delete confirmed, starting deletion...');
            try {
              const success = await deleteTransactionByIdImproved(id, OFFLINE_KEYS.AGENCY_ENTRIES);
              console.log('📊 Delete result:', success);
              
              if (success) {
                // Send notification to admin
                if (entryToDelete) {
                  console.log('📢 Sending delete notification to admin');
                  await NotificationService.notifyDelete('mumbai_delivery', `Deleted Mumbai delivery: ₹${entryToDelete.amount} - ${entryToDelete.description.slice(0, 30)}${entryToDelete.description.length > 30 ? '...' : ''}`);
                }

                const updatedEntries = recentEntries.filter(entry => entry.id !== id);
                console.log('✅ Entry deleted, updating list. Remaining entries:', updatedEntries.length);
                setRecentEntries(updatedEntries);
                showAlert('Entry deleted successfully!');
              } else {
                console.error('❌ Delete failed');
                showAlert('Failed to delete entry');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              showAlert('Error deleting entry');
            }
          }
        }
      ]
    );
  };

  const renderEntryItem = useCallback(({ item }: { item: AgencyEntry }) => {
    const deliveryText = item.delivery_status === 'yes' ? 'Delivered' : 'Not Delivered';
    const chipStyle = item.delivery_status === 'yes' ? styles.deliveredChip : styles.notDeliveredChip;
    const isConfirmed = item.confirmation_status === 'confirmed';

    const longPressRef = React.useRef(null);
    const doubleTapRef = React.useRef(null);

    return (
      <LongPressGestureHandler
        ref={longPressRef}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            console.log('🔴 Long press detected on entry:', item.id);
            handleDeleteEntry(item.id);
          }
        }}
        minDurationMs={800}
      >
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onActivated={() => {
            console.log('🔵 Double tap detected on entry:', item.id);
            // Allow viewing confirmed entries in read-only mode
            // Allow confirming pending entries
            setSelectedEntry(item);
            setShowPaymentPopup(true);
          }}
          waitFor={longPressRef}
        >
          <View style={[GlobalStyles.card, styles.entryCard, isConfirmed && styles.confirmedCard]}>
            <View style={styles.entryHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={chipStyle}>
                  <Text style={styles.chipText}>{deliveryText}</Text>
                </View>
                {isConfirmed && (
                  <View style={styles.confirmedBadge}>
                    <Icon name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.confirmedText}>Confirmed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.entryDate}>{new Date(item.entry_date).toLocaleDateString('en-IN')}</Text>
            </View>
            <View style={styles.entryContent}>
              <Text style={styles.entryDescription}>{item.description}</Text>
              <Text style={styles.creditAmount}>
                ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>
            {isConfirmed && (
              <View style={styles.confirmedFooter}>
                <Text style={styles.confirmedFooterText}>
                  Double tap to view details • Long press to delete • Confirmed on {new Date(item.confirmed_at || '').toLocaleDateString('en-IN')}
                </Text>
              </View>
            )}
            {!isConfirmed && (
              <View style={styles.actionHint}>
                <Text style={styles.actionHintText}>Double tap to confirm payment • Long press to delete</Text>
              </View>
            )}
          </View>
        </TapGestureHandler>
      </LongPressGestureHandler>
    );
  }, []);
  const handlePaymentConfirm = async (confirmation: PaymentConfirmation) => {
    try {
      if (!selectedEntry) return;
      
      console.log('🔄 Confirming payment for entry:', selectedEntry.id);
      
      // Use confirmDeliveryPayment which creates the daily report entry
      const success = await confirmDeliveryPayment(confirmation);
      
      if (success) {
        console.log('✅ Payment confirmed successfully');
        await loadData(false);
        showAlert('Payment confirmed! Credit entry added to Daily Report.');
      } else {
        console.error('❌ Payment confirmation failed');
        showAlert('Failed to confirm payment');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      showAlert('Error confirming payment');
    } finally {
      setShowPaymentPopup(false);
      setSelectedEntry(null);
    }
  };
  const renderHeader = () => (
    <>
      <View style={GlobalStyles.card}>
        <View style={styles.cardContent}>
          <Text style={[GlobalStyles.title, styles.cardTitle]}>Add Mumbai Delivery Entry</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter delivery description"
              placeholderTextColor={Colors.placeholder}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor={Colors.placeholder}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={[GlobalStyles.buttonPrimary, styles.saveButton, saving && styles.disabledButton]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <Text style={GlobalStyles.buttonPrimaryText}>Save Mumbai Delivery Entry</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentEntriesSection}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
      </View>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="car-outline" size={60} color={Colors.textSecondary} />
      <Text style={styles.emptyText}>No Mumbai delivery entries yet</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent={false} />

        <View style={styles.header}>
          {/* Left: Back Button */}
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          
          {/* Center: Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Mumbai Delivery Entry</Text>
          </View>
          
          {/* Right: Spacer */}
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Mumbai delivery entries...</Text>
          </View>
        ) : (
          <FlatList
            data={recentEntries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntryItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
            }
          />
        )}
      </View>
      {selectedEntry && (
        <PaymentConfirmationPopup
          visible={showPaymentPopup}
          deliveryRecord={convertToDeliveryRecord(selectedEntry)}
          onConfirm={handlePaymentConfirm}
          onCancel={() => {
            setShowPaymentPopup(false);
            setSelectedEntry(null);
          }}
          readOnly={selectedEntry.confirmation_status === 'confirmed'}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    height: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    marginLeft: 8,
  },
  flatListContent: {
    padding: 16,
    flexGrow: 1,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  requiredStar: {
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  saveButton: {
    marginTop: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  recentEntriesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  entryCard: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  deliveredChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.success,
  },
  notDeliveredChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.error,
  },
  chipText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDescription: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginRight: 12,
  },
  creditAmount: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  confirmedCard: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FFF4',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E6F7ED',
  },
  confirmedText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  confirmedFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmedFooterText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionHintText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default MumbaiDeliveryEntryScreen;
