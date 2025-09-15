import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StatusBar, Platform, Keyboard } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import Dropdown from '../components/Dropdown';
import { saveAgencyMajuri, getAgencyMajuri, AgencyMajuri, getAgencies, Agency, syncAllDataFixed } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';
import NotificationService from '../services/NotificationService';

type AddMajuriScreenNavigationProp = NavigationProp<RootStackParamList, 'AddMajuri'>;

interface AddMajuriScreenProps {
  navigation: AddMajuriScreenNavigationProp;
}

function AddMajuriScreen({ navigation }: AddMajuriScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { goBack } = navigation;
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [majuriAmount, setMajuriAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [majuriEntries, setMajuriEntries] = useState<AgencyMajuri[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const storedEntries: AgencyMajuri[] = await getAgencyMajuri();
      setMajuriEntries(storedEntries.sort((a, b) => new Date(b.majuri_date).getTime() - new Date(a.majuri_date).getTime()));

      const storedAgencies: Agency[] = await getAgencies();
      const options = storedAgencies.map(agency => ({ label: agency.name, value: agency.name }));
      setAgencyOptions(options);

      if (options.length > 0 && !selectedAgency) {
        setSelectedAgency(options[0].value);
      } else if (options.length === 0) {
        setSelectedAgency('');
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveMajuri = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    if (!selectedAgency) {
      showAlert('Please select an agency');
      return;
    }
    const amount = parseFloat(majuriAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }
    // Description is optional, so we don't need validation for it

    setSaving(true);
    const newMajuriEntry: Omit<AgencyMajuri, 'id' | 'date' | 'created_at' | 'updated_at' | 'created_by' | 'agency_id' | 'majuri_date'> = {
      agency_name: selectedAgency,
      amount: amount,
      description: description.trim(),
    };

    const success = await saveAgencyMajuri(newMajuriEntry);

    if (success) {
      // Send notification to admin
      await NotificationService.notifyAdd('agency_majuri', `New majuri entry: ₹${amount} for ${selectedAgency}`);
      
      showAlert('Majuri saved successfully');
      setMajuriAmount('');
      setDescription('');
      await loadData();
      
      // Trigger manual sync to refresh all majur dashboards
      console.log('AddMajuriScreen - Triggering manual sync after majuri save');
      try {
        await syncAllDataFixed();
        console.log('AddMajuriScreen - Manual sync completed');
      } catch (error) {
        console.error('AddMajuriScreen - Manual sync failed:', error);
      }
    } else {
      showAlert('Failed to save majuri entry. Please try again.');
    }
    setSaving(false);
  };

  const renderMajuriEntryItem = ({ item }: { item: AgencyMajuri }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{item.agency_name}</Text>
        <Text style={styles.entryDate}>{new Date(item.majuri_date).toLocaleDateString('en-IN')}</Text>
      </View>
      <Text style={styles.entryDescription}>Description: {item.description || 'N/A'}</Text>
      <View style={styles.entryFooter}>
        <Text style={styles.entryAmountLabel}>Amount:</Text>
        <Text style={styles.entryAmount}>₹{item.amount.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Majuri</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[GlobalStyles.card, { paddingBottom: 48 }]}>
        <View style={styles.cardContent}>
          <Text style={GlobalStyles.title}>Add Majuri Entry</Text>
          <Text style={styles.dateText}>Date: {currentDate}</Text>
          <Text style={styles.inputLabel}>Select Agency <Text style={styles.requiredStar}>*</Text></Text>
          <Dropdown
            options={agencyOptions}
            selectedValue={selectedAgency}
            onValueChange={setSelectedAgency}
            placeholder={agencyOptions.length > 0 ? "Select Agency" : "No Agencies Added"}
          />
          <Text style={styles.inputLabel}>Majuri Amount <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            placeholder="Majuri Amount"
            placeholderTextColor={Colors.placeholder}
            value={majuriAmount}
            onChangeText={setMajuriAmount}
            keyboardType="numeric"
            style={GlobalStyles.input}
          />
          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            placeholder="Description (Optional)"
            placeholderTextColor={Colors.placeholder}
            value={description}
            onChangeText={setDescription}
            style={[GlobalStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity onPress={handleSaveMajuri} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}>
            <Text style={GlobalStyles.buttonPrimaryText}>{saving ? "Saving..." : "Save Majuri Entry"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.listSectionTitle}>Recent Majuri Entries</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : majuriEntries.length > 0 ? (
        <FlatList
          data={majuriEntries.slice(0, 10)}
          renderItem={renderMajuriEntryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>No majuri entries found</Text>
            </View>
          }
        />
      ) : (
        <View style={[GlobalStyles.card, styles.noEntriesCard]}>
          <Icon name="cash-outline" size={40} color={Colors.textSecondary} style={styles.emptyIcon} />
          <Text style={GlobalStyles.bodyText}>No majuri entries added yet.</Text>
        </View>
      )}
      
      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingBottom: 0,
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
    paddingBottom: 16,
  },
  dateText: {
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 12,
    textAlign: 'left',
    color: Colors.textPrimary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginHorizontal: 4,
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
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  entryAmountLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  listContainer: {
    flex: 1,
  },
  noEntriesCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    margin: 16,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
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
  emptyIcon: {
    marginBottom: 10,
    opacity: 0.6,
  },
  emptyListContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AddMajuriScreen;