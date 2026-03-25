// AgencyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { useAlert } from '../context/AlertContext';
import {
  getAgencies,
  getAgencyEntry,
  saveAgencyEntry,
  deleteTransactionByIdImproved,
  Agency,
  AgencyEntry,
  syncAllDataFixed,
  OFFLINE_KEYS,
} from '../data/Storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

// Custom Dropdown component
interface CustomDropdownProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label: string;
}

const CustomDropdown = ({ options, selectedValue, onValueChange, placeholder, label }: CustomDropdownProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, width: 0, left: 0 });
  const dropdownRef = useRef<View>(null);

  const toggleModal = () => {
    if (isModalVisible) {
      setIsModalVisible(false);
    } else {
      dropdownRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y + height, width, left: x });
        setIsModalVisible(true);
      });
    }
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsModalVisible(false);
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  return (
    <View style={{ zIndex: isModalVisible ? 100 : 0 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity onPress={toggleModal} style={styles.dropdownToggle} ref={dropdownRef}>
        <Text style={styles.dropdownText}>{selectedLabel}</Text>
        <Icon name={isModalVisible ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
          <View style={[styles.dropdownList, { top: dropdownPosition.top, width: dropdownPosition.width, left: dropdownPosition.left }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelect(item.value)} style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

type AgencyEntryScreenNavigationProp = NavigationProp<RootStackParamList, 'AgencyEntry'>;

interface AgencyEntryScreenProps {
  navigation: AgencyEntryScreenNavigationProp;
}

const AgencyEntryScreen = ({ navigation }: AgencyEntryScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recentEntries, setRecentEntries] = useState<AgencyEntry[]>([]);
  const isMountedRef = useRef(true);

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (!isMountedRef.current) return;
    if (showLoading) setLoading(true);
    try {
      const storedAgencies = await getAgencies();
      if (isMountedRef.current) {
        setAgencies(storedAgencies);
        const options = storedAgencies.map(agency => ({ label: agency.name, value: agency.name }));
        setAgencyOptions(options);
        if (options.length > 0 && !selectedAgency) {
          setSelectedAgency(options[0].value);
        } else if (options.length === 0) {
          setSelectedAgency('');
        }
      }
      
      const allEntries = await getAgencyEntry();
      if (isMountedRef.current) {
        const agencyEntries = allEntries.filter(entry => entry.agency_name === selectedAgency);
        setRecentEntries(agencyEntries);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('Failed to load data');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [selectedAgency]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
      await loadData(false);
    } catch (error) {
      console.error('Sync failed:', error);
      showAlert('Using offline data');
      await loadData(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!selectedAgency || !description.trim() || !amount.trim()) {
      showAlert('Please fill all fields');
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
        agency_name: selectedAgency,
        description: description.trim(),
        amount: numericAmount,
        entry_type: entryType,
        entry_date: date.toISOString(),
      };
      const success = await saveAgencyEntry(entryData);
      if (success) {
        // Notification handled by AdminEntryNotificationService in Storage.ts
        
        // Using a small timeout to ensure the alert is shown after the state updates
        setTimeout(() => {
          showAlert('Entry saved successfully!');
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
  
  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const entryToDelete = recentEntries.find(entry => entry.id === id);
              const success = await deleteTransactionByIdImproved(id, OFFLINE_KEYS.AGENCY_ENTRIES);
              if (success) {
                // Notification handled by AdminEntryNotificationService in Storage.ts
                
                const updatedEntries = recentEntries.filter(entry => entry.id !== id);
                setRecentEntries(updatedEntries);
                showAlert('Entry deleted successfully!');
              } else {
                showAlert('Failed to delete entry');
              }
            } catch (error) {
              console.error('Delete error:', error);
              showAlert('Error deleting entry');
            }
          }
        }
      ]
    );
  };
  
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const renderEntryItem = ({ item }: { item: AgencyEntry }) => {
    const isCredit = item.entry_type === 'credit';
    
    return (
      <LongPressGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            handleDeleteEntry(item.id);
          }
        }}
        minDurationMs={800}
      >
        <View style={[GlobalStyles.card, styles.entryCard]}>
          <View style={styles.entryHeader}>
            <View style={[
              styles.typeChip,
              isCredit ? styles.creditChip : styles.debitChip
            ]}>
              <Text style={styles.chipText}>{isCredit ? 'Credit' : 'Debit'}</Text>
            </View>
            <Text style={styles.entryDate}>{new Date(item.entry_date).toLocaleDateString('en-IN')}</Text>
          </View>
          <View style={styles.entryContent}>
            <Text style={styles.entryDescription}>{item.description}</Text>
            <Text style={[styles.entryAmount, isCredit ? styles.creditAmount : styles.debitAmount]}>
              {isCredit ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </LongPressGestureHandler>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <View style={styles.header}>
          {/* Left: Back Button */}
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          
          {/* Center: Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Agency Entry</Text>
          </View>
          
          {/* Right: Spacer */}
          <View style={styles.headerSpacer} />
        </View>
        
        <FlatList
          data={recentEntries}
          renderItem={renderEntryItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={GlobalStyles.card}>
              <View style={styles.cardContent}>
                <Text style={[GlobalStyles.title, styles.cardTitle]}>Add New Agency Entry</Text>
                
                <CustomDropdown
                  label="Select Agency"
                  options={agencyOptions}
                  selectedValue={selectedAgency}
                  onValueChange={setSelectedAgency}
                  placeholder="Choose an agency"
                />

                <Text style={styles.inputLabel}>Description <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={GlobalStyles.input}
                  placeholder="Enter a description"
                  placeholderTextColor={Colors.placeholder}
                  value={description}
                  onChangeText={setDescription}
                />
                
                <Text style={styles.inputLabel}>Amount <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={GlobalStyles.input}
                  placeholder="Enter amount"
                  placeholderTextColor={Colors.placeholder}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Entry Type</Text>
                <View style={styles.radioContainer}>
                  {/* Debit Option (First) */}
                  <TouchableOpacity
                    style={[styles.radioOption, entryType === 'debit' && styles.radioOptionSelected]}
                    onPress={() => setEntryType('debit')}
                  >
                    <Icon name="arrow-up-circle-outline" size={24} color={entryType === 'debit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.radioText, entryType === 'debit' && styles.radioTextSelected]}>Debit</Text>
                  </TouchableOpacity>
                  {/* Credit Option (Second) */}
                  <TouchableOpacity
                    style={[styles.radioOption, entryType === 'credit' && styles.radioOptionSelected]}
                    onPress={() => setEntryType('credit')}
                  >
                    <Icon name="arrow-down-circle-outline" size={24} color={entryType === 'credit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.radioText, entryType === 'credit' && styles.radioTextSelected]}>Credit</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[GlobalStyles.input, styles.dateInput]}>
                  <Text style={styles.dateInputText}>{date.toLocaleDateString('en-IN')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleSaveEntry} 
                  disabled={saving} 
                  style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}
                >
                  <Text style={GlobalStyles.buttonPrimaryText}>{saving ? 'Saving...' : 'Save Entry'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={() => {
            if (loading || refreshing) return null;
            return (
              <View style={[GlobalStyles.card, styles.emptyStateCard]}>
                <Text style={styles.emptyStateIcon}>📝</Text>
                <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Recent Entries</Text>
                <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
                  Entries for {selectedAgency || 'the selected agency'} will appear here.
                </Text>
                <TouchableOpacity onPress={handleRefresh} style={GlobalStyles.buttonPrimary}>
                  <Text style={GlobalStyles.buttonPrimaryText}>Refresh Data</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
        
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    position: 'absolute',
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
    paddingBottom: 20,
  },
  cardContent: {
    padding: 0,
  },
  cardTitle: {
    marginBottom: 16,
    fontSize: 22,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  requiredStar: {
    color: Colors.error,
    fontSize: 14,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  radioOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  radioTextSelected: {
    color: Colors.surface,
  },
  dateInput: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginBottom: 10,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  entryCard: {
    padding: 15,
    marginVertical: 5,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditChip: {
    backgroundColor: Colors.success,
  },
  debitChip: {
    backgroundColor: Colors.error,
  },
  chipText: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 12,
  },
  entryDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDescription: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: Colors.success,
  },
  debitAmount: {
    color: Colors.error,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 10,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  deliveryOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  deliveryOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deliveryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deliveryTextSelected: {
    color: Colors.surface,
  },
});

export default AgencyEntryScreen;