// NotificationCard.tsx - Beautiful notification card component with animations
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AdminNotification } from '../services/NotificationService';

interface NotificationCardProps {
  notification: AdminNotification;
  onPress?: (notification: AdminNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const { width } = Dimensions.get('window');

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(notification.id);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'add':
        return 'add-circle';
      case 'edit':
        return 'create';
      case 'delete':
        return 'trash';
      default:
        return 'notifications';
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'add':
        return '#4CAF50';
      case 'edit':
        return '#FF9800';
      case 'delete':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const getSeverityColor = () => {
    switch (notification.severity) {
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          notification.is_read ? styles.readCard : styles.unreadCard,
          (notification as any).deleted && styles.deletedCard,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={(notification as any).deleted}
      >
        {/* Unread indicator */}
        {!notification.is_read && !(notification as any).deleted && <View style={styles.unreadIndicator} />}
        
        {/* Deleted indicator */}
        {(notification as any).deleted && (
          <View style={styles.deletedBanner}>
            <Icon name="trash" size={12} color="#FFFFFF" />
            <Text style={styles.deletedText}>DELETED</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.typeContainer}>
              <View style={[styles.iconContainer, { backgroundColor: getTypeColor() }]}>
                <Icon name={getTypeIcon()} size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {notification.title}
              </Text>
            </View>
            <View style={styles.metaContainer}>
              <View style={[styles.severityDot, { backgroundColor: getSeverityColor() }]} />
              <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>

          {/* User info */}
          <View style={styles.userInfo}>
            <Icon name="person-circle" size={16} color="#666" />
            <Text style={styles.userName}>{notification.user_name || 'System'}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.category}>{(notification.type || 'system').replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!notification.is_read && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onMarkAsRead && onMarkAsRead(notification.id)}
            >
              <Icon name="checkmark" size={16} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Icon name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    backgroundColor: '#F8FFFE',
  },
  readCard: {
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  time: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  separator: {
    fontSize: 12,
    color: '#CCC',
    marginHorizontal: 6,
  },
  category: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  deletedCard: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
  },
  deletedBanner: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  deletedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});
