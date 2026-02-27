import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { Colors } from '../theme/colors';

interface CommonHeaderProps {
  title: string;
  onBackPress: () => void;
  rightComponent?: React.ReactNode;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ 
  title, 
  onBackPress, 
  rightComponent,
}) => {
  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Left: Back Button */}
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      
      {/* Center: Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>
      
      {/* Right: Optional Component or Spacer */}
      {rightComponent ? (
        <View style={styles.rightComponent}>{rightComponent}</View>
      ) : (
        <View style={styles.rightSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  rightComponent: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  rightSpacer: {
    width: 40,
    marginLeft: 8,
  },
});

export default CommonHeader;
