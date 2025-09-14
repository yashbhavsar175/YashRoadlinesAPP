import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, TextInput, TouchableOpacity, StatusBar, Platform, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { saveAgencyPayment, getAgencies, Agency, AgencyPayment, getAgencyPaymentsLocal } from '../data/Storage';
import { useAlert } from '../context/AlertContext';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Dropdown from '../components/Dropdown';
import Icon from 'react-native-vector-icons/Ionicons';

type PaidSectionScreenNavigationProp = NavigationProp<RootStackParamList, 'PaidSection'>;

interface PaidSectionScreenProps {
  navigation: PaidSectionScreenNavigationProp;
}

function PaidSectionScreen({ navigation }: PaidSectionScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [billNo, setBillNo] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paidEntries, setPaidEntries] = useState<AgencyPayment[]>([]);
  const [displayedEntries, setDisplayedEntries] = useState<AgencyPayment[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const storedEntries: AgencyPayment[] = await getAgencyPaymentsLocal();
      const sortedEntries = storedEntries.sort((a, b) => {
        const dateA = new Date(a.payment_date).getTime();
        const dateB = new Date(b.payment_date).getTime();
        return dateB - dateA;
      });
      setPaidEntries(sortedEntries);
      setDisplayedEntries(sortedEntries.slice(0, 10));

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
      showAlert('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );

  const handleSavePayment = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    if (!selectedAgency) {
      showAlert('Please select an agency');
      return;
    }

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }

    if (!billNo.trim()) {
      showAlert('Please enter a bill number');
      return;
    }

    // Helper to perform the actual save
    const doSave = async () => {
      setSaving(true);
      const newPaymentEntry: Omit<AgencyPayment, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'agency_id'> = {
        agency_name: selectedAgency,
        amount: amount,
        bill_no: billNo.trim(),
        payment_date: new Date().toISOString(),
        date: new Date().toISOString()
      };

      const success = await saveAgencyPayment(newPaymentEntry);

      if (success) {
        showAlert('Payment saved successfully');
        setBillNo('');
        setPaidAmount('');
        await loadData();
      } else {
        showAlert('Failed to save payment');
      }
      setSaving(false);
    };

    // Duplicate bill check (same agency + same bill no)
    const normalizedNewBill = billNo.trim().toLowerCase();
    const hasDuplicate = paidEntries.some(e =>
      e.agency_name === selectedAgency && (e.bill_no || '').trim().toLowerCase() === normalizedNewBill
    );

    if (hasDuplicate) {
      // Show confirmation using Alert
      Alert.alert(
        'Duplicate Bill',
        `A payment with bill number "${billNo.trim()}" already exists for ${selectedAgency}. Do you want to save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: doSave },
        ]
      );
      return;
    }

    // No duplicate, proceed normally
    await doSave();
  };

  const renderPaidEntryItem = ({ item }: { item: AgencyPayment }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{item.agency_name}</Text>
        <Text style={styles.entryDate}>{new Date(item.payment_date).toLocaleDateString('en-IN')}</Text>
      </View>
      <Text style={styles.entryBillNo}>Bill No: {item.bill_no || 'N/A'}</Text>
      <View style={styles.entryFooter}>
        <Text style={styles.entryAmountLabel}>Amount:</Text>
        <Text style={styles.entryAmount}>₹{item.amount.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paid Section</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={GlobalStyles.card}>
        <View style={styles.cardContent}>
          <Text style={GlobalStyles.title}>Record Agency Payment</Text>
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

      <Text style={styles.listSectionTitle}>Recent Paid Entries</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : displayedEntries.length > 0 ? (
        <FlatList
          data={displayedEntries}
          renderItem={renderPaidEntryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  cardContent: {
    padding: 0,
  },
  dateText: {
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 16,
    textAlign: 'left',
    color: Colors.textPrimary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginHorizontal: 16,
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
  entryBillNo: {
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
    paddingBottom: 16,
    paddingTop: 4,
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
    backgroundColor: Colors.primary,
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
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
  emptyIcon: {
    marginBottom: 10,
    opacity: 0.5,
  },
});

export default PaidSectionScreen;