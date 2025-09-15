// AdminUserManagementScreen.tsx - Admin screen to manage user display names
import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Text,
    TouchableOpacity,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import UserManagementService, { User } from '../services/UserManagementService';

// Safe area helper for status bar
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

type AdminUserManagementScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminUserManagement'>;

interface AdminUserManagementScreenProps {
    navigation: AdminUserManagementScreenNavigationProp;
}



const AdminUserManagementScreen = ({ navigation }: AdminUserManagementScreenProps): React.JSX.Element => {
    const { goBack } = navigation;

    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const userData = await UserManagementService.getAllUsers();
            setUsers(userData);
        } catch (error) {
            console.error('❌ Error loading users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setNewDisplayName(user.full_name || '');
        setModalVisible(true);
    };

    const handleUpdateDisplayName = async () => {
        if (!selectedUser || !newDisplayName.trim()) {
            Alert.alert('Error', 'Please enter a valid display name');
            return;
        }

        setUpdating(true);
        try {
            const success = await UserManagementService.updateUserDisplayName(
                selectedUser.id,
                newDisplayName.trim()
            );

            if (success) {
                // Update local state
                const updatedUsers = users.map(user =>
                    user.id === selectedUser.id
                        ? { ...user, full_name: newDisplayName.trim() }
                        : user
                );
                setUsers(updatedUsers);

                setModalVisible(false);
                setSelectedUser(null);
                setNewDisplayName('');

                Alert.alert('Success', 'Display name updated successfully! This will be reflected on the user\'s home screen.');
            } else {
                Alert.alert('Error', 'Failed to update display name');
            }
        } catch (error) {
            console.error('❌ Error updating display name:', error);
            Alert.alert('Error', 'Failed to update display name');
        } finally {
            setUpdating(false);
        }
    };

    const renderUser = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <Icon name="person-circle" size={24} color="#2196F3" />
                    <View style={styles.userDetails}>
                        <Text style={styles.userEmail}>{item.username}</Text>
                        <Text style={styles.userDisplayName}>
                            {item.full_name || 'No display name set'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.userDate}>
                    Joined: {new Date(item.created_at).toLocaleDateString()}
                    {item.is_admin && <Text style={styles.adminBadge}> • Admin</Text>}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditUser(item)}
            >
                <Icon name="create" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Icon name="people" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyMessage}>
                No users are registered in the system yet.
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>User Management</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Management</Text>
                <TouchableOpacity onPress={loadUsers} style={styles.refreshButton}>
                    <Icon name="refresh" size={24} color="#2196F3" />
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{users.length}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                        {users.filter(u => u.full_name).length}
                    </Text>
                    <Text style={styles.statLabel}>With Names</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: '#F44336' }]}>
                        {users.filter(u => !u.full_name).length}
                    </Text>
                    <Text style={styles.statLabel}>Without Names</Text>
                </View>
            </View>

            {/* Users List */}
            <FlatList
                data={users}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={users.length === 0 ? styles.emptyContainer : styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Display Name</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Username:</Text>
                            <Text style={styles.modalEmail}>{selectedUser?.username}</Text>

                            <Text style={styles.modalLabel}>Display Name:</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newDisplayName}
                                onChangeText={setNewDisplayName}
                                placeholder="Enter display name"
                                autoFocus={true}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleUpdateDisplayName}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingTop: STATUSBAR_HEIGHT + 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    refreshButton: {
        padding: 8,
        marginRight: -8,
    },
    placeholder: {
        width: 24,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 2,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    stat: {
        alignItems: 'center',
        paddingVertical: 0,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
    listContainer: {
        paddingTop: 8,
        paddingBottom: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        lineHeight: 24,
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    userDisplayName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    userDate: {
        fontSize: 12,
        color: '#999',
    },
    editButton: {
        backgroundColor: '#2196F3',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        margin: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalEmail: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    adminBadge: {
        color: '#FF9800',
        fontWeight: '600',
    },
});

export default AdminUserManagementScreen;