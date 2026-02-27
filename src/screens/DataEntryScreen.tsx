import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { MumbaiDeliveryTabParamList } from '../navigation/MumbaiDeliveryNavigator';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { useAlert } from '../context/AlertContext';
import { useOffice } from '../context/OfficeContext';
import { CommonHeader, CommonInput } from '../components';
import Icon from 'react-native-vector-icons/Ionicons';
import { DeliveryRecord } from '../data/Storage';
import { validateDeliveryRecord } from '../utils/ValidationUtils';
import { logError, logValidationError, logInfo } from '../utils/ErrorLogger';
import { ensureMumbaiAgency } from '../utils/ensureMumbaiAgency';

// Storage key for form data persistence - Validates: Requirement 9.4
const FORM_DATA_KEY = 'MUMBAI_DELIVERY_FORM_DATA';

type DataEntryScreenNavigationProp = NavigationProp<MumbaiDeliveryTabParamList, 'DataEntry'>;

interface DataEntryScreenProps {
  navigation: DataEntryScreenNavigationProp;
}

interface FormState {
  billtyNo: string;
  consigneeName: string;
  itemDescription: string;
  amount: string;
}

interface ValidationErrors {
  billtyNo?: string;
  consigneeName?: string;
  itemDescription?: string;
  amount?: string;
}

function DataEntryScreen({ navigation }: DataEntryScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { currentOffice, getCurrentOfficeId } = useOffice();
  const { goBack } = navigation;

  // Form state
  const [billtyNo, setBilltyNo] = useState<string>('');
  const [consigneeName, setConsigneeName] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const [recentEntries, setRecentEntries] = useState<DeliveryRecord[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * Load persisted form data on mount
   * Validates: Requirement 9.4
   */
  useEffect(() => {
    const loadFormData = async () => {
      try {
        const savedFormData = await AsyncStorage.getItem(FORM_DATA_KEY);
        if (savedFormData) {
          const formData = JSON.parse(savedFormData);
          setBilltyNo(formData.billtyNo || '');
          setConsigneeName(formData.consigneeName || '');
          setItemDescription(formData.itemDescription || '');
          setAmount(formData.amount || '');
          logInfo('Form data restored successfully');
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error('Failed to restore form data'), {
          functionName: 'DataEntryScreen.loadFormData',
          additionalInfo: 'Error loading persisted form data from AsyncStorage',
        });
      }
    };
    
    loadFormData();
  }, []);

  /**
   * Clear form data when office changes
   * Validates: Requirement 7.3
   */
  useEffect(() => {
    const handleOfficeChange = async () => {
      if (currentOffice) {
        logInfo('Office changed, clearing form data', {
          officeId: currentOffice.id,
          officeName: currentOffice.name,
        });
        await clearForm();
      }
    };
    
    handleOfficeChange();
  }, [currentOffice?.id]);

  /**
   * Persist form data when it changes
   * Validates: Requirement 9.4
   */
  useEffect(() => {
    const saveFormData = async () => {
      try {
        const formData = {
          billtyNo,
          consigneeName,
          itemDescription,
          amount,
        };
        await AsyncStorage.setItem(FORM_DATA_KEY, JSON.stringify(formData));
      } catch (error) {
        logError(error instanceof Error ? error : new Error('Failed to persist form data'), {
          functionName: 'DataEntryScreen.saveFormData',
          additionalInfo: 'Error saving form data to AsyncStorage',
        });
      }
    };
    
    // Debounce the save to avoid excessive writes
    const timeoutId = setTimeout(saveFormData, 500);
    return () => clearTimeout(timeoutId);
  }, [billtyNo, consigneeName, itemDescription, amount]);

  /**
   * Validate all input fields using comprehensive validation utilities
   * Returns true if all fields are valid, false otherwise
   * Validates: Requirements 1.3, 1.4, 1.5, 10.1
   */
  const validateInputs = (): boolean => {
    // Use comprehensive validation from ValidationUtils
    const validationResult = validateDeliveryRecord(
      billtyNo,
      consigneeName,
      itemDescription,
      amount
    );

    // Log validation errors (Requirement 10.7)
    if (!validationResult.isValid) {
      Object.entries(validationResult.errors).forEach(([field, error]) => {
        if (error) {
          logValidationError(field, { billtyNo, consigneeName, itemDescription, amount }[field], error);
        }
      });
    }

    setErrors(validationResult.errors);
    return validationResult.isValid;
  };

  /**
   * Clear all form fields
   * Validates: Requirement 1.7
   */
  const clearForm = async () => {
    setBilltyNo('');
    setConsigneeName('');
    setItemDescription('');
    setAmount('');
    setErrors({});
    
    // Clear persisted form data - Validates: Requirement 9.4
    try {
      await AsyncStorage.removeItem(FORM_DATA_KEY);
      logInfo('Form data cleared from storage');
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to clear form data'), {
        functionName: 'DataEntryScreen.clearForm',
        additionalInfo: 'Error clearing form data from AsyncStorage',
      });
    }
  };

  /**
   * Handle save delivery record
   * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 10.1, 10.5, 6.1
   */
  const handleSave = async () => {
    console.log('🎯 handleSave: Starting...');
    
    // Validate inputs with comprehensive validation
    const validationResult = validateDeliveryRecord(
      billtyNo,
      consigneeName,
      itemDescription,
      amount
    );

    if (!validationResult.isValid) {
      console.log('❌ Validation failed:', validationResult.errors);
      // Log validation errors
      Object.entries(validationResult.errors).forEach(([field, error]) => {
        if (error) {
          logValidationError(field, { billtyNo, consigneeName, itemDescription, amount }[field], error);
        }
      });
      
      // Show first error message using AlertContext (Requirement 10.6)
      const firstError = Object.values(validationResult.errors).find(err => err);
      if (firstError) {
        showAlert(firstError);
      }
      setErrors(validationResult.errors);
      return;
    }

    console.log('✅ Validation passed');
    setSaving(true);

    try {
      console.log('📦 Importing modules...');
      const { saveDeliveryRecord, getDeliveryRecords } = await import('../data/Storage');
      const { isOnline } = await import('../data/modules/NetworkHelper');
      
      // Check online status - Validates: Requirement 6.1
      console.log('🌐 Checking online status...');
      const online = await isOnline();
      console.log(`📡 Online: ${online}`);
      
      // Ensure Mumbai agency exists (only when online)
      if (online) {
        console.log('🏢 Ensuring Mumbai agency exists...');
        const agencyExists = await ensureMumbaiAgency();
        console.log(`🏢 Agency exists: ${agencyExists}`);
        if (!agencyExists) {
          logError(new Error('Mumbai agency check failed'), {
            functionName: 'DataEntryScreen.handleSave',
            additionalInfo: 'Could not verify or create Mumbai agency',
          });
          // Continue anyway - offline cache might have it
        }
      }
      
      // Check for duplicate billty number (Requirement 10.5)
      const officeId = getCurrentOfficeId();
      console.log('🏢 Current office ID:', officeId);
      
      if (officeId) {
        console.log('🔍 Checking for duplicates...');
        const existingRecords = await getDeliveryRecords(officeId, 'all');
        const duplicate = existingRecords.find(
          record => record.billty_no?.trim().toLowerCase() === billtyNo.trim().toLowerCase()
        );
        
        if (duplicate) {
          // Display warning but allow save to proceed
          console.log('⚠️ Duplicate found:', duplicate.id);
          logInfo('Duplicate billty number detected', {
            billtyNo: billtyNo.trim(),
            existingRecordId: duplicate.id,
          });
          showAlert(`Warning: Billty No "${billtyNo.trim()}" already exists for this office`);
          // Continue with save after showing warning
        } else {
          console.log('✅ No duplicates found');
        }
      }
      
      // Prepare delivery record
      const deliveryRecord = {
        billty_no: billtyNo.trim(),
        consignee_name: consigneeName.trim(),
        item_description: itemDescription.trim(),
        amount: parseFloat(amount),
        office_id: officeId || undefined,
        entry_date: new Date().toISOString().split('T')[0],
      };

      console.log('📝 Delivery record prepared:', {
        billty_no: deliveryRecord.billty_no,
        amount: deliveryRecord.amount,
        office_id: deliveryRecord.office_id,
      });

      logInfo('Saving delivery record', {
        billtyNo: deliveryRecord.billty_no,
        amount: deliveryRecord.amount,
        officeId: deliveryRecord.office_id,
        online,
      });

      // Save delivery record
      console.log('💾 Calling saveDeliveryRecord...');
      const success = await saveDeliveryRecord(deliveryRecord);
      console.log('💾 Save result:', success);

      if (success) {
        logInfo('Delivery record saved successfully', {
          billtyNo: deliveryRecord.billty_no,
          online,
        });
        
        // Show appropriate success message based on online status - Validates: Requirement 6.1
        if (!online) {
          showAlert('Working offline - data will sync when connected');
        } else {
          showAlert('Delivery record saved successfully!');
        }

        // Clear form for next entry (Requirement 1.7)
        await clearForm();

        // Send notification (Requirement 1.6)
        try {
          // Get current user info for notifications
          const userDataString = await AsyncStorage.getItem('user_profile');
          const userData = userDataString ? JSON.parse(userDataString) : null;
          const userName = userData?.name || 'User';
          
          // Send in-app notification
          const NotificationService = (await import('../services/NotificationService')).default;
          await NotificationService.notifyAdd(
            'mumbai_delivery',
            `New delivery: Billty No ${deliveryRecord.billty_no}, Amount ₹${deliveryRecord.amount}`
          );
          
          // Send device notification to admin
          const DeviceNotificationService = (await import('../services/DeviceNotificationService')).default;
          await DeviceNotificationService.notifyAdminEntryAdded(
            'Mumbai Delivery',
            userName,
            {
              billtyNo: deliveryRecord.billty_no,
              consigneeName: deliveryRecord.consignee_name,
              itemDescription: deliveryRecord.item_description,
              amount: deliveryRecord.amount,
              office: getCurrentOfficeId()
            }
          );
          
          console.log('✅ Notifications sent to admin for new delivery');
        } catch (notifError) {
          // Log but don't fail the save operation if notification fails
          logError(notifError instanceof Error ? notifError : new Error('Notification failed'), {
            functionName: 'DataEntryScreen.handleSave',
            additionalInfo: 'Failed to send notification after successful save',
          });
        }
      } else {
        logError(new Error('Save operation returned false'), {
          functionName: 'DataEntryScreen.handleSave',
          parameters: deliveryRecord,
          additionalInfo: 'saveDeliveryRecord returned false - Mumbai agency may not exist',
        });
        showAlert('Failed to save: Mumbai agency not found. Please contact administrator.');
      }

    } catch (error) {
      logError(error instanceof Error ? error : new Error('Unknown error during save'), {
        functionName: 'DataEntryScreen.handleSave',
        parameters: {
          billtyNo,
          consigneeName,
          itemDescription,
          amount,
        },
        additionalInfo: 'Error occurred while saving delivery record',
      });
      showAlert('An error occurred while saving delivery record.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Check if save button should be enabled
   * Validates: Requirement 1.2
   */
  const isSaveButtonEnabled = (): boolean => {
    return (
      billtyNo.trim() !== '' &&
      consigneeName.trim() !== '' &&
      itemDescription.trim() !== '' &&
      amount.trim() !== '' &&
      !saving
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* KeyboardAvoidingView wraps only the content area, not the navigator header
          This prevents the header (including back button) from flickering when keyboard opens
          Using 'padding' behavior for both platforms for smoother keyboard handling */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title}>Mumbai Delivery</Text>

          {/* Billty No Input - Validates: Requirement 1.1 */}
          <CommonInput
            label="Billty No"
            required
            placeholder="Enter billty number"
            value={billtyNo}
            onChangeText={setBilltyNo}
            error={errors.billtyNo}
            autoCapitalize="characters"
          />

          {/* Consignee Name Input - Validates: Requirement 1.1 */}
          <CommonInput
            label="Consignee Name"
            required
            placeholder="Enter consignee name"
            value={consigneeName}
            onChangeText={setConsigneeName}
            error={errors.consigneeName}
            autoCapitalize="words"
          />

          {/* Item Description Input - Validates: Requirement 1.1 */}
          <CommonInput
            label="Item Description"
            required
            placeholder="Enter item description"
            value={itemDescription}
            onChangeText={setItemDescription}
            error={errors.itemDescription}
            multiline
            style={styles.multilineInput}
          />

          {/* Amount Input - Validates: Requirement 1.1 */}
          <CommonInput
            label="Amount"
            required
            placeholder="Enter amount"
            value={amount}
            onChangeText={setAmount}
            error={errors.amount}
            keyboardType="numeric"
          />

          {/* Save Button - Validates: Requirement 1.2 */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isSaveButtonEnabled()}
            style={[
              GlobalStyles.buttonPrimary,
              !isSaveButtonEnabled() && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={GlobalStyles.buttonPrimaryText}>Save Delivery</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recent Entries Preview (Optional) */}
        {recentEntries.length > 0 && (
          <View style={[GlobalStyles.card, styles.recentEntriesCard]}>
            <Text style={styles.recentEntriesTitle}>Recent Entries</Text>
            {recentEntries.slice(0, 3).map((entry, index) => (
              <View key={entry.id} style={styles.recentEntryRow}>
                <Text style={styles.recentEntryText} numberOfLines={1}>
                  {entry.billty_no} - {entry.consignee_name}
                </Text>
                <Text style={styles.recentEntryAmount}>₹{entry.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={goBack}
        style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}
      >
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  secondaryButton: {
    marginTop: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  recentEntriesCard: {
    marginTop: 8,
  },
  recentEntriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  recentEntryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentEntryText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  recentEntryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
});

export default DataEntryScreen;
