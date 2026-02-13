// src/screens/MumbaiDeliveryEntryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { saveAgencyEntry, getAgencyEntry, deleteTransactionByIdImproved, OFFLINE_KEYS, AgencyEntry } from '../data/Storage';
import { useAlert } from '../context/AlertContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import NotificationService from '../services/NotificationService';
import { useOffice } from '../context/OfficeContext';

type MumbaiDeliveryEntryScreenNavigationProp = NavigationProp<RootStackParamList, 'MumbaiDeliveryEntry'>;

interface MumbaiDeliveryEntryScreenProps {
  navigation: MumbaiDeliveryEntryScreenNavigationProp;
}

function MumbaiDeliveryEntryScreen({ navigation }: MumbaiDeliveryEntryScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const { getCurrentOfficeId } = useOffice();

  // Form states
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState<boolean>(false);

  // List states
  const [recentEntries, setRecentEntries] = useState<AgencyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const currentOfficeId = getCurrentOfficeId();
      const allEntries = await getAgencyEntry(currentOfficeId || undefined);
      // Filter only Mumbai entries
      const mumbaiEntries = allEntries
        .filter(entry => entry.agency_name === 'Mumbai')
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
        .slice(0, 20); // Show last 20 entries

      setRecentEntries(mumbaiEntries);
    } catch (error) {
      console.error('Error loading Mumbai entries:', error);
      showAlert('Failed to load entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert, getCurrentOfficeId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => { };
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      showAlert('Enter description');
      return;
    }
    if (!amount.trim()) {
      showAlert('Enter amount');
      return;
    }
    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert('Enter valid amount');
      return;
    }

    setSaving(true);
    try {
      const entryData = {
        agency_name: 'Mumbai',
        description: description.trim(),
        amount: numericAmount,
        entry_type: 'credit' as 'credit', // Always credit for Mumbai delivery
        entry_date: date.toISOString(),
        delivery_status: 'yes' as 'yes', // Always yes for Mumbai delivery
      };

      const success = await saveAgencyEntry(entryData);
      if (success) {
        // Send notification to admin
        await NotificationService.notifyAdd('mumbai_delivery', `New Mumbai delivery: ₹${numericAmount} - ${description.trim().slice(0, 30)}${description.trim().length > 30 ? '...' : ''}`);

        setTimeout(() => {
          showAlert('Mumbai delivery entry saved successfully!');
        }, 100);
        setDescription('');
        setAmount('');
        await loadData(false);
      } else {
        showAlert('Failed to save entry');
      }
    } catch (error) {
      console.error('Save entry error:', error);
      showAlert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    const entryToDelete = recentEntries.find(entry => entry.id === id);

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this Mumbai delivery entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTransactionByIdImproved(id, OFFLINE_KEYS.AGENCY_ENTRIES);
              if (success) {
                // Send notification to admin
                if (entryToDelete) {
                  await NotificationService.notifyDelete('mumbai_delivery', `Deleted Mumbai delivery: ₹${entryToDelete.amount} - ${entryToDelete.description.slice(0, 30)}${entryToDelete.description.length > 30 ? '...' : ''}`);
                }

                const updatedEntries = recentEntries.filter(entry => entry.id !== id);
                setRecentEntries(updatedEntries);
                showAlert('Entry deleted successfully!');
              } else {
                showAlert('Failed to delete entry');
              }
            } catch (error) {
              console.error('Delete error:', error);
              showAlert('Error deleting entry');
            }
          }
        }
      ]
    );
  };

  const renderEntryItem = ({ item }: { item: AgencyEntry }) => {
    const deliveryText = item.delivery_status === 'yes' ? 'Delivered' : 'Not Delivered';

    return (
      <LongPressGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            handleDeleteEntry(item.id);
          }
        }}
        minDurationMs={800}
      >
        <View style={[GlobalStyles.card, styles.entryCard]}>
          <View style={styles.entryHeader}>
            <View style={styles.deliveredChip}>
              <Text style={styles.chipText}>{deliveryText}</Text>
            </View>
            <Text style={styles.entryDate}>{new Date(item.entry_date).toLocaleDateString('en-IN')}</Text>
          </View>
          <View style={styles.entryContent}>
            <Text style={styles.entryDescription}>{item.description}</Text>
            <Text style={styles.creditAmount}>
              ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </LongPressGestureHandler>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mumbai Delivery Entry</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={recentEntries}
          renderItem={renderEntryItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={GlobalStyles.card}>
              <View style={styles.cardContent}>
                <Text style={[GlobalStyles.title, styles.cardTitle]}>Add Mumbai Delivery Entry</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description <Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    style={[GlobalStyles.input, styles.input]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter delivery description"
                    placeholderTextColor={Colors.placeholder}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount <Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    style={[GlobalStyles.input, styles.input]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[GlobalStyles.buttonPrimary, styles.saveButton, saving && styles.disabledButton]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <Text style={GlobalStyles.buttonPrimaryText}>Save Mumbai Delivery Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Icon name="car-outline" size={60} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No Mumbai delivery entries yet</Text>
              </View>
            ) : null
          }
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Mumbai delivery entries...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
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
  },
  backButton: {
    paddingRight: 10,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 34,
  },
  listContent: {
    padding: 16,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  requiredStar: {
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  saveButton: {
    marginTop: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  entryCard: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  deliveredChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDescription: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginRight: 12,
  },
  creditAmount: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

export default MumbaiDeliveryEntryScreen;
