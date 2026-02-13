// ProfileSettingsScreen.tsx - User profile and settings
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { supabase } from '../supabase';
import { getProfile, getOffices, Office } from '../data/Storage';
import CommonHeader from '../components/CommonHeader';
import Dropdown from '../components/Dropdown';

type ProfileSettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProfileSettings'
>;

interface ProfileSettingsScreenProps {
  navigation: ProfileSettingsScreenNavigationProp;
}

function ProfileSettingsScreen({ navigation }: ProfileSettingsScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentOfficeId, setCurrentOfficeId] = useState('');
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadOffices();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        navigation.goBack();
        return;
      }

      setUserEmail(user.email || '');

      const profile = await getProfile(user.id);
      if (profile) {
        setUserName(profile.full_name || profile.username || '');
        setUserType(profile.user_type || 'normal');
        setIsAdmin(profile.is_admin || false);
        setCurrentOfficeId(profile.office_id || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    try {
      const officeList = await getOffices();
      setOffices(officeList);
    } catch (error) {
      console.error('Error loading offices:', error);
    }
  };

  const handleSaveOffice = async () => {
    if (!currentOfficeId) {
      Alert.alert('Error', 'Please select an office');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update({ office_id: currentOfficeId })
        .eq('id', user.id);

      if (error) throw error;

      const selectedOffice = offices.find(o => o.id === currentOfficeId);
      Alert.alert(
        'Success',
        `Your default office has been set to ${selectedOffice?.name}`
      );
    } catch (error) {
      console.error('Error saving office:', error);
      Alert.alert('Error', 'Failed to save office assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={GlobalStyles.container}>
        <CommonHeader title="Profile Settings" onBackPress={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <CommonHeader title="Profile Settings" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userEmail}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{userName || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>User Type</Text>
            <Text style={styles.value}>
              {userType === 'majur' ? 'Majur User' : 'Normal User'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{isAdmin ? 'Admin' : 'User'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Office Assignment</Text>
          <Text style={styles.sectionDescription}>
            Set your default office. This will be used when you login.
          </Text>

          {offices.length === 0 ? (
            <Text style={styles.noOfficesText}>
              No offices available. Contact admin to create offices.
            </Text>
          ) : (
            <>
              <Dropdown
                options={[
                  { label: 'No Office', value: '' },
                  ...offices.map(office => ({
                    label: office.name,
                    value: office.id
                  }))
                ]}
                selectedValue={currentOfficeId}
                onValueChange={(value: string) => setCurrentOfficeId(value)}
                placeholder="Select your default office"
              />

              <TouchableOpacity
                onPress={handleSaveOffice}
                disabled={saving}
                style={[GlobalStyles.buttonPrimary, saving && styles.disabledButton]}
              >
                <Text style={GlobalStyles.buttonPrimaryText}>
                  {saving ? 'Saving...' : 'Save Office Assignment'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.infoText}>
            You can temporarily switch offices using the office selector in the header.
            Your default office will be automatically selected when you login.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  noOfficesText: {
    fontSize: 14,
    color: Colors.error,
    fontStyle: 'italic',
    marginVertical: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ProfileSettingsScreen;
