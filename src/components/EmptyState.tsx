import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  iconSize?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  message,
  iconSize = 60 
}) => {
  return (
    <View style={[GlobalStyles.card, styles.container]}>
      <Icon name={icon} size={iconSize} color={Colors.textSecondary} style={styles.icon} />
      <Text style={[GlobalStyles.title, styles.title]}>{title}</Text>
      <Text style={[GlobalStyles.bodyText, styles.message]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 10,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default EmptyState;
