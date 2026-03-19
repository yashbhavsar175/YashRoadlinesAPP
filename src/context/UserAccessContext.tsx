// UserAccessContext.tsx - React Context for managing user screen access permissions in real-time
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import UserAccessHelper, { ScreenAccess } from '../services/UserAccessHelper';
import { supabase } from '../supabase';

interface UserAccessContextType {
  isAdmin: boolean;
  screenAccess: ScreenAccess;
  userEmail?: string;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
  hasScreenAccess: (screenName: string) => boolean;
  lastUpdated: number; // Timestamp to track when permissions were last updated
  assignedOfficeId: string | null;
  assignedOfficeName: string | null;
  canAccessMultipleOffices: boolean;
}

const UserAccessContext = createContext<UserAccessContextType | undefined>(undefined);

interface UserAccessProviderProps {
  children: ReactNode;
}

export const UserAccessProvider: React.FC<UserAccessProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [screenAccess, setScreenAccess] = useState<ScreenAccess>({} as ScreenAccess);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  // FIX: Start as true so HomeScreen waits for real data before rendering role/offices
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [assignedOfficeId, setAssignedOfficeId] = useState<string | null>(null);
  const [assignedOfficeName, setAssignedOfficeName] = useState<string | null>(null);
  const [canAccessMultipleOffices, setCanAccessMultipleOffices] = useState<boolean>(false);

  const refreshPermissions = async () => {
    try {
      setIsLoading(true);
      // Wait for a valid Supabase session before fetching profile
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[PROFILE] Fetching profile for user:', user?.id ?? 'none');
      const accessData = await UserAccessHelper.refreshUserAccess();
      
      setIsAdmin(accessData.isAdmin);
      setScreenAccess(accessData.screenAccess);
      setUserEmail(accessData.userEmail);
      setAssignedOfficeId(accessData.assignedOfficeId || null);
      setAssignedOfficeName(accessData.assignedOfficeName || null);
      
      // Determine if user can access multiple offices (admin only)
      const canSwitch = accessData.isAdmin === true;
      setCanAccessMultipleOffices(canSwitch);
      
      console.log('[PROFILE] Profile loaded: role=' + (accessData.isAdmin ? 'Admin' : 'User') + ', office=' + (accessData.assignedOfficeName ?? 'none'));
      setLastUpdated(Date.now()); // Update timestamp when permissions change
      

    } catch (error) {
      console.error('🔴 UserAccessContext: Error refreshing permissions:', error);
      // Reset to safe defaults on error
      setIsAdmin(false);
      setScreenAccess({} as ScreenAccess);
      setUserEmail(undefined);
      setAssignedOfficeId(null);
      setAssignedOfficeName(null);
      setCanAccessMultipleOffices(false);
    } finally {
      setIsLoading(false);
    }
  };

  const hasScreenAccess = (screenName: string): boolean => {
    return isAdmin || (screenAccess[screenName as keyof ScreenAccess] === true);
  };

  // Listen for auth state changes — fetch permissions on login, reset on logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[PROFILE] Auth state changed:', event, 'userId:', session?.user?.id ?? 'none');
      if (session?.user?.id) {
        await refreshPermissions();
      } else {
        // User logged out — reset to safe defaults
        setIsAdmin(false);
        setScreenAccess({} as ScreenAccess);
        setUserEmail(undefined);
        setAssignedOfficeId(null);
        setAssignedOfficeName(null);
        setCanAccessMultipleOffices(false);
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const contextValue: UserAccessContextType = {
    isAdmin,
    screenAccess,
    userEmail,
    isLoading,
    refreshPermissions,
    hasScreenAccess,
    lastUpdated,
    assignedOfficeId,
    assignedOfficeName,
    canAccessMultipleOffices,
  };

  return (
    <UserAccessContext.Provider value={contextValue}>
      {children}
    </UserAccessContext.Provider>
  );
};

export const useUserAccess = (): UserAccessContextType => {
  const context = useContext(UserAccessContext);
  if (context === undefined) {
    throw new Error('useUserAccess must be used within a UserAccessProvider');
  }
  return context;
};

export default UserAccessContext;