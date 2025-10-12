import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export interface UserPassword {
  userId: string;
  hashedPassword: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PasswordResetRequest {
  userId: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

class UserPasswordService {
  private static instance: UserPasswordService;
  private readonly STORAGE_KEY = 'user_notification_passwords';
  private readonly RESET_REQUESTS_KEY = 'password_reset_requests';

  static getInstance(): UserPasswordService {
    if (!UserPasswordService.instance) {
      UserPasswordService.instance = new UserPasswordService();
    }
    return UserPasswordService.instance;
  }

  // Simple hash function for demo - use bcrypt in production
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Generate random salt
  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Hash password with salt
  private hashPasswordWithSalt(password: string, salt: string): string {
    return this.hashPassword(password + salt);
  }

  // Check if user has set notification password
  async hasNotificationPassword(userId: string): Promise<boolean> {
    try {
      const passwords = await this.getAllPasswords();
      return passwords.some(p => p.userId === userId && p.isActive);
    } catch (error) {
      console.error('❌ Error checking password existence:', error);
      return false;
    }
  }

  // Set notification password for user (Supabase integration)
  async setNotificationPassword(userId: string, password: string): Promise<boolean> {
    try {
      const salt = this.generateSalt();
      const hashedPassword = this.hashPasswordWithSalt(password, salt);
      
      // Insert or update password in Supabase
      const { data, error } = await supabase
        .from('user_passwords')
        .upsert({
          user_id: userId,
          password_hash: hashedPassword,
          salt: salt,
          is_first_time: false,
          failed_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error setting password in database:', error);
        return false;
      }
      
      console.log(`✅ Password set for user ${userId} in database`);
      return true;
    } catch (error) {
      console.error('❌ Error setting password:', error);
      return false;
    }
  }

  // Verify notification password
  async verifyNotificationPassword(userId: string, password: string): Promise<boolean> {
    try {
      const passwords = await this.getAllPasswords();
      const userPassword = passwords.find(p => p.userId === userId && p.isActive);
      
      if (!userPassword) {
        console.log(`❌ No password found for user ${userId}`);
        return false;
      }
      
      const hashedInput = this.hashPassword(password);
      const isValid = hashedInput === userPassword.hashedPassword;
      
      console.log(`${isValid ? '✅' : '❌'} Password verification for user ${userId}: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      return false;
    }
  }

  // Admin: Reset user password
  async adminResetPassword(adminId: string, userId: string): Promise<boolean> {
    try {
      const passwords = await this.getAllPasswords();
      const filteredPasswords = passwords.filter(p => p.userId !== userId);
      await this.savePasswords(filteredPasswords);
      
      console.log(`✅ Admin ${adminId} reset password for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      return false;
    }
  }

  // Request password reset
  async requestPasswordReset(userId: string, requestedBy: string): Promise<boolean> {
    try {
      const requests = await this.getResetRequests();
      
      // Check if there's already a pending request
      const existingRequest = requests.find(r => 
        r.userId === userId && r.status === 'pending'
      );
      
      if (existingRequest) {
        console.log(`❌ Reset request already exists for user ${userId}`);
        return false;
      }
      
      const newRequest: PasswordResetRequest = {
        userId,
        requestedBy,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
      
      requests.push(newRequest);
      await this.saveResetRequests(requests);
      
      console.log(`✅ Password reset requested for user ${userId} by ${requestedBy}`);
      return true;
    } catch (error) {
      console.error('❌ Error requesting password reset:', error);
      return false;
    }
  }

  // Admin: Get all password reset requests
  async getPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    try {
      return await this.getResetRequests();
    } catch (error) {
      console.error('❌ Error getting reset requests:', error);
      return [];
    }
  }

  // Admin: Approve/Reject password reset request
  async processResetRequest(
    requestId: string, 
    adminId: string, 
    action: 'approve' | 'reject'
  ): Promise<boolean> {
    try {
      const requests = await this.getResetRequests();
      const requestIndex = requests.findIndex(r => 
        r.userId === requestId && r.status === 'pending'
      );
      
      if (requestIndex === -1) {
        console.log(`❌ Reset request not found: ${requestId}`);
        return false;
      }
      
      requests[requestIndex].status = action === 'approve' ? 'approved' : 'rejected';
      await this.saveResetRequests(requests);
      
      if (action === 'approve') {
        // Actually reset the password
        await this.adminResetPassword(adminId, requestId);
      }
      
      console.log(`✅ Admin ${adminId} ${action}d reset request for user ${requestId}`);
      return true;
    } catch (error) {
      console.error('❌ Error processing reset request:', error);
      return false;
    }
  }

  // Get all users with notification passwords
  async getUsersWithPasswords(): Promise<{ userId: string; createdAt: string }[]> {
    try {
      const passwords = await this.getAllPasswords();
      return passwords
        .filter(p => p.isActive)
        .map(p => ({
          userId: p.userId,
          createdAt: p.createdAt,
        }));
    } catch (error) {
      console.error('❌ Error getting users with passwords:', error);
      return [];
    }
  }

  // Admin: Force password update for user
  async forcePasswordUpdate(adminId: string, userId: string, newPassword: string): Promise<boolean> {
    try {
      const success = await this.setNotificationPassword(userId, newPassword);
      if (success) {
        console.log(`✅ Admin ${adminId} force updated password for user ${userId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error force updating password:', error);
      return false;
    }
  }

  // Private helper methods
  private async getAllPasswords(): Promise<UserPassword[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading passwords from storage:', error);
      return [];
    }
  }

  private async savePasswords(passwords: UserPassword[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(passwords));
    } catch (error) {
      console.error('❌ Error saving passwords to storage:', error);
      throw error;
    }
  }

  private async getResetRequests(): Promise<PasswordResetRequest[]> {
    try {
      const data = await AsyncStorage.getItem(this.RESET_REQUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading reset requests from storage:', error);
      return [];
    }
  }

  private async saveResetRequests(requests: PasswordResetRequest[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.RESET_REQUESTS_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error('❌ Error saving reset requests to storage:', error);
      throw error;
    }
  }

  // Debug: Clear all passwords (development only)
  async clearAllPasswords(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.RESET_REQUESTS_KEY);
      console.log('✅ All passwords and reset requests cleared');
    } catch (error) {
      console.error('❌ Error clearing passwords:', error);
    }
  }
}

export default UserPasswordService.getInstance();