// AddGeneralEntryScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, StatusBar, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { saveGeneralEntry, GeneralEntryInput, getAgencies } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAlert } from '../context/AlertContext';
import NotificationService from '../services/NotificationService';
import DeviceNotificationService from '../services/DeviceNotificationService';
import { supabase } from '../supabase';
import { CommonHeader, CommonInput } from '../components';
type AddGeneralEntryScreenNavigationProp = NavigationProp<RootStackParamList, 'AddGeneralEntry'>;

interface AddGeneralEntryScreenProps {
  navigation: AddGeneralEntryScreenNavigationProp;
}

function AddGeneralEntryScreen({ navigation }: AddGeneralEntryScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { goBack } = navigation;
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
  const [saving, setSaving] = useState<boolean>(false);
  const [agencyName, setAgencyName] = useState<string>('');
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getAgencies();
        if (!mounted) return;
        const opts = (list || []).map(a => ({ label: a.name, value: a.name }));
        setAgencyOptions(opts);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const handleSaveEntry = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Invalid Input', 'Please enter both description and amount.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Amount must be a positive number.');
      return;
    }

    setSaving(true);
    const input: GeneralEntryInput = {
      // Use description as a concise title; limit length to keep it tidy
      title: description.trim().slice(0, 60),
      amount: numAmount,
      entry_type: entryType,
      description: description.trim(),
      agency_name: agencyName || undefined,
    };

    try {
      const success = await saveGeneralEntry(input);

      if (success) {
        // Get current user info for notifications
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.full_name || user?.email || 'User';
        
        // Send notification to admin
        await NotificationService.notifyAdd('general_entry', `New ${entryType} entry: ₹${numAmount} - ${description.trim().slice(0, 30)}${description.trim().length > 30 ? '...' : ''}`);
        
        // Send device notification to admin
        await DeviceNotificationService.notifyAdminEntryAdded(
          'General Entry', 
          userName, 
          {
            type: entryType,
            amount: numAmount,
            description: description.trim(),
            agency: agencyName
          }
        );
        
        showAlert('Entry saved successfully!');
        // Reset fields for next entry
        setDescription('');
        setAmount('');
        setAgencyName('');
      } else {
        showAlert('Failed to save entry. Please try again.');
      }
    } catch (error) {
      console.error('Save entry error:', error);
      showAlert('An error occurred while saving entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={GlobalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <CommonHeader title="New Debit/Credit Entry" onBackPress={goBack} />

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title}>Add General Entry</Text>
          
          <CommonInput
            label="Description"
            required
            placeholder="e.g., Office Rent, Salary"
            value={description}
            onChangeText={setDescription}
            style={{ height: 80, textAlignVertical: 'top' }}
            multiline
          />
          
          <CommonInput
            label="Amount"
            required
            placeholder="e.g., 5000"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          
          
          <Text style={styles.inputLabel}>Entry Type <Text style={styles.requiredStar}>*</Text></Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              onPress={() => setEntryType('debit')}
              style={[styles.radioOption, entryType === 'debit' && styles.radioOptionSelected]}
            >
              <Icon name="arrow-up-circle-outline" size={24} color={entryType === 'debit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.radioText, entryType === 'debit' && styles.radioTextSelected]}>Debit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEntryType('credit')}
              style={[styles.radioOption, entryType === 'credit' && styles.radioOptionSelected]}
            >
              <Icon name="arrow-down-circle-outline" size={24} color={entryType === 'credit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.radioText, entryType === 'credit' && styles.radioTextSelected]}>Credit</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={handleSaveEntry} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}>
            <Text style={GlobalStyles.buttonPrimaryText}>{saving ? 'Saving...' : 'Save Entry'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
    flexGrow: 1,
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
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    elevation: 1,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  radioOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  radioTextSelected: {
    color: Colors.surface,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
});

export default AddGeneralEntryScreen;