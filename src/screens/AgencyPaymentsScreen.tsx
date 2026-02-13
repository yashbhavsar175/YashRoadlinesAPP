import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { saveAgencyPayment, getAgencyPaymentsLocal, AgencyPayment, getAgencies, Agency } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Dropdown from '../components/Dropdown';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceNotificationService from '../services/DeviceNotificationService';
import { supabase } from '../supabase';
import { useOffice } from '../context/OfficeContext';
import CommonHeader from '../components/CommonHeader';

type AgencyPaymentsScreenNavigationProp = NavigationProp<RootStackParamList, 'PaidSection'>;

interface AgencyPaymentsScreenProps {
  navigation: AgencyPaymentsScreenNavigationProp;
}

function AgencyPaymentsScreen({ navigation }: AgencyPaymentsScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { currentOffice, getCurrentOfficeId } = useOffice();
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [billNo, setBillNo] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paidEntries, setPaidEntries] = useState<AgencyPayment[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [profile, setProfile] = useState<any>(null);

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load user profile and admin status
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      
      const emailLower = (data.user?.email || '').toLowerCase();
      const isUserAdmin = emailLower === 'yashbhavsar175@gmail.com';
      setIsAdmin(isUserAdmin);

      // Load profile
      if (userId) {
        try {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          setProfile(userProfile);
        } catch (err) {
          console.warn('Could not load profile');
        }
      }

      // Get current office ID for filtering
      const officeId = getCurrentOfficeId();
      console.log('🏢 AgencyPaymentsScreen: Loading data for office:', officeId);

      // Load agency payments filtered by current office
      const storedEntries: AgencyPayment[] = await getAgencyPaymentsLocal(officeId || undefined);
      setPaidEntries(storedEntries.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));

      const storedAgencies: Agency[] = await getAgencies();
      const options = storedAgencies.map(agency => ({ label: agency.name, value: agency.name }));
      setAgencyOptions(options);

      if (options.length > 0 && !selectedAgency) {
        setSelectedAgency(options[0].value);
      } else if (options.length === 0) {
        setSelectedAgency('');
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedAgency, getCurrentOfficeId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );

  // Reload data when office changes
  useEffect(() => {
    if (currentOffice) {
      console.log('🔄 AgencyPaymentsScreen: Office changed, reloading data...');
      loadData();
    }
  }, [currentOffice]);

  const handleSavePayment = useCallback(async () => {
    if (!selectedAgency.trim()) {
      Alert.alert('Invalid Input', 'Please select an agency from the dropdown.');
      return;
    }
    if (!billNo.trim()) {
      Alert.alert('Invalid Input', 'Please enter a Bill Number.');
      return;
    }
    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive Paid Amount.');
      return;
    }

    // Get current office ID
    const officeId = getCurrentOfficeId();
    if (!officeId) {
      Alert.alert('Error', 'No office selected. Please contact administrator.');
      return;
    }

    setSaving(true);
    try {
      const newPaymentEntry: Omit<AgencyPayment, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'agency_id'> = {
        agency_name: selectedAgency,
        amount: amount,
        bill_no: billNo.trim(),
        payment_date: new Date().toISOString(),
        date: new Date().toISOString(),
        office_id: officeId,
        office_name: currentOffice?.name
      };

      const success = await saveAgencyPayment(newPaymentEntry);

      if (success) {
        // Trigger admin notification (only if user is not admin)
        console.log('🔔 Payment saved, checking notification conditions...');
        console.log('isAdmin:', isAdmin);
        console.log('profile:', profile);
        
        // Always send notification to admin (even if admin is adding the entry)
        if (profile) {
          console.log('🚀 Triggering admin notification for payment...');
          const userName = profile.username || profile.name || 'User';
          try {
            await DeviceNotificationService.notifyAdminEntryAdded(
              'Agency Payment',
              userName,
              { agency: selectedAgency, amount: amount, billNo: billNo.trim() }
            );
            console.log('✅ Admin notification sent successfully');
          } catch (notifError) {
            console.error('❌ Admin notification error:', notifError);
          }
        } else {
          console.log('❌ Notification not sent - no profile found');
        }
        
        Alert.alert('Success', 'Paid entry saved successfully!');
        setBillNo('');
        setPaidAmount('');
        loadData();
      } else {
        Alert.alert('Error', 'Failed to save paid entry. Please try again.');
      }
    } catch (error) {
      console.error('Save payment error:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving the payment.');
    } finally {
      setSaving(false);
    }
  }, [selectedAgency, billNo, paidAmount, loadData, isAdmin, profile, getCurrentOfficeId, currentOffice]);

  const PaidEntryItem = memo(({ item }: { item: AgencyPayment }) => {
    const formattedDate = useMemo(
      () => new Date(item.payment_date).toLocaleDateString('en-IN'),
      [item.payment_date]
    );

    const formattedAmount = useMemo(
      () => `₹${item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      [item.amount]
    );

    return (
      <View style={[GlobalStyles.card, styles.entryCard]}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryAgency} numberOfLines={1} ellipsizeMode="tail">
            {item.agency_name}
          </Text>
          <Text style={styles.entryDate}>{formattedDate}</Text>
        </View>
        <View style={styles.entryContent}>
          <Text style={styles.entryBillNo} numberOfLines={1} ellipsizeMode="tail">
            Bill No: {item.bill_no}
          </Text>
          <Text style={styles.entryAmount} numberOfLines={1}>
            {formattedAmount}
          </Text>
        </View>
      </View>
    );
  });

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 100, // Approximate height of each item
    offset: 100 * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: AgencyPayment) => item.id || String(Math.random()),
    []
  );

  const renderItem = useCallback(({ item }: { item: AgencyPayment }) => (
    <PaidEntryItem item={item} />
  ), []);

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <CommonHeader title="Paid Section" onBackPress={goBack} />

      <View style={GlobalStyles.card}>
        <View style={styles.cardContent}>
          <Text style={GlobalStyles.title}>Record Agency Payment</Text>
          {currentOffice && (
            <Text style={styles.officeText}>Office: {currentOffice.name}</Text>
          )}
          <Text style={styles.dateText}>Date: {currentDate}</Text>
          <Text style={styles.inputLabel}>Select Agency <Text style={styles.requiredStar}>*</Text></Text>
          <Dropdown
            options={agencyOptions}
            selectedValue={selectedAgency}
            onValueChange={setSelectedAgency}
            placeholder={agencyOptions.length > 0 ? "Select Agency" : "No Agencies Available"}
          />
          <Text style={styles.inputLabel}>Bill No. <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            placeholder="Bill No."
            placeholderTextColor={Colors.placeholder}
            value={billNo}
            onChangeText={setBillNo}
            style={GlobalStyles.input}
          />
          <Text style={styles.inputLabel}>Paid Amount <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            placeholder="Paid Amount"
            placeholderTextColor={Colors.placeholder}
            value={paidAmount}
            onChangeText={setPaidAmount}
            keyboardType="numeric"
            style={GlobalStyles.input}
          />
          <TouchableOpacity onPress={handleSavePayment} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}>
            <Text style={GlobalStyles.buttonPrimaryText}>{saving ? "Saving..." : "Save Paid Entry"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.listSectionTitle}>Recent Paid Entries ({paidEntries.length})</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : paidEntries.length > 0 ? (
        <FlatList
          data={paidEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={21}
          initialNumToRender={10}
          removeClippedSubviews={true}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="receipt-outline" size={48} color={Colors.textSecondary} style={styles.emptyIcon} />
                <Text style={styles.emptyStateText}>No paid entries found</Text>
                <Text style={styles.emptyStateText}>Add a new payment to get started</Text>
              </View>
            )
          }
        />
      ) : (
        <View style={[GlobalStyles.card, styles.noEntriesCard]}>
          <Icon name="cash-outline" size={40} color={Colors.textSecondary} style={styles.emptyIcon} />
          <Text style={GlobalStyles.bodyText}>No paid entries added yet.</Text>
        </View>
      )}
      
      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 0,
  },
  officeText: {
    textAlign: 'center',
    marginBottom: 8,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  requiredStar: {
    color: Colors.error,
    fontSize: 14,
  },
  listSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginHorizontal: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.textPrimary,
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  entryAgency: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  entryBillNo: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  entryBillNoPrimary: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  entryAmountLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
  noEntriesCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AgencyPaymentsScreen;