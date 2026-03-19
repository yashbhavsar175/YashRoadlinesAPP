// UserUppadJamaScreen.tsx
// Allows normal (non-admin) users to add and view their own Uppad/Jama entries.
// Entries are filtered by created_by = current user's auth.uid().
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabase';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { CommonHeader, CommonInput, Dropdown } from '../components';
import { saveUppadJamaEntry, UppadJamaEntry } from '../data/Storage';
import { useOffice } from '../context/OfficeContext';
import { useAlert } from '../context/AlertContext';

type UserUppadJamaNavigationProp = NavigationProp<RootStackParamList, 'UserUppadJama'>;

interface UserUppadJamaScreenProps {
  navigation: UserUppadJamaNavigationProp;
}

const ENTRY_TYPE_OPTIONS = [
  { label: 'Uppad (Debit)', value: 'debit' },
  { label: 'Jama (Credit)', value: 'credit' },
];

function UserUppadJamaScreen({ navigation }: UserUppadJamaScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { currentOffice } = useOffice();
  const { showAlert } = useAlert();

  // Form state
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // List state
  const [entries, setEntries] = useState<UppadJamaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Current user id
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Totals
  const totalCredit = entries.filter(e => e.entry_type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
  const totalDebit = entries.filter(e => e.entry_type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
  const net = totalCredit - totalDebit;

  const fmt = (n: number) => {
    try { return n.toLocaleString('en-IN'); } catch { return String(n); }
  };

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  // Load current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserName(user.email?.split('@')[0] || user.id);
      }
    });
  }, []);

  // Fetch only this user's entries from Supabase
  const loadEntries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('uppad_jama_entries')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries((data as UppadJamaEntry[]) || []);
    } catch (e) {
      console.error('UserUppadJama: failed to load entries', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) loadEntries();
    }, [userId, loadEntries])
  );

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    setSaving(true);
    try {
      const success = await saveUppadJamaEntry({
        person_name: userName,
        amount: num,
        entry_type: entryType,
        description: description.trim() || undefined,
        office_id: currentOffice?.id,
      });

      if (!success) {
        Alert.alert('Error', 'Failed to save entry. Please try again.');
        return;
      }

      setAmount('');
      setDescription('');
      setEntryType('debit');
      showAlert('Entry saved successfully!');
      await loadEntries();
    } catch (e) {
      console.error('UserUppadJama: save error', e);
      Alert.alert('Error', 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const renderEntry = ({ item, index }: { item: UppadJamaEntry; index: number }) => {
    const isCredit = item.entry_type === 'credit';
    return (
      <View style={[styles.entryRow, index % 2 === 0 && styles.entryRowAlt]}>
        <View style={styles.entryLeft}>
          <Text style={styles.entryDate}>{fmtDate(item.entry_date || item.created_at)}</Text>
          {item.description ? (
            <Text style={styles.entryDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={[styles.typeBadge, isCredit ? styles.creditBadge : styles.debitBadge]}>
            <Text style={[styles.typeBadgeText, isCredit ? styles.creditText : styles.debitText]}>
              {isCredit ? 'Jama (Credit)' : 'Uppad (Debit)'}
            </Text>
          </View>
        </View>
        <Text style={[styles.entryAmount, isCredit ? styles.creditText : styles.debitText]}>
          {isCredit ? '+' : '-'}₹{fmt(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <CommonHeader title="My Uppad / Jama" onBackPress={goBack} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadEntries(); }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Entry Form */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title}>Add Entry</Text>

          <Text style={styles.label}>Type</Text>
          <Dropdown
            options={ENTRY_TYPE_OPTIONS}
            selectedValue={entryType}
            onValueChange={v => setEntryType(v as 'debit' | 'credit')}
            placeholder="Select type"
          />

          <CommonInput
            label="Amount"
            required
            placeholder="e.g. 500"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <CommonInput
            label="Note (optional)"
            placeholder="Description or reason"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ height: 72, textAlignVertical: 'top' }}
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[GlobalStyles.buttonPrimary, saving && styles.disabledBtn]}
          >
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color={Colors.surface} style={{ marginRight: 8 }} />
                <Text style={GlobalStyles.buttonPrimaryText}>Saving...</Text>
              </View>
            ) : (
              <Text style={GlobalStyles.buttonPrimaryText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={[GlobalStyles.card, styles.summaryCard]}>
          <Text style={styles.summaryTitle}>My Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Jama (Credit)</Text>
            <Text style={[styles.summaryValue, styles.creditText]}>₹{fmt(totalCredit)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Uppad (Debit)</Text>
            <Text style={[styles.summaryValue, styles.debitText]}>₹{fmt(totalDebit)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.netRow]}>
            <Text style={styles.netLabel}>Net Balance</Text>
            <Text style={[styles.netValue, { color: net >= 0 ? Colors.success : Colors.error }]}>
              ₹{fmt(Math.abs(net))} {net >= 0 ? '(Credit)' : '(Debit)'}
            </Text>
          </View>
        </View>

        {/* Entries List */}
        <View style={GlobalStyles.card}>
          <Text style={styles.listTitle}>My Entries</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Add your first entry above.</Text>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={item => item.id}
              renderItem={renderEntry}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 12,
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  netValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  entryRowAlt: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  entryLeft: {
    flex: 1,
    marginRight: 12,
  },
  entryDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  entryDesc: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  creditBadge: {
    backgroundColor: '#E8F5E9',
  },
  debitBadge: {
    backgroundColor: '#FFEBEE',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  creditText: {
    color: Colors.success,
  },
  debitText: {
    color: Colors.error,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
});

export default UserUppadJamaScreen;
