import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  PermissionsAndroid,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { supabase } from '../supabase';
import NotificationService from '../services/NotificationService';
import PushNotification from 'react-native-push-notification';

// Temporary navigation type - will be updated when integrated
type RootStackParamList = {
  SendNotification: undefined;
  [key: string]: undefined | object;
};

type SendNotificationScreenNavigationProp = NavigationProp<RootStackParamList, 'SendNotification'>;

interface SendNotificationScreenProps {
  navigation: SendNotificationScreenNavigationProp;
}

interface User {
  id: string;
  name: string; // maps to full_name
  email: string; // maps to username
  phone?: string;
  role?: string;
  is_active?: boolean;
}

const SendNotificationScreen = ({ navigation }: SendNotificationScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to show you updates.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('✅ Notification permission granted');
          } else {
            console.log('❌ Notification permission denied');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🔍 Loading users from Supabase...');
      console.log('🌐 Attempting database connection...');
      
      // Test basic connectivity first
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      console.log('🧪 Connection test:', testData, testError);

      // Check if table exists
      if (testError && testError.code === '42P01') {
        console.error('💥 Users table does not exist');
        Alert.alert(
          'Database Error', 
          'Users table does not exist. Please run the SQL migration first.'
        );
        setUsers([]);
        return;
      }

      // First try to fetch all users to see if database connection works
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*');
      
      console.log('📊 All users in database:', allUsers?.length || 0, 'users');
      console.log('❌ All users error:', allUsersError);

      // If basic fetch fails, show detailed error
      if (allUsersError) {
        console.error('💥 Database connection failed:', allUsersError);
        Alert.alert(
          'Database Error', 
          `Failed to connect to database: ${allUsersError.message}. No users loaded.`
        );
        setUsers([]);
        return;
      }

      // Fetch all users from the table - including real users you added manually
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, full_name')
        .order('full_name');

      console.log('👥 Filtered users count:', Array.isArray(users) ? users.length : 0);
      console.log('👥 Filtered users data:', users);
      console.log('❌ Filtered users error:', error);

      if (error) {
        console.error('❌ Error fetching users:', error);
        Alert.alert(
          'Filter Error', 
          `Database connected but filter failed: ${error.message}. No users loaded.`
        );
        setUsers([]);
        return;
      }

      if (Array.isArray(users) && users.length > 0) {
        // Map real database fields to UI fields
        const mappedUsers: User[] = users.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username || 'Unknown User',
          email: u.username || u.email || '',
        }));
        console.log('✅ Successfully loaded', mappedUsers.length, 'real users from database');
        setUsers(mappedUsers);
        Alert.alert('Success!', `Loaded ${mappedUsers.length} real users from database`);
      } else {
        console.log('⚠️ No users found in database.');
        setUsers([]);
        Alert.alert('No Data', 'Database is empty. No users to show.');
      }
    } catch (error) {
      console.error('💥 Critical error loading users:', error);
      setUsers([]);
      Alert.alert('Connection Error', `Critical error: ${String(error)}. No users loaded.`);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendNotification = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to send notification');
      return;
    }
    
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter notification title');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter notification description');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Sending notification to:', selectedUser.name, selectedUser.email);
      
      // Get current admin/sender ID
      const adminId = 'admin-001'; // You can get this from AsyncStorage or auth
      
      // Send actual notification using NotificationService
      const notificationData = {
        title: title.trim(),
        description: description.trim(),
        recipient_id: selectedUser.id,
        type: 'admin_message'
      };

      const success = await NotificationService.sendUserNotification(notificationData, adminId);
      
      if (success) {
        console.log('✅ Notification sent successfully');
        
        // DON'T show notification to sender - only success alert
        // Notification will be shown to recipient via real-time subscription
        
        Alert.alert(
          'Success', 
          `Notification sent successfully to ${selectedUser.name}!\n\nThe recipient will receive the notification on their device.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedUser(null);
                setTitle('');
                setDescription('');
                goBack();
              }
            }
          ]
        );
      } else {
        console.error('❌ Failed to send notification');
        Alert.alert('Error', 'Failed to send notification. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        setSelectedUser(item);
        setUserModalVisible(false);
        setSearchQuery('');
      }}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userContact}>{item.email}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Notification</Text>
        <TouchableOpacity 
          onPress={loadUsers} 
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select User</Text>
          <TouchableOpacity
            style={styles.userSelector}
            onPress={() => setUserModalVisible(true)}
          >
            {selectedUser ? (
              <View style={styles.selectedUserRow}>
                <View style={styles.selectedUserAvatar}>
                  <Text style={styles.selectedUserAvatarText}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                  <Text style={styles.selectedUserRole}>{selectedUser.email}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderRow}>
                <Icon name="person-add" size={20} color="#999" />
                <Text style={styles.placeholderText}>Select a user to send notification</Text>
              </View>
            )}
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Notification Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter notification title..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Notification Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            placeholder="Enter detailed description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Preview */}
        {(title || description) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Icon name="notifications" size={20} color="#2196F3" />
                <Text style={styles.previewTitle}>{title || 'Notification Title'}</Text>
              </View>
              <Text style={styles.previewDescription}>
                {description || 'Notification description will appear here...'}
              </Text>
              <Text style={styles.previewTime}>Just now</Text>
            </View>
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedUser || !title.trim() || !description.trim()) && styles.sendButtonDisabled
          ]}
          onPress={handleSendNotification}
          disabled={loading || !selectedUser || !title.trim() || !description.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send Notification</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* User Selection Modal */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setUserModalVisible(false);
                setSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select User</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.userList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  userSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedUserAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedUserRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 12,
    color: '#888',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCloseButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userContact: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default SendNotificationScreen;