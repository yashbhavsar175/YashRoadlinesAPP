import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, FlatList, Text, TouchableOpacity, StatusBar, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { saveAgency, getAgencies, Agency } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import NotificationService from '../services/NotificationService';

// Import common components
import CommonHeader from '../components/CommonHeader';
import CommonInput from '../components/CommonInput';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

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
      await NotificationService.notifyAdd('agency_entry', 
        `${trimmedAgencyName} agency was added by user`
      );
      
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
    <KeyboardAvoidingView 
      style={GlobalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <CommonHeader title="Add Agency" onBackPress={goBack} />

      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={GlobalStyles.card}>
          <View style={styles.cardContent}>
            <Text style={GlobalStyles.title}>Add New Agency</Text>
            
            <CommonInput
              label="Agency Name"
              required
              placeholder="e.g., Shree Ram Transport"
              value={agencyName}
              onChangeText={setAgencyName}
              editable={!saving}
            />

            <TouchableOpacity 
              onPress={handleAddAgency} 
              disabled={saving} 
              style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}
            >
              <Text style={GlobalStyles.buttonPrimaryText}>
                {saving ? "Adding..." : "Add Agency"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.listSectionTitle}>Existing Agencies ({agencies.length})</Text>
        
        {loading ? (
          <LoadingSpinner message="Loading agencies..." />
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
          <EmptyState
            icon="business-outline"
            title="No Agencies Yet"
            message="No agencies added yet. Add your first agency above."
          />
        )}
      </ScrollView>

      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
});

export default AddAgencyScreen;
