// AddGeneralEntryScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Text, StatusBar, Platform, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { saveGeneralEntry, GeneralEntryInput, getAgencies } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAlert } from '../context/AlertContext';
import ActivityNotificationService from '../services/ActivityNotificationService';
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
        // Send push notification to admin
        await ActivityNotificationService.notifyGeneralEntry(
          'add',
          `${entryType.toUpperCase()}: ₹${numAmount} - ${description.trim().slice(0, 30)}${description.trim().length > 30 ? '...' : ''}`
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

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Debit/Credit Entry</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title}>Add General Entry</Text>
          
          <Text style={styles.inputLabel}>Description <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            placeholder="e.g., Office Rent, Salary"
            placeholderTextColor={Colors.placeholder}
            value={description}
            onChangeText={setDescription}
            style={[GlobalStyles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
          />
          
          <Text style={styles.inputLabel}>Amount <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            placeholder="e.g., 5000"
            placeholderTextColor={Colors.placeholder}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={GlobalStyles.input}
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