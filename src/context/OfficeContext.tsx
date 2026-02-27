// OfficeContext.tsx - React Context for managing office selection and data segregation
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Office, getOffices, getUserOfficeAssignment } from '../data/Storage';
import { supabase } from '../supabase';

const OFFICE_STORAGE_KEY = '@selected_office_id';
const OFFICE_CACHE_KEY = '@office_list_cache';
const OFFICE_CACHE_TIMESTAMP_KEY = '@office_cache_timestamp';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache duration

interface OfficeContextType {
  currentOffice: Office | null;
  availableOffices: Office[];
  isLoading: boolean;
  canSwitchOffice: boolean; // true for admin, false for regular users
  switchOffice: (officeId: string) => Promise<void>;
  refreshOffices: () => Promise<void>;
  getCurrentOfficeId: () => string | null;
  error: string | null;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

interface OfficeProviderProps {
  children: ReactNode;
}

export const OfficeProvider: React.FC<OfficeProviderProps> = ({ children }) => {
  const [currentOffice, setCurrentOffice] = useState<Office | null>(null);
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canSwitchOffice, setCanSwitchOffice] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance monitoring
  const performanceMetrics = useRef<{
    initTime: number;
    switchTime: number;
    cacheHits: number;
    cacheMisses: number;
  }>({
    initTime: 0,
    switchTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  /**
   * Load offices from cache or fetch from database
   * Implements caching strategy to reduce database queries
   */
  const loadOfficesWithCache = useCallback(async (): Promise<Office[]> => {
    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(OFFICE_CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(OFFICE_CACHE_TIMESTAMP_KEY);
      
      const now = Date.now();
      const cacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp, 10) : Infinity;
      
      // Use cache if valid and not expired
      if (cachedData && cacheAge < CACHE_DURATION_MS) {
        performanceMetrics.current.cacheHits++;
        return JSON.parse(cachedData);
      }
      
      // Cache miss or expired - fetch from database
      performanceMetrics.current.cacheMisses++;
      
      const offices = await getOffices();
      
      // Update cache
      await AsyncStorage.setItem(OFFICE_CACHE_KEY, JSON.stringify(offices));
      await AsyncStorage.setItem(OFFICE_CACHE_TIMESTAMP_KEY, now.toString());
      
      return offices;
    } catch (error) {
      console.error('❌ OfficeContext: Error loading offices with cache:', error);
      // Fallback to direct fetch
      return await getOffices();
    }
  }, []);

  /**
   * Invalidate office cache
   * Call this when offices are created, updated, or deleted
   */
  const invalidateOfficeCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(OFFICE_CACHE_KEY);
      await AsyncStorage.removeItem(OFFICE_CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('❌ OfficeContext: Error invalidating cache:', error);
    }
  }, []);

  /**
   * Initialize office context on app start
   * Loads user's assigned office and determines if they can switch offices
   */
  const initializeOfficeContext = async () => {
    const startTime = performance.now();
    
    try {

      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
  
        setIsLoading(false);
        return;
      }

      // Load available offices with caching
      const offices = await loadOfficesWithCache();
      setAvailableOffices(offices);


      if (offices.length === 0) {
        setError('No offices available. Please contact administrator.');
        setIsLoading(false);
        return;
      }

      // Get user's assigned office
      const assignedOfficeId = await getUserOfficeAssignment(user.id);


      // Check if user is admin (admins can switch offices)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.is_admin === true;
      setCanSwitchOffice(isAdmin);

      // Determine which office to set as current
      let officeToSet: Office | null = null;

      if (isAdmin) {
        // For admin, try to load last selected office from AsyncStorage
        const savedOfficeId = await AsyncStorage.getItem(OFFICE_STORAGE_KEY);

        if (savedOfficeId) {
          officeToSet = offices.find(o => o.id === savedOfficeId) || null;
        }

        // If no saved office or saved office not found, use first available office
        if (!officeToSet && offices.length > 0) {
          officeToSet = offices[0];
        }
      } else {
        // For regular users, use their assigned office
        if (assignedOfficeId) {
          officeToSet = offices.find(o => o.id === assignedOfficeId) || null;
          
          if (!officeToSet) {
            setError('Your assigned office could not be found. Please contact administrator.');
          }
        } else {
          setError('You have not been assigned to an office. Please contact administrator.');
        }
      }

      if (officeToSet) {
        setCurrentOffice(officeToSet);
        // Save to AsyncStorage for persistence
        await AsyncStorage.setItem(OFFICE_STORAGE_KEY, officeToSet.id);
      }

    } catch (err) {
      console.error('🔴 OfficeContext: Error during initialization:', err);
      setError('Failed to initialize office context. Please try again.');
    } finally {
      setIsLoading(false);
      const endTime = performance.now();
      performanceMetrics.current.initTime = endTime - startTime;
    }
  };

  /**
   * Switch to a different office (admin only)
   * @param officeId - The ID of the office to switch to
   */
  const switchOffice = async (officeId: string) => {
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setError(null);

      if (!canSwitchOffice) {
        setError('You do not have permission to switch offices.');
        setIsLoading(false);
        return;
      }

      // Find the office in available offices
      const office = availableOffices.find(o => o.id === officeId);
      
      if (!office) {
        setError('Selected office not found.');
        setIsLoading(false);
        return;
      }

      // Update current office
      setCurrentOffice(office);

      // Persist selection to AsyncStorage
      await AsyncStorage.setItem(OFFICE_STORAGE_KEY, officeId);
      
      const endTime = performance.now();
      performanceMetrics.current.switchTime = endTime - startTime;
      
      // Note: Data reload will be handled by screens listening to currentOffice changes
      // via useEffect hooks that depend on currentOffice
      
    } catch (err) {
      console.error('🔴 OfficeContext: Error switching office:', err);
      setError('Failed to switch office. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh the list of available offices from the database
   */
  const refreshOffices = async () => {
    try {
      setError(null);

      // Invalidate cache to force fresh fetch
      await invalidateOfficeCache();

      const offices = await loadOfficesWithCache();
      setAvailableOffices(offices);

      // If current office is no longer in the list, reset to first available
      if (currentOffice && !offices.find(o => o.id === currentOffice.id)) {
        if (offices.length > 0) {
          const newOffice = offices[0];
          setCurrentOffice(newOffice);
          await AsyncStorage.setItem(OFFICE_STORAGE_KEY, newOffice.id);
        } else {
          setCurrentOffice(null);
          await AsyncStorage.removeItem(OFFICE_STORAGE_KEY);
        }
      }

    } catch (err) {
      console.error('🔴 OfficeContext: Error refreshing offices:', err);
      setError('Failed to refresh office list. Please try again.');
    }
  };

  /**
   * Get the current office ID
   * @returns The current office ID or null if no office is selected
   */
  const getCurrentOfficeId = (): string | null => {
    return currentOffice?.id || null;
  };

  /**
   * Get performance metrics for monitoring
   * @returns Performance metrics object
   */
  const getPerformanceMetrics = () => {
    return {
      ...performanceMetrics.current,
      cacheHitRate: performanceMetrics.current.cacheHits + performanceMetrics.current.cacheMisses > 0
        ? (performanceMetrics.current.cacheHits / (performanceMetrics.current.cacheHits + performanceMetrics.current.cacheMisses) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  };

  // Initialize on mount
  useEffect(() => {
    initializeOfficeContext();
  }, []);

  // Performance metrics disabled
  useEffect(() => {
    // Disabled to reduce console spam
  }, []);

  const contextValue: OfficeContextType = {
    currentOffice,
    availableOffices,
    isLoading,
    canSwitchOffice,
    switchOffice,
    refreshOffices,
    getCurrentOfficeId,
    error,
  };

  return (
    <OfficeContext.Provider value={contextValue}>
      {children}
    </OfficeContext.Provider>
  );
};

/**
 * Hook to access OfficeContext
 * Must be used within an OfficeProvider
 */
export const useOffice = (): OfficeContextType => {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  return context;
};

export default OfficeContext;
