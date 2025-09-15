// UserManagementService.ts - Service for managing users
import { supabase } from '../supabase';
import NotificationService from './NotificationService';
import PushNotificationService from './PushNotificationService';

export interface User {
    id: string;
    username: string;
    full_name: string | null;
    is_admin: boolean;
    created_at: string;
    updated_at?: string;
}

class UserManagementService {
    // Get all users
    async getAllUsers(): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, is_admin, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching users:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Error in getAllUsers:', error);
            throw error;
        }
    }

    // Update user display name (full_name)
    async updateUserDisplayName(userId: string, displayName: string): Promise<boolean> {
        try {
            // Get user details before update
            const { data: userData } = await supabase
                .from('user_profiles')
                .select('username, full_name')
                .eq('id', userId)
                .single();

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: displayName.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('❌ Error updating user display name:', error);
                return false;
            }

            // Send notifications for user profile update
            const oldName = userData?.full_name || 'No name';
            const newName = displayName.trim();
            
            // Send admin notification
            await NotificationService.sendAdminNotification({
                title: '👤 User Profile Updated',
                message: `User ${userData?.username} changed display name from "${oldName}" to "${newName}"`,
                type: 'edit',
                severity: 'info',
                metadata: {
                    category: 'user_profile',
                    action: 'edit',
                    userId,
                    username: userData?.username,
                    oldName,
                    newName
                }
            });

            // Send push notification
            await PushNotificationService.notifyUserAction(
                'edit',
                'User Profile',
                userData?.username || 'Unknown User',
                `Display name: "${oldName}" → "${newName}"`
            );

            console.log('✅ User display name updated and notifications sent');
            return true;
        } catch (error) {
            console.error('❌ Error in updateUserDisplayName:', error);
            return false;
        }
    }

    // Get user by ID
    async getUserById(userId: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, is_admin, created_at, updated_at')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ Error fetching user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('❌ Error in getUserById:', error);
            return null;
        }
    }

    // Search users by username
    async searchUsersByUsername(username: string): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, is_admin, created_at, updated_at')
                .ilike('username', `%${username}%`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error searching users:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Error in searchUsersByUsername:', error);
            throw error;
        }
    }

    // Get users without full names
    async getUsersWithoutDisplayNames(): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, is_admin, created_at, updated_at')
                .is('full_name', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching users without display names:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Error in getUsersWithoutDisplayNames:', error);
            throw error;
        }
    }

    // Notify admin when new user registers
    async notifyNewUserRegistration(username: string, userId: string) {
        try {
            // Send admin notification
            await NotificationService.sendAdminNotification({
                title: '🎉 New User Registered',
                message: `New user "${username}" has registered and joined the system`,
                type: 'add',
                severity: 'success',
                metadata: {
                    category: 'user_registration',
                    action: 'add',
                    userId,
                    username,
                    registrationTime: new Date().toISOString()
                }
            });

            // Send push notification
            await PushNotificationService.notifyUserAction(
                'add',
                'User Registration',
                username,
                'New user joined the system'
            );

            console.log('✅ New user registration notifications sent');
        } catch (error) {
            console.error('❌ Error sending new user registration notifications:', error);
        }
    }

    // Notify admin when user is deleted/removed
    async notifyUserDeletion(username: string, userId: string, reason?: string) {
        try {
            // Send admin notification
            await NotificationService.sendAdminNotification({
                title: '🗑️ User Account Deleted',
                message: `User "${username}" has been removed from the system${reason ? `. Reason: ${reason}` : ''}`,
                type: 'delete',
                severity: 'warning',
                metadata: {
                    category: 'user_deletion',
                    action: 'delete',
                    userId,
                    username,
                    reason,
                    deletionTime: new Date().toISOString()
                }
            });

            // Send push notification
            await PushNotificationService.notifyUserAction(
                'delete',
                'User Account',
                username,
                reason ? `Reason: ${reason}` : 'Account removed'
            );

            console.log('✅ User deletion notifications sent');
        } catch (error) {
            console.error('❌ Error sending user deletion notifications:', error);
        }
    }
}

export default new UserManagementService();