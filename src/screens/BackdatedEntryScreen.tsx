// src/screens/BackdatedEntryScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StatusBar, 
  Platform, 
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { 
  saveAgencyEntry, 
  saveAgencyMajuri, 
  saveGeneralEntry,
  saveTruckFuel,
  saveUppadJamaEntry,
  saveAgencyPayment,
  getAgencies,
  Agency
} from '../data/Storage';
import { useAlert } from '../context/AlertContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomDropdown from '../components/Dropdown';
import NotificationService from '../services/NotificationService';
import { supabase } from '../supabase';
import { useOffice } from '../context/OfficeContext';

type BackdatedEntryScreenNavigationProp = NavigationProp<RootStackParamList, 'BackdatedEntry'>;

interface BackdatedEntryScreenProps {
  navigation: BackdatedEntryScreenNavigationProp;
}

type EntryType = 'majuri' | 'agency' | 'general' | 'mumbai_delivery' | 'paid_section' | 'uppad_jama' | 'fuel';

interface EntryTypeOption {
  label: string;
  value: EntryType;
  icon: string;
  description: string;
}

const entryTypeOptions: EntryTypeOption[] = [
  {
    label: 'Majuri Entry',
    value: 'majuri',
    icon: 'hammer-outline',
    description: 'Add labor charges for agencies'
  },
  {
    label: 'Agency Entry',
    value: 'agency',
    icon: 'business-outline',
    description: 'General agency transactions'
  },
  {
    label: 'Mumbai Delivery',
    value: 'mumbai_delivery',
    icon: 'car-outline',
    description: 'Mumbai delivery entries'
  },
  {
    label: 'General Entry',
    value: 'general',
    icon: 'journal-outline',
    description: 'General income/expense entries'
  },
  {
    label: 'Paid Section',
    value: 'paid_section',
    icon: 'card-outline',
    description: 'Payment transactions'
  },
  {
    label: 'Uppad/Jama',
    value: 'uppad_jama',
    icon: 'people-outline',
    description: 'Uppad and Jama entries'
  },
  {
    label: 'Fuel Entry',
    value: 'fuel',
    icon: 'water-outline',
    description: 'Truck fuel expenses'
  }
];

function BackdatedEntryScreen({ navigation }: BackdatedEntryScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const { getCurrentOfficeId } = useOffice();
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);
  
  // Common states
  const [selectedEntryType, setSelectedEntryType] = useState<EntryType | null>(null);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Entry type specific states
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('credit');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [uppadJamaType, setUppadJamaType] = useState<'uppad' | 'jama'>('uppad');
  const [truckNumber, setTruckNumber] = useState<string>('');
  const [fuelQuantity, setFuelQuantity] = useState<string>('');
  const [ratePerLiter, setRatePerLiter] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [billNo, setBillNo] = useState<string>('');
  
  // Check admin status on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Access Denied', 'Please login to access this feature.');
          goBack();
          return;
        }
        
        const ADMIN_EMAIL = 'yashbhavsar175@gmail.com';
        const isUserAdmin = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        if (!isUserAdmin) {
          Alert.alert('Access Denied', 'This feature is only available to administrators.');
          goBack();
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        Alert.alert('Error', 'Failed to verify access permissions.');
        goBack();
      } finally {
        setAdminLoading(false);
      }
    };
    
    checkAdminAccess();
  }, [goBack]);
  
  // Options
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAgencyDropdown, setShowAgencyDropdown] = useState<boolean>(false);

  useEffect(() => {
    loadOptionsData();
  }, []);

  const loadOptionsData = async () => {
    setLoading(true);
    try {
      const agencyData = await getAgencies();
      setAgencies(agencyData);
    } catch (error) {
      console.error('Error loading options:', error);
      showAlert('Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setSelectedAgency('');
    setTruckNumber('');
    setFuelQuantity('');
    setRatePerLiter('');
    setPersonName('');
    setBillNo('');
    setDate(new Date());
    setShowAgencyDropdown(false);
  };

  const validateFields = () => {
    if (!selectedEntryType) {
      showAlert('Select entry type');
      return false;
    }
    if (!description.trim() && selectedEntryType !== 'uppad_jama' && selectedEntryType !== 'paid_section' && selectedEntryType !== 'majuri' && selectedEntryType !== 'mumbai_delivery') {
      showAlert('Enter description');
      return false;
    }
    if (!amount.trim()) {
      showAlert('Enter amount');
      return false;
    }
    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert('Enter valid amount');
      return false;
    }
    
    // Specific validations
    if ((selectedEntryType === 'majuri' || selectedEntryType === 'agency') && !selectedAgency) {
      showAlert('Select agency');
      return false;
    }
    
    if (selectedEntryType === 'uppad_jama' && !personName.trim()) {
      showAlert('Enter person name');
      return false;
    }
    
    if (selectedEntryType === 'paid_section' && !billNo.trim()) {
      showAlert('Enter bill number');
      return false;
    }
    
    if (selectedEntryType === 'fuel') {
      if (!truckNumber.trim()) {
        showAlert('Enter truck number');
        return false;
      }
      if (!fuelQuantity.trim() || isNaN(parseFloat(fuelQuantity)) || parseFloat(fuelQuantity) <= 0) {
        showAlert('Enter valid fuel quantity');
        return false;
      }
      if (!ratePerLiter.trim() || isNaN(parseFloat(ratePerLiter)) || parseFloat(ratePerLiter) <= 0) {
        showAlert('Enter valid rate per liter');
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    setSaving(true);
    try {
      const numericAmount = parseFloat(amount.trim());
      let success = false;

      switch (selectedEntryType) {
        case 'majuri':
          success = await saveAgencyMajuri({
            agency_name: selectedAgency,
            description: description.trim(),
            amount: numericAmount,
            majuri_date: date.toISOString(),
            office_id: getCurrentOfficeId() || undefined
          });
          break;

        case 'agency':
          success = await saveAgencyEntry({
            agency_name: selectedAgency,
            description: description.trim(),
            amount: numericAmount,
            entry_type: entryType,
            entry_date: date.toISOString(),
          });
          break;

        case 'mumbai_delivery':
          success = await saveAgencyEntry({
            agency_name: 'Mumbai',
            description: description.trim(),
            amount: numericAmount,
            entry_type: 'credit' as 'credit',
            entry_date: date.toISOString(),
            delivery_status: 'yes' as 'yes',
          });
          break;

        case 'general':
          success = await saveGeneralEntry({
            description: description.trim(),
            amount: numericAmount,
            entry_type: entryType,
            entry_date: date.toISOString(),
            charAt: function (): string {
              throw new Error('Function not implemented.');
            },
            charCodeAt: function (index: number): number {
              throw new Error('Function not implemented.');
            },
            concat: function (...strings: string[]): string {
              throw new Error('Function not implemented.');
            },
            indexOf: function (searchString: string, position?: number): number {
              throw new Error('Function not implemented.');
            },
            lastIndexOf: function (searchString: string, position?: number): number {
              throw new Error('Function not implemented.');
            },
            localeCompare: function (that: string): number {
              throw new Error('Function not implemented.');
            },
            match: function (regexp: string | RegExp): RegExpMatchArray | null {
              throw new Error('Function not implemented.');
            },
            replace: function (searchValue: string | RegExp, replaceValue: string): string {
              throw new Error('Function not implemented.');
            },
            search: function (regexp: string | RegExp): number {
              throw new Error('Function not implemented.');
            },
            slice: function (start?: number, end?: number): string {
              throw new Error('Function not implemented.');
            },
            split: function (separator: string | RegExp, limit?: number): string[] {
              throw new Error('Function not implemented.');
            },
            substring: function (start: number, end?: number): string {
              throw new Error('Function not implemented.');
            },
            toLowerCase: function (): string {
              throw new Error('Function not implemented.');
            },
            toLocaleLowerCase: function (locales?: string | string[]): string {
              throw new Error('Function not implemented.');
            },
            toUpperCase: function (): string {
              throw new Error('Function not implemented.');
            },
            toLocaleUpperCase: function (locales?: string | string[]): string {
              throw new Error('Function not implemented.');
            },
            trim: function (): string {
              throw new Error('Function not implemented.');
            },
            length: 0,
            substr: function (from: number, length?: number): string {
              throw new Error('Function not implemented.');
            },
            codePointAt: function (pos: number): number | undefined {
              throw new Error('Function not implemented.');
            },
            includes: function (searchString: string, position?: number): boolean {
              throw new Error('Function not implemented.');
            },
            endsWith: function (searchString: string, endPosition?: number): boolean {
              throw new Error('Function not implemented.');
            },
            normalize: function (form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string {
              throw new Error('Function not implemented.');
            },
            repeat: function (count: number): string {
              throw new Error('Function not implemented.');
            },
            startsWith: function (searchString: string, position?: number): boolean {
              throw new Error('Function not implemented.');
            },
            anchor: function (name: string): string {
              throw new Error('Function not implemented.');
            },
            big: function (): string {
              throw new Error('Function not implemented.');
            },
            blink: function (): string {
              throw new Error('Function not implemented.');
            },
            bold: function (): string {
              throw new Error('Function not implemented.');
            },
            fixed: function (): string {
              throw new Error('Function not implemented.');
            },
            fontcolor: function (color: string): string {
              throw new Error('Function not implemented.');
            },
            fontsize: function (size: number): string {
              throw new Error('Function not implemented.');
            },
            italics: function (): string {
              throw new Error('Function not implemented.');
            },
            link: function (url: string): string {
              throw new Error('Function not implemented.');
            },
            small: function (): string {
              throw new Error('Function not implemented.');
            },
            strike: function (): string {
              throw new Error('Function not implemented.');
            },
            sub: function (): string {
              throw new Error('Function not implemented.');
            },
            sup: function (): string {
              throw new Error('Function not implemented.');
            },
            padStart: function (maxLength: number, fillString?: string): string {
              throw new Error('Function not implemented.');
            },
            padEnd: function (maxLength: number, fillString?: string): string {
              throw new Error('Function not implemented.');
            },
            trimEnd: function (): string {
              throw new Error('Function not implemented.');
            },
            trimStart: function (): string {
              throw new Error('Function not implemented.');
            },
            trimLeft: function (): string {
              throw new Error('Function not implemented.');
            },
            trimRight: function (): string {
              throw new Error('Function not implemented.');
            },
            matchAll: function (regexp: RegExp): RegExpStringIterator<RegExpExecArray> {
              throw new Error('Function not implemented.');
            },
            replaceAll: function (searchValue: string | RegExp, replaceValue: string): string {
              throw new Error('Function not implemented.');
            },
            at: function (index: number): string | undefined {
              throw new Error('Function not implemented.');
            },
            [Symbol.iterator]: function (): StringIterator<string> {
              throw new Error('Function not implemented.');
            }
          }, {});
          break;

        case 'paid_section':
          success = await saveAgencyPayment({
            agency_name: selectedAgency,
            amount: numericAmount,
            bill_no: billNo.trim(),
            payment_date: date.toISOString(),
            office_id: getCurrentOfficeId() || undefined
          });
          break;

        case 'uppad_jama':
          success = await saveUppadJamaEntry({
            person_name: personName.trim(),
            amount: numericAmount,
            entry_type: entryType,
            description: `${uppadJamaType} - ${personName.trim()}`,
            entry_date: date.toISOString(),
          });
          break;

        case 'fuel':
          const calculatedAmount = parseFloat(fuelQuantity) * parseFloat(ratePerLiter);
          success = await saveTruckFuel({
            truck_number: truckNumber.trim(),
            fuel_type: 'Diesel' as 'Diesel',
            quantity: parseFloat(fuelQuantity),
            price_per_liter: parseFloat(ratePerLiter),
            total_price: calculatedAmount,
          });
          break;
      }

      if (success) {
        // Send notification to admin
        const entryTypeName = entryTypeOptions.find(t => t.value === selectedEntryType)?.label || selectedEntryType;
        await NotificationService.notifyAdd(selectedEntryType as any, `Backdated ${entryTypeName}: ₹${numericAmount} for ${date.toLocaleDateString('en-IN')}`);
        
        showAlert(`${entryTypeName} saved successfully for ${date.toLocaleDateString('en-IN')}!`);
        resetForm();
      } else {
        showAlert('Failed to save entry');
      }
    } catch (error) {
      console.error('Save entry error:', error);
      showAlert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const renderEntryTypeSelection = () => (
    <View style={styles.entryTypeContainer}>
      <Text style={styles.sectionTitle}>Select Entry Type</Text>
      <View style={styles.entryTypeGrid}>
        {entryTypeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.entryTypeCard,
              selectedEntryType === option.value && styles.entryTypeCardSelected
            ]}
            onPress={() => setSelectedEntryType(option.value)}
            activeOpacity={0.8}
          >
            <Icon
              name={option.icon}
              size={24}
              color={selectedEntryType === option.value ? Colors.surface : Colors.primary}
            />
            <Text style={[
              styles.entryTypeLabel,
              selectedEntryType === option.value && styles.entryTypeLabelSelected
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.entryTypeDescription,
              selectedEntryType === option.value && styles.entryTypeDescriptionSelected
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFormFields = () => {
    if (!selectedEntryType) return null;

    const agencyOptions = agencies.map(agency => ({
      label: agency.name,
      value: agency.name
    }));

    return (
      <View style={[GlobalStyles.card, styles.formCard]}>
        <Text style={styles.formTitle}>
          {entryTypeOptions.find(t => t.value === selectedEntryType)?.label} - Backdated Entry
        </Text>
        
        {/* Date Field with DateTimePicker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date <Text style={styles.requiredStar}>*</Text></Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[GlobalStyles.input, styles.dateInput]}>
            <Text style={styles.dateText}>{date.toLocaleDateString('en-IN')}</Text>
            <Icon name="calendar-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Agency Selection with CustomDropdown (for majuri, agency, paid_section) */}
        {(selectedEntryType === 'majuri' || selectedEntryType === 'agency' || selectedEntryType === 'paid_section') && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select Agency <Text style={styles.requiredStar}>*</Text></Text>
            <CustomDropdown
              options={agencyOptions}
              selectedValue={selectedAgency}
              onValueChange={setSelectedAgency}
              placeholder="Choose an agency"
            />
          </View>
        )}

        {/* Bill Number for Paid Section */}
        {selectedEntryType === 'paid_section' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bill Number <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={billNo}
              onChangeText={setBillNo}
              placeholder="Enter bill number"
              placeholderTextColor={Colors.placeholder}
            />
          </View>
        )}

        {/* Person Name for Uppad/Jama */}
        {selectedEntryType === 'uppad_jama' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Person Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={personName}
              onChangeText={setPersonName}
              placeholder="Enter person name"
              placeholderTextColor={Colors.placeholder}
            />
          </View>
        )}

        {/* Truck Number for Fuel */}
        {selectedEntryType === 'fuel' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Truck Number <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={truckNumber}
              onChangeText={setTruckNumber}
              placeholder="Enter truck number"
              placeholderTextColor={Colors.placeholder}
            />
          </View>
        )}

        {/* Fuel Quantity for Fuel */}
        {selectedEntryType === 'fuel' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fuel Quantity (Liters) <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={fuelQuantity}
              onChangeText={setFuelQuantity}
              placeholder="Enter fuel quantity"
              placeholderTextColor={Colors.placeholder}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Rate per Liter for Fuel */}
        {selectedEntryType === 'fuel' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rate per Liter <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={ratePerLiter}
              onChangeText={setRatePerLiter}
              placeholder="Enter rate per liter"
              placeholderTextColor={Colors.placeholder}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Calculated Amount for Fuel */}
        {selectedEntryType === 'fuel' && fuelQuantity && ratePerLiter && (
          <View style={styles.calculatedAmount}>
            <Text style={styles.calculatedAmountLabel}>Total Amount:</Text>
            <Text style={styles.calculatedAmountValue}>
              ₹{(parseFloat(fuelQuantity || '0') * parseFloat(ratePerLiter || '0')).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Description Field (not for uppad_jama and paid_section) */}
        {selectedEntryType !== 'uppad_jama' && selectedEntryType !== 'paid_section' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Description {!(selectedEntryType === 'majuri' || selectedEntryType === 'mumbai_delivery') && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            <TextInput
              style={[GlobalStyles.input, styles.input]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor={Colors.placeholder}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* Amount Field (auto-calculated for fuel) */}
        {selectedEntryType !== 'fuel' && (
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
        )}

        {/* Uppad/Jama Type Selection */}
        {selectedEntryType === 'uppad_jama' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Uppad/Jama Type</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioOption, uppadJamaType === 'uppad' && styles.radioOptionSelected]}
                onPress={() => setUppadJamaType('uppad')}
              >
                <Text style={[styles.radioText, uppadJamaType === 'uppad' && styles.radioTextSelected]}>Uppad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, uppadJamaType === 'jama' && styles.radioOptionSelected]}
                onPress={() => setUppadJamaType('jama')}
              >
                <Text style={[styles.radioText, uppadJamaType === 'jama' && styles.radioTextSelected]}>Jama</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Entry Type (for agency, general, uppad_jama entries, but not Mumbai delivery, majuri, paid_section or fuel) */}
        {selectedEntryType !== 'majuri' && selectedEntryType !== 'mumbai_delivery' && selectedEntryType !== 'fuel' && selectedEntryType !== 'paid_section' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Entry Type</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioOption, entryType === 'debit' && styles.radioOptionSelected]}
                onPress={() => setEntryType('debit')}
              >
                <Text style={[styles.radioText, entryType === 'debit' && styles.radioTextSelected]}>
                  {selectedEntryType === 'general' ? 'Expense' : 
                   selectedEntryType === 'uppad_jama' ? 'Given' : 'Debit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, entryType === 'credit' && styles.radioOptionSelected]}
                onPress={() => setEntryType('credit')}
              >
                <Text style={[styles.radioText, entryType === 'credit' && styles.radioTextSelected]}>
                  {selectedEntryType === 'general' ? 'Income' : 
                   selectedEntryType === 'uppad_jama' ? 'Received' : 'Credit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Helper text for Paid Section */}
        {selectedEntryType === 'paid_section' && (
          <Text style={styles.helperText}>This will be saved as agency payment transaction</Text>
        )}

        {/* Helper text for Mumbai delivery */}
        {selectedEntryType === 'mumbai_delivery' && (
          <Text style={styles.helperText}>This will be automatically set as Mumbai delivery (Credit)</Text>
        )}

        {/* Helper text for Fuel */}
        {selectedEntryType === 'fuel' && (
          <Text style={styles.helperText}>Amount will be calculated automatically from quantity × rate</Text>
        )}

        <TouchableOpacity
          onPress={handleSave}
          style={[GlobalStyles.buttonPrimary, styles.saveButton, saving && styles.disabledButton]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <Text style={GlobalStyles.buttonPrimaryText}>Save Backdated Entry</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading options...</Text>
      </View>
    );
  }

  // Show loading screen while checking admin access
  if (adminLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { marginTop: 10 }]}>Verifying access...</Text>
      </View>
    );
  }

  // If not admin, this component won't render (user will be redirected)
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Backdated Entry</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {renderEntryTypeSelection()}
            {renderFormFields()}
          </View>
        </ScrollView>

        {/* DateTimePicker */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 18,
  },
  backButton: {
    paddingRight: 10,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  entryTypeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  entryTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  entryTypeCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 90,
    marginBottom: 8,
  },
  entryTypeCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  entryTypeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  entryTypeLabelSelected: {
    color: Colors.surface,
  },
  entryTypeDescription: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  entryTypeDescriptionSelected: {
    color: Colors.surface,
    opacity: 0.9,
  },
  formCard: {
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    maxHeight: 150,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownOptionSelected: {
    backgroundColor: Colors.primary,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownOptionTextSelected: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  radioOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  radioTextSelected: {
    color: Colors.surface,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  calculatedAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  calculatedAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  calculatedAmountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
});

export default BackdatedEntryScreen;
