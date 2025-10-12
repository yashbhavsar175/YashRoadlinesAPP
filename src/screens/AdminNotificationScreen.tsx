import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, StatusBar, Platform, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/Ionicons';
import { AdminNotification } from '../services/NotificationService';
import NotificationService from '../services/NotificationService';
import { Colors } from '../theme/colors';

type AdminNotificationScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminNotifications'>;

interface AdminNotificationScreenProps {
  navigation: AdminNotificationScreenNavigationProp;
}

interface FilterOption {
  label: string;
  value: 'all' | 'unread' | 'read';
  icon: string;
}

const AdminNotificationScreen = ({ navigation }: AdminNotificationScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption['value']>('all');

  const filterOptions: FilterOption[] = [
    { label: 'All', value: 'all', icon: 'list' },
    { label: 'Unread', value: 'unread', icon: 'mail-unread' },
    { label: 'Read', value: 'read', icon: 'checkmark-done' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      return () => {};
    }, [])
  );

  const loadNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await NotificationService.getNotifications(100, 0);
      setNotifications(data);
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (success) {
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        setNotifications(updatedNotifications);
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
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        setNotifications(updatedNotifications);
        applyFilter(updatedNotifications, selectedFilter);
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              for (const n of notifications) {
                await NotificationService.deleteNotification(n.id);
              }
              setNotifications([]);
              setFilteredNotifications([]);
              Alert.alert('Success', 'All notifications have been deleted.');
            } catch (error) {
              console.error('❌ Error deleting all notifications:', error);
              Alert.alert('Error', 'Failed to delete all notifications');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'add': return 'add-circle';
      case 'edit': return 'create';
      case 'delete': return 'trash';
      default: return 'notifications';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'add': return '#4CAF50';
      case 'edit': return '#FF9800';
      case 'delete': return '#F44336';
      default: return '#2196F3';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
  };

  const renderNotificationCard = ({ item }: { item: AdminNotification }) => (
    <View style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
      {!item.is_read && <View style={styles.unreadDot} />}
      
      <View style={[styles.iconContainer, { backgroundColor: getTypeColor(item.type) }]}>
        <Icon name={getTypeIcon(item.type)} size={20} color="#fff" />
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>
            {formatTime(item.created_at)}
          </Text>
        </View>
        
        <Text style={styles.cardMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.cardUser}>
            👤 {item.user_name || 'System'}
          </Text>
          <Text style={styles.cardType}>
            {item.type}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        {!item.is_read && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleMarkAsRead(item.id)}
          >
            <Icon name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          onPress={() => handleDelete(item.id)}
        >
          <Icon name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Remove FlatList and use a simple horizontal View for filter text
  const renderFilterButtons = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginTop: 8, marginBottom: 8 }}>
      {filterOptions.map((item) => (
        <TouchableOpacity
          key={item.value}
          onPress={() => handleFilterChange(item.value)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            marginRight: 10,
            backgroundColor: selectedFilter === item.value ? '#E3F2FD' : '#F5F5F5',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedFilter === item.value ? '#2196F3' : '#E5E5E5',
          }}
        >
          <Text style={{
            fontSize: 15,
            color: selectedFilter === item.value ? '#2196F3' : '#666',
            fontWeight: selectedFilter === item.value ? 'bold' : '500',
          }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-off" size={64} color="#DDD" />
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
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SendNotification')} 
            style={styles.headerActionButton}
          >
            <Icon name="add" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AdminPasswordReset')} 
            style={styles.headerActionButton}
          >
            <Icon name="settings" size={20} color="#2196F3" />
          </TouchableOpacity>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteAllButton}>
              <Icon name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{notifications.filter(n => n.is_read).length}</Text>
          <Text style={styles.statLabel}>Read</Text>
        </View>
      </View>

      {renderFilterButtons()}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F44336',
    borderRadius: 20,
  },
  deleteAllText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
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
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    backgroundColor: '#FAFCFF',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  cardMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardUser: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  cardType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
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
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AdminNotificationScreen;