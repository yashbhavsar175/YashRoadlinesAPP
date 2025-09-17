import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUserAccess } from '../context/UserAccessContext';

interface UserProfile {
  id: string;
  username?: string;
  full_name: string;
  phone_number?: string;
  user_type?: 'normal' | 'majur';
  is_admin?: boolean;
  is_active?: boolean;
  screen_access?: string[]; // Array of screen names user can access
  created_at: string;
  updated_at?: string;
}

interface ScreenPermission {
  screen_name: string;
  display_name: string;
  description: string;
  category: string;
}

const AVAILABLE_SCREENS: ScreenPermission[] = [
  // Financial Entry Screens
  {
    screen_name: 'AddMajuriScreen',
    display_name: 'Add Majuri',
    description: 'Add labor charges and majuri entries',
    category: 'Financial Entry'
  },
  {
    screen_name: 'AgencyEntryScreen',
    display_name: 'Agency Entry',
    description: 'Record agency transactions and payments',
    category: 'Financial Entry'
  },
  {
    screen_name: 'AddGeneralEntryScreen',
    display_name: 'General Entry',
    description: 'Add general financial transactions',
    category: 'Financial Entry'
  },
  {
    screen_name: 'UppadJamaScreen',
    display_name: 'Uppad/Jama',
    description: 'Record debit and credit entries',
    category: 'Financial Entry'
  },
  {
    screen_name: 'MumbaiDeliveryEntryScreen',
    display_name: 'Mumbai Delivery',
    description: 'Record Mumbai delivery transactions',
    category: 'Financial Entry'
  },
  {
    screen_name: 'BackdatedEntryScreen',
    display_name: 'Backdated Entry',
    description: 'Add historical transactions with past dates',
    category: 'Financial Entry'
  },
  {
    screen_name: 'AgencyPaymentsScreen',
    display_name: 'Agency Payments',
    description: 'Manage agency payment records',
    category: 'Financial Entry'
  },
  {
    screen_name: 'AddAgencyScreen',
    display_name: 'Add Agency',
    description: 'Create new agency records',
    category: 'Financial Entry'
  },

  // Driver & Vehicle Management
  {
    screen_name: 'DriverDetailsScreen',
    display_name: 'Driver Details',
    description: 'Manage driver information and transactions',
    category: 'Driver & Vehicle'
  },
  {
    screen_name: 'DriverStatementScreen',
    display_name: 'Driver Statement',
    description: 'View driver financial statements',
    category: 'Driver & Vehicle'
  },
  {
    screen_name: 'AddTruckFuelScreen',
    display_name: 'Truck Fuel Entry',
    description: 'Record fuel expenses and truck maintenance',
    category: 'Driver & Vehicle'
  },

  // Reports & Statements
  {
    screen_name: 'DailyReportScreen',
    display_name: 'Daily Report',
    description: 'Generate and view daily financial reports',
    category: 'Reports'
  },
  {
    screen_name: 'StatementScreen',
    display_name: 'Statement',
    description: 'View financial statements and summaries',
    category: 'Reports'
  },
  {
    screen_name: 'MonthlyStatementScreen',
    display_name: 'Monthly Statement',
    description: 'Generate monthly financial statements',
    category: 'Reports'
  },
  {
    screen_name: 'TotalPaidScreen',
    display_name: 'Total Paid',
    description: 'View total payment summaries',
    category: 'Reports'
  },
  {
    screen_name: 'EWayBillConsolidatedScreen',
    display_name: 'E-Way Bill Consolidated',
    description: 'Manage consolidated E-Way Bill reports',
    category: 'Reports'
  },
  {
    screen_name: 'PaidSectionScreen',
    display_name: 'Paid Section',
    description: 'View and manage payment sections',
    category: 'Reports'
  },

  // Cash Management
  {
    screen_name: 'CashVerificationScreen',
    display_name: 'Cash Verification',
    description: 'Verify actual cash amounts received',
    category: 'Cash Management'
  },
  {
    screen_name: 'CashHistoryScreen',
    display_name: 'Cash History',
    description: 'View cash verification history and records',
    category: 'Cash Management'
  },
  {
    screen_name: 'LeaveCashSetupScreen',
    display_name: 'Leave Cash Setup',
    description: 'Setup expected cash amounts for verification',
    category: 'Cash Management'
  },
  {
    screen_name: 'ManageCashScreen',
    display_name: 'Manage Cash',
    description: 'Comprehensive cash management tools',
    category: 'Cash Management'
  },

  // Administration
  {
    screen_name: 'AdminPanelScreen',
    display_name: 'Admin Panel',
    description: 'Administrative controls and settings',
    category: 'Administration'
  },
  {
    screen_name: 'AdminUserManagementScreen',
    display_name: 'User Management',
    description: 'Manage users and their permissions',
    category: 'Administration'
  },
  {
    screen_name: 'AdminNotificationScreen',
    display_name: 'Admin Notifications',
    description: 'Manage system notifications and alerts',
    category: 'Administration'
  },
  {
    screen_name: 'AdminPasswordChangeScreen',
    display_name: 'Password Change',
    description: 'Administrative password management',
    category: 'Administration'
  },
  {
    screen_name: 'UserAccessManagementScreen',
    display_name: 'User Access Management',
    description: 'Control user access to specific screens',
    category: 'Administration'
  },
  {
    screen_name: 'HistoryScreen',
    display_name: 'History Log',
    description: 'View system activity history and logs',
    category: 'Administration'
  },

  // Special Dashboards
  {
    screen_name: 'MajurDashboardScreen',
    display_name: 'Majur Dashboard',
    description: 'Specialized dashboard for majur users',
    category: 'Dashboards'
  },

  // System & Testing
  {
    screen_name: 'BiometricAuthScreen',
    display_name: 'Biometric Authentication',
    description: 'Biometric security and authentication',
    category: 'System'
  },
  {
    screen_name: 'NotificationTestScreen',
    display_name: 'Notification Test',
    description: 'Test system notification functionality',
    category: 'System'
  },
  {
    screen_name: 'PushDiagnosticsScreen',
    display_name: 'Push Diagnostics',
    description: 'Diagnose push notification issues',
    category: 'System'
  }
];

const UserAccessManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshPermissions } = useUserAccess();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        Alert.alert('Error', 'Failed to load users');
        return;
      }

      setUsers(data || []);
      console.log('🔍 Debug: Users loaded with screen access:', data?.map(u => ({
        name: u.full_name,
        id: u.id,
        screen_access: u.screen_access,
        access_count: u.screen_access?.length || 0
      })));
    } catch (error) {
      console.error('Error in loadUsers:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserAccess = async (userId: string, screenName: string, hasAccess: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      let currentAccess = user.screen_access || [];
      
      if (hasAccess) {
        // Add screen access
        if (!currentAccess.includes(screenName)) {
          currentAccess = [...currentAccess, screenName];
        }
      } else {
        // Remove screen access
        currentAccess = currentAccess.filter(screen => screen !== screenName);
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          screen_access: currentAccess,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user access:', error);
        Alert.alert('Error', `Failed to update user access: ${error.message}`);
        return;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, screen_access: currentAccess }
          : u
      ));

      // Show detailed success message
      const actionText = hasAccess ? 'granted' : 'removed';
      const screenDisplayName = AVAILABLE_SCREENS.find(s => s.screen_name === screenName)?.display_name || screenName;
      Alert.alert(
        'Success', 
        `${screenDisplayName} access ${actionText} for ${user.full_name || user.username}. Changes will be visible immediately.`
      );

      console.log('✅ Screen access updated:', {
        userId,
        userName: user.full_name || user.username,
        screenName,
        hasAccess,
        newAccess: currentAccess
      });

      // Refresh permissions in context for real-time updates across app
      await refreshPermissions();
      console.log('🔄 Real-time permissions refreshed after access update');
    } catch (error) {
      console.error('Error in updateUserAccess:', error);
      Alert.alert('Error', 'Failed to update user access');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number?.includes(searchQuery)
  );

  const renderUserCard = (user: UserProfile) => {
    const userAccess = user.screen_access || [];
    console.log(`🔍 Debug: Rendering user ${user.full_name} with access:`, userAccess);
    
    return (
      <View key={user.id} style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.full_name}</Text>
            <Text style={styles.userDetails}>
              {user.username && `@${user.username} • `}
              {user.phone_number || 'No phone'}
            </Text>
            <View style={styles.userBadges}>
              {user.is_admin && <Text style={styles.adminBadge}>Admin</Text>}
              <Text style={[styles.typeBadge, 
                user.user_type === 'majur' ? styles.majurBadge : styles.normalBadge
              ]}>
                {user.user_type === 'majur' ? 'Majur' : 'Normal'}
              </Text>
              <Text style={[styles.statusBadge, 
                user.is_active ? styles.activeBadge : styles.inactiveBadge
              ]}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
          >
            <Icon 
              name={selectedUser?.id === user.id ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#3498db" 
            />
          </TouchableOpacity>
        </View>

        {selectedUser?.id === user.id && (
          <View style={styles.permissionsSection}>
            <Text style={styles.permissionsTitle}>Screen Access Permissions</Text>
            
            {/* Group screens by category */}
            {['Financial Entry', 'Driver & Vehicle', 'Reports', 'Cash Management', 'Administration', 'Dashboards', 'System'].map(category => {
              const categoryScreens = AVAILABLE_SCREENS.filter(screen => screen.category === category);
              if (categoryScreens.length === 0) return null;
              
              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {categoryScreens.map(screen => {
                    const hasAccess = userAccess.includes(screen.screen_name);
                    console.log(`🔍 Permission check: ${screen.display_name} for ${user.full_name}:`, {
                      screen_name: screen.screen_name,
                      userAccess,
                      hasAccess
                    });
                    return (
                      <View key={screen.screen_name} style={styles.permissionItem}>
                        <View style={styles.permissionInfo}>
                          <Text style={styles.permissionName}>{screen.display_name}</Text>
                          <Text style={styles.permissionDescription}>{screen.description}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.toggleButton, hasAccess ? styles.toggleOn : styles.toggleOff]}
                          onPress={() => updateUserAccess(user.id, screen.screen_name, !hasAccess)}
                        >
                          <Text style={[styles.toggleText, hasAccess ? styles.toggleTextOn : styles.toggleTextOff]}>
                            {hasAccess ? 'ON' : 'OFF'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Access Management</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>👥 User Access Management</Text>
        <Text style={styles.subtitle}>Manage user permissions for different screens</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name, username, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#95a5a6"
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.is_admin).length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.user_type === 'majur').length}</Text>
            <Text style={styles.statLabel}>Majurs</Text>
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={60} color="#95a5a6" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users match your search criteria' : 'No users available'}
            </Text>
          </View>
        ) : (
          filteredUsers.map(renderUserCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    width: 40,
  },
  contentHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  searchContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  userBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  adminBadge: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
    marginBottom: 3,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
    marginBottom: 3,
  },
  majurBadge: {
    backgroundColor: '#f39c12',
    color: '#fff',
  },
  normalBadge: {
    backgroundColor: '#3498db',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  activeBadge: {
    backgroundColor: '#27ae60',
    color: '#fff',
  },
  inactiveBadge: {
    backgroundColor: '#95a5a6',
    color: '#fff',
  },
  editButton: {
    padding: 10,
  },
  permissionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  permissionInfo: {
    flex: 1,
    marginRight: 15,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  toggleButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#27ae60',
  },
  toggleOff: {
    backgroundColor: '#e9ecef',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleTextOn: {
    color: '#fff',
  },
  toggleTextOff: {
    color: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});

export default UserAccessManagementScreen;