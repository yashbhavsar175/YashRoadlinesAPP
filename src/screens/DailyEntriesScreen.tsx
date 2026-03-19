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
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../supabase';
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  
  // Statement state
  const [savedEntries, setSavedEntries] = useState<DailyEntry[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editDialogData, setEditDialogData] = useState<{
    date: string;
    categoryId: string;
    categoryLabel: string;
    currentAmount: string;
  } | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

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
      
      // Cleanup duplicates on first load
      if (entries.length > 0 && !forceRefresh) {
        await cleanupDuplicateEntries();
      }
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
          onPress: () => {
            setAmounts({});
            setSelectedDate(new Date());
          }
        }
      ]
    );
  };

  const cleanupDuplicateEntries = async () => {
    try {
      console.log('🧹 Checking for duplicate entries...');
      
      // Group entries by date
      const entriesByDate: Record<string, DailyEntry[]> = {};
      savedEntries.forEach(entry => {
        if (!entriesByDate[entry.entry_date]) {
          entriesByDate[entry.entry_date] = [];
        }
        entriesByDate[entry.entry_date].push(entry);
      });
      
      // Find dates with duplicates
      const duplicateDates = Object.entries(entriesByDate).filter(([_, entries]) => entries.length > 1);
      
      if (duplicateDates.length === 0) {
        console.log('✅ No duplicate entries found');
        return;
      }
      
      console.log(`⚠️ Found ${duplicateDates.length} dates with duplicate entries`);
      
      // For each date with duplicates, keep the latest one and delete others
      for (const [date, entries] of duplicateDates) {
        // Sort by updated_at descending (latest first)
        const sorted = entries.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        const toKeep = sorted[0];
        const toDelete = sorted.slice(1);
        
        console.log(`🗑️ Deleting ${toDelete.length} duplicate entries for ${date}`);
        
        // Delete duplicates
        for (const entry of toDelete) {
          await supabase.from('daily_entries').delete().eq('id', entry.id);
        }
      }
      
      console.log('✅ Duplicate cleanup complete');
      await AsyncStorage.removeItem('offline_daily_entries');
      await loadSavedEntries(true);
    } catch (error) {
      console.error('❌ Error cleaning up duplicates:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
      
      // Format date to YYYY-MM-DD for database
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Check if entry already exists for this date
      const existingEntry = savedEntries.find(e => e.entry_date === formattedDate);
      
      if (existingEntry) {
        // Update existing entry
        console.log('📝 Updating existing entry for date:', formattedDate);
        
        const { error } = await supabase
          .from('daily_entries')
          .update({
            entries: numericEntries,
            total_credit: totalCredit,
            total_debit: totalDebit,
            net_profit: netProfit,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id);
        
        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        
        console.log('✅ Entry updated successfully');
        showAlert('Entries updated successfully!');
      } else {
        // Create new entry
        console.log('➕ Creating new entry for date:', formattedDate);
        
        const result = await saveDailyEntry(
          numericEntries,
          totalCredit,
          totalDebit,
          netProfit,
          officeId || undefined,
          formattedDate
        );

        if (!result) {
          showAlert('Failed to save entries. Please try again.');
          return;
        }
        
        console.log('✅ Entry created successfully');
        showAlert('Entries saved successfully!');
      }
      
      // Clear form and refresh
      setAmounts({});
      setSelectedDate(new Date());
      setActiveTab('statement');
      await AsyncStorage.removeItem('offline_daily_entries');
      await loadSavedEntries(true);
    } catch (error) {
      console.error('❌ Error saving entries:', error);
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

  const handleEditEntry = (date: string, categoryId: string, currentAmount?: number) => {
    const category = ENTRY_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Edit Entry',
        `Enter amount for ${category.label}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async (value) => {
              if (value && !isNaN(parseFloat(value))) {
                await updateCategoryEntry(date, categoryId, parseFloat(value));
              }
            }
          },
          ...(currentAmount ? [{
            text: 'Delete',
            style: 'destructive' as const,
            onPress: async () => {
              await updateCategoryEntry(date, categoryId, 0);
            }
          }] : [])
        ],
        'plain-text',
        currentAmount?.toString() || ''
      );
    } else {
      // Android: Show custom dialog
      setEditDialogData({
        date,
        categoryId,
        categoryLabel: category.label,
        currentAmount: currentAmount?.toString() || ''
      });
      setEditAmount(currentAmount?.toString() || '');
      setShowEditDialog(true);
    }
  };

  const handleSaveEditDialog = async () => {
    if (!editDialogData) return;
    
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      showAlert('Please enter a valid amount');
      return;
    }
    
    setShowEditDialog(false);
    await updateCategoryEntry(editDialogData.date, editDialogData.categoryId, amount);
    setEditDialogData(null);
    setEditAmount('');
  };

  const handleDeleteFromDialog = async () => {
    if (!editDialogData) return;
    
    Alert.alert(
      'Delete Entry',
      `Remove ${editDialogData.categoryLabel} from this date?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setShowEditDialog(false);
            await updateCategoryEntry(editDialogData.date, editDialogData.categoryId, 0);
            setEditDialogData(null);
            setEditAmount('');
          }
        }
      ]
    );
  };

  const updateCategoryEntry = async (date: string, categoryId: string, amount: number) => {
    try {
      setSaving(true);
      
      // Find existing entry for this date
      const existingEntry = savedEntries.find(e => e.entry_date === date);
      
      if (existingEntry) {
        // Update existing entry
        const updatedEntries = { ...existingEntry.entries };
        
        // If amount is 0 or negative, remove the category
        if (amount <= 0) {
          delete updatedEntries[categoryId];
        } else {
          updatedEntries[categoryId] = amount;
        }
        
        // Recalculate totals
        let newCredit = 0;
        let newDebit = 0;
        
        ENTRY_CATEGORIES.forEach(cat => {
          const val = updatedEntries[cat.id] || 0;
          if (val > 0) {
            if (cat.type === 'credit') newCredit += val;
            else newDebit += val;
          }
        });
        
        console.log('🔄 Updating entry:', {
          id: existingEntry.id,
          date,
          categoryId,
          amount,
          updatedEntries,
          newCredit,
          newDebit
        });
        
        const { data, error } = await supabase
          .from('daily_entries')
          .update({
            entries: updatedEntries,
            total_credit: newCredit,
            total_debit: newDebit,
            net_profit: newCredit - newDebit,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        
        console.log('✅ Entry updated:', data);
        showAlert('Entry updated successfully!');
        
        // Clear cache and reload
        await AsyncStorage.removeItem('offline_daily_entries');
        await loadSavedEntries(true);
      } else {
        // Create new entry for this date
        const category = ENTRY_CATEGORIES.find(c => c.id === categoryId);
        if (!category) return;
        
        if (amount <= 0) {
          showAlert('Please enter a valid amount');
          return;
        }
        
        const entries = { [categoryId]: amount };
        const credit = category.type === 'credit' ? amount : 0;
        const debit = category.type === 'debit' ? amount : 0;
        
        console.log('➕ Creating new entry:', {
          date,
          categoryId,
          amount,
          entries
        });
        
        const officeId = getCurrentOfficeId();
        const result = await saveDailyEntry(entries, credit, debit, credit - debit, officeId || undefined, date);
        
        if (result) {
          console.log('✅ Entry created:', result);
          showAlert('Entry added successfully!');
          await AsyncStorage.removeItem('offline_daily_entries');
          await loadSavedEntries(true);
        } else {
          showAlert('Failed to add entry');
        }
      }
    } catch (error) {
      console.error('❌ Error updating entry:', error);
      showAlert('Failed to update entry. Please try again.');
    } finally {
      setSaving(false);
    }
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
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'entry' ? renderEntryTab() : renderStatementTab()}

      {/* Edit Dialog for Android */}
      {showEditDialog && editDialogData && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Edit Entry</Text>
            <Text style={styles.dialogSubtitle}>{editDialogData.categoryLabel}</Text>
            
            <View style={styles.dialogInputContainer}>
              <Text style={styles.dialogCurrencySymbol}>₹</Text>
              <TextInput
                style={styles.dialogInput}
                value={editAmount}
                onChangeText={(value) => {
                  const sanitized = value.replace(/[^0-9.]/g, '');
                  setEditAmount(sanitized);
                }}
                placeholder="Enter amount"
                placeholderTextColor={Colors.placeholder}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowEditDialog(false);
                  setEditDialogData(null);
                  setEditAmount('');
                }}
              >
                <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              {editDialogData.currentAmount && (
                <TouchableOpacity
                  style={[styles.dialogButton, styles.dialogButtonDelete]}
                  onPress={handleDeleteFromDialog}
                >
                  <Icon name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.dialogButtonTextDelete}>Delete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonSave]}
                onPress={handleSaveEditDialog}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                  <>
                    <Icon name="checkmark" size={18} color={Colors.surface} />
                    <Text style={styles.dialogButtonTextSave}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  function renderEntryTab() {
    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Date Selector */}
          <View style={[GlobalStyles.card, styles.dateCard]}>
            <View style={styles.dateCardHeaderRow}>
              <Text style={styles.dateLabel}>Entry Date</Text>
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <TouchableOpacity
                  onPress={() => setSelectedDate(new Date())}
                  style={styles.todayButton}
                >
                  <Icon name="today-outline" size={16} color={Colors.primary} />
                  <Text style={styles.todayButtonText}>Today</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              <Icon name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

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
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Enter Amounts</Text>
              {Object.keys(amounts).length > 0 && (
                <Text style={styles.entryCount}>
                  {Object.values(amounts).filter(v => v && parseFloat(v) > 0).length} entries
                </Text>
              )}
            </View>
            
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
          
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setActiveTab('entry')}
          >
            <Icon name="add-circle-outline" size={20} color={Colors.surface} />
            <Text style={styles.emptyActionButtonText}>Create First Entry</Text>
          </TouchableOpacity>
          
          <Text style={[styles.emptySubText, { marginTop: 24, fontSize: 12, fontStyle: 'italic' }]}>
            Pull down to refresh
          </Text>
        </ScrollView>
      );
    }

    // Group entries by date
    const groupedEntries = savedEntries.reduce((acc, entry) => {
      const dateKey = entry.entry_date;
      if (!acc[dateKey]) {
        acc[dateKey] = entry;
      } else {
        // Merge entries for same date (shouldn't happen but handle it)
        const merged = { ...acc[dateKey] };
        merged.entries = { ...merged.entries, ...entry.entries };
        merged.total_credit += entry.total_credit;
        merged.total_debit += entry.total_debit;
        merged.net_profit += entry.net_profit;
        acc[dateKey] = merged;
      }
      return acc;
    }, {} as Record<string, DailyEntry>);

    // Sort dates in descending order
    const sortedDates = Object.keys(groupedEntries).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return (
      <FlatList
        data={sortedDates}
        keyExtractor={(date) => date}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.statementList}
        renderItem={({ item: date }) => {
          const entry = groupedEntries[date];
          
          return (
            <View style={styles.dateCard}>
              {/* Date Header - Clickable to expand/collapse */}
              <TouchableOpacity
                style={styles.dateCardHeader}
                onPress={() => setExpandedDate(expandedDate === date ? null : date)}
                activeOpacity={0.7}
              >
                <View style={styles.dateHeaderLeft}>
                  <Icon name="calendar" size={20} color={Colors.primary} />
                  <Text style={styles.dateCardTitle}>
                    {new Date(date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.dateHeaderRight}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(entry.id, e);
                    }}
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                  <Icon 
                    name={expandedDate === date ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </View>
              </TouchableOpacity>

              {/* Summary Row */}
              <View style={styles.dateCardSummary}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxLabel}>Credit</Text>
                  <Text style={[styles.summaryBoxValue, styles.creditText]}>
                    +₹{entry.total_credit.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxLabel}>Debit</Text>
                  <Text style={[styles.summaryBoxValue, styles.debitText]}>
                    -₹{entry.total_debit.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.summaryBox, styles.netProfitBox]}>
                  <Text style={styles.summaryBoxLabel}>Net Profit</Text>
                  <Text style={[
                    styles.summaryBoxValue,
                    styles.netProfitValueBold,
                    entry.net_profit >= 0 ? styles.profitPositive : styles.profitNegative
                  ]}>
                    ₹{entry.net_profit.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* All Categories Table - Collapsible */}
              {expandedDate === date && (
                <View style={styles.categoriesTable}>
                  <Text style={styles.tableTitle}>All Categories</Text>
                  {ENTRY_CATEGORIES.map((category, index) => {
                    const amount = entry.entries[category.id];
                    const hasValue = amount !== undefined && amount > 0;
                    
                    return (
                      <View key={category.id}>
                        <TouchableOpacity
                          style={styles.categoryRow}
                          onPress={() => handleEditEntry(date, category.id, amount)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.categoryLeft}>
                            <Text style={styles.categoryLabel}>{category.label}</Text>
                            <View style={[
                              styles.categoryTypeBadge,
                              category.type === 'credit' ? styles.creditBadge : styles.debitBadge
                            ]}>
                              <Text style={styles.categoryTypeBadgeText}>
                                {category.type === 'credit' ? 'C' : 'D'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.categoryRight}>
                            {hasValue ? (
                              <Text style={[
                                styles.categoryAmount,
                                category.type === 'credit' ? styles.creditText : styles.debitText
                              ]}>
                                {category.type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                              </Text>
                            ) : (
                              <View style={styles.naContainer}>
                                <Text style={styles.naText}>N/A</Text>
                                <Icon name="add-circle-outline" size={16} color={Colors.primary} />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        {index < ENTRY_CATEGORIES.length - 1 && (
                          <View style={styles.categoryDivider} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
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
  dateCard: {
    padding: 16,
    marginBottom: 16,
  },
  dateCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  entryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.surface,
  },
  statementList: {
    padding: 16,
  },
  dateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: 14,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dateCardSummary: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBoxLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  netProfitBox: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  netProfitValueBold: {
    fontSize: 18,
  },
  categoriesTable: {
    padding: 16,
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  categoryTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  categoryTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  categoryRight: {
    marginLeft: 12,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  naContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  naText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  categoryDivider: {
    height: 1,
    backgroundColor: Colors.border + '40',
    marginVertical: 2,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dateGroupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateGroupLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateGroupTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statementCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
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
  statementTime: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
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
  // Edit Dialog Styles
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dialogSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  dialogInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dialogCurrencySymbol: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginRight: 8,
  },
  dialogInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  dialogButtonCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dialogButtonDelete: {
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  dialogButtonSave: {
    backgroundColor: Colors.primary,
  },
  dialogButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dialogButtonTextDelete: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  dialogButtonTextSave: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.surface,
  },
});

export default DailyEntriesScreen;
