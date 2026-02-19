// MumbaiDeliveryNavigator.tsx
// Tab navigator for Mumbai Delivery feature with Data Entry and Payment Confirmation screens
// Validates: Requirement 9.1

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import DataEntryScreen from '../screens/DataEntryScreen';
import PaymentConfirmationScreen from '../screens/PaymentConfirmationScreen';
import { Colors } from '../theme/colors';

// Define the tab navigator param list
export type MumbaiDeliveryTabParamList = {
  DataEntry: undefined;
  PaymentConfirmation: undefined;
};

const Tab = createMaterialTopTabNavigator<MumbaiDeliveryTabParamList>();

/**
 * Mumbai Delivery Navigator
 * Provides tab navigation between Data Entry and Payment Confirmation screens
 * Validates: Requirement 9.1
 */
function MumbaiDeliveryNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: Colors.primary,
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          elevation: 0,
          shadowColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        tabBarPressColor: Colors.primaryLight,
      }}
    >
      <Tab.Screen
        name="DataEntry"
        component={DataEntryScreen}
        options={{
          title: 'New Delivery',
        }}
      />
      <Tab.Screen
        name="PaymentConfirmation"
        component={PaymentConfirmationScreen}
        options={{
          title: 'Confirm Payment',
        }}
      />
    </Tab.Navigator>
  );
}

export default MumbaiDeliveryNavigator;
