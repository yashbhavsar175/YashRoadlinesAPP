import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Dropdown from './Dropdown';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { UppadJamaEntry, Person } from '../data/Storage';

interface UppadJamaStatementProps {
  entries: UppadJamaEntry[];
  persons: Person[];
  statementPersonId: string;
  setStatementPersonId: (id: string) => void;
  statementFilter: 'all' | 'uppad' | 'jama';
  setStatementFilter: (filter: 'all' | 'uppad' | 'jama') => void;
  loadEntries: () => Promise<void>;
  loadingEntries: boolean;
  confirmDelete: (id: string) => void;
  numberFormat: (n: number) => string;
  formatDateTime: (iso: string) => string;
}

const UppadJamaStatement: React.FC<UppadJamaStatementProps> = ({
  entries,
  persons,
  statementPersonId,
  setStatementPersonId,
  statementFilter,
  setStatementFilter,
  loadEntries,
  loadingEntries,
  confirmDelete,
  numberFormat,
  formatDateTime,
}) => {
  const personOptions = useMemo(() => persons.map(p => ({ label: p.name, value: p.id })), [persons]);

  const filteredEntries = useMemo(() => {
    const personName = personOptions.find(o => o.value === statementPersonId)?.label || '';
    const personEntries = entries.filter(e => e.person_name === personName);

    return statementFilter === 'all'
      ? personEntries
      : statementFilter === 'uppad'
        ? personEntries.filter(e => e.entry_type === 'debit')
        : personEntries.filter(e => e.entry_type === 'credit');
  }, [entries, statementPersonId, statementFilter, personOptions]);

  const renderEntryRow = useCallback((e: UppadJamaEntry) => (
    <View key={e.id} style={styles.entryRow}>
      <View style={styles.entryDetails}>
        <Text style={styles.entryTitle}>
          {e.entry_type === 'debit' ? 'Uppad' : 'Jama'} - {e.person_name}
        </Text>
        <Text style={styles.entrySub}>
          {formatDateTime(e.entry_date)}{e.description ? `  •  ${e.description}` : ''}
        </Text>
      </View>
      <Text style={[styles.entryAmount, e.entry_type === 'credit' ? styles.credit : styles.debit]}>
        ₹{numberFormat(e.amount)}
      </Text>
      <TouchableOpacity onPress={() => confirmDelete(e.id)} style={styles.deleteBtn}>
        <Icon name="trash-outline" size={18} color={Colors.surface} />
      </TouchableOpacity>
    </View>
  ), [confirmDelete, numberFormat, formatDateTime]);

  const renderSummary = useCallback(() => {
    const personName = personOptions.find(o => o.value === statementPersonId)?.label || '';
    const personEntries = entries.filter(e => e.person_name === personName);
    const totalCredit = personEntries.filter(e => e.entry_type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
    const totalDebit = personEntries.filter(e => e.entry_type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
    const net = totalCredit - totalDebit;
    const showLeneKe = statementFilter === 'all' && totalDebit > totalCredit;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Jama (Credit)</Text>
          <Text style={[styles.summaryAmount, styles.credit]}>₹{numberFormat(totalCredit)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Uppad (Debit)</Text>
          <Text style={[styles.summaryAmount, styles.debit]}>₹{numberFormat(totalDebit)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Net (Jama - Uppad)</Text>
          <Text style={[styles.summaryAmount, { color: net >= 0 ? Colors.success : Colors.error }]}>₹{numberFormat(net)}</Text>
        </View>
        {showLeneKe && (
          <Text style={styles.smallHint}>₹{numberFormat(totalDebit - totalCredit)} lene ke he</Text>
        )}
      </View>
    );
  }, [entries, statementPersonId, statementFilter, personOptions, numberFormat]);

  return (
    <View style={GlobalStyles.card}>
      <View style={styles.labelRow}>
        <Text style={GlobalStyles.title}>Uppad/Jama Statement</Text>
        <TouchableOpacity onPress={loadEntries} disabled={loadingEntries}>
          {loadingEntries ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.refreshText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Person</Text>
      <Dropdown
        options={personOptions}
        selectedValue={statementPersonId}
        onValueChange={setStatementPersonId}
        placeholder="Select person"
      />

      <View style={styles.filterChipsRow}>
        <TouchableOpacity
          onPress={() => setStatementFilter('all')}
          style={[styles.chip, statementFilter === 'all' && styles.chipActive]}
        >
          <Text style={[styles.chipText, statementFilter === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStatementFilter('uppad')}
          style={[styles.chip, statementFilter === 'uppad' && styles.chipActive]}
        >
          <Text style={[styles.chipText, statementFilter === 'uppad' && styles.chipTextActive]}>Uppad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStatementFilter('jama')}
          style={[styles.chip, statementFilter === 'jama' && styles.chipActive]}
        >
          <Text style={[styles.chipText, statementFilter === 'jama' && styles.chipTextActive]}>Jama</Text>
        </TouchableOpacity>
      </View>

      {!statementPersonId ? (
        <Text style={styles.noEntriesText}>Select a person to view statement.</Text>
      ) : (
        <>
          {filteredEntries.length === 0 ? (
            <Text style={styles.noEntriesText}>No entries found.</Text>
          ) : (
            filteredEntries.map(renderEntryRow)
          )}
        </>
      )}
      {statementPersonId && renderSummary()}
    </View>
  );
};

const styles = StyleSheet.create({
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
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f2f4f7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.surface,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  entryDetails: {
    flex: 1,
  },
  entryTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  entrySub: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  entryAmount: {
    minWidth: 100,
    textAlign: 'right',
    fontWeight: '700',
  },
  credit: {
    color: Colors.success, // Using Colors.success for consistency
  },
  debit: {
    color: Colors.error, // Using Colors.error for consistency
  },
  deleteBtn: {
    marginLeft: 10,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noEntriesText: {
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  smallHint: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
  },
});

export default UppadJamaStatement;
