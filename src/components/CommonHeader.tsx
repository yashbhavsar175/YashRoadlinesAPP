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
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      {rightComponent ? (
        <View style={styles.rightComponent}>{rightComponent}</View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 18,
    flex: 1,
    textAlign: 'left',
    marginLeft: 8,
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
  rightComponent: {
    width: 32,
    alignItems: 'flex-end',
  },
});

export default CommonHeader;
