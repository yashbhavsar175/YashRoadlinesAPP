/**
 * OfficeIndicator Component
 * 
 * Displays the current office name in the app header.
 * For admin users: clickable and opens OfficeSelector modal
 * For regular users: static display showing assigned office
 * 
 * Requirements: 5.1, 5.2, 5.4
 * 
 * @example
 * // Usage in header for admin user
 * <OfficeIndicator
 *   officeName="Prem Darvaja Office"
 *   isAdmin={true}
 *   onPress={() => setShowOfficeSelector(true)}
 * />
 * 
 * @example
 * // Usage in header for regular user
 * <OfficeIndicator
 *   officeName="Aslali Office"
 *   isAdmin={false}
 * />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';

interface OfficeIndicatorProps {
  officeName: string;
  isAdmin: boolean;
  onPress?: () => void; // Only used for admin users
  style?: ViewStyle;
}

const OfficeIndicator: React.FC<OfficeIndicatorProps> = ({
  officeName,
  isAdmin,
  onPress,
  style,
}) => {
  // For admin users, make it clickable
  if (isAdmin && onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.containerAdmin, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <Text style={[styles.label, styles.labelAdmin]} numberOfLines={1}>
            {officeName}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // For regular users, static display
  return (
    <View style={[styles.container, styles.containerRegular, style]}>
      <Text style={[styles.label, styles.labelRegular]} numberOfLines={1}>
        {officeName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    borderWidth: 1,
  },
  containerAdmin: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accent,
    // Add subtle shadow for clickable appearance
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  containerRegular: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  labelAdmin: {
    color: Colors.textPrimary,
    marginRight: 4,
  },
  labelRegular: {
    color: Colors.textPrimary,
  },
  dropdownIcon: {
    fontSize: 9,
    color: Colors.textPrimary,
    marginLeft: 4,
  },
});

export default OfficeIndicator;
