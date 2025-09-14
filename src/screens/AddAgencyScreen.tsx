import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, Text, TextInput, TouchableOpacity, StatusBar, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { saveAgency, getAgencies, Agency } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';

type AddAgencyScreenNavigationProp = NavigationProp<RootStackParamList, 'AddAgency'>;

interface AddAgencyScreenProps {
  navigation: AddAgencyScreenNavigationProp;
}

function AddAgencyScreen({ navigation }: AddAgencyScreenProps): React.JSX.Element {
  const { showAlert } = useAlert();
  const { goBack } = navigation;
  const [agencyName, setAgencyName] = useState<string>('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const loadAgencies = useCallback(async () => {
    setLoading(true);
    try {
      const storedAgencies: Agency[] = await getAgencies();
      setAgencies(storedAgencies.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to load agencies:", error);
      Alert.alert('Error', 'Failed to load existing agencies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAgencies();
      return () => {};
    }, [loadAgencies])
  );

  const handleAddAgency = async () => {
    if (!agencyName.trim()) {
      Alert.alert('Invalid Input', 'Please enter an agency name.');
      return;
    }

    setSaving(true);
    const trimmedAgencyName = agencyName.trim();
    const success = await saveAgency(trimmedAgencyName);

    if (success) {
      showAlert(`Agency "${trimmedAgencyName}" added successfully!`, 2000);
      setAgencyName('');
      loadAgencies();
    } else {
      showAlert(`Agency "${trimmedAgencyName}" already exists or failed to save.`);
    }
    setSaving(false);
  };

  const renderAgencyItem = ({ item, index }: { item: Agency, index: number }) => (
    <View style={styles.agencyItem}>
      <Text style={styles.agencyItemIndex}>{index + 1}.</Text>
      <Text style={styles.agencyItemText}>{item.name}</Text>
    </View>
  );

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Agency</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={GlobalStyles.card}>
          <View style={styles.cardContent}>
            <Text style={GlobalStyles.title}>Add New Agency</Text>
            <Text style={styles.inputLabel}>Agency Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              placeholder="e.g., Shree Ram Transport"
              placeholderTextColor={Colors.placeholder}
              value={agencyName}
              onChangeText={setAgencyName}
              style={GlobalStyles.input}
              editable={!saving}
            />
            <TouchableOpacity onPress={handleAddAgency} disabled={saving} style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}>
              <Text style={GlobalStyles.buttonPrimaryText}>{saving ? "Adding..." : "Add Agency"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.listSectionTitle}>Existing Agencies ({agencies.length})</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading agencies...</Text>
          </View>
        ) : agencies.length > 0 ? (
          <View style={styles.listContainer}>
            <FlatList
              data={agencies}
              renderItem={renderAgencyItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
            />
          </View>
        ) : (
          <View style={[GlobalStyles.card, styles.noAgenciesCard]}>
            <Icon name="business-outline" size={40} color={Colors.textSecondary} style={styles.emptyIcon} />
            <Text style={GlobalStyles.bodyText}>No agencies added yet.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
  listSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  agencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  agencyItemIndex: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginRight: 10,
  },
  agencyItemText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
  noAgenciesCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
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
  },
});

export default AddAgencyScreen;