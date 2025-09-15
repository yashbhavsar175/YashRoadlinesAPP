// NotificationBell.tsx - Animated notification bell with badge
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NotificationService from '../services/NotificationService';

interface NotificationBellProps {
  onPress?: () => void;
  size?: number;
  color?: string;
  badgeColor?: string;
  textColor?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onPress,
  size = 24,
  color = '#333',
  badgeColor = '#F44336',
  textColor = '#FFFFFF',
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
    
    // Subscribe to real-time notifications
    const subscription = NotificationService.subscribeToNotifications((notification) => {
      console.log('🔔 New notification received:', notification);
      loadUnreadCount();
      triggerNotificationAnimation();
    });

    return () => {
      clearInterval(interval);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (unreadCount > 0) {
      // Animate badge appearance
      Animated.spring(badgeScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate badge disappearance
      Animated.timing(badgeScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [unreadCount]);

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Error loading unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerNotificationAnimation = () => {
    // Shake animation
    const shakeSequence = Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    // Pulse animation
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([shakeSequence, pulseSequence]).start();
  };

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    }
  };

  const formatBadgeText = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.bellContainer,
          {
            transform: [
              { translateX: shakeAnim },
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <Icon name="notifications-outline" size={size} color={color} />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor,
                transform: [{ scale: badgeScaleAnim }],
                minWidth: unreadCount > 9 ? 20 : 16,
                height: unreadCount > 9 ? 20 : 16,
                borderRadius: unreadCount > 9 ? 10 : 8,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: textColor,
                  fontSize: unreadCount > 9 ? 10 : 9,
                },
              ]}
            >
              {formatBadgeText(unreadCount)}
            </Text>
          </Animated.View>
        )}

        {/* Pulse indicator for new notifications */}
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.pulseIndicator,
              {
                backgroundColor: badgeColor,
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0, 0.3],
                }),
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  bellContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pulseIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -8,
    right: -8,
  },
});
