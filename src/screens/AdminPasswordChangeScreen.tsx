import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    FlatList,
    ActivityIndicator,
    StatusBar,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { supabase } from '../supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAlert } from '../context/AlertContext';

type AdminPasswordChangeScreenNavigationProp = NavigationProp<RootStackParamList, 'AdminPasswordChangeScreen'>;

interface AdminPasswordChangeScreenProps {
    navigation: AdminPasswordChangeScreenNavigationProp;
}

interface UserProfile {
    id: string;
    username: string;
    full_name: string | null;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: string;
}

const AdminPasswordChangeScreen: React.FC<AdminPasswordChangeScreenProps> = ({ navigation }) => {
    const { showAlert } = useAlert();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, is_admin, is_active, created_at')
                .order('username', { ascending: true });

            if (error) throw error;

            // For now, use username as email placeholder since we can't access auth.users with anon key
            const usersWithEmail = (data || []).map((user) => ({
                ...user,
                email: user.username || 'No email' // Use username as placeholder
            }));

            setUsers(usersWithEmail);
        } catch (error: any) {
            console.error('Error loading users:', error);
            if (error.code === '42P17') {
                showAlert('Database policy error. Please contact administrator to fix RLS policies.');
            } else if (error.message?.includes('column') && error.message?.includes('does not exist')) {
                showAlert('Database schema needs to be updated. Please run the provided SQL scripts.');
            } else {
                showAlert(`Failed to load users: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!selectedUser) {
            showAlert('Please select a user first');
            return;
        }

        if (!newPassword.trim()) {
            showAlert('Please enter a new password');
            return;
        }

        if (newPassword.length < 6) {
            showAlert('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match');
            return;
        }

        Alert.alert(
            'Change User Password',
            `Change password for "${selectedUser.username}" (${selectedUser.email})?\n\nNew Password: ${newPassword}\n\nThe user will be able to login immediately with this new password.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Change Password', style: 'destructive', onPress: performPasswordChange },
            ]
        );
    };

    const performPasswordChange = async () => {
        if (!selectedUser) return;

        try {
            setChangingPassword(true);

            console.log('🔧 DEBUG: Attempting password reset for user:', {
                userId: selectedUser.id,
                username: selectedUser.username,
                email: selectedUser.email
            });

            // Method 1: Try test function first to debug UUID error
            const { data: testData, error: testError } = await supabase.rpc('test_admin_password_change', {
                target_user_email: selectedUser.email,
                new_password: newPassword
            });

            if (testError) {
                console.error('🔧 DEBUG: Test function error:', testError);
                throw testError;
            }

            console.log('🔧 DEBUG: Test function result:', testData);

            if (testData && !testData.success) {
                throw new Error(`Test failed at ${testData.step}: ${testData.error}`);
            }

            // If test passes, try the real function
            const { data: directChangeData, error: directChangeError } = await supabase.rpc('simple_admin_password_change', {
                target_user_email: selectedUser.email,
                new_password: newPassword
            });

            if (directChangeError) {
                console.error('Direct password change error:', directChangeError);
                throw directChangeError;
            }

            if (directChangeData && !directChangeData.success) {
                throw new Error(directChangeData.error || 'Password change failed');
            }

            console.log('✅ Password changed successfully via direct method');
            showAlert(`Password successfully changed for ${selectedUser.username}!\n\nNew Password: ${newPassword}\n\nThe user can now login with this password.`);

            // Reset form
            setSelectedUser(null);
            setNewPassword('');
            setConfirmPassword('');

        } catch (error: any) {
            console.error('Error changing password:', error);
            
            // Parse different types of errors
            let errorMessage = 'Unknown error occurred';
            
            if (error.message?.includes('Access denied') || error.message?.includes('access_denied')) {
                errorMessage = 'Access denied: You need admin privileges to change passwords. Please ensure you are logged in as an admin user.';
            } else if (error.message?.includes('JWT') || error.message?.includes('token')) {
                errorMessage = 'Authentication error: Please log out and log back in as an admin user.';
            } else if (error.message?.includes('service_role') || error.message?.includes('anon')) {
                errorMessage = 'Permission error: Admin API access not configured. Please contact system administrator.';
            } else if (error.message?.includes('uuid') || error.message?.includes('invalid input syntax')) {
                errorMessage = 'Invalid user ID format. Please refresh the user list and try again.';
            } else if (error.message?.includes('User not found')) {
                errorMessage = 'User not found. The user may have been deleted.';
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                errorMessage = 'Network error: Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = `Password change failed: ${error.message}`;
            }
            
            showAlert(errorMessage);
            
            // Log additional debug info
            console.log('🔧 DEBUG: Error details', {
                errorType: typeof error,
                errorMessage: error.message,
                errorCode: error.code,
                errorStatus: error.status,
                selectedUserId: selectedUser?.id,
                selectedUserEmail: selectedUser?.email
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderUserItem = ({ item }: { item: UserProfile }) => (
        <TouchableOpacity
            style={[
                styles.userItem,
                selectedUser?.id === item.id && styles.selectedUserItem
            ]}
            onPress={() => setSelectedUser(item)}
        >
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <Text style={[styles.username, selectedUser?.id === item.id && styles.selectedUserText]}>{item.username}</Text>
                    <View style={styles.badges}>
                        {item.is_admin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.badgeText}>Admin</Text>
                            </View>
                        )}
                        {!item.is_active && (
                            <View style={styles.inactiveBadge}>
                                <Text style={styles.badgeText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>
                {item.full_name && (
                    <Text style={[styles.fullName, selectedUser?.id === item.id && styles.selectedUserText]}>{item.full_name}</Text>
                )}
                <Text style={[styles.email, selectedUser?.id === item.id && styles.selectedUserText]}>{item.email}</Text>
                <Text style={[styles.createdAt, selectedUser?.id === item.id && styles.selectedUserText]}>
                    Created: {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <Icon
                name={selectedUser?.id === item.id ? "checkmark-circle" : "chevron-forward"}
                size={24}
                color={selectedUser?.id === item.id ? Colors.primary : Colors.textSecondary}
            />
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView 
            style={GlobalStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change User Password</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor={Colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* User List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select User</Text>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>Loading users...</Text>
                        </View>
                    ) : (
                        <View>
                            {filteredUsers.map((item) => (
                                <View key={item.id}>
                                    {renderUserItem({ item })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Password Change Form */}
                {selectedUser && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Change Password for: {selectedUser.username}
                        </Text>

                        <View style={styles.passwordForm}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <TextInput
                                style={GlobalStyles.input}
                                placeholder="Enter new password"
                                placeholderTextColor={Colors.placeholder}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <TextInput
                                style={GlobalStyles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor={Colors.placeholder}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />

                            <TouchableOpacity
                                style={[
                                    GlobalStyles.buttonPrimary,
                                    changingPassword && styles.disabledButton
                                ]}
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                            >
                                {changingPassword ? (
                                    <ActivityIndicator size="small" color={Colors.surface} />
                                ) : (
                                    <Text style={GlobalStyles.buttonPrimaryText}>Change Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
    },
    headerTitle: {
        color: Colors.surface,
        fontWeight: 'bold',
        fontSize: 18,
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    loadingText: {
        marginTop: 8,
        color: Colors.textSecondary,
    },
    userList: {
        // Remove height restrictions to allow natural scrolling
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        elevation: 1,
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    selectedUserItem: {
        borderColor: Colors.primary,
        borderWidth: 2,
        backgroundColor: Colors.surface,
    },
    selectedUserText: {
        color: Colors.textPrimary,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    badges: {
        flexDirection: 'row',
    },
    adminBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 4,
    },
    inactiveBadge: {
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 4,
    },
    badgeText: {
        color: Colors.surface,
        fontSize: 10,
        fontWeight: 'bold',
    },
    fullName: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    email: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    createdAt: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    passwordForm: {
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 8,
        elevation: 2,
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 8,
    },
    disabledButton: {
        backgroundColor: Colors.textSecondary,
        opacity: 0.6,
    },
    passwordSection: {
        flex: 1,
        paddingTop: 16,
    },
    infoBox: {
        backgroundColor: Colors.primaryLight,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    infoText: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoSubText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});

export default AdminPasswordChangeScreen;