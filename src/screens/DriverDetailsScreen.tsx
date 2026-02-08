import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, ScrollView, RefreshControl, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { saveDriverTransaction, DriverTransaction, getDriverTransactions, deleteTransactionByIdImproved, syncAllDataFixed } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { useAlert } from '../context/AlertContext';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { CommonHeader, CommonInput, EmptyState } from '../components';

type DriverDetailsScreenNavigationProp = NavigationProp<RootStackParamList, 'DriverDetails'>;

interface DriverDetailsScreenProps {
  navigation: DriverDetailsScreenNavigationProp;
}

const DRIVER_SUGGESTIONS_KEY = 'driver_description_suggestions';

function DriverDetailsScreen({ navigation }: DriverDetailsScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const [driverName, setDriverName] = useState('');
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('debit');
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Changed from `loading`
  const [isSaving, setIsSaving] = useState(false); // New state for saving
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<DriverTransaction[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsInitialLoading(true); // Use the new state for initial loading
    try {
      await loadSuggestions();
      const storedTransactions = await getDriverTransactions();
      setRecentEntries(storedTransactions);

      const debits = storedTransactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const credits = storedTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      setTotalDebit(debits);
      setTotalCredit(credits);
    } catch (error) {
      console.error('Failed to load data', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => { };
    }, [loadData])
  );

  useEffect(() => {
    if (description.trim()) {
      const filtered = suggestions.filter(s => s.toLowerCase().includes(description.toLowerCase()));
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [description, suggestions]);

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const storedSuggestions = await AsyncStorage.getItem(DRIVER_SUGGESTIONS_KEY);
      if (storedSuggestions) {
        setSuggestions(JSON.parse(storedSuggestions));
      }
    } catch (error) {
      console.error('Failed to load suggestions', error);
      Alert.alert('Error', 'Failed to load description suggestions.');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const saveSuggestion = async (text: string) => {
    try {
      const trimmedText = text.trim();
      if (trimmedText && !suggestions.includes(trimmedText)) {
        const newSuggestions = [trimmedText, ...suggestions].slice(0, 20);
        setSuggestions(newSuggestions);
        await AsyncStorage.setItem(DRIVER_SUGGESTIONS_KEY, JSON.stringify(newSuggestions));
      }
    } catch (error) {
      console.error('Failed to save suggestion', error);
    }
  };

  const removeSuggestion = async (suggestionToRemove: string) => {
    Alert.alert(
      "Remove Suggestion",
      `Are you sure you want to remove "${suggestionToRemove}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            try {
              const newSuggestions = suggestions.filter(s => s !== suggestionToRemove);
              setSuggestions(newSuggestions);
              await AsyncStorage.setItem(DRIVER_SUGGESTIONS_KEY, JSON.stringify(newSuggestions));
              setFilteredSuggestions(filteredSuggestions.filter(s => s !== suggestionToRemove));
            } catch (error) {
              console.error('Failed to remove suggestion', error);
              Alert.alert('Error', 'Failed to remove suggestion.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    await loadData();
  };

  const validateInputs = () => {
    if (!driverName.trim()) {
      Alert.alert('Error', 'Please enter driver name.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter description.');
      return false;
    }
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount.');
      return false;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setIsSaving(true); // Use the new state for saving
    try {
      await saveSuggestion(description.trim());

      const numAmount = parseFloat(amount);
      const newTransaction: Omit<DriverTransaction, 'id' | 'created_at' | 'updated_at' | 'editedAt' | 'date' | 'type' | 'transaction_date' | 'recorded_by'> = {
        driver_name: driverName.trim(),
        description: description.trim(),
        amount: numAmount,
        transaction_type: transactionType as 'credit' | 'debit',
      };

      const success = await saveDriverTransaction(newTransaction as any);

      if (success) {
        showAlert('Transaction saved successfully!');
        setDriverName('');
        setDescription('');
        setAmount('');
        setTransactionType('debit');
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to save transaction. Please try again.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false); // Use the new state for saving
    }
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTransactionByIdImproved(id, 'offline_driver_transactions');
              if (success) {
                const updatedEntries = recentEntries.filter(entry => entry.id !== id);
                setRecentEntries(updatedEntries);
                const amount = recentEntries.find(e => e.id === id)?.amount || 0;
                const type = recentEntries.find(e => e.id === id)?.transaction_type || 'debit';

                if (type === 'debit') {
                  setTotalDebit(prev => Math.max(0, prev - amount));
                } else {
                  setTotalCredit(prev => Math.max(0, prev - amount));
                }

                showAlert('Transaction deleted successfully!');
              } else {
                Alert.alert('Error', 'Failed to delete entry. Please try again.');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'An error occurred while deleting the entry.');
            }
          }
        }
      ]
    );
  };

  const renderSuggestionItem = ({ item }: { item: string }) => (
    <View style={styles.suggestionItem}>
      <TouchableOpacity
        onPress={() => setDescription(item)}
        style={styles.suggestionContent}
      >
        <Text style={styles.suggestionText}>{item}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => removeSuggestion(item)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentEntryItem = ({ item }: { item: DriverTransaction }) => {
    const isDebit = item.transaction_type === 'debit';
    return (
      <LongPressGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            handleDeleteEntry(item.id);
          }
        }}
        minDurationMs={800}
      >
        <View style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{item.driver_name}</Text>
            <Text style={styles.entryDate}>{new Date(item.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          </View>
          <Text style={styles.entryDescription}>Description: {item.description || 'N/A'}</Text>
          <View style={styles.totalPriceContainer}>
            <Text style={styles.amountLabel}>Amount:</Text>
            <Text style={[styles.amountValue, isDebit ? styles.debitAmount : styles.creditAmount]}>
              {isDebit ? '-' : '+'} ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </LongPressGestureHandler>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="person-outline"
      title="No Transactions Yet!"
      message="Start by adding your first driver transaction above."
    />
  );

  const renderForm = () => (
    <View style={GlobalStyles.card}>
      <View style={styles.cardContent}>
        <Text style={GlobalStyles.title}>Add Driver Transaction</Text>

        <CommonInput
          label="Driver Name"
          required
          placeholder="e.g., Ramesh Kumar"
          value={driverName}
          onChangeText={setDriverName}
          autoCapitalize="words"
        />

        <CommonInput
          label="Description"
          required
          placeholder="e.g., Fuel, Advance, Salary"
          value={description}
          onChangeText={setDescription}
          style={styles.descriptionInput}
          multiline
          numberOfLines={2}
        />

        {suggestionsLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.suggestionsLoading} />
        ) : filteredSuggestions.length > 0 && description.trim() ? (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Suggestions:</Text>
            <FlatList
              data={filteredSuggestions}
              keyExtractor={(item) => item}
              renderItem={renderSuggestionItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            />
          </View>
        ) : null}

        <View style={styles.transactionTypeSection}>
          <Text style={styles.transactionTypeLabel}>Transaction Type <Text style={styles.requiredStar}>*</Text></Text>
          <View style={styles.radioContainer}>
            <View style={styles.radioButtons}>
              <TouchableOpacity
                style={[styles.radioOption, transactionType === 'debit' && styles.radioOptionSelected]}
                onPress={() => setTransactionType('debit')}
              >
                <Icon name="arrow-up-circle-outline" size={24} color={transactionType === 'debit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.radioLabel, transactionType === 'debit' && styles.radioLabelSelected]}>
                  Debit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, transactionType === 'credit' && styles.radioOptionSelected]}
                onPress={() => setTransactionType('credit')}
              >
                <Icon name="arrow-down-circle-outline" size={24} color={transactionType === 'credit' ? Colors.surface : Colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.radioLabel, transactionType === 'credit' && styles.radioLabelSelected]}>
                  Credit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <CommonInput
          label="Amount"
          required
          placeholder="e.g., 500.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
          <View style={styles.amountPreview}>
            <Text style={styles.amountPreviewLabel}>Amount to be recorded:</Text>
            <Text style={[
              styles.amountPreviewValue,
              transactionType === 'debit' ? styles.debitAmount : styles.creditAmount
            ]}>
              {transactionType === 'debit' ? '-' : '+'}
              ₹{parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSave}
          style={[GlobalStyles.buttonPrimary, isSaving && styles.disabledButton]} // Use the new saving state
          disabled={isSaving} // Use the new saving state
        >
          <Text style={GlobalStyles.buttonPrimaryText}>{isSaving ? 'Saving Transaction...' : 'Save Transaction'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <CommonHeader title="Driver Transaction" onBackPress={goBack} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        >
          {renderForm()}
          <Text style={styles.listSectionTitle}>Recent Driver Entries</Text>
          <FlatList
            data={recentEntries.slice(0, 10)}
            renderItem={renderRecentEntryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={isInitialLoading ? null : renderEmptyState}
            scrollEnabled={false}
          />
        </ScrollView>

        <TouchableOpacity
          onPress={goBack}
          style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}
        >
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 0,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  transactionTypeSection: {
    marginTop: 15,
  },
  transactionTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  requiredStar: {
    color: Colors.error,
    fontSize: 14,
  },
  suggestionsContainer: {
    marginBottom: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionsLoading: {
    marginTop: 10,
    marginBottom: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionContent: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  removeButton: {
    padding: 6,
    marginLeft: 4,
  },
  removeButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  radioContainer: {
    marginBottom: 16,
    marginTop: 10,
  },
  radioButtons: {
    gap: 10,
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
  },
  radioOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  radioLabelSelected: {
    color: Colors.surface,
    fontWeight: '700',
  },
  radioSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  amountPreview: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: Colors.background,
    elevation: 2,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  amountPreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  amountPreviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  debitAmount: {
    color: Colors.error,
  },
  creditAmount: {
    color: Colors.success,
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
  quickSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  quickSuggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSuggestionChip: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    opacity: 0.9,
    elevation: 1,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickSuggestionText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  listSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginHorizontal: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  entryDescription: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default DriverDetailsScreen;