// NotificationIntegrationExample.tsx
// This shows how to integrate notifications in your actual screen files
// Copy the notification code from here to your existing screens

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Text, StatusBar, Platform, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { saveGeneralEntry, GeneralEntryInput, getAgencies } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAlert } from '../context/AlertContext';

// Import the new notification services
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
            } catch { }
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
            title: description.trim().slice(0, 60),
            amount: numAmount,
            entry_type: entryType,
            description: description.trim(),
            agency_name: agencyName || undefined,
        };

        try {
            const success = await saveGeneralEntry(input);

            if (success) {
                // 🔔 ADD THIS LINE: Send notification when entry is added
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

    // Rest of your component remains the same...
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

            {/* Your existing UI components... */}

        </KeyboardAvoidingView>
    );
}

// ========================================
// 🔔 QUICK INTEGRATION EXAMPLES
// ========================================

/*
  COPY THESE EXAMPLES TO YOUR EXISTING SCREENS:

  1. ADD TO IMPORTS:
  import ActivityNotificationService from '../services/ActivityNotificationService';

  2. ADD AFTER SUCCESSFUL SAVE/UPDATE/DELETE:

  // For General Entry
  await ActivityNotificationService.notifyGeneralEntry('add', 'Entry description');

  // For Agency Payment  
  await ActivityNotificationService.notifyAgencyPayment('add', amount, 'Payment details');

  // For Fuel Entry
  await ActivityNotificationService.notifyFuelEntry('add', amount, location, 'Fuel details');

  // For Driver Transaction
  await ActivityNotificationService.notifyDriverTransaction('add', amount, 'Driver details');

  // For Mumbai Delivery
  await ActivityNotificationService.notifyMumbaiDelivery('add', destination, 'Delivery details');

  // For Uppad Jama
  await ActivityNotificationService.notifyUppadJama('add', amount, 'Uppad/Jama details');

  // For Agency Entry
  await ActivityNotificationService.notifyAgencyEntry('add', 'Agency entry details');

  // Generic notification for any activity
  await ActivityNotificationService.notifyActivity({
    category: 'Your Category',
    action: 'add', // or 'edit' or 'delete'
    details: 'What happened'
  });
*/

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'ios' ? 50 : 12,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSpacer: {
        width: 34, // Same width as back button to center the title
    },
});

export default AddGeneralEntryScreen;