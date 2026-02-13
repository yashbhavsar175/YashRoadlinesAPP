import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Modal } from 'react-native';
import { Colors } from '../theme/colors';
import { useUserAccess } from '../context/UserAccessContext';
import { useOffice } from '../context/OfficeContext';
import OfficeSelector from './OfficeSelector';

interface CommonHeaderProps {
  title: string;
  onBackPress: () => void;
  rightComponent?: React.ReactNode;
  showUserInfo?: boolean; // Show user name, role, and office info
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ 
  title, 
  onBackPress, 
  rightComponent,
  showUserInfo = true 
}) => {
  const { isAdmin, userEmail, assignedOfficeName } = useUserAccess();
  const { currentOffice, availableOffices, switchOffice, canSwitchOffice } = useOffice();
  const [showOfficeSelector, setShowOfficeSelector] = useState(false);

  // Determine user role display
  const getUserRole = () => {
    return isAdmin ? 'Admin' : 'User';
  };

  // Get display name from email (part before @)
  const getDisplayName = () => {
    if (!userEmail) return 'User';
    return userEmail.split('@')[0];
  };

  // Get office name to display
  const getOfficeName = () => {
    if (currentOffice) {
      return currentOffice.name;
    }
    if (assignedOfficeName) {
      return assignedOfficeName;
    }
    return 'No Office';
  };

  const handleOfficePress = () => {
    if (canSwitchOffice) {
      setShowOfficeSelector(true);
    }
  };

  const handleOfficeChange = async (officeId: string) => {
    setShowOfficeSelector(false);
    await switchOffice(officeId);
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      {showUserInfo ? (
        <View style={styles.userInfoContainer}>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{getDisplayName()}</Text>
            <Text style={styles.userRole}>{getUserRole()}</Text>
          </View>
          
          <View style={styles.officeDivider} />
          
          {/* Office Indicator/Selector */}
          {canSwitchOffice ? (
            <TouchableOpacity 
              style={styles.officeButton}
              onPress={handleOfficePress}
              activeOpacity={0.7}
            >
              <Text style={styles.officeText} numberOfLines={1}>
                {getOfficeName()}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.officeStatic}>
              <Text style={styles.officeTextStatic} numberOfLines={1}>
                {getOfficeName()}
              </Text>
            </View>
          )}
        </View>
      ) : rightComponent ? (
        <View style={styles.rightComponent}>{rightComponent}</View>
      ) : (
        <View style={styles.headerSpacer} />
      )}

      {/* Office Selector Modal */}
      <Modal
        transparent={true}
        visible={showOfficeSelector}
        onRequestClose={() => setShowOfficeSelector(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOfficeSelector(false)}
        >
          <View style={styles.modalContent}>
            <OfficeSelector
              currentOffice={currentOffice}
              availableOffices={availableOffices}
              onOfficeChange={handleOfficeChange}
              showAllOfficesOption={isAdmin}
              disabled={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  // User info container
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '50%',
  },
  userDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  userName: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 80,
  },
  userRole: {
    color: Colors.surface,
    fontSize: 11,
    opacity: 0.9,
  },
  officeDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  // Office button (for admin)
  officeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    maxWidth: 120,
  },
  officeText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dropdownIcon: {
    color: Colors.surface,
    fontSize: 10,
    marginLeft: 4,
  },
  // Office static display (for regular users)
  officeStatic: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    maxWidth: 120,
  },
  officeTextStatic: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
  },
});

export default CommonHeader;
