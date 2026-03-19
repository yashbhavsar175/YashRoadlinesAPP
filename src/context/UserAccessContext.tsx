// UserAccessContext.tsx - React Context for managing user screen access permissions in real-time
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import UserAccessHelper, { ScreenAccess } from '../services/UserAccessHelper';

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
  const [isLoading, setIsLoading] = useState<boolean>(false); // Start with false to avoid blocking
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [assignedOfficeId, setAssignedOfficeId] = useState<string | null>(null);
  const [assignedOfficeName, setAssignedOfficeName] = useState<string | null>(null);
  const [canAccessMultipleOffices, setCanAccessMultipleOffices] = useState<boolean>(false);

  const refreshPermissions = async () => {
    try {
      setIsLoading(true);
      const accessData = await UserAccessHelper.refreshUserAccess();
      
      setIsAdmin(accessData.isAdmin);
      setScreenAccess(accessData.screenAccess);
      setUserEmail(accessData.userEmail);
      setAssignedOfficeId(accessData.assignedOfficeId || null);
      setAssignedOfficeName(accessData.assignedOfficeName || null);
      
      // Determine if user can access multiple offices (admin only)
      const canSwitch = accessData.isAdmin === true;
      setCanAccessMultipleOffices(canSwitch);
      
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

  // Initial load — delayed to avoid racing react-native-config bridge init
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPermissions();
    }, 500);
    return () => clearTimeout(timer);
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