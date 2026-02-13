/**
 * OfficeSelector Component
 * 
 * A dropdown component that allows admin users to switch between offices.
 * Features smooth animations, visual indicators for current selection, and
 * optional "All Offices" view for consolidated data.
 * 
 * @example
 * // Basic usage with OfficeContext
 * import { useOffice } from '../context/OfficeContext';
 * import OfficeSelector from '../components/OfficeSelector';
 * 
 * const MyScreen = () => {
 *   const { currentOffice, availableOffices, switchOffice, canSwitchOffice } = useOffice();
 *   
 *   return (
 *     <OfficeSelector
 *       currentOffice={currentOffice}
 *       availableOffices={availableOffices}
 *       onOfficeChange={switchOffice}
 *       showAllOfficesOption={true}
 *       disabled={!canSwitchOffice}
 *     />
 *   );
 * };
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Office } from '../data/Storage';

interface OfficeSelectorProps {
  currentOffice: Office | null;
  availableOffices: Office[];
  onOfficeChange: (officeId: string) => void;
  showAllOfficesOption?: boolean; // Show "All Offices" option for admin users
  disabled?: boolean;
}

const ALL_OFFICES_ID = 'ALL_OFFICES';
const DEBOUNCE_DELAY_MS = 300; // Debounce delay for office selection

const OfficeSelector: React.FC<OfficeSelectorProps> = ({
  currentOffice,
  availableOffices,
  onOfficeChange,
  showAllOfficesOption = false,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // Debouncing state
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Debounced office selection handler
   * Prevents rapid successive office switches that could cause performance issues
   */
  const debouncedOfficeChange = useCallback((officeId: string) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsProcessing(true);

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('🎯 OfficeSelector: Executing debounced office change to:', officeId);
      onOfficeChange(officeId);
      setIsProcessing(false);
    }, DEBOUNCE_DELAY_MS);
  }, [onOfficeChange]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setVisible(true);
    // Smooth fade-in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    // Smooth fade-out animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleOfficeSelect = (officeId: string) => {
    // Use debounced handler to prevent rapid switches
    debouncedOfficeChange(officeId);
    closeMenu();
  };

  // Determine the display label
  const getDisplayLabel = () => {
    if (!currentOffice) {
      return 'Select Office';
    }
    if (currentOffice.id === ALL_OFFICES_ID) {
      return 'All Offices';
    }
    return currentOffice.name;
  };

  // Check if an office is currently selected
  const isSelected = (officeId: string) => {
    if (!currentOffice) return false;
    return currentOffice.id === officeId;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={openMenu}
        style={[styles.button, disabled && styles.buttonDisabled]}
        disabled={disabled || isProcessing}
      >
        <Text style={[styles.buttonLabel, disabled && styles.buttonLabelDisabled]} numberOfLines={1}>
          {getDisplayLabel()}
        </Text>
        {isProcessing ? (
          <Text style={[styles.dropdownIcon, disabled && styles.buttonLabelDisabled]}>⏳</Text>
        ) : (
          <Text style={[styles.dropdownIcon, disabled && styles.buttonLabelDisabled]}>▼</Text>
        )}
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        onRequestClose={closeMenu}
        animationType="none"
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.dropdown,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Office</Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
              {/* All Offices option for admin */}
              {showAllOfficesOption && (
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    isSelected(ALL_OFFICES_ID) && styles.menuItemSelected,
                  ]}
                  onPress={() => handleOfficeSelect(ALL_OFFICES_ID)}
                >
                  <View style={styles.menuItemContent}>
                    <Text
                      style={[
                        styles.menuItemText,
                        isSelected(ALL_OFFICES_ID) && styles.menuItemTextSelected,
                      ]}
                    >
                      All Offices
                    </Text>
                    {isSelected(ALL_OFFICES_ID) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.menuItemSubtext}>View consolidated data</Text>
                </TouchableOpacity>
              )}

              {/* Individual offices */}
              {availableOffices.map((office) => (
                <TouchableOpacity
                  key={office.id}
                  style={[
                    styles.menuItem,
                    isSelected(office.id) && styles.menuItemSelected,
                  ]}
                  onPress={() => handleOfficeSelect(office.id)}
                >
                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemTextContainer}>
                      <Text
                        style={[
                          styles.menuItemText,
                          isSelected(office.id) && styles.menuItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {office.name}
                      </Text>
                      {office.address && (
                        <Text style={styles.menuItemSubtext} numberOfLines={1}>
                          {office.address}
                        </Text>
                      )}
                    </View>
                    {isSelected(office.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {availableOffices.length === 0 && !showAllOfficesOption && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No offices available</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    minHeight: 36,
  },
  buttonDisabled: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 4,
  },
  buttonLabelDisabled: {
    color: Colors.textSecondary,
  },
  dropdownIcon: {
    fontSize: 10,
    color: Colors.textPrimary,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdown: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  scrollView: {
    maxHeight: 400,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  menuItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  menuItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.success,
    fontWeight: 'bold',
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default OfficeSelector;
