// AddTruckFuelScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Text, StatusBar, Platform, FlatList, ActivityIndicator, KeyboardAvoidingView, ScrollView, RefreshControl } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Dropdown from '../components/Dropdown';
import { saveTruckFuel, getTruckFuelEntries, TruckFuelEntry, deleteTransactionByIdImproved, syncAllDataFixed } from '../data/Storage';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import ActivityNotificationService from '../services/ActivityNotificationService';

interface DriverFuelEntry {
  id: string;
  driverName: string;
  fuelType: 'Diesel' | 'Petrol' | 'CNG';
  amount: number;
  date: string;
}

type AddTruckFuelScreenNavigationProp = NavigationProp<RootStackParamList, 'AddTruckFuel'>;

interface AddTruckFuelScreenProps {
  navigation: AddTruckFuelScreenNavigationProp;
}

function AddTruckFuelScreen({ navigation }: AddTruckFuelScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { goBack } = navigation;
  const [driverName, setDriverName] = useState<string>('');
  const [fuelType, setFuelType] = useState<'Diesel' | 'Petrol' | 'CNG'>('Diesel');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [fuelEntries, setFuelEntries] = useState<DriverFuelEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fuelTypeOptions = [
    { label: 'Diesel', value: 'Diesel' as const },
    { label: 'Petrol', value: 'Petrol' as const },
    { label: 'CNG', value: 'CNG' as const },
  ];

  const loadFuelEntries = useCallback(async () => {
    setLoading(true);
    try {
      const storedEntries = await getTruckFuelEntries();
      const driverEntries: DriverFuelEntry[] = storedEntries.map(entry => ({
        id: entry.id,
        driverName: entry.truck_number,
        fuelType: entry.fuel_type as 'Diesel' | 'Petrol' | 'CNG',
        amount: entry.total_price,
        date: entry.fuel_date
      }));
      const sortedEntries = driverEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      setFuelEntries(sortedEntries);
    } catch (error) {
      console.error('Error loading fuel entries:', error);
      Alert.alert('Error', 'Failed to load fuel entries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFuelEntries();
      return () => {};
    }, [loadFuelEntries])
  );

  const handleFuelTypeChange = (itemValue: string) => {
    setFuelType(itemValue as 'Diesel' | 'Petrol' | 'CNG');
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    await loadFuelEntries();
  };

  const handleSaveFuelEntry = async () => {
    if (!driverName.trim() || !amount.trim()) {
      Alert.alert('Invalid Input', 'Please fill all required fields: Driver Name and Amount.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Amount must be a positive number.');
      return;
    }

    setSaving(true);
    const approximatePricePerLiter = fuelType === 'Diesel' ? 90 : fuelType === 'Petrol' ? 100 : 75;
    const estimatedQuantity = numAmount / approximatePricePerLiter;

    const newEntry: Omit<TruckFuelEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'date'> = {
      truck_number: driverName.trim(),
      fuel_type: fuelType,
      quantity: estimatedQuantity,
      total_price: numAmount,
      price_per_liter: approximatePricePerLiter,
      fuel_date: new Date().toISOString(),
    };

    try {
      const success = await saveTruckFuel(newEntry);
      if (success) {
        // Send push notification to admin
        await ActivityNotificationService.notifyFuelEntry(
          'add',
          numAmount,
          driverName.trim(),
          `${fuelType} - ${estimatedQuantity.toFixed(1)}L`
        );
        
        showAlert('Fuel entry saved successfully!');
        setDriverName('');
        setAmount('');
        loadFuelEntries();
      } else {
        showAlert('Failed to save fuel entry. Please try again.');
      }
    } catch (error) {
      console.error('Save fuel entry error:', error);
      showAlert('An error occurred while saving fuel entry.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteEntry = async (id: string) => {
    const entryToDelete = fuelEntries.find(entry => entry.id === id);
    
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
              const success = await deleteTransactionByIdImproved(id, 'offline_truck_fuel');
              if (success) {
                // Send delete notification to admin
                if (entryToDelete) {
                  await ActivityNotificationService.notifyFuelEntry(
                    'delete',
                    entryToDelete.amount,
                    entryToDelete.driverName,
                    `Deleted ${entryToDelete.fuelType} entry`
                  );
                }
                
                Alert.alert('Success ✅', 'Entry deleted successfully!', [
                  { text: 'OK', onPress: loadFuelEntries }
                ]);
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

  const renderFuelEntryItem = ({ item }: { item: DriverFuelEntry }) => (
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
          <Text style={styles.entryTitle}>Driver: {item.driverName}</Text>
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fuel Type:</Text>
          <Text style={styles.detailValue}>{item.fuelType}</Text>
        </View>
        <View style={styles.totalPriceContainer}>
          <Text style={styles.amountLabel}>Amount:</Text>
          <Text style={styles.amountValue}>₹{item.amount.toFixed(2)}</Text>
        </View>
      </View>
    </LongPressGestureHandler>
  );

  const renderEmptyState = () => (
    <View style={[GlobalStyles.card, styles.emptyStateCard]}>
      <Icon name="gas-pump-outline" size={60} color={Colors.textSecondary} style={styles.emptyIcon} />
      <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Fuel Entries Yet!</Text>
      <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
        Start by adding your first driver fuel transaction above.
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Fuel Data</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={GlobalStyles.card}>
            <View style={styles.cardContent}>
              <Text style={GlobalStyles.title}>Add Fuel Entry</Text>

              <Text style={styles.inputLabel}>Driver Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                placeholder="e.g., Ramesh Kumar"
                placeholderTextColor={Colors.placeholder}
                value={driverName}
                onChangeText={setDriverName}
                style={GlobalStyles.input}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>Fuel Type <Text style={styles.requiredStar}>*</Text></Text>
              <Dropdown
                options={fuelTypeOptions}
                selectedValue={fuelType}
                onValueChange={handleFuelTypeChange}
                placeholder="Select Fuel Type"
              />

              <Text style={styles.inputLabel}>Amount (₹) <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                placeholder="e.g., 5000.00"
                placeholderTextColor={Colors.placeholder}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={GlobalStyles.input}
              />

              <TouchableOpacity onPress={handleSaveFuelEntry} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}>
                <Text style={GlobalStyles.buttonPrimaryText}>{saving ? 'Saving...' : 'Save Fuel Entry'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.listSectionTitle}>Recent Fuel Entries ({fuelEntries.length})</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading fuel entries...</Text>
            </View>
          ) : fuelEntries.length > 0 ? (
            <FlatList
              data={fuelEntries}
              renderItem={renderFuelEntryItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            renderEmptyState()
          )}
        </ScrollView>

        <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 20,
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
  cardContent: {
    padding: 0,
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
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  listSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
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
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '400',
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
  emptyStateCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
});

export default AddTruckFuelScreen;