// AdminNotificationScreen.tsx - Beautiful admin notification screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/Ionicons';
import { NotificationCard } from '../components/NotificationCard';
import { AdminNotification } from '../services/NotificationService';
import NotificationService from '../services/NotificationService';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';

// Safe area helper for status bar
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

type AdminNotificationScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminNotifications'>;

interface AdminNotificationScreenProps {
  navigation: AdminNotificationScreenNavigationProp;
}

interface FilterOption {
  label: string;
  value: 'all' | 'unread' | 'read' | 'add' | 'edit' | 'delete' | 'deleted';
  icon: string;
  color: string;
}

const AdminNotificationScreen = ({ navigation }: AdminNotificationScreenProps): React.JSX.Element => {
  const { goBack } = navigation;

  // State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption['value']>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Filter options
  const filterOptions: FilterOption[] = [
    { label: 'All', value: 'all', icon: 'list', color: '#2196F3' },
    { label: 'Unread', value: 'unread', icon: 'radio-button-off', color: '#F44336' },
    { label: 'Read', value: 'read', icon: 'checkmark-circle', color: '#4CAF50' },
    { label: 'Added', value: 'add', icon: 'add-circle', color: '#4CAF50' },
    { label: 'Updated', value: 'edit', icon: 'create', color: '#FF9800' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      
      // Set up real-time subscription for auto-refresh
      const subscription = NotificationService.subscribeToNotifications((notification) => {
        console.log('🔔 AdminNotificationScreen: New notification received, refreshing...');
        loadNotifications(false); // Refresh without loading indicator
      });
      
      return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      };
    }, [])
  );

  const loadNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await NotificationService.getNotifications(100, 0);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
      applyFilter(data, selectedFilter);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (notificationsList: AdminNotification[], filter: FilterOption['value']) => {
    let filtered = [...notificationsList];

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read);
        break;
      case 'read':
        filtered = filtered.filter(n => n.is_read);
        break;
      case 'add':
        filtered = filtered.filter(n => n.type === 'add');
        break;
      case 'edit':
        filtered = filtered.filter(n => n.type === 'edit');
        break;
      case 'delete':
        filtered = filtered.filter(n => n.type === 'delete');
        break;
      case 'all':
      default:
        // Show all notifications
        break;
    }

    setFilteredNotifications(filtered);
  };

  const handleFilterChange = (filter: FilterOption['value']) => {
    setSelectedFilter(filter);
    applyFilter(notifications, filter);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  const handleNotificationPress = (notification: AdminNotification) => {
    // You can navigate to a detailed view or show more info
    Alert.alert(
      notification.title,
      `${notification.message}\n\nUser: ${notification.user_name}\nTime: ${new Date(notification.created_at).toLocaleString()}`,
      [{ text: 'OK' }]
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (success) {
        // Update local state
        const updatedNotifications = notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        setNotifications(updatedNotifications);
        setUnreadCount(prev => prev - 1);
        applyFilter(updatedNotifications, selectedFilter);
      }
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const success = await NotificationService.deleteNotification(notificationId);
      if (success) {
        // Remove notification from local state completely
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        setNotifications(updatedNotifications);
        
        // Update unread count if deleting an unread notification
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => prev - 1);
        }
        
        applyFilter(updatedNotifications, selectedFilter);

        // Show success message
        Alert.alert('Success', 'Notification deleted successfully');
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            try {
              const success = await NotificationService.markAllAsRead();
              if (success) {
                const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }));
                setNotifications(updatedNotifications);
                setUnreadCount(0);
                applyFilter(updatedNotifications, selectedFilter);
              }
            } catch (error) {
              console.error('❌ Error marking all as read:', error);
              Alert.alert('Error', 'Failed to mark all notifications as read');
            }
          },
        },
      ]
    );
  };

  const renderFilterButton = ({ item }: { item: FilterOption }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === item.value && [styles.activeFilterButton, { borderColor: item.color }],
      ]}
      onPress={() => handleFilterChange(item.value)}
    >
      <Icon
        name={item.icon}
        size={16}
        color={selectedFilter === item.value ? item.color : '#666'}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === item.value && { color: item.color, fontWeight: '600' },
        ]}
      >
        {item.label}
      </Text>
      {item.value === 'unread' && unreadCount > 0 && (
        <View style={[styles.filterBadge, { backgroundColor: item.color }]}>
          <Text style={styles.filterBadgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderNotification = ({ item, index }: { item: AdminNotification; index: number }) => (
    <View style={index === 0 ? styles.firstNotification : null}>
      <NotificationCard
        notification={item}
        onPress={handleNotificationPress}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-off" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyMessage}>
        {selectedFilter === 'all'
          ? 'You don\'t have any notifications yet.'
          : `No ${selectedFilter} notifications found.`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{notifications.filter(n => n.is_read).length}</Text>
          <Text style={styles.statLabel}>Read</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          data={filterOptions}
          renderItem={renderFilterButton}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        />
      </View>



      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        style={styles.flatListStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: STATUSBAR_HEIGHT + 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  placeholder: {
    width: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 2,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stat: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  filtersWrapper: {
    backgroundColor: '#FFFFFF',
    marginBottom: -4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 1,
    height: 32,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeFilterButton: {
    backgroundColor: '#F8F9FF',
    borderWidth: 2,
    paddingVertical: 1,
    height: 32,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  filterBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  flatListStyle: {
    flex: 1,
    marginTop: 0,
  },
  firstNotification: {
    marginTop: -2,
  },

});

export default AdminNotificationScreen;
