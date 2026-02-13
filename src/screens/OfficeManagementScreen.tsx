import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { 
  getOffices, 
  createOffice, 
  updateOffice, 
  deleteOffice, 
  Office 
} from '../data/Storage';
import { useOffice } from '../context/OfficeContext';

const OfficeManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshOffices } = useOffice();
  
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create office modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeAddress, setNewOfficeAddress] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Edit office modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editOfficeName, setEditOfficeName] = useState('');
  const [editOfficeAddress, setEditOfficeAddress] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      setLoading(true);
      const officeList = await getOffices();
      setOffices(officeList);
      console.log('📋 Loaded offices:', officeList.length);
    } catch (error) {
      console.error('Error loading offices:', error);
      Alert.alert('Error', 'Failed to load offices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffice = async () => {
    const trimmedName = newOfficeName.trim();
    
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Office name is required');
      return;
    }

    setCreating(true);
    try {
      const newOffice = await createOffice(trimmedName, newOfficeAddress.trim() || undefined);
      
      if (newOffice) {
        Alert.alert('Success', `Office "${newOffice.name}" created successfully`);
        setNewOfficeName('');
        setNewOfficeAddress('');
        setShowCreateModal(false);
        await loadOffices();
        await refreshOffices(); // Refresh context
      } else {
        Alert.alert(
          'Error', 
          'Failed to create office. An office with this name may already exist.'
        );
      }
    } catch (error) {
      console.error('Error creating office:', error);
      Alert.alert('Error', 'Failed to create office');
    } finally {
      setCreating(false);
    }
  };

  const handleEditOffice = (office: Office) => {
    setEditingOffice(office);
    setEditOfficeName(office.name);
    setEditOfficeAddress(office.address || '');
    setShowEditModal(true);
  };

  const handleUpdateOffice = async () => {
    if (!editingOffice) return;

    const trimmedName = editOfficeName.trim();
    
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Office name is required');
      return;
    }

    setUpdating(true);
    try {
      const success = await updateOffice(editingOffice.id, {
        name: trimmedName,
        address: editOfficeAddress.trim() || undefined,
      });
      
      if (success) {
        Alert.alert('Success', 'Office updated successfully');
        setShowEditModal(false);
        setEditingOffice(null);
        await loadOffices();
        await refreshOffices(); // Refresh context
      } else {
        Alert.alert(
          'Error', 
          'Failed to update office. An office with this name may already exist.'
        );
      }
    } catch (error) {
      console.error('Error updating office:', error);
      Alert.alert('Error', 'Failed to update office');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOffice = (office: Office) => {
    Alert.alert(
      'Delete Office',
      `Are you sure you want to delete "${office.name}"?\n\nThis action cannot be undone and will only succeed if the office has no associated transactions or users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteOffice(office.id);
              
              if (success) {
                Alert.alert('Success', 'Office deleted successfully');
                await loadOffices();
                await refreshOffices(); // Refresh context
              } else {
                Alert.alert(
                  'Cannot Delete',
                  'This office cannot be deleted because it has associated transactions or assigned users. Please reassign users and ensure no transactions exist for this office before deleting.'
                );
              }
            } catch (error) {
              console.error('Error deleting office:', error);
              Alert.alert('Error', 'Failed to delete office');
            }
          },
        },
      ]
    );
  };

  const filteredOffices = offices.filter(office =>
    office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    office.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOfficeCard = (office: Office) => {
    return (
      <View key={office.id} style={styles.officeCard}>
        <View style={styles.officeHeader}>
          <View style={styles.officeInfo}>
            <View style={styles.officeNameRow}>
              <Icon name="business" size={20} color="#3498db" style={styles.officeIcon} />
              <Text style={styles.officeName}>{office.name}</Text>
            </View>
            {office.address && (
              <View style={styles.addressRow}>
                <Icon name="location-outline" size={16} color="#7f8c8d" style={styles.addressIcon} />
                <Text style={styles.officeAddress}>{office.address}</Text>
              </View>
            )}
            <Text style={styles.officeDate}>
              Created: {new Date(office.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.officeActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditOffice(office)}
          >
            <Icon name="create-outline" size={20} color="#3498db" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteOffice(office)}
          >
            <Icon name="trash-outline" size={20} color="#e74c3c" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading offices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Office Management</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>🏢 Office Management</Text>
        <Text style={styles.subtitle}>Manage office locations and details</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search offices by name or address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#95a5a6"
        />
      </View>

      {/* Create Office Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Icon name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create New Office</Text>
      </TouchableOpacity>

      {/* Office List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{offices.length}</Text>
            <Text style={styles.statLabel}>Total Offices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{filteredOffices.length}</Text>
            <Text style={styles.statLabel}>Filtered Results</Text>
          </View>
        </View>

        {filteredOffices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="business-outline" size={60} color="#95a5a6" />
            <Text style={styles.emptyTitle}>No Offices Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'No offices match your search criteria' 
                : 'Create your first office to get started'}
            </Text>
          </View>
        ) : (
          filteredOffices.map(renderOfficeCard)
        )}
      </ScrollView>

      {/* Create Office Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Office</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Icon name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>
                Office Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Prem Darvaja Office"
                value={newOfficeName}
                onChangeText={setNewOfficeName}
                placeholderTextColor="#95a5a6"
              />

              <Text style={styles.inputLabel}>Office Address (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., 123 Main Street, City"
                value={newOfficeAddress}
                onChangeText={setNewOfficeAddress}
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.modalButton, creating && styles.disabledButton]}
                onPress={handleCreateOffice}
                disabled={creating}
              >
                <Text style={styles.modalButtonText}>
                  {creating ? 'Creating...' : 'Create Office'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Office Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Office</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>
                Office Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Prem Darvaja Office"
                value={editOfficeName}
                onChangeText={setEditOfficeName}
                placeholderTextColor="#95a5a6"
              />

              <Text style={styles.inputLabel}>Office Address (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., 123 Main Street, City"
                value={editOfficeAddress}
                onChangeText={setEditOfficeAddress}
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.modalButton, updating && styles.disabledButton]}
                onPress={handleUpdateOffice}
                disabled={updating}
              >
                <Text style={styles.modalButtonText}>
                  {updating ? 'Updating...' : 'Update Office'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    width: 40,
  },
  contentHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  searchContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  createButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  officeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  officeHeader: {
    padding: 15,
  },
  officeInfo: {
    flex: 1,
  },
  officeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  officeIcon: {
    marginRight: 8,
  },
  officeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  officeAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  officeDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  officeActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  editButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 10,
  },
  requiredStar: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
});

export default OfficeManagementScreen;
