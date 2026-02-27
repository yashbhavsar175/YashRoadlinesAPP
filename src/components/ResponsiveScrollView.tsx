// ResponsiveScrollView.tsx - Universal responsive scroll container
import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';

interface ResponsiveScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  paddingHorizontal?: number;
  paddingVertical?: number;
}

/**
 * ResponsiveScrollView - Ensures content is scrollable on all screen sizes
 * 
 * Usage:
 * <ResponsiveScrollView>
 *   <YourContent />
 * </ResponsiveScrollView>
 */
export const ResponsiveScrollView: React.FC<ResponsiveScrollViewProps> = ({
  children,
  paddingHorizontal = 12,
  paddingVertical = 16,
  style,
  contentContainerStyle,
  ...props
}) => {
  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingHorizontal,
          paddingVertical,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ResponsiveScrollView;
