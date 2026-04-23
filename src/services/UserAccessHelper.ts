// UserAccessHelper.ts - Helper service for managing user screen access
import { supabase } from '../supabase';
import { getProfile } from '../data/Storage';

export interface ScreenAccess {
  // Financial Entry Screens
  AddMajuriScreen: boolean;
  AgencyEntryScreen: boolean;
  AddGeneralEntryScreen: boolean;
  UppadJamaScreen: boolean;
  MumbaiDeliveryEntryScreen: boolean;
  BackdatedEntryScreen: boolean;
  DailyEntriesScreen: boolean; // Added missing screen
  AgencyPaymentsScreen: boolean;
  AddAgencyScreen: boolean;
  
  // Driver & Vehicle Management
  DriverDetailsScreen: boolean;
  DriverStatementScreen: boolean;
  AddTruckFuelScreen: boolean;
  
  // Reports & Statements
  DailyReportScreen: boolean;
  StatementScreen: boolean;
  MonthlyStatementScreen: boolean;
  TotalPaidScreen: boolean;
  EWayBillConsolidatedScreen: boolean;
  PaidSectionScreen: boolean;
  
  // Cash Management
  CashVerificationScreen: boolean;
  CashHistoryScreen: boolean;
  LeaveCashSetupScreen: boolean;
  ManageCashScreen: boolean;
  
  // Administration
  AdminPanelScreen: boolean;
  AdminUserManagementScreen: boolean;
  AdminNotificationScreen: boolean;
  AdminPasswordChangeScreen: boolean;
  UserAccessManagementScreen: boolean;
  HistoryScreen: boolean;
  
  // Special Dashboards
  MajurDashboardScreen: boolean;
  
  // System & Testing
  BiometricAuthScreen: boolean;
  NotificationTestScreen: boolean;
  PushDiagnosticsScreen: boolean;
}

class UserAccessHelper {
  private static readonly MAIN_ADMIN_EMAIL = 'yashbhavsar175@gmail.com';

  /**
   * Check if user has access to a specific screen
   */
  static async checkScreenAccess(screenName: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔐 UserAccessHelper: No authenticated user');
        return false;
      }

      // Special admin emails have access to all screens
      if (user.email === this.MAIN_ADMIN_EMAIL) {
        console.log('🔐 UserAccessHelper: Admin access granted', user.email);
        return true;
      }

      // Get user profile
      const profile = await getProfile(user.id);
      if (!profile) {
        console.log('🔐 UserAccessHelper: No profile found for user', user.id);
        return false;
      }

      // Admin users have access to all screens
      if (profile.is_admin === true) {
        console.log('🔐 UserAccessHelper: Admin access granted', user.email);
        return true;
      }

      // Check specific screen access
      const screenAccess = profile.screen_access || [];
      const hasAccess = screenAccess.includes(screenName);
      
      console.log('🔐 UserAccessHelper: Screen access check', {
        userId: user.id,
        userEmail: user.email,
        screenName,
        screenAccess,
        hasAccess
      });

      return hasAccess;
    } catch (error) {
      console.error('🔐 UserAccessHelper: Error checking screen access:', error);
      return false;
    }
  }

  /**
   * Get all screen access permissions for a user
   */
  static async getUserScreenAccess(): Promise<ScreenAccess> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return this.getEmptyScreenAccess();
      }

      // Special admin emails have access to all screens
      if (user.email === this.MAIN_ADMIN_EMAIL) {
        return this.getFullScreenAccess();
      }

      // Get user profile
      const profile = await getProfile(user.id);
      if (!profile) {
        return this.getEmptyScreenAccess();
      }

      // Admin users have access to all screens
      if (profile.is_admin === true) {
        return this.getFullScreenAccess();
      }

      // Check individual permissions
      const screenAccess = profile.screen_access || [];
      return this.buildScreenAccessFromArray(screenAccess);
    } catch (error) {
      console.error('🔐 UserAccessHelper: Error getting user screen access:', error);
      return this.getEmptyScreenAccess();
    }
  }

  private static getEmptyScreenAccess(): ScreenAccess {
    return {
      // Financial Entry Screens
      AddMajuriScreen: false,
      AgencyEntryScreen: false,
      AddGeneralEntryScreen: false,
      UppadJamaScreen: false,
      MumbaiDeliveryEntryScreen: false,
      BackdatedEntryScreen: false,
      DailyEntriesScreen: false, // Added missing screen
      AgencyPaymentsScreen: false,
      AddAgencyScreen: false,
      
      // Driver & Vehicle Management
      DriverDetailsScreen: false,
      DriverStatementScreen: false,
      AddTruckFuelScreen: false,
      
      // Reports & Statements
      DailyReportScreen: false,
      StatementScreen: false,
      MonthlyStatementScreen: false,
      TotalPaidScreen: false,
      EWayBillConsolidatedScreen: false,
      PaidSectionScreen: false,
      
      // Cash Management
      CashVerificationScreen: false,
      CashHistoryScreen: false,
      LeaveCashSetupScreen: false,
      ManageCashScreen: false,
      
      // Administration
      AdminPanelScreen: false,
      AdminUserManagementScreen: false,
      AdminNotificationScreen: false,
      AdminPasswordChangeScreen: false,
      UserAccessManagementScreen: false,
      HistoryScreen: false,
      
      // Special Dashboards
      MajurDashboardScreen: false,
      
      // System & Testing
      BiometricAuthScreen: false,
      NotificationTestScreen: false,
      PushDiagnosticsScreen: false,
    };
  }

  private static getFullScreenAccess(): ScreenAccess {
    return {
      // Financial Entry Screens
      AddMajuriScreen: true,
      AgencyEntryScreen: true,
      AddGeneralEntryScreen: true,
      UppadJamaScreen: true,
      MumbaiDeliveryEntryScreen: true,
      BackdatedEntryScreen: true,
      DailyEntriesScreen: true, // Added missing screen
      AgencyPaymentsScreen: true,
      AddAgencyScreen: true,
      
      // Driver & Vehicle Management
      DriverDetailsScreen: true,
      DriverStatementScreen: true,
      AddTruckFuelScreen: true,
      
      // Reports & Statements
      DailyReportScreen: true,
      StatementScreen: true,
      MonthlyStatementScreen: true,
      TotalPaidScreen: true,
      EWayBillConsolidatedScreen: true,
      PaidSectionScreen: true,
      
      // Cash Management
      CashVerificationScreen: true,
      CashHistoryScreen: true,
      LeaveCashSetupScreen: true,
      ManageCashScreen: true,
      
      // Administration
      AdminPanelScreen: true,
      AdminUserManagementScreen: true,
      AdminNotificationScreen: true,
      AdminPasswordChangeScreen: true,
      UserAccessManagementScreen: true,
      HistoryScreen: true,
      
      // Special Dashboards
      MajurDashboardScreen: true,
      
      // System & Testing
      BiometricAuthScreen: true,
      NotificationTestScreen: true,
      PushDiagnosticsScreen: true,
    };
  }

  private static buildScreenAccessFromArray(screenAccess: string[]): ScreenAccess {
    const base = this.getEmptyScreenAccess();
    
    // Set access based on array
    screenAccess.forEach(screenName => {
      if (screenName in base) {
        (base as any)[screenName] = true;
      }
    });
    
    return base;
  }

  /**
   * Check if user is admin (any type of admin)
   */
  static async isUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      // Check special admin emails
      if (user.email === this.MAIN_ADMIN_EMAIL) {
        return true;
      }

      // Check profile admin flag
      const profile = await getProfile(user.id);
      return profile?.is_admin === true;
    } catch (error) {
      console.error('🔐 UserAccessHelper: Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Refresh user access data (for use in components)
   */
  static async refreshUserAccess(): Promise<{
    isAdmin: boolean;
    screenAccess: ScreenAccess;
    userEmail?: string;
    assignedOfficeId?: string;
    assignedOfficeName?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const isAdmin = await this.isUserAdmin();
      const screenAccess = await this.getUserScreenAccess();

      // Get office assignment from user profile
      let assignedOfficeId: string | undefined;
      let assignedOfficeName: string | undefined;

      if (user) {
        const profile = await getProfile(user.id);
        if (profile) {
          assignedOfficeId = profile.office_id;
          assignedOfficeName = profile.office_name;
        }
      }

      return {
        isAdmin,
        screenAccess,
        userEmail: user?.email,
        assignedOfficeId,
        assignedOfficeName
      };
    } catch (error) {
      console.error('🔐 UserAccessHelper: Error refreshing user access:', error);
      return {
        isAdmin: false,
        screenAccess: this.getEmptyScreenAccess()
      };
    }
  }
}

export default UserAccessHelper;