// UppadJamaScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Button, TextInput, List, Divider, Menu, useTheme } from 'react-native-paper';
import { supabase } from '../supabase';
import { useAlert } from '../context/AlertContext';
import { useOffice } from '../context/OfficeContext';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { CommonHeader, CommonInput, Dropdown } from '../components';
import { 
  getPersons, 
  Person, 
  saveUppadJamaEntry, 
  getUppadJamaEntries, 
  UppadJamaEntry,
  syncAllDataFixed,
  OFFLINE_KEYS,
  deleteTransactionByIdImproved
} from '../data/Storage';
import UppadJamaStatement from '../components/UppadJamaStatement'; // Added import
import ActivityNotificationService from '../services/ActivityNotificationService';


type UppadJamaScreenNavigationProp = NavigationProp<RootStackParamList, 'UppadJama'>;

interface UppadJamaScreenProps {
  navigation: UppadJamaScreenNavigationProp;
}

function UppadJamaScreen({ navigation }: UppadJamaScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { currentOffice } = useOffice();
  const { goBack } = navigation;

  // Tab state
  const [activeTab, setActiveTab] = useState<'entry' | 'statement'>('entry');

  // Persons dropdown (loaded from storage/backend)
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState<boolean>(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const personOptions: { label: string; value: string }[] = persons.map(p => ({ label: p.name, value: p.id }));

  const loadPersons = async () => {
    setLoadingPersons(true);
    try {
      const list = await getPersons();
      setPersons(list || []);
    } catch (e) {
      console.error('Failed to load persons', e);
      Alert.alert('Error', 'Failed to load persons.');
    } finally {
      setLoadingPersons(false);
    }
  };

  // Enhanced loadEntries function with forced refresh
  const loadEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const officeId = currentOffice?.id;
      const list = await getUppadJamaEntries(officeId);
      if (list) {
        // Force a re-render by updating the state
        setEntries(list);
      }
    } catch (e) {
      console.error('Failed to load Uppad/Jama entries', e);
      Alert.alert('Error', 'Failed to load statement.');
    } finally {
      setLoadingEntries(false);
    }
  }, [currentOffice]);

  // Memoize the load functions with proper types
  const memoizedLoadPersons = useCallback(loadPersons, []);
  const memoizedLoadEntries = useCallback(loadEntries, []);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;
    let retryTimeout: NodeJS.Timeout;
    const channelName = `uppad_jama_screen_${Date.now()}`;
    let retryCount = 0;
    const maxRetries = 3;

    const handleDataChange = (payload: any, eventType: string) => {
      if (!isMounted) return;
      console.log(`Uppad/Jama entry ${eventType}:`, payload);
      if (activeTab === 'statement') {
        memoizedLoadEntries().catch(console.error);
      }
    };

    const setupSubscription = async () => {
      try {
        // Initial data load only if needed
        if (isMounted) {
          await Promise.all([memoizedLoadPersons(), memoizedLoadEntries()]);
        }

        if (!isMounted) return;

        // Only set up subscription if we don't have one yet and component is mounted
        if (!channel && isMounted) {
          channel = supabase.channel(channelName, {
            config: {
              presence: {
                key: channelName
              },
              broadcast: { self: false }
            }
          });

          // Set up event listeners
          channel
            .on('postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'uppad_jama_entries' },
              (payload: any) => handleDataChange(payload, 'INSERT')
            )
            .on('postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'uppad_jama_entries' },
              (payload: any) => handleDataChange(payload, 'UPDATE')
            )
            .on('postgres_changes',
              { event: 'DELETE', schema: 'public', table: 'uppad_jama_entries' },
              (payload: any) => handleDataChange(payload, 'DELETE')
            )
            .subscribe((status: string, err: Error | null) => {
              if (err) {
                console.error('Subscription error:', err);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`Retrying subscription (${retryCount}/${maxRetries})...`);
                  setTimeout(() => {
                    if (isMounted) setupSubscription();
                  }, 1000 * retryCount);
                }
              } else {
                console.log('Successfully subscribed to Uppad/Jama changes');
              }
            });
        }
      } catch (error) {
        console.error('Error in subscription setup:', error);
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`Retrying setup (${retryCount}/${maxRetries})...`);
          setTimeout(() => {
            if (isMounted) setupSubscription();
          }, 1000 * retryCount);
        }
      }
    };

    setupSubscription();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (channel) {
        console.log('Cleaning up Uppad/Jama subscription');
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error('Error cleaning up channel:', err);
        }
      }
    };
  }, [memoizedLoadPersons, memoizedLoadEntries, activeTab]);
  
  // Uppad/Jama dropdown using debit/credit values
  // Entry type state
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
  const entryTypeOptions = [
    { label: 'Uppad (Debit)', value: 'debit' },
    { label: 'Jama (Credit)', value: 'credit' },
  ];

  // Amount (required) and Description (optional)
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false); // New state for success indication
  const [entries, setEntries] = useState<UppadJamaEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);
  // Statement tab controls
  const [statementPersonId, setStatementPersonId] = useState<string>('');
  const [statementFilter, setStatementFilter] = useState<'all' | 'uppad' | 'jama'>('all');

  const numberFormat = (n: number) => {
    try { return n.toLocaleString('en-IN'); } catch { return String(n); }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const entryToDelete = entries.find(entry => entry.id === id);
        const ok = await deleteTransactionByIdImproved(id, OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
        if (ok) {
          // Send delete notification to admin
          if (entryToDelete) {
            await ActivityNotificationService.notifyUppadJama(
              'delete',
              entryToDelete.amount,
              `Deleted ${entryToDelete.entry_type} entry for ${entryToDelete.person_name}`
            );
          }
          
          await loadEntries();
          showAlert('Entry deleted.');
        } else {
          Alert.alert('Error', 'Failed to delete entry.');
        }
      }}
    ]);
  };

  const renderSummary = () => {
    const totalCredit = entries.filter(e => e.entry_type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
    const totalDebit = entries.filter(e => e.entry_type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
    const net = totalCredit - totalDebit; 
    return (
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.summaryLabel}>Total Jama (Credit)</Text>
          <Text style={[styles.summaryValue, styles.credit]}>₹{numberFormat(totalCredit)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.summaryLabel}>Total Uppad (Debit)</Text>
          <Text style={[styles.summaryValue, styles.debit]}>₹{numberFormat(totalDebit)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.entryTitle]}>Net (Jama - Uppad)</Text>
          <Text style={[styles.entryTitle, { color: net >= 0 ? '#1B5E20' : '#B71C1C' }]}>₹{numberFormat(net)}</Text>
        </View>
      </View>
    );
  };

  const handleSave = async () => {
    if (!selectedPersonId) {
      Alert.alert('Missing Person', 'Please select a person.');
      return;
    }
    if (!amount.trim()) {
      Alert.alert('Invalid Amount', 'Amount is required.');
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive number.');
      return;
    }
    setSaving(true);
    try {
      const selectedPersonName = personOptions.find(o => o.value === selectedPersonId)?.label || '';
      if (!selectedPersonName) {
        Alert.alert('Invalid Selection', 'Please select a valid person.');
        return;
      }

      const success = await saveUppadJamaEntry({
        person_name: selectedPersonName,
        amount: num,
        entry_type: entryType,
        description: description?.trim() || undefined,
        office_id: currentOffice?.id,
      });

      console.log('UppadJamaScreen - Entry saved:', {
        person_name: selectedPersonName,
        amount: num,
        entry_type: entryType,
        description: description?.trim() || undefined,
        office_id: currentOffice?.id,
        success: success
      });

      if (!success) {
        Alert.alert('Error ❌', 'Failed to save entry. Please try again.');
        return;
      }

      // Send push notification to admin
      await ActivityNotificationService.notifyUppadJama(
        'add',
        num,
        `${entryType.toUpperCase()}: ${selectedPersonName}${description?.trim() ? ` - ${description.trim().slice(0, 30)}${description.trim().length > 30 ? '...' : ''}` : ''}`
      );

      // Clear form
      setAmount('');
      setDescription('');
      
      // Force reload of all data
      await Promise.all([
        loadEntries(),
        loadPersons()
      ]);
      
      // Show success message
      showAlert('Entry saved successfully!');
      
      // Sync with server
      console.log('UppadJamaScreen - Starting data sync...');
      await syncAllDataFixed();
      console.log('UppadJamaScreen - Data sync completed');
      
      // Manual broadcast to trigger refresh on majur dashboards - only for jama (credit) entries
      if (entryType === 'credit') {
        try {
          console.log('UppadJamaScreen - Broadcasting refresh signal for jama entry...');
          const broadcastChannel = supabase.channel('majur-dashboard-refresh');
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'refresh-dashboard',
            payload: {
              action: 'jama_entry_added',
              entry_type: entryType,
              person_name: selectedPersonName,
              amount: num,
              timestamp: new Date().toISOString()
            }
          });
          console.log('UppadJamaScreen - Broadcast sent successfully for jama entry');
        } catch (broadcastError) {
          console.error('UppadJamaScreen - Broadcast failed:', broadcastError);
        }
      } else {
        console.log('UppadJamaScreen - Skipping broadcast for uppad (debit) entry');
      }
      
      // Reload data one more time after sync
      await Promise.all([
        loadEntries(),
        loadPersons()
      ]);
      
      // Show temporary success indication without alert popup
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
      }, 3000); // Hide after 3 seconds
      
      // Reset person selection for next entry
      setSelectedPersonId('');
      
    } catch (e) {
      console.error('Error saving entry:', e);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <CommonHeader title={`Uppad/Jama ${activeTab === 'entry' ? 'Entry' : 'Statement'}`} onBackPress={goBack} />

      {/* Tabs: Entry | Statement */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('entry')}
          style={[styles.tabButton, activeTab === 'entry' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'entry' && styles.tabTextActive]}>Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('statement')}
          style={[styles.tabButton, activeTab === 'statement' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'statement' && styles.tabTextActive]}>Statement</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {activeTab === 'entry' ? (
          <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title}>Uppad/Jama Entry</Text>
            
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Person</Text>
              <TouchableOpacity onPress={loadPersons} disabled={loadingPersons}>
                {loadingPersons ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.refreshText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </View>
            <Dropdown
              options={personOptions}
              selectedValue={selectedPersonId}
              onValueChange={(val) => {
                try {
                  setSelectedPersonId(val);
                } catch (err) {
                  console.error('Error selecting person:', err);
                  Alert.alert('Error', 'Person select failed: ' + (err instanceof Error ? err.message : String(err)));
                }
              }}
              placeholder="Select person"
            />

            <Text style={styles.inputLabel}>Type</Text>
            <Dropdown
              options={entryTypeOptions}
              selectedValue={entryType}
              onValueChange={(v) => setEntryType(v as 'debit' | 'credit')}
              placeholder="Select type (Uppad / Jama)"
            />

            <CommonInput
              label="Amount"
              required
              placeholder="e.g., 5000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <CommonInput
              label="Description (optional)"
              placeholder="Details (optional)"
              value={description}
              onChangeText={setDescription}
              style={{ height: 80, textAlignVertical: 'top' }}
              multiline
            />

            {/* Success indicator removed - silent save */}

            <TouchableOpacity onPress={handleSave} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton] }>
              {saving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.surface} style={{ marginRight: 8 }} />
                  <Text style={GlobalStyles.buttonPrimaryText}>Saving...</Text>
                </View>
              ) : (
                <Text style={GlobalStyles.buttonPrimaryText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <UppadJamaStatement
            entries={entries}
            persons={persons}
            statementPersonId={statementPersonId}
            setStatementPersonId={setStatementPersonId}
            statementFilter={statementFilter}
            setStatementFilter={setStatementFilter}
            loadEntries={loadEntries}
            loadingEntries={loadingEntries}
            confirmDelete={confirmDelete}
            numberFormat={numberFormat}
            formatDateTime={formatDateTime}
          />
        )}
      </ScrollView>

      {/* Keep bottom back button only for Entry tab to avoid overlap with sticky footer */}
      {activeTab === 'entry' && (
        <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
    flexGrow: 1,
    paddingBottom: 140,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tabTextActive: {
    color: Colors.surface,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 8,
  },
  refreshText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  credit: {
    color: Colors.success,
  },
  debit: {
    color: Colors.error,
  },
  entryTitle: { // Re-using existing style for net balance
  },
  successIndicator: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    alignItems: 'center',
  },
  successText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  officeIndicatorContainer: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 10,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default UppadJamaScreen;