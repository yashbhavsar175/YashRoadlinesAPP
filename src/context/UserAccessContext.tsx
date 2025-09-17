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

  const refreshPermissions = async () => {
    try {
      console.log('🔄 UserAccessContext: Starting permission refresh...');
      setIsLoading(true);
      const accessData = await UserAccessHelper.refreshUserAccess();
      
      setIsAdmin(accessData.isAdmin);
      setScreenAccess(accessData.screenAccess);
      setUserEmail(accessData.userEmail);
      setLastUpdated(Date.now()); // Update timestamp when permissions change
      
      console.log('✅ UserAccessContext: Permissions refreshed', {
        isAdmin: accessData.isAdmin,
        userEmail: accessData.userEmail,
        screenCount: Object.keys(accessData.screenAccess).length
      });
    } catch (error) {
      console.error('🔴 UserAccessContext: Error refreshing permissions:', error);
      // Reset to safe defaults on error
      setIsAdmin(false);
      setScreenAccess({} as ScreenAccess);
      setUserEmail(undefined);
    } finally {
      setIsLoading(false);
      console.log('🏁 UserAccessContext: Permission refresh completed');
    }
  };

  const hasScreenAccess = (screenName: string): boolean => {
    return isAdmin || (screenAccess[screenName as keyof ScreenAccess] === true);
  };

  // Initial load
  useEffect(() => {
    refreshPermissions();
  }, []);

  const contextValue: UserAccessContextType = {
    isAdmin,
    screenAccess,
    userEmail,
    isLoading,
    refreshPermissions,
    hasScreenAccess,
    lastUpdated,
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