import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import UserPasswordService, { PasswordResetRequest } from '../services/UserPasswordService';

// Temporary navigation type - will be updated in App.tsx
type RootStackParamList = {
  AdminPasswordReset: undefined;
  [key: string]: undefined | object;
};

type AdminPasswordResetScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminPasswordReset'>;

interface AdminPasswordResetScreenProps {
  navigation: AdminPasswordResetScreenNavigationProp;
}

interface UserWithPassword {
  userId: string;
  userName: string;
  hasPassword: boolean;
  createdAt?: string;
}

const AdminPasswordResetScreen = ({ navigation }: AdminPasswordResetScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  
  const [usersWithPasswords, setUsersWithPasswords] = useState<UserWithPassword[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'users' | 'requests'>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Load users with passwords
      const usersData = await UserPasswordService.getUsersWithPasswords();
      
      // Mock users for demo - replace with actual user API
      const mockUsers: UserWithPassword[] = [
        { userId: 'user1@example.com', userName: 'Yash Bhavsar', hasPassword: false },
        { userId: 'user2@example.com', userName: 'Rahul Sharma', hasPassword: false },
        { userId: 'user3@example.com', userName: 'Priya Patel', hasPassword: false },
        { userId: 'user4@example.com', userName: 'Amit Kumar', hasPassword: false },
      ];

      // Update password status
      const enrichedUsers = mockUsers.map(user => {
        const passwordData = usersData.find(p => p.userId === user.userId);
        return {
          ...user,
          hasPassword: !!passwordData,
          createdAt: passwordData?.createdAt,
        };
      });

      setUsersWithPasswords(enrichedUsers);

      // Load reset requests
      const requests = await UserPasswordService.getPasswordResetRequests();
      setResetRequests(requests);

    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load password data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  const handleResetUserPassword = (user: UserWithPassword) => {
    Alert.alert(
      'Reset Password',
      `Are you sure you want to reset notification password for ${user.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await UserPasswordService.adminResetPassword('admin', user.userId);
              if (success) {
                Alert.alert('Success', `Password reset successfully for ${user.userName}`);
                loadData(false);
              } else {
                Alert.alert('Error', 'Failed to reset password');
              }
            } catch (error) {
              console.error('❌ Error resetting password:', error);
              Alert.alert('Error', 'Failed to reset password');
            }
          },
        },
      ]
    );
  };

  const handleProcessResetRequest = (request: PasswordResetRequest, action: 'approve' | 'reject') => {
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Request`,
      `Are you sure you want to ${action} password reset request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const success = await UserPasswordService.processResetRequest(
                request.userId, 
                'admin', 
                action
              );
              if (success) {
                Alert.alert('Success', `Reset request ${action}d successfully`);
                loadData(false);
              } else {
                Alert.alert('Error', `Failed to ${action} reset request`);
              }
            } catch (error) {
              console.error(`❌ Error ${action}ing request:`, error);
              Alert.alert('Error', `Failed to ${action} reset request`);
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: UserWithPassword }) => (
    <View style={styles.userItem}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.userEmail}>{item.userId}</Text>
        <View style={styles.passwordStatus}>
          <Icon 
            name={item.hasPassword ? 'shield-checkmark' : 'shield-outline'} 
            size={16} 
            color={item.hasPassword ? '#4CAF50' : '#999'} 
          />
          <Text style={[
            styles.passwordStatusText,
            { color: item.hasPassword ? '#4CAF50' : '#999' }
          ]}>
            {item.hasPassword ? 'Password Set' : 'No Password'}
          </Text>
        </View>
        {item.createdAt && (
          <Text style={styles.passwordDate}>
            Set on: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      {item.hasPassword && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => handleResetUserPassword(item)}
        >
          <Icon name="refresh" size={16} color="#F44336" />
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRequestItem = ({ item }: { item: PasswordResetRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <View style={styles.requestUser}>
          <Icon name="person-circle" size={24} color="#2196F3" />
          <View style={styles.requestUserInfo}>
            <Text style={styles.requestUserName}>{item.userId}</Text>
            <Text style={styles.requestDate}>
              Requested: {new Date(item.requestedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'pending' ? '#FF9800' : 
                           item.status === 'approved' ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleProcessResetRequest(item, 'approve')}
          >
            <Icon name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleProcessResetRequest(item, 'reject')}
          >
            <Icon name="close" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon 
        name={selectedTab === 'users' ? 'people' : 'document-text'} 
        size={64} 
        color="#DDD" 
      />
      <Text style={styles.emptyTitle}>
        {selectedTab === 'users' ? 'No Users Found' : 'No Reset Requests'}
      </Text>
      <Text style={styles.emptyMessage}>
        {selectedTab === 'users' 
          ? 'No users have set notification passwords yet.'
          : 'No password reset requests pending.'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading password data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{usersWithPasswords.filter(u => u.hasPassword).length}</Text>
          <Text style={styles.statLabel}>With Password</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {resetRequests.filter(r => r.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending Requests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {resetRequests.filter(r => r.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'users' && styles.activeTab]}
          onPress={() => setSelectedTab('users')}
        >
          <Icon 
            name="people" 
            size={20} 
            color={selectedTab === 'users' ? '#2196F3' : '#666'} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'users' && { color: '#2196F3', fontWeight: '600' }
          ]}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'requests' && styles.activeTab]}
          onPress={() => setSelectedTab('requests')}
        >
          <Icon 
            name="document-text" 
            size={20} 
            color={selectedTab === 'requests' ? '#2196F3' : '#666'} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'requests' && { color: '#2196F3', fontWeight: '600' }
          ]}>
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === 'users' ? (
        <FlatList
          data={usersWithPasswords}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.userId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            usersWithPasswords.length === 0 ? styles.emptyContainer : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={resetRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.userId + item.requestedAt}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            resetRequests.length === 0 ? styles.emptyContainer : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  passwordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  passwordDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  resetButtonText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 4,
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  requestUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AdminPasswordResetScreen;