import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, StatusBar, Platform, KeyboardAvoidingView, ScrollView, LayoutAnimation, UIManager } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabase';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeBiometrics from 'react-native-biometrics';
import { listAllProfiles, listProfilesExceptCurrent, setUserActive, updateUserType, createProfileIfMissing, getProfile, UserProfile, savePerson, getPersons, Person, saveUppadJamaEntry, syncAllDataFixed, getOffices } from '../data/Storage'; // Added getOffices
import Dropdown from '../components/Dropdown'; // Added Dropdown import
import { migrateAllDataToPremDarwaja, checkMigrationNeeded } from '../utils/migrateDataToOffice';

type AdminPanelScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminPanel'>;

interface AdminPanelScreenProps {
  navigation: AdminPanelScreenNavigationProp;
}

function AdminPanelScreen({ navigation }: AdminPanelScreenProps): React.JSX.Element {
  const { navigate, goBack } = navigation;
  const [newUsername, setNewUsername] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserType, setNewUserType] = useState<'normal' | 'majur'>('normal');
  const [newUserOfficeId, setNewUserOfficeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentProfileUsername, setCurrentProfileUsername] = useState<string | null>(null);
  const [currentProfileFullName, setCurrentProfileFullName] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean>(false);
  // Persons management
  const [personName, setPersonName] = useState<string>('');
  const [personSaving, setPersonSaving] = useState<boolean>(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [personsLoading, setPersonsLoading] = useState<boolean>(false);
  // Uppad/Jama Entry states
  const [uppadJamaPersonId, setUppadJamaPersonId] = useState<string>('');
  const [uppadAmount, setUppadAmount] = useState<string>('');
  const [jamaAmount, setJamaAmount] = useState<string>('');
  const [uppadJamaSaving, setUppadJamaSaving] = useState<boolean>(false);
  // Section expand/collapse
  const [expandUserSection, setExpandUserSection] = useState<boolean>(false);
  const [expandMastersSection, setExpandMastersSection] = useState<boolean>(false);
  // Sub-section expand/collapse
  const [expandAddUser, setExpandAddUser] = useState<boolean>(false);
  const [expandManageUsers, setExpandManageUsers] = useState<boolean>(false);
  const [expandMajurDebug, setExpandMajurDebug] = useState<boolean>(false);
  const [expandManageAgencies, setExpandManageAgencies] = useState<boolean>(false);
  const [expandPersonMgmt, setExpandPersonMgmt] = useState<boolean>(false);
  const [expandUppadJamaEntry, setExpandUppadJamaEntry] = useState<boolean>(false); // New state for Uppad/Jama Entry
  
  // Offices state
  const [offices, setOffices] = useState<any[]>([]);
  const [officesLoading, setOfficesLoading] = useState<boolean>(false);
  
  // Migration state
  const [expandMigrationSection, setExpandMigrationSection] = useState<boolean>(false);
  const [migrationLoading, setMigrationLoading] = useState<boolean>(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');

  const toggleUserSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandUserSection(prev => !prev);
  };
  const toggleMastersSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandMastersSection(prev => !prev);
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newUserPassword.trim()) {
      Alert.alert('Error', 'Please enter a username and password for the new user.');
      return;
    }
    setLoading(true);
    try {
      const email = newUsername.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: newUserPassword,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('Error', `User "${email}" already exists.`);
        } else {
          throw error;
        }
      } else {
        // FIX: Sign out after creating the user to prevent automatic login
        if (data.session) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            console.error("Sign out after user creation error:", signOutError.message);
          }
        }
        
        Alert.alert('Success', `User "${email}" created successfully! The current admin user remains logged in.`);
        setNewUsername('');
        setNewUserPassword('');
        setNewUserType('normal');
        setNewUserOfficeId('');
        
        if (data.user?.id) {
          // Ensure profile exists for manage users list
          await createProfileIfMissing(data.user.id, email, newUserType);
          
          // Assign office if selected
          if (newUserOfficeId) {
            try {
              const { error: officeError } = await supabase
                .from('user_profiles')
                .update({ office_id: newUserOfficeId })
                .eq('id', data.user.id);
              
              if (officeError) {
                console.error('Error assigning office:', officeError);
                Alert.alert('Warning', 'User created but office assignment failed.');
              } else {
                const selectedOffice = offices.find(o => o.id === newUserOfficeId);
                console.log(`✅ User assigned to office: ${selectedOffice?.name}`);
              }
            } catch (err) {
              console.error('Error in office assignment:', err);
            }
          }
          
          await loadUsers();
        }
      }
    } catch (error: any) {
      console.error("Create user error:", error.message);
      Alert.alert('Error creating user', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // Server-side exclude current user by id
      const items = await listProfilesExceptCurrent();
      setUsers(items);
    } catch (e) {
      // ignore
    }
    finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadOffices();
  }, [loadUsers]);

  const loadOffices = useCallback(async () => {
    setOfficesLoading(true);
    try {
      const officeList = await getOffices();
      setOffices(officeList);
      console.log('📋 Loaded offices for user creation:', officeList.length);
    } catch (error) {
      console.error('Error loading offices:', error);
    } finally {
      setOfficesLoading(false);
    }
  }, []);

  const loadPersons = useCallback(async () => {
    setPersonsLoading(true);
    try {
      const items = await getPersons();
      setPersons(items);
    } catch (e) {
      // ignore
    }
    finally {
      setPersonsLoading(false);
    }
  }, []);

  // Hide admin (current logged-in user) from the users list
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        const uid = user?.id ?? null;
        setCurrentUserId(uid);
        setCurrentUserEmail(user?.email ?? null);
        if (uid) {
          const p = await getProfile(uid);
          if (p) {
            setCurrentProfileUsername(p.username ?? null);
            setCurrentProfileFullName(p.full_name ?? null);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Reload list once we know current user's id/email
  useEffect(() => {
    if (currentUserId !== null || currentUserEmail !== null) {
      loadUsers();
      loadPersons();
    }
  }, [currentUserId, currentUserEmail, loadUsers, loadPersons]);

  // Admin + biometric gate on screen focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const checkAccess = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email?.toLowerCase() || '';
          const uid = user?.id || '';
          if (!uid) {
            Alert.alert('Not logged in', 'Please login again.');
            goBack();
            return;
          }
          const profile = await getProfile(uid);
          const isAdmin = profile?.is_admin === true || email === 'yashbhavsar175@gmail.com';
          if (!isAdmin) {
            Alert.alert('Access denied', 'Admin privileges required.');
            goBack();
            return;
          }
          const rnBiometrics = new ReactNativeBiometrics();
          const { available } = await rnBiometrics.isSensorAvailable();
          if (available) {
            const result = await rnBiometrics.simplePrompt({ promptMessage: 'Unlock Admin Panel' });
            if (!result.success) {
              Alert.alert('Authentication failed', 'Biometric verification required.');
              goBack();
              return;
            }
          }
          if (active) setAuthorized(true);
        } catch (e) {
          Alert.alert('Error', 'Unable to verify admin access.');
          goBack();
        }
      };
      setAuthorized(false);
      checkAccess();
      return () => { active = false; };
    }, [goBack])
  );

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && (UIManager as any).setLayoutAnimationEnabledExperimental) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const handleSaveUppadJamaEntry = async () => {
    if (!uppadJamaPersonId) {
      Alert.alert('Missing Person', 'Please select a person.');
      return;
    }

    const hasUppad = uppadAmount.trim().length > 0;
    const hasJama = jamaAmount.trim().length > 0;

    if (!hasUppad && !hasJama) {
      Alert.alert('Missing Amount', 'Please enter either an Uppad or Jama amount.');
      return;
    }

    const numUppad = parseFloat(uppadAmount);
    const numJama = parseFloat(jamaAmount);

    if (hasUppad && (isNaN(numUppad) || numUppad <= 0)) {
      Alert.alert('Invalid Uppad Amount', 'Please enter a positive number for Uppad.');
      return;
    }

    if (hasJama && (isNaN(numJama) || numJama <= 0)) {
      Alert.alert('Invalid Jama Amount', 'Please enter a positive number for Jama.');
      return;
    }

    if (hasUppad && hasJama) {
      Alert.alert('Conflicting Entries', 'Please enter either Uppad or Jama, not both.');
      return;
    }

    setUppadJamaSaving(true);
    try {
      const selectedPersonName = persons.find(p => p.id === uppadJamaPersonId)?.name || '';
      if (!selectedPersonName) {
        Alert.alert('Invalid Selection', 'Please select a valid person.');
        return;
      }

      let success = false;
      if (hasUppad) {
        success = await saveUppadJamaEntry({
          person_name: selectedPersonName,
          amount: numUppad,
          entry_type: 'debit',
          description: 'Admin Panel Uppad Entry', // Default description
        });
      } else if (hasJama) {
        success = await saveUppadJamaEntry({
          person_name: selectedPersonName,
          amount: numJama,
          entry_type: 'credit',
          description: 'Admin Panel Jama Entry', // Default description
        });
        console.log('AdminPanel - Jama entry saved:', {
          person_name: selectedPersonName,
          amount: numJama,
          entry_type: 'credit',
          description: 'Admin Panel Jama Entry',
          success: success
        });
      }

      if (success) {
        Alert.alert('Success', 'Entry saved successfully!');
        setUppadAmount('');
        setJamaAmount('');
        setUppadJamaPersonId(''); // Clear selected person
        
        // Trigger manual sync to refresh all majur dashboards
        console.log('AdminPanel - Triggering manual sync after entry save');
        try {
          await syncAllDataFixed();
          console.log('AdminPanel - Manual sync completed');
        } catch (error) {
          console.error('AdminPanel - Manual sync failed:', error);
        }
      } else {
        Alert.alert('Error', 'Failed to save entry. Please try again.');
      }
    } catch (e) {
      console.error('Error saving Uppad/Jama entry:', e);
      Alert.alert('Error', 'An unexpected error occurred while saving the entry.');
    } finally {
      setUppadJamaSaving(false);
    }
  };

  if (!authorized) {
    return (
      <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={GlobalStyles.bodyText}>Verifying admin access...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={GlobalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="chevron-back" size={28} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* User Accounts Section */}
        <View style={styles.section}>
          <TouchableOpacity onPress={toggleUserSection} style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="settings-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>User Accounts</Text>
            </View>
            <Icon name={expandUserSection ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {expandUserSection && (
            <>
              {/* Add New User */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandAddUser(prev => !prev);
                  }}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="person-add-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Add New User</Text>
                  </View>
                  <Icon name={expandAddUser ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
                </TouchableOpacity>

                {expandAddUser && (
                  <View style={GlobalStyles.card}>
                    <Text style={GlobalStyles.bodyText}>Create accounts for new application users.</Text>
                    <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={GlobalStyles.input}
                      placeholder="e.g., newuser@example.com"
                      placeholderTextColor={Colors.placeholder}
                      value={newUsername}
                      onChangeText={setNewUsername}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter user's password"
                        placeholderTextColor={Colors.placeholder}
                        value={newUserPassword}
                        onChangeText={setNewUserPassword}
                        secureTextEntry={!isPasswordVisible}
                      />
                      <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.eyeIcon}
                      >
                        <Icon name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={24} color="gray" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.inputLabel}>User Type <Text style={styles.requiredStar}>*</Text></Text>
                    <Dropdown
                      options={[
                        { label: 'Normal User', value: 'normal' },
                        { label: 'Majur User', value: 'majur' }
                      ]}
                      selectedValue={newUserType}
                      onValueChange={(value: string) => setNewUserType(value as 'normal' | 'majur')}
                      placeholder="Select user type"
                    />
                    
                    <Text style={styles.inputLabel}>Office Assignment</Text>
                    {officesLoading ? (
                      <Text style={GlobalStyles.bodyText}>Loading offices...</Text>
                    ) : offices.length === 0 ? (
                      <Text style={[GlobalStyles.bodyText, { color: Colors.error }]}>
                        No offices available. Please create an office first.
                      </Text>
                    ) : (
                      <Dropdown
                        options={[
                          { label: 'No Office (Optional)', value: '' },
                          ...offices.map(office => ({
                            label: office.name,
                            value: office.id
                          }))
                        ]}
                        selectedValue={newUserOfficeId}
                        onValueChange={(value: string) => setNewUserOfficeId(value)}
                        placeholder="Select office (optional)"
                      />
                    )}
                    
                    <TouchableOpacity onPress={handleCreateUser} disabled={loading} style={[GlobalStyles.buttonPrimary, loading && styles.disabledButton]}>
                      <Text style={GlobalStyles.buttonPrimaryText}>{loading ? "Creating User..." : "Create User"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Manage Users */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandManageUsers(prev => !prev);
                  }}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="people-circle-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Manage Users</Text>
                  </View>
                  <Icon name={expandManageUsers ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
                </TouchableOpacity>

                {expandManageUsers && (
                  <View style={GlobalStyles.card}>
                    <Text style={GlobalStyles.bodyText}>Activate or deactivate users' access.</Text>
                    {usersLoading ? (
                      <Text style={GlobalStyles.bodyText}>Loading users...</Text>
                    ) : users.filter(u => {
                        const email = (currentUserEmail || '').toLowerCase();
                        const emailLocal = email.split('@')[0] || '';
                        const uname = (u.username || '').toLowerCase();
                        const fname = (u.full_name || '').toLowerCase();
                        const cpUser = (currentProfileUsername || '').toLowerCase();
                        const cpName = (currentProfileFullName || '').toLowerCase();
                        const exclude = (
                          u.id === currentUserId ||
                          (email && (
                            uname.includes(email) || fname.includes(email) ||
                            email.includes(uname) || email.includes(fname)
                          )) ||
                          (emailLocal && (
                            uname.includes(emailLocal) || fname.includes(emailLocal) ||
                            emailLocal.includes(uname) || emailLocal.includes(fname)
                          )) ||
                          (cpUser && uname === cpUser) ||
                          (cpName && fname === cpName)
                        );
                        return !exclude;
                      }).length === 0 ? (
                      <Text style={GlobalStyles.bodyText}>No users found.</Text>
                    ) : (
                      users.filter(u => {
                        const email = (currentUserEmail || '').toLowerCase();
                        const emailLocal = email.split('@')[0] || '';
                        const uname = (u.username || '').toLowerCase();
                        const fname = (u.full_name || '').toLowerCase();
                        const cpUser = (currentProfileUsername || '').toLowerCase();
                        const cpName = (currentProfileFullName || '').toLowerCase();
                        const exclude = (
                          u.id === currentUserId ||
                          (email && (
                            uname.includes(email) || fname.includes(email) ||
                            email.includes(uname) || email.includes(fname)
                          )) ||
                          (emailLocal && (
                            uname.includes(emailLocal) || fname.includes(emailLocal) ||
                            emailLocal.includes(uname) || emailLocal.includes(fname)
                          )) ||
                          (cpUser && uname === cpUser) ||
                          (cpName && fname === cpName)
                        );
                        return !exclude;
                      }).map(u => {
                        const displayName = u.full_name || u.username || u.id;
                        const active = u.is_active !== false; // default to active when null/undefined
                        return (
                          <View key={u.id} style={styles.userRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.userName}>{displayName}</Text>
                              <Text style={styles.userMeta}>ID: {u.id}</Text>
                              <Text style={styles.userMeta}>Status: {active ? 'Active' : 'Inactive'}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                const next = !active;
                                const title = next ? 'Activate User' : 'Deactivate User';
                                const msg = next ? `Activate ${displayName}?` : `Deactivate ${displayName}?`;
                                Alert.alert(title, msg, [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: next ? 'Activate' : 'Deactivate',
                                    style: next ? 'default' : 'destructive',
                                    onPress: async () => {
                                      const ok = await setUserActive(u.id, next);
                                      if (!ok) {
                                        Alert.alert('Failed', 'Could not update user status.');
                                      }
                                      await loadUsers();
                                    },
                                  },
                                ]);
                              }}
                              style={[
                                GlobalStyles.buttonPrimary,
                                !active && styles.dangerButton,
                                { alignSelf: 'center', paddingHorizontal: 14 }
                              ]}
                            >
                              <Text style={GlobalStyles.buttonPrimaryText}>{active ? 'Deactivate' : 'Activate'}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                    <TouchableOpacity onPress={loadUsers} style={[GlobalStyles.buttonPrimary, { marginTop: 8 }]}>
                      <Text style={GlobalStyles.buttonPrimaryText}>Refresh</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => navigate('AdminPasswordChangeScreen')} 
                      style={[GlobalStyles.buttonPrimary, { marginTop: 8, backgroundColor: Colors.warning }]}
                    >
                      <Text style={GlobalStyles.buttonPrimaryText}>Change User Password</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* User Type Management Section */}
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setExpandMajurDebug(prev => !prev)} style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="hammer-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>User Type Management</Text>
            </View>
            <Icon name={expandMajurDebug ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {expandMajurDebug && (
            <View style={styles.subSection}>
              <View style={GlobalStyles.card}>
                <Text style={GlobalStyles.bodyText}>Easily switch users between Normal and Majur types using dropdowns.</Text>
                <Text style={[GlobalStyles.bodyText, { fontWeight: 'bold', marginBottom: 12 }]}>User Type Management:</Text>
                <Text style={GlobalStyles.bodyText}>Change user types using dropdowns below:</Text>
                
                {users.length === 0 ? (
                  <Text style={GlobalStyles.bodyText}>No users found.</Text>
                ) : (
                  users.map((u) => {
                    const currentType = u.user_type || 'normal';
                    return (
                      <View key={u.id} style={[styles.userRow, { alignItems: 'center', paddingVertical: 12 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{u.full_name || u.username || 'No Name'}</Text>
                          <Text style={styles.userMeta}>ID: {u.id.substring(0, 8)}... | Status: {u.is_active ? 'Active' : 'Inactive'}</Text>
                        </View>
                        
                        <View style={{ marginLeft: 12, minWidth: 120 }}>
                          <Text style={[GlobalStyles.bodyText, { fontSize: 12, marginBottom: 4, color: Colors.textSecondary }]}>
                            User Type:
                          </Text>
                          <View style={styles.dropdownContainer}>
                            <TouchableOpacity
                              style={[
                                styles.dropdown,
                                { backgroundColor: currentType === 'majur' ? '#E8F5E8' : '#F5F5F5' }
                              ]}
                              onPress={() => {
                                Alert.alert(
                                  'Change User Type',
                                  `Current: ${currentType === 'majur' ? 'Majur' : 'Normal'}\nSelect new type for ${u.full_name || u.username}:`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Normal User',
                                      onPress: async () => {
                                        if (currentType !== 'normal') {
                                          console.log('🔄 Converting user to Normal:', u.id);
                                          const success = await updateUserType(u.id, 'normal');
                                          if (success) {
                                            console.log('✅ User converted to Normal successfully');
                                            Alert.alert('Success', 'User type changed to Normal!');
                                            // Force refresh the user list
                                            await loadUsers();
                                          } else {
                                            console.error('❌ Failed to convert user to Normal');
                                            Alert.alert('Error', 'Failed to update user type.');
                                          }
                                        }
                                      },
                                    },
                                    {
                                      text: 'Majur User',
                                      onPress: async () => {
                                        if (currentType !== 'majur') {
                                          console.log('🔄 Converting user to Majur:', u.id);
                                          const success = await updateUserType(u.id, 'majur');
                                          if (success) {
                                            console.log('✅ User converted to Majur successfully');
                                            Alert.alert('Success', 'User type changed to Majur!');
                                            // Force refresh the user list
                                            await loadUsers();
                                          } else {
                                            console.error('❌ Failed to convert user to Majur');
                                            Alert.alert('Error', 'Failed to update user type.');
                                          }
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={[
                                styles.dropdownText,
                                { color: currentType === 'majur' ? '#2E7D32' : '#666' }
                              ]}>
                                {currentType === 'majur' ? 'Majur' : 'Normal'}
                              </Text>
                              <Icon name="chevron-down" size={16} color={currentType === 'majur' ? '#2E7D32' : '#666'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
                
                {/* Manual Refresh Button */}
                <TouchableOpacity 
                  onPress={async () => {
                    console.log('🔄 Manual refresh triggered');
                    await loadUsers();
                    Alert.alert('Refreshed', 'User list has been refreshed!');
                  }} 
                  style={[GlobalStyles.buttonPrimary, { marginTop: 16, backgroundColor: Colors.accent }]}
                  disabled={usersLoading}
                >
                  <Text style={GlobalStyles.buttonPrimaryText}>
                    {usersLoading ? 'Refreshing...' : '🔄 Refresh User List'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Masters Section */}
        <View style={styles.section}>
          <TouchableOpacity onPress={toggleMastersSection} style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="grid-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Masters</Text>
            </View>
            <Icon name={expandMastersSection ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {expandMastersSection && (
            <>
              {/* Manage Agencies */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandManageAgencies(prev => !prev);
                  }}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="business-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Manage Agencies</Text>
                  </View>
                  <Icon name={expandManageAgencies ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
                </TouchableOpacity>

                {expandManageAgencies && (
                  <View style={GlobalStyles.card}>
                    <Text style={GlobalStyles.bodyText}>Add or view agencies in the system.</Text>
                    <TouchableOpacity onPress={() => navigate('AddAgency')} style={GlobalStyles.buttonPrimary}>
                      <Text style={GlobalStyles.buttonPrimaryText}>Go to Add Agency</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* User Display Name Management */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => navigate('AdminUserManagement')}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="person-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>User Display Names</Text>
                  </View>
                  <Icon name="chevron-forward" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Office Management */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => navigate('OfficeManagement')}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="business-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Office Management</Text>
                  </View>
                  <Icon name="chevron-forward" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Person Management */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandPersonMgmt(prev => !prev);
                  }}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="people-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Person Management(For Uppad & Jama)</Text>
                  </View>
                  <Icon name={expandPersonMgmt ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
                </TouchableOpacity>

                {expandPersonMgmt && (
                  <View style={GlobalStyles.card}>
                    <Text style={GlobalStyles.bodyText}>Add persons to use in Uppad/Jama entries.</Text>
                    <Text style={styles.inputLabel}>Person Name <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={GlobalStyles.input}
                      placeholder="e.g., Ramesh"
                      placeholderTextColor={Colors.placeholder}
                      value={personName}
                      onChangeText={setPersonName}
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        const name = (personName || '').trim();
                        if (!name) {
                          Alert.alert('Required', 'Please enter a person name.');
                          return;
                        }
                        // Pre-check with freshly fetched list (case-insensitive)
                        const normalized = name.toLowerCase();
                        try {
                          const latest = await getPersons();
                          setPersons(latest);
                          const existsLocal = latest.some(p => (p.name || '').trim().toLowerCase() === normalized);
                          if (existsLocal) {
                            Alert.alert('Already Exists', `"${name}" is already in the list.`);
                            setPersonName('');
                            return;
                          }
                        } catch (_) {
                          // ignore fetch error; proceed to attempt save
                        }
                        setPersonSaving(true);
                        try {
                          const res = await savePerson(name);
                          if (!res.ok) {
                            if (res.reason === 'duplicate') {
                              // Duplicate reported by server — fetch fresh and confirm
                              try {
                                const refreshed = await getPersons();
                                setPersons(refreshed);
                                const existsNow = refreshed.some(p => (p.name || '').trim().toLowerCase() === normalized);
                                if (existsNow) {
                                  Alert.alert('Already Exists', `"${name}" already existed. List refreshed.`);
                                } else {
                                  Alert.alert('Duplicate', 'Name already exists (possibly added by another user). Please use a different name.');
                                }
                              } catch (_) {
                                Alert.alert('Duplicate', 'Name already exists (possibly added by another user). Please use a different name.');
                              }
                            } else {
                              // Other error — show detail if available
                              const msg = res.errorMessage || 'Unable to save person.';
                              Alert.alert('Error', msg);
                            }
                          } else {
                            const savedOffline = res.reason === 'offline';
                            Alert.alert('Saved', savedOffline ? 'Person saved (offline). It will sync when online.' : 'Person added successfully.');
                            setPersonName('');
                            try {
                              const refreshed = await getPersons();
                              setPersons(refreshed);
                            } catch (_) {}
                          }
                        } catch (e: any) {
                          Alert.alert('Error', 'Failed to save person.');
                        } finally {
                          setPersonSaving(false);
                        }
                      }}
                      disabled={personSaving}
                      style={[GlobalStyles.buttonPrimary, personSaving && styles.disabledButton]}
                    >
                      <Text style={GlobalStyles.buttonPrimaryText}>{personSaving ? 'Saving...' : 'Add Person'}</Text>
                    </TouchableOpacity>

                    <Text style={[GlobalStyles.title, { marginTop: 16 }]}>Existing Persons</Text>
                    {personsLoading ? (
                      <Text style={GlobalStyles.bodyText}>Loading persons...</Text>
                    ) : persons.length === 0 ? (
                      <Text style={GlobalStyles.bodyText}>No persons found.</Text>
                    ) : (
                      persons.map(p => (
                        <View key={p.id} style={styles.userRow}>
                          <Text style={styles.userName}>{p.name}</Text>
                          <Text style={styles.userMeta}>ID: {p.id}</Text>
                        </View>
                      ))
                    )}
                    <TouchableOpacity onPress={loadPersons} style={[GlobalStyles.buttonPrimary, { marginTop: 8 }]}>
                      <Text style={GlobalStyles.buttonPrimaryText}>Refresh Persons</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Uppad/Jama Entry */}
              <View style={styles.subSection}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandUppadJamaEntry(prev => !prev);
                  }}
                  style={styles.subSectionHeader}
                >
                  <View style={styles.subSectionHeaderLeft}>
                    <Icon name="cash-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.subSectionTitle}>Uppad/Jama Entry</Text>
                  </View>
                  <Icon name={expandUppadJamaEntry ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
                </TouchableOpacity>

                {expandUppadJamaEntry && (
                  <View style={GlobalStyles.card}>
                    <Text style={GlobalStyles.bodyText}>Add Uppad (Debit) or Jama (Credit) entries for persons.</Text>
                    
                    <Text style={styles.inputLabel}>Person</Text>
                    <Dropdown
                      options={persons.map(p => ({ label: p.name, value: p.id }))}
                      selectedValue={uppadJamaPersonId}
                      onValueChange={setUppadJamaPersonId}
                      placeholder="Select person"
                    />

                    <Text style={styles.inputLabel}>Uppad Amount (Debit)</Text>
                    <TextInput
                      style={GlobalStyles.input}
                      placeholder="e.g., 1000"
                      placeholderTextColor={Colors.placeholder}
                      value={uppadAmount}
                      onChangeText={setUppadAmount}
                      keyboardType="numeric"
                    />

                    <Text style={styles.inputLabel}>Jama Amount (Credit)</Text>
                    <TextInput
                      style={GlobalStyles.input}
                      placeholder="e.g., 500"
                      placeholderTextColor={Colors.placeholder}
                      value={jamaAmount}
                      onChangeText={setJamaAmount}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      onPress={handleSaveUppadJamaEntry}
                      disabled={uppadJamaSaving}
                      style={[GlobalStyles.buttonPrimary, uppadJamaSaving && styles.disabledButton]}
                    >
                      <Text style={GlobalStyles.buttonPrimaryText}>{uppadJamaSaving ? 'Saving...' : 'Save Entry'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Data Migration Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpandMigrationSection(prev => !prev);
            }} 
            style={styles.sectionHeader}
          >
            <View style={styles.sectionHeaderLeft}>
              <Icon name="cloud-upload-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Data Migration</Text>
            </View>
            <Icon name={expandMigrationSection ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {expandMigrationSection && (
            <View style={GlobalStyles.card}>
              <Text style={GlobalStyles.bodyText}>
                Migrate all legacy data (with null office_id) to Prem Darwaja office.
              </Text>
              <Text style={[GlobalStyles.bodyText, { marginTop: 8, fontStyle: 'italic', color: Colors.textSecondary }]}>
                This will update all old records to be visible when "Prem Darwaja" office is selected.
              </Text>
              
              {migrationStatus ? (
                <View style={[GlobalStyles.card, { marginTop: 12, backgroundColor: '#F0F8FF' }]}>
                  <Text style={[GlobalStyles.bodyText, { fontWeight: '600' }]}>Migration Status:</Text>
                  <Text style={[GlobalStyles.bodyText, { marginTop: 4 }]}>{migrationStatus}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={async () => {
                  setMigrationLoading(true);
                  setMigrationStatus('Checking migration status...');
                  try {
                    const result = await checkMigrationNeeded();
                    const { total, details } = result;
                    
                    if (total === 0) {
                      setMigrationStatus('✅ No records need migration. All data is already assigned to offices.');
                    } else {
                      let statusText = `📊 Found ${total} records that need migration:\n\n`;
                      Object.entries(details).forEach(([table, count]) => {
                        if (count > 0) {
                          statusText += `• ${table}: ${count} records\n`;
                        }
                      });
                      setMigrationStatus(statusText);
                    }
                  } catch (error: any) {
                    console.error('Error checking migration:', error);
                    setMigrationStatus('❌ Error checking migration status: ' + error.message);
                  } finally {
                    setMigrationLoading(false);
                  }
                }}
                disabled={migrationLoading}
                style={[GlobalStyles.buttonPrimary, { marginTop: 12, backgroundColor: Colors.accent }, migrationLoading && styles.disabledButton]}
              >
                <Text style={GlobalStyles.buttonPrimaryText}>
                  {migrationLoading ? 'Checking...' : '🔍 Check Migration Status'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  Alert.alert(
                    'Confirm Migration',
                    'This will migrate all legacy data (null office_id) to Prem Darwaja office. This action cannot be undone. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Migrate',
                        style: 'default',
                        onPress: async () => {
                          setMigrationLoading(true);
                          setMigrationStatus('🔄 Migration in progress...');
                          try {
                            const result = await migrateAllDataToPremDarwaja();
                            
                            if (result.success) {
                              let successText = `✅ Migration completed successfully!\n\n`;
                              successText += `Office: ${result.officeName}\n`;
                              successText += `Total records updated: ${result.totalUpdated}\n\n`;
                              successText += `Details:\n`;
                              Object.entries(result.details).forEach(([table, info]: [string, any]) => {
                                if (info.success && info.count > 0) {
                                  successText += `• ${table}: ${info.count} records\n`;
                                }
                              });
                              setMigrationStatus(successText);
                              Alert.alert('Success', 'Data migration completed! All legacy data is now assigned to Prem Darwaja office.');
                            } else {
                              setMigrationStatus(`❌ Migration failed: ${result.error}`);
                              Alert.alert('Error', result.error || 'Migration failed');
                            }
                          } catch (error: any) {
                            console.error('Error during migration:', error);
                            setMigrationStatus('❌ Migration error: ' + error.message);
                            Alert.alert('Error', 'Migration failed: ' + error.message);
                          } finally {
                            setMigrationLoading(false);
                          }
                        }
                      }
                    ]
                  );
                }}
                disabled={migrationLoading}
                style={[GlobalStyles.buttonPrimary, { marginTop: 12, backgroundColor: Colors.warning }, migrationLoading && styles.disabledButton]}
              >
                <Text style={GlobalStyles.buttonPrimaryText}>
                  {migrationLoading ? 'Migrating...' : '🚀 Run Migration'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardTitle: {
    marginBottom: 16,
    fontSize: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
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
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
    marginHorizontal: 12,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusLabel: {
    color: Colors.textSecondary,
  },
  statusValue: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  dangerButton: {
    backgroundColor: Colors.error,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  dropdownContainer: {
    minWidth: 100,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminPanelScreen;
