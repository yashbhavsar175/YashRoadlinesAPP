import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';

interface CommonInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
}

const CommonInput: React.FC<CommonInputProps> = ({ 
  label, 
  required = false, 
  error,
  style,
  ...props 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[GlobalStyles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.placeholder}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  requiredStar: {
    color: Colors.error,
    fontSize: 14,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});

export default CommonInput;
