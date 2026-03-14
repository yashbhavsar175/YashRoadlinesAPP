// src/screens/DailyEntriesScreen.tsx
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
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  saveDailyEntry, 
  getDailyEntries, 
  deleteDailyEntry,
  DailyEntry 
} from '../data/Storage';
import { useOffice } from '../context/OfficeContext';
import { useAlert } from '../context/AlertContext';

type DailyEntriesScreenNavigationProp = NavigationProp<RootStackParamList, 'DailyEntries'>;

interface DailyEntriesScreenProps {
  navigation: DailyEntriesScreenNavigationProp;
}

interface EntryCategory {
  id: string;
  label: string;
  type: 'credit' | 'debit';
}

const ENTRY_CATEGORIES: EntryCategory[] = [
  { id: 'prem_darvaja_city', label: 'Prem Darvaja City', type: 'credit' },
  { id: 'prem_darvaja_paid', label: 'Prem Darvaja Paid', type: 'credit' },
  { id: 'sarkhej_city', label: 'Sarkhej City', type: 'credit' },
  { id: 'sarkhej_paid', label: 'Sarkhej Paid', type: 'credit' },
  { id: 'aslali_city', label: 'Aslali City', type: 'credit' },
  { id: 'aslali_paid', label: 'Aslali Paid', type: 'credit' },
  { id: 'sarkhej_to_bb', label: 'Sarkhej To BB', type: 'credit' },
  { id: 'ahmedabad_hamali', label: 'Ahmedabad Hamali', type: 'debit' },
  { id: 'mandal_hamali', label: 'Mandal Hamali', type: 'debit' },
  { id: 'anay_kharch', label: 'Any Other Expenses', type: 'debit' },
  { id: 'diesel', label: 'Diesel', type: 'debit' },
  { id: 'return_bhadu', label: 'Return Bhadu', type: 'credit' },
];

function DailyEntriesScreen({ navigation }: DailyEntriesScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { getCurrentOfficeId } = useOffice();
  const { showAlert } = useAlert();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'entry' | 'statement'>('entry');
  
  // Entry form state
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  
  // Statement state
  const [savedEntries, setSavedEntries] = useState<DailyEntry[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Calculate totals whenever amounts change
  useEffect(() => {
    let creditSum = 0;
    let debitSum = 0;

    ENTRY_CATEGORIES.forEach(category => {
      const amount = parseFloat(amounts[category.id] || '0');
      if (!isNaN(amount) && amount > 0) {
        if (category.type === 'credit') {
          creditSum += amount;
        } else {
          debitSum += amount;
        }
      }
    });

    setTotalCredit(creditSum);
    setTotalDebit(debitSum);
    setNetProfit(creditSum - debitSum);
  }, [amounts]);

  // Load saved entries on mount and when tab changes
  useFocusEffect(
    React.useCallback(() => {
      loadSavedEntries();
    }, [])
  );

  // Reload when switching to statement tab
  useEffect(() => {
    if (activeTab === 'statement') {
      loadSavedEntries();
    }
  }, [activeTab]);

  const loadSavedEntries = async (forceRefresh: boolean = false) => {
    try {
      console.log('📊 Loading saved entries...', forceRefresh ? '(force refresh)' : '');
      setLoading(true);
      const officeId = getCurrentOfficeId();
      console.log('🏢 Office ID:', officeId);
      const entries = await getDailyEntries(officeId || undefined, forceRefresh);
      console.log('✅ Loaded entries:', entries.length);
      console.log('📋 Entries data:', JSON.stringify(entries, null, 2));
      setSavedEntries(entries);
    } catch (error) {
      console.error('❌ Error loading entries:', error);
      showAlert('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedEntries(true); // Force refresh on pull-to-refresh
    setRefreshing(false);
  };

  const handleAmountChange = (categoryId: string, value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmounts(prev => ({
      ...prev,
      [categoryId]: sanitized
    }));
  };

  const handleClear = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setAmounts({})
        }
      ]
    );
  };

  const handleSave = async () => {
    // Check if at least one entry has been made
    const hasEntries = Object.values(amounts).some(val => val && parseFloat(val) > 0);
    
    if (!hasEntries) {
      showAlert('Please add at least one entry before saving.');
      return;
    }

    setSaving(true);
    try {
      // Convert string amounts to numbers
      const numericEntries: Record<string, number> = {};
      Object.keys(amounts).forEach(key => {
        const val = parseFloat(amounts[key] || '0');
        if (val > 0) {
          numericEntries[key] = val;
        }
      });

      const officeId = getCurrentOfficeId();
      const result = await saveDailyEntry(
        numericEntries,
        totalCredit,
        totalDebit,
        netProfit,
        officeId || undefined
      );

      if (result) {
        showAlert('Entries saved successfully!');
        setAmounts({});
        setActiveTab('statement');
        await loadSavedEntries();
      } else {
        showAlert('Failed to save entries. Please try again.');
      }
    } catch (error) {
      console.error('Error saving entries:', error);
      showAlert('An error occurred while saving entries.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, event?: any) => {
    // Stop event propagation to prevent card expansion
    if (event) {
      event.stopPropagation();
    }
    
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting entry:', entryId);
              const success = await deleteDailyEntry(entryId);
              console.log('Delete result:', success);
              if (success) {
                showAlert('Entry deleted successfully!');
                await loadSavedEntries(true); // Force refresh after delete
              } else {
                showAlert('Failed to delete entry. Please try again.');
              }
            } catch (error) {
              console.error('Error in handleDeleteEntry:', error);
              showAlert('An error occurred while deleting.');
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Entries</Text>
        {activeTab === 'entry' ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Icon name="refresh-outline" size={24} color={Colors.surface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'entry' && styles.activeTab]}
          onPress={() => setActiveTab('entry')}
        >
          <Icon 
            name="create-outline" 
            size={20} 
            color={activeTab === 'entry' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'entry' && styles.activeTabText]}>
            Entry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statement' && styles.activeTab]}
          onPress={() => setActiveTab('statement')}
        >
          <Icon 
            name="list-outline" 
            size={20} 
            color={activeTab === 'statement' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'statement' && styles.activeTabText]}>
            Statement
          </Text>
          {savedEntries.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{savedEntries.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'entry' ? renderEntryTab() : renderStatementTab()}
    </KeyboardAvoidingView>
  );

  function renderEntryTab() {
    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Summary Card */}
          <View style={[GlobalStyles.card, styles.summaryCard]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Credit:</Text>
              <Text style={[styles.summaryValue, styles.creditText]}>
                +₹{totalCredit.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Debit:</Text>
              <Text style={[styles.summaryValue, styles.debitText]}>
                -₹{totalDebit.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.netProfitRow]}>
              <Text style={styles.netProfitLabel}>Net Profit:</Text>
              <Text style={[
                styles.netProfitValue,
                netProfit >= 0 ? styles.profitPositive : styles.profitNegative
              ]}>
                ₹{netProfit.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Entry Fields */}
          <View style={[GlobalStyles.card, styles.entriesCard]}>
            <Text style={styles.sectionTitle}>Enter Amounts</Text>
            
            {ENTRY_CATEGORIES.map((category, index) => (
              <View key={category.id}>
                <View style={styles.entryRow}>
                  <View style={styles.entryLabelContainer}>
                    <Text style={styles.entryLabel}>{category.label}</Text>
                    <View style={[
                      styles.typeBadge,
                      category.type === 'credit' ? styles.creditBadge : styles.debitBadge
                    ]}>
                      <Text style={styles.typeBadgeText}>
                        {category.type === 'credit' ? 'Credit' : 'Debit'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amounts[category.id] || ''}
                      onChangeText={(value) => handleAmountChange(category.id, value)}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                {index < ENTRY_CATEGORIES.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={[GlobalStyles.buttonPrimary, styles.saveButton]}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={Colors.surface} />
                <Text style={[GlobalStyles.buttonPrimaryText, styles.saveButtonText]}>
                  Saving...
                </Text>
              </>
            ) : (
              <>
                <Icon name="checkmark-circle-outline" size={24} color={Colors.surface} />
                <Text style={[GlobalStyles.buttonPrimaryText, styles.saveButtonText]}>
                  Save Entries
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function renderStatementTab() {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      );
    }

    if (savedEntries.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <Icon name="document-text-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No entries saved yet</Text>
          <Text style={styles.emptySubText}>Add entries from the Entry tab</Text>
          <Text style={[styles.emptySubText, { marginTop: 16, fontSize: 12, fontStyle: 'italic' }]}>
            Pull down to refresh
          </Text>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={savedEntries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]} // Android
            tintColor={Colors.primary} // iOS
          />
        }
        contentContainerStyle={styles.statementList}
        renderItem={({ item }) => (
          <View style={styles.statementCard}>
            {/* Header */}
            <TouchableOpacity
              style={styles.statementHeader}
              onPress={() => setExpandedEntry(expandedEntry === item.id ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.statementHeaderLeft}>
                <Icon name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.statementDate}>
                  {new Date(item.entry_date).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <View style={styles.statementHeaderRight}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteEntry(item.id, e);
                  }}
                  style={styles.deleteIconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
                <Icon 
                  name={expandedEntry === item.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.textSecondary} 
                />
              </View>
            </TouchableOpacity>

            {/* Summary */}
            <View style={styles.statementSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Credit</Text>
                <Text style={[styles.summaryItemValue, styles.creditText]}>
                  +₹{item.total_credit.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Debit</Text>
                <Text style={[styles.summaryItemValue, styles.debitText]}>
                  -₹{item.total_debit.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.summaryItem, styles.netProfitItem]}>
                <Text style={styles.summaryItemLabel}>Net Profit</Text>
                <Text style={[
                  styles.summaryItemValue,
                  styles.netProfitValueLarge,
                  item.net_profit >= 0 ? styles.profitPositive : styles.profitNegative
                ]}>
                  ₹{item.net_profit.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Expanded Details */}
            {expandedEntry === item.id && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailsSeparator} />
                <Text style={styles.detailsTitle}>Entry Details</Text>
                {Object.entries(item.entries).map(([categoryId, amount]) => {
                  const category = ENTRY_CATEGORIES.find(c => c.id === categoryId);
                  if (!category) return null;
                  
                  return (
                    <View key={categoryId} style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Text style={styles.detailLabel}>{category.label}</Text>
                        <View style={[
                          styles.detailBadge,
                          category.type === 'credit' ? styles.creditBadge : styles.debitBadge
                        ]}>
                          <Text style={styles.detailBadgeText}>
                            {category.type === 'credit' ? 'C' : 'D'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[
                        styles.detailAmount,
                        category.type === 'credit' ? styles.creditText : styles.debitText
                      ]}>
                        {category.type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      />
    );
  }
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditText: {
    color: Colors.success,
  },
  debitText: {
    color: Colors.error,
  },
  netProfitRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginBottom: 0,
  },
  netProfitLabel: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  netProfitValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profitPositive: {
    color: Colors.success,
  },
  profitNegative: {
    color: Colors.error,
  },
  entriesCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  entryLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  entryLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creditBadge: {
    backgroundColor: Colors.success + '20',
  },
  debitBadge: {
    backgroundColor: Colors.error + '20',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    marginLeft: 8,
  },
  // Statement Tab Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  statementList: {
    padding: 16,
  },
  statementCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
  },
  statementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statementHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statementDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deleteIconButton: {
    padding: 4,
  },
  statementSummary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  netProfitItem: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  netProfitValueLarge: {
    fontSize: 18,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailsSeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  detailBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  detailBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  detailAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default DailyEntriesScreen;
