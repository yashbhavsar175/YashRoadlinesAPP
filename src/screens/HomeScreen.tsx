// HomeScreen.tsx - Complete with Black & White Theme + Majur Dashboard
import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Modal, 
  Dimensions, 
  TouchableOpacity, 
  Text, 
  Platform, 
  StatusBar, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserAccess } from '../context/UserAccessContext';
import { useOffice } from '../context/OfficeContext';
import OfficeSelector from '../components/OfficeSelector';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabase';
import { GlobalStyles } from '../theme/styles';
import { getProfile, updateProfile, getAgencyMajuri, AgencyMajuri, getUppadJamaEntries, UppadJamaEntry, getAllTransactionsForDate, syncAllDataFixed } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { NotificationBell } from '../components/NotificationBell';

// Black & White Theme Colors
const BWColors = {
  primary: '#000000',
  secondary: '#1a1a1a',
  surface: '#ffffff',
  surfaceVariant: '#f8f9fa',
  surfaceDark: '#f5f5f5',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  accent: '#333333',
  success: '#000000',
  warning: '#666666',
  error: '#000000',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  syncStatus: {
    lastSync: string | null;
    pendingOperations: number;
    isOnline: boolean;
  };
  onSyncStatusPress: () => void;
}

const ADMIN_EMAIL = 'yashbhavsar175@gmail.com';

function HomeScreen({ navigation, syncStatus, onSyncStatusPress }: HomeScreenProps): React.JSX.Element {
  const { navigate, replace } = navigation;
  const { isAdmin: contextIsAdmin, screenAccess, hasScreenAccess: contextHasScreenAccess, refreshPermissions, isLoading: contextLoading, lastUpdated } = useUserAccess();
  const { currentOffice, getCurrentOfficeId, isLoading: officeLoading, availableOffices, switchOffice } = useOffice();
  const [userInitial, setUserInitial] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('User');
  const [userType, setUserType] = useState<'normal' | 'majur'>('normal');
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState<boolean>(false);
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(false);
  const [profileNameInput, setProfileNameInput] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Reset initialization flag when component mounts
  useEffect(() => {
    hasInitializedRef.current = false;
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Majur Dashboard states
  const [majuriData, setMajuriData] = useState<{displayDate: string; isToday: boolean; isYesterday: boolean; id: string; majuri_date: string; amount: number; agency_name: string; description?: string}[]>([]);
  const [combinedData, setCombinedData] = useState<{displayDate: string; isToday: boolean; isYesterday: boolean; id: string; date: string; amount: number; name: string; description?: string; type: 'majuri' | 'uppad_jama'; entry_type?: string}[]>([]);
  const [datewiseSummary, setDatewiseSummary] = useState<{date: string; displayDate: string; totalAmount: number; isToday: boolean; isYesterday: boolean}[]>([]);
  const [majurLoading, setMajurLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState<Date>(today); // Default to today
  const [viewMode, setViewMode] = useState<'all' | 'date'>('date'); // Default to date view
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const updateFilteredData = useCallback((data: any[], date: Date) => {
    // Normalize the comparison dates to ignore time
    const normalizedSelectedDate = new Date(date);
    normalizedSelectedDate.setHours(0, 0, 0, 0);
    
    const selectedDateEntries = data.filter(item => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === normalizedSelectedDate.getTime();
    });
    
    const total = selectedDateEntries.reduce((sum, item) => {
      if (item.type === 'majuri') return sum + item.amount;
      else if (item.type === 'uppad_jama') return item.entry_type === 'credit' ? sum + item.amount : sum - item.amount;
      return sum;
    }, 0);
    
    setDailyTotal(total);
    setFilteredData(selectedDateEntries);
  }, [setDailyTotal, setFilteredData]);

  // Update filtered data when combinedData or selectedDate changes
  useEffect(() => {
    if (combinedData.length > 0) {
      updateFilteredData(combinedData, selectedDate);
    }
  }, [combinedData, selectedDate, updateFilteredData]);
  
  // Force refresh when loading completes
  useEffect(() => {
    if (combinedData.length > 0 && !majurLoading) {
      updateFilteredData(combinedData, selectedDate);
    }
  }, [combinedData, selectedDate, majurLoading, updateFilteredData]);

  // Helper function to check if user has access to specific screen
  const hasScreenAccess = useCallback((screenName: string): boolean => {
    return contextIsAdmin || contextHasScreenAccess(screenName);
  }, [contextIsAdmin, contextHasScreenAccess]);

  const fetchUserProfile = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsProfileLoading(true);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setUserInitial('?');
        setUserRole('Guest');
        setIsProfileLoading(false);
        return;
      }
      
      let profile = await getProfile(user.id);
      
      if (!profile) {
        await new Promise(resolve => setTimeout(resolve, 500));
        profile = await getProfile(user.id);
      }
      
      if (profile?.full_name && profile.full_name.trim()) {
        if (isMountedRef.current) {
          setUserName(profile.full_name);
          setUserInitial(profile.full_name.charAt(0).toUpperCase());
          setUserType(profile.user_type || 'normal');
          setShowNamePrompt(false);
          hasInitializedRef.current = true;
        }
      } else {
        if (isMountedRef.current) {
          setShowNamePrompt(true);
        }
        setUserInitial(user.email?.charAt(0).toUpperCase() || '?');
        setUserType(profile?.user_type || 'normal');
      }

      // Use context admin status instead of local state
      setUserRole(contextIsAdmin ? 'Admin' : 'User');
    } catch (e) {
      console.error("Error fetching user profile:", e);
      setUserInitial('?');
      setUserRole('Guest');
    } finally {
      if (isMountedRef.current) {
        setIsProfileLoading(false);
      }
    }
  }, [contextIsAdmin]);

  // Majur Dashboard functions
  const getDayName = (date: Date) => {
    const days = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    return days[date.getDay()];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'आज';
    if (isYesterday) return 'कल';
    
    const dayName = getDayName(date);
    const dateStr = date.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
    });
    
    return `${dayName}, ${dateStr}`;
  };

  const loadMajurData = useCallback(async () => {
    try {
      setMajurLoading(true);
      // Clear previous data to force refresh
      setFilteredData([]);
      
      // Get current office ID for filtering
      const officeId = getCurrentOfficeId();
      
      // Sync data first
      await syncAllDataFixed();
      
      // Load both majuri and uppad/jama entries with office filter
      const allMajuri: AgencyMajuri[] = await getAgencyMajuri(officeId || undefined);
      const allUppadJama: UppadJamaEntry[] = await getUppadJamaEntries(officeId || undefined);
      
      // Get current date and set time to start of day
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      // Filter majuri entries from the last 7 days
      const recentMajuri = allMajuri.filter(item => {
        const itemDate = new Date(item.majuri_date);
        return itemDate >= sevenDaysAgo;
      });
      
      // Filter uppad/jama entries from the last 7 days
      const recentUppadJama = allUppadJama.filter(item => {
        const itemDate = new Date(item.entry_date);
        return itemDate >= sevenDaysAgo;
      });
      
      // Convert majuri entries to combined format
      const majuriCombined = recentMajuri.map(item => ({
        id: `majuri-${item.id}`,
        date: item.majuri_date,
        amount: item.amount,
        name: item.agency_name,
        description: item.description,
        type: 'majuri' as const,
        displayDate: formatDate(item.majuri_date),
        isToday: new Date(item.majuri_date).toDateString() === new Date().toDateString(),
        isYesterday: new Date(item.majuri_date).toDateString() === new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toDateString(),
      }));
      
      // Convert uppad/jama entries to combined format, excluding Uppad (debit) entries
      // For Jama (credit) entries, we show them as negative amounts in the dashboard
      const uppadJamaCombined = recentUppadJama
        .filter(item => item.entry_type === 'credit') // Only include Jama (credit) entries
        .map(item => ({
          id: `uppad_jama-${item.id}`,
          date: item.entry_date,
          amount: -Math.abs(item.amount), // Make Jama amounts negative
          name: item.person_name,
          description: item.description,
          type: 'uppad_jama' as const,
          entry_type: item.entry_type,
          displayDate: formatDate(item.entry_date),
          isToday: new Date(item.entry_date).toDateString() === new Date().toDateString(),
          isYesterday: new Date(item.entry_date).toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString(),
        }));
      
      // Combine all entries
      const allCombined = [...majuriCombined, ...uppadJamaCombined];
      
      // Sort all positive entries first (newest first), then all negative entries (newest first)
      const sortedCombined = allCombined.sort((a, b) => {
        // First sort by sign (positive first, then negative)
        if (a.amount >= 0 && b.amount < 0) return -1; // a is positive, b is negative
        if (a.amount < 0 && b.amount >= 0) return 1;  // a is negative, b is positive
        
        // If both are same sign, sort by date (newest first)
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        
        // If same date, sort by absolute amount (largest first)
        return Math.abs(b.amount) - Math.abs(a.amount);
      });

      setCombinedData(sortedCombined);
      
      // Update filtered data with the latest combined data
      updateFilteredData(sortedCombined, selectedDate);
      
      // Keep original majuri data for backward compatibility
      const sortedMajuri = recentMajuri.sort((a, b) => 
        new Date(b.majuri_date).getTime() - new Date(a.majuri_date).getTime()
      );

      const majuriWithDisplay = sortedMajuri.map(item => {
        const date = new Date(item.majuri_date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        return {
          ...item,
          displayDate: formatDate(item.majuri_date),
          isToday: date.toDateString() === today.toDateString(),
          isYesterday: date.toDateString() === yesterday.toDateString(),
        };
      });

      setMajuriData(majuriWithDisplay);
      
      // Create an array of the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        return date;
      });
      
      // Create a map of dates to their entries for combined data
      const dateToEntries = new Map();
      sortedCombined.forEach(item => {
        const date = new Date(item.date);
        date.setHours(0, 0, 0, 0);
        const dateString = date.toDateString();
        
        if (!dateToEntries.has(dateString)) {
          dateToEntries.set(dateString, {
            entries: [],
            totalAmount: 0,
            displayDate: formatDate(dateString),
            isToday: date.toDateString() === new Date().toDateString(),
            isYesterday: date.toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
          });
        }
        
        const dayData = dateToEntries.get(dateString);
        dayData.entries.push(item);
        // Calculate amount based on type and entry_type
        if (item.type === 'majuri') {
          dayData.totalAmount += item.amount; // Majuri is positive
        } else if (item.type === 'uppad_jama') {
          // Jama (credit) is positive for majur, Uppad (debit) is negative
          dayData.totalAmount += item.entry_type === 'credit' ? item.amount : -item.amount;
        }
      });
      
      // Create summary for all 7 days, including those with zero entries
      const summary = last7Days.map(date => {
        const dateString = date.toDateString();
        const dayData = dateToEntries.get(dateString);
        
        if (dayData) {
          return {
            date: dateString,
            displayDate: dayData.displayDate,
            totalAmount: dayData.totalAmount,
            isToday: dayData.isToday,
            isYesterday: dayData.isYesterday,
            hasEntries: true
          };
        }
        
        // For days with no entries
        return {
          date: dateString,
          displayDate: formatDate(dateString),
          totalAmount: 0,
          isToday: date.toDateString() === new Date().toDateString(),
          isYesterday: date.toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString(),
          hasEntries: false
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setDatewiseSummary(summary);
      updateFilteredData(combinedData, selectedDate);
    } catch (error) {
      console.error('Error loading majuri data:', error);
    } finally {
      setMajurLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, getCurrentOfficeId, currentOffice]);


  const handleDateChange = (date: Date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    setSelectedDate(normalizedDate);
    updateFilteredData(combinedData, normalizedDate);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMajurData();
  }, [loadMajurData]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const loadData = async () => {
        try {
          // Always refresh permissions when screen comes into focus
          await refreshPermissions();
          
          // Load user profile
          await fetchUserProfile();
          
          // Run migration check for legacy delivery records (only once per session)
          if (!hasInitializedRef.current) {
            try {
              const { checkMigrationNeeded, migrateDeliveryRecords } = await import('../utils/migrateDeliveryRecords');
              const needsMigration = await checkMigrationNeeded();
              if (needsMigration) {
                const result = await migrateDeliveryRecords();
                if (!result.success) {
                  console.error('❌ Migration failed:', result.error);
                }
              }
            } catch (migrationError) {
              console.error('❌ Migration check failed:', migrationError);
            }
          }
          
          if (userType === 'majur') {
            await loadMajurData();
          }
        } catch (error) {
          console.error('❌ HomeScreen: Error loading data:', error);
        }
      };

      loadData();
      
      return () => {
        isActive = false;
        isMountedRef.current = false;
      };
    }, [userType]) // Removed other dependencies to prevent infinite loop
  );

  // Watch for permission changes and force re-render
  useEffect(() => {
    // Trigger re-render when permissions change
  }, [lastUpdated, contextIsAdmin, screenAccess]);

  // Update userRole when contextIsAdmin changes
  useEffect(() => {
    setUserRole(contextIsAdmin ? 'Admin' : 'User');
  }, [contextIsAdmin]);

  // Reload data when office changes (for majur users)
  useEffect(() => {
    if (userType === 'majur' && currentOffice) {
      loadMajurData();
    }
  }, [currentOffice, userType, loadMajurData]);

  // Real-time subscription for majur dashboard auto-refresh
  useEffect(() => {
    if (userType !== 'majur') return;

    // Set up real-time subscription for majuri data
    const majuriChannel = supabase
      .channel('agency_majuri_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agency_majuri' }, 
        (payload) => {
          loadMajurData();
        }
      )
      .subscribe();

    // Set up broadcast listener for manual refresh triggers
    const broadcastChannel = supabase
      .channel('majur-dashboard-refresh')
      .on('broadcast', 
        { event: 'refresh-dashboard' },
        (payload) => {
          // Force refresh majur dashboard
          loadMajurData().catch(error => {
            console.error('Error refreshing after broadcast:', error);
          });
        }
      )
      .subscribe();

    // Set up real-time subscription for uppad_jama_entries - only for jama (credit) entries
    const uppadJamaChannel = supabase
      .channel('uppad_jama_entries_changes')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'uppad_jama_entries',
          filter: 'entry_type=eq.credit' // Only listen to jama (credit) entries
        },
        (payload) => {
          // Force a fresh data load only for jama entries
          loadMajurData().catch(error => {
            console.error('Error refreshing after Jama entry:', error);
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to Uppad/Jama changes:', err);
          return;
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(majuriChannel);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(uppadJamaChannel);
    };
  }, [userType, loadMajurData]);

  // Remove automatic polling - only refresh on specific events

  // Updated Styles with Black & White Theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: BWColors.surfaceVariant,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      backgroundColor: BWColors.surface,
      borderWidth: 1,
      borderColor: BWColors.borderLight,
    },
    loadingContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: BWColors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 16,
    },
    appBar: {
      backgroundColor: BWColors.primary,
      padding: 20,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 16 : 50,
      paddingBottom: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    appBarTitle: {
      color: BWColors.surface,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    appBarSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '400',
    },
    adminOfficeSelector: {
      backgroundColor: BWColors.surface,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: BWColors.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    officeSelectorLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: BWColors.text,
    },
    officeSelectorDropdown: {
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: BWColors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    avatarText: {
      color: BWColors.primary,
      fontWeight: '800',
      fontSize: 16,
    },
    scrollViewContent: {
      padding: 20,
      paddingTop: 24,
    },
    dateSelectorContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 28,
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    navButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: BWColors.surfaceDark,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: BWColors.border,
    },
    dateDisplay: {
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 20,
    },
    dateText: {
      fontSize: 20,
      fontWeight: '800',
      color: BWColors.text,
      textAlign: 'center',
    },
    sectionHeader: {
      marginBottom: 20,
    },
    sectionHeaderRow: {
      marginBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: BWColors.text,
      marginBottom: 16,
    },
    dateSummaryContent: {
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    dateSummaryItem: {
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      padding: 20,
      marginRight: 16,
      minWidth: 140,
      maxWidth: 160,
      minHeight: 120,
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    selectedDateItem: {
      backgroundColor: BWColors.primary,
      borderColor: BWColors.primary,
      shadowColor: BWColors.primary,
      shadowOpacity: 0.3,
    },
    dateSummaryHeader: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryDateText: {
      fontSize: 15,
      color: BWColors.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    summaryDayText: {
      fontSize: 16,
      fontWeight: '700',
      color: BWColors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    summaryAmountText: {
      fontSize: 18,
      fontWeight: '800',
      color: BWColors.primary,
      backgroundColor: BWColors.surfaceDark,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: BWColors.borderLight,
      overflow: 'hidden',
    },
    selectedSummaryAmountText: {
      color: BWColors.surface,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    majuriList: {
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    majuriItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 24,
      minHeight: 80,
      fontWeight: '500',
    },
    majuriAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: BWColors.primary,
      textAlign: 'right',
      minWidth: 100,
    },
    majuriType: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
      textTransform: 'uppercase',
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    symbolText: {
      fontSize: 20,
      fontWeight: '900',
      marginRight: 4,
    },
    separator: {
      height: 1,
      backgroundColor: BWColors.borderLight,
      marginHorizontal: 24,
    },
    emptyContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      marginTop: 16,
    },
    emptyText: {
      color: BWColors.textTertiary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 24,
    },
    card: {
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileMenu: {
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 400,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    menuHeader: {
      padding: 24,
      backgroundColor: BWColors.primary,
      alignItems: 'center',
    },
    menuAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: BWColors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    menuAvatarText: {
      color: BWColors.primary,
      fontSize: 32,
      fontWeight: '800',
    },
    menuUserName: {
      color: BWColors.surface,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    menuUserRole: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 15,
      fontWeight: '500',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: BWColors.borderLight,
    },
    menuIcon: {
      marginRight: 16,
      width: 24,
      alignItems: 'center',
    },
    menuItemText: {
      fontSize: 17,
      color: BWColors.text,
      fontWeight: '600',
    },
    namePromptContainer: {
      backgroundColor: BWColors.surface,
      borderRadius: 20,
      padding: 28,
      width: '90%',
      maxWidth: 400,
      borderWidth: 2,
      borderColor: BWColors.borderLight,
    },
    namePromptTitle: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 8,
      color: BWColors.text,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 16,
      color: BWColors.textSecondary,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 22,
    },
    nameInput: {
      borderWidth: 2,
      borderColor: BWColors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      fontSize: 16,
      fontWeight: '500',
      backgroundColor: BWColors.surfaceVariant,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    modalButton: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginLeft: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: BWColors.surfaceDark,
      borderWidth: 2,
      borderColor: BWColors.border,
    },
    cancelButtonText: {
      color: BWColors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: BWColors.primary,
      borderWidth: 2,
      borderColor: BWColors.primary,
    },
    saveButtonText: {
      color: BWColors.surface,
      fontSize: 16,
      fontWeight: '700',
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    gridButton: {
      width: '48%',
      backgroundColor: BWColors.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    gridButtonText: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: '700',
      color: BWColors.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    syncStatusButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: BWColors.surface,
      borderRadius: 16,
      marginTop: 24,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: BWColors.borderLight,
      shadowColor: BWColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    syncStatusText: {
      marginLeft: 8,
      color: BWColors.textSecondary,
      fontSize: 15,
      fontWeight: '600',
    },
    pendingIndicator: {
      backgroundColor: BWColors.surfaceDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      marginLeft: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: BWColors.borderLight,
    },
    pendingText: {
      marginLeft: 4,
      color: BWColors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    categoryTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: BWColors.text,
      marginBottom: 8,
    },
    categoryDescription: {
      fontSize: 14,
      color: BWColors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    majuriInfo: {
      flex: 1,
      marginRight: 16,
    },
    agencyName: {
      fontSize: 16,
      fontWeight: '700',
      color: BWColors.text,
      marginBottom: 4,
    },
    majuriDescription: {
      fontSize: 14,
      color: BWColors.textSecondary,
      lineHeight: 18,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: BWColors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
  });

  // Render functions for Majur Dashboard
  const renderDateSummary = ({ item }: { item: any }) => {
    const isSelected = viewMode === 'date' && selectedDate.toDateString() === item.date;
    const date = new Date(item.date);
    const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
    
    return (
      <TouchableOpacity
        style={[
          styles.dateSummaryItem,
          isSelected && styles.selectedDateItem,
          {
            backgroundColor: isSelected ? BWColors.primary : BWColors.surface,
            borderWidth: isSelected ? 0 : 1,
            borderColor: isSelected ? 'transparent' : BWColors.borderLight,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => {
          if (isSelected) {
            setViewMode('all');
          } else {
            handleDateChange(new Date(item.date));
            setViewMode('date');
          }
        }}
      >
        <View style={styles.dateSummaryHeader}>
          <View>
            <Text style={[
              styles.summaryDateText,
              isSelected && { color: 'rgba(255, 255, 255, 0.9)' }
            ]}>
              {item.displayDate}
            </Text>
            <Text style={[
              styles.summaryDayText,
              isSelected && { color: 'white' }
            ]}>
              {dayName}
            </Text>
          </View>
          <Text style={[
            styles.summaryAmountText,
            isSelected && styles.selectedSummaryAmountText
          ]}>
            ₹{item.totalAmount.toLocaleString('hi-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleLogout = () => {
    setIsProfileMenuVisible(false);
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              hasInitializedRef.current = false;
              setUserName('');
              setUserInitial('');
              setShowNamePrompt(false);
              setProfileNameInput('');
              
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              replace('Login');
            } catch (error: any) {
              Alert.alert("Failed to logout", error.message || "An unknown error occurred.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleSaveName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && profileNameInput.trim()) {
        const success = await updateProfile(user.id, profileNameInput.trim());
        if (success) {
          setUserName(profileNameInput.trim());
          setUserInitial(profileNameInput.trim().charAt(0).toUpperCase());
          setShowNamePrompt(false);
          setProfileNameInput('');
          Alert.alert('Success', 'Name saved successfully!');
        } else {
          Alert.alert('Error', 'Failed to save name. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'An error occurred while saving your name.');
    }
  };

  if (isProfileLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={BWColors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BWColors.primary} />
      <View style={styles.appBar}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.appBarTitle} numberOfLines={1}>Yash Roadlines</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.appBarSubtitle} numberOfLines={1}>
              {userName ? `${userName} • ${userRole}` : userRole}
              {currentOffice && ` • ${currentOffice.name}`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
          {/* Notification Bell for Admin */}
          {contextIsAdmin && (
            <NotificationBell
              onPress={() => navigate('AdminNotifications')}
              size={22}
              color="#FFFFFF"
              badgeColor="#F44336"
              textColor="#FFFFFF"
            />
          )}
          <TouchableOpacity 
            onPress={userType === 'majur' ? handleLogout : () => setIsProfileMenuVisible(true)}
            activeOpacity={0.8}
            style={{ marginLeft: contextIsAdmin ? 12 : 0 }}
          >
            <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
        </TouchableOpacity>
        </View>
      </View>

      {/* Admin Office Selector - Only for Admin users */}
      {contextIsAdmin && (
        <View style={styles.adminOfficeSelector}>
          <Text style={styles.officeSelectorLabel}>Select Office:</Text>
          <View style={styles.officeSelectorDropdown}>
            <OfficeSelector
              currentOffice={currentOffice}
              availableOffices={availableOffices}
              onOfficeChange={switchOffice}
              showAllOfficesOption={true}
              disabled={false}
            />
          </View>
        </View>
      )}

      {userType === 'majur' ? (
  // MAJUR DASHBOARD - Black & White Theme
  <View style={styles.container}>
    <ScrollView
      contentContainerStyle={[styles.scrollViewContent, { padding: 20 }]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[BWColors.primary]}
          tintColor={BWColors.primary}
        />
      }
    >
      {/* Header with Full Dashboard Button */}
      <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
        <Text style={[styles.sectionTitle, { fontSize: 24, color: BWColors.primary }]}>मजूर डैशबोर्ड</Text>
        <TouchableOpacity 
          onPress={() => navigate('MajurDashboard')}
          style={{
            backgroundColor: BWColors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          activeOpacity={0.8}
        >
          <Icon name="apps-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>पूरा डैशबोर्ड</Text>
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelectorContainer}>
        <TouchableOpacity 
          onPress={() => handleDateChange(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={24} color={BWColors.primary} />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {viewMode === 'all' ? 'All Entries' : formatDate(selectedDate.toISOString())}
          </Text>
        </View>

        
        <TouchableOpacity 
          onPress={() => handleDateChange(new Date(selectedDate.setDate(selectedDate.getDate() + 2)))}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Icon name="chevron-forward" size={24} color={BWColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Summary Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>तारीख के हिसाब से</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={datewiseSummary}
        renderItem={renderDateSummary}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.dateSummaryContent}
        nestedScrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={48} color={BWColors.textTertiary} />
            <Text style={styles.emptyText}>कोई एंट्री नहीं मिली</Text>
          </View>
        }
      />

      {/* Majuri Entries Section */}
      <View style={[styles.sectionHeader, { marginTop: 32 }]}>
        <Text style={styles.sectionTitle}>
          {viewMode === 'all' ? 'सभी एंट्री' : `${formatDate(selectedDate.toISOString())} की एंट्री`}
        </Text>
      </View>

      {majurLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BWColors.primary} />
          <Text style={styles.loadingText}>लोड हो रहा है...</Text>
        </View>
      ) : (viewMode === 'all' ? combinedData : filteredData).length > 0 ? (
        <View style={styles.majuriList}>
          {(viewMode === 'all' ? combinedData : filteredData).map((item, index, array) => {
            // For Majur dashboard, show Jama entries as negative amounts
            // Majuri is always positive, Uppad/Jama entries are shown as negative
            const isPositive = item.type === 'majuri';
            const symbol = isPositive ? '+' : '-';
            const symbolColor = isPositive ? '#2E7D32' : '#D32F2F';
            
            
            return (
              <React.Fragment key={item.id}>
                <View style={styles.majuriItem}>
                  <View style={styles.majuriInfo}>
                    <Text style={styles.agencyName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.majuriDescription} numberOfLines={2} ellipsizeMode="tail">
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.majuriType, { color: BWColors.textSecondary }]}>
                      {item.type === 'majuri' ? 'मजूरी' : item.entry_type === 'credit' ? 'जमा' : 'उप्पद'}
                    </Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={[styles.symbolText, { color: symbolColor }]}>{symbol}</Text>
                    <Text style={[styles.majuriAmount, { color: symbolColor }]}>
                      ₹{item.amount.toLocaleString('hi-IN')}
                    </Text>
                  </View>
                </View>
                {index < array.length - 1 && (
                  <View style={styles.separator} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="document-text-outline" size={64} color={BWColors.textTertiary} />
          <Text style={styles.emptyText}>
            {viewMode === 'all' 
              ? 'कोई मजूरी एंट्री नहीं मिली' 
              : `${formatDate(selectedDate.toISOString())} के लिए कोई एंट्री नहीं मिली`}
          </Text>
        </View>
      )}
    </ScrollView>
  </View>
      ) : (
        // NORMAL USER DASHBOARD
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Financial Entries - Only show if user has access to any financial screen */}
            {(contextIsAdmin || 
              hasScreenAccess('PaidSectionScreen') || 
              hasScreenAccess('AddMajuriScreen') || 
              hasScreenAccess('AgencyEntryScreen') || 
              hasScreenAccess('AddGeneralEntryScreen') || 
              hasScreenAccess('UppadJamaScreen') || 
              hasScreenAccess('MumbaiDeliveryEntryScreen') || 
              hasScreenAccess('BackdatedEntryScreen')) && (
            <View style={styles.card}>
              <Text style={styles.categoryTitle}>Financial Entries</Text>
              <Text style={styles.categoryDescription}>Record payments, labor charges, and other transactions.</Text>
              <View style={styles.buttonGrid}>
                {(contextIsAdmin || hasScreenAccess('PaidSectionScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('PaidSection')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="cash-outline" size={28} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Paid Section</Text>
                  </TouchableOpacity>
                )}
                
                {(contextIsAdmin || hasScreenAccess('AddMajuriScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('AddMajuri')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="hammer-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Add Majuri</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('AgencyEntryScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('AgencyEntry')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="business-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Agency Entry</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('AddGeneralEntryScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('AddGeneralEntry')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="journal-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>General Entry</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('UppadJamaScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('UppadJama')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="people-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Uppad/Jama</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('MumbaiDeliveryEntryScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('MumbaiDelivery')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="car-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Mumbai Delivery</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('BackdatedEntryScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('BackdatedEntry')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="time-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Backdated Entry</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            )}

            {/* Driver & Truck Management - Only show if user has access to any driver/truck screen */}
            {(contextIsAdmin || 
              hasScreenAccess('DriverDetailsScreen') || 
              hasScreenAccess('AddTruckFuelScreen')) && (
            <View style={styles.card}>
              <Text style={styles.categoryTitle}>Driver & Truck Management</Text>
              <Text style={styles.categoryDescription}>Manage driver transactions and record fuel expenses.</Text>
              <View style={styles.buttonGrid}>
                {(contextIsAdmin || hasScreenAccess('DriverDetailsScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('DriverDetails')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="person-circle-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Driver Account</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('AddTruckFuelScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('AddTruckFuel')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="water-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Add Truck Fuel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            )}

            {/* Statements & Reports - Only show if user has access to any report screen */}
            {(contextIsAdmin || 
              hasScreenAccess('StatementScreen') || 
              hasScreenAccess('MonthlyStatementScreen') || 
              hasScreenAccess('DailyReportScreen') || 
              hasScreenAccess('HistoryScreen')) && (
            <View style={styles.card}>
              <Text style={styles.categoryTitle}>Statements & Reports</Text>
              <Text style={styles.categoryDescription}>View, generate, and share detailed financial reports.</Text>
              <View style={styles.buttonGrid}>
                {(contextIsAdmin || hasScreenAccess('StatementScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('Statement')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="list-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Statement</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('MonthlyStatementScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('MonthlyStatement')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="calendar-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Monthly Statement</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('DailyReportScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('DailyReport')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="document-text-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>Daily Report</Text>
                  </TouchableOpacity>
                )}

                {(contextIsAdmin || hasScreenAccess('HistoryScreen')) && (
                  <TouchableOpacity 
                    onPress={() => navigate('History')} 
                    style={styles.gridButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name="time-outline" size={26} color={BWColors.primary} />
                    </View>
                    <Text style={styles.gridButtonText}>History Log</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            )}

            {/* Cash Management Section - Show if user has any cash-related access */}
            {(contextIsAdmin || hasScreenAccess('CashVerificationScreen') || hasScreenAccess('CashHistoryScreen') || hasScreenAccess('LeaveCashSetupScreen') || hasScreenAccess('ManageCashScreen')) && (
              <View style={styles.card}>
                <Text style={styles.categoryTitle}>💰 Cash Management</Text>
                <Text style={styles.categoryDescription}>Track and verify cash amounts when leaving office.</Text>
                <View style={styles.buttonGrid}>
                  {/* Setup Cash Amount - Admin only */}
                  {(contextIsAdmin || hasScreenAccess('LeaveCashSetupScreen')) && (
                    <TouchableOpacity 
                      onPress={() => navigate('LeaveCashSetupScreen')} 
                      style={styles.gridButton}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconContainer}>
                        <Icon name="wallet-outline" size={26} color={BWColors.primary} />
                      </View>
                      <Text style={styles.gridButtonText}>Setup Cash Amount</Text>
                    </TouchableOpacity>
                  )}

                  {/* Verify Cash - Based on permission */}
                  {(contextIsAdmin || hasScreenAccess('CashVerificationScreen')) && (
                    <TouchableOpacity 
                      onPress={() => navigate('CashVerificationScreen')} 
                      style={styles.gridButton}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconContainer}>
                        <Icon name="checkmark-circle-outline" size={26} color={BWColors.primary} />
                      </View>
                      <Text style={styles.gridButtonText}>Verify Cash</Text>
                    </TouchableOpacity>
                  )}

                  {/* Cash History - Based on permission */}
                  {(contextIsAdmin || hasScreenAccess('CashHistoryScreen')) && (
                    <TouchableOpacity 
                      onPress={() => navigate('CashHistoryScreen')} 
                      style={styles.gridButton}
                      activeOpacity={0.8}
                    >
                      <View style={styles.iconContainer}>
                        <Icon name="receipt-outline" size={26} color={BWColors.primary} />
                      </View>
                      <Text style={styles.gridButtonText}>Cash History</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Profile Menu Modal */}
          <Modal
            visible={isProfileMenuVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsProfileMenuVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setIsProfileMenuVisible(false)}
            >
              <View style={styles.profileMenu}>
                <View style={styles.menuHeader}>
                  <View style={styles.menuAvatar}>
                    <Text style={styles.menuAvatarText}>{userInitial}</Text>
                  </View>
                  <Text style={styles.menuUserName}>{userName || 'User'}</Text>
                  <Text style={styles.menuUserRole}>{userRole}</Text>
                </View>

                {/* Debug: Log admin status */}
                {(() => {
                  console.log('🔧 DEBUG: Profile menu rendering with permissions:', {
                    contextIsAdmin,
                    userRole,
                    screenAccess: screenAccess
                  });
                  return null;
                })()}

                {/* Admin Panel - Based on permission */}
                {(contextIsAdmin || hasScreenAccess('AdminPanelScreen')) && (
                  <TouchableOpacity onPress={() => {
                  setIsProfileMenuVisible(false);
                  navigate('AdminPanel');
                }} style={styles.menuItem}>
                    <Icon name="cog-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Admin Panel</Text>
                  </TouchableOpacity>
                )}

                {/* User Access Management - Based on permission */}
                {(contextIsAdmin || hasScreenAccess('UserAccessManagementScreen')) && (
                  <TouchableOpacity onPress={() => {
                  console.log('🔧 DEBUG: User Access Management clicked');
                  setIsProfileMenuVisible(false);
                  navigate('UserAccessManagementScreen');
                }} style={styles.menuItem}>
                    <Icon name="people-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>User Access Management</Text>
                  </TouchableOpacity>
                )}

                {/* Page Management - Admin Only */}
                {contextIsAdmin && (
                  <TouchableOpacity onPress={() => {
                  setIsProfileMenuVisible(false);
                  navigate('PageManagement');
                }} style={styles.menuItem}>
                    <Icon name="layers-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Page Management</Text>
                  </TouchableOpacity>
                )}

                {userType === 'normal' && (
                  <Fragment>
                    <TouchableOpacity onPress={() => {
                      setIsProfileMenuVisible(false);
                      navigate('TotalPaid');
                    }} style={styles.menuItem}>
                      <Icon name="cash-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>Total Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setIsProfileMenuVisible(false);
                      navigate('EWayBillConsolidated');
                    }} style={styles.menuItem}>
                      <Icon name="document-text-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>Consolidated E-Way Bill</Text>
                    </TouchableOpacity>
                  </Fragment>
                )}
                <TouchableOpacity onPress={handleLogout} style={styles.menuItem}>
                  <Icon name="log-out-outline" size={20} color={BWColors.text} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      {/* Name Prompt Modal */}
      <Modal
        visible={showNamePrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.namePromptContainer}>
            <Text style={styles.namePromptTitle}>Welcome to Yash Roadlines</Text>
            <Text style={styles.modalSubtitle}>Please enter your name to continue</Text>
            <TextInput
              style={styles.nameInput}
              value={profileNameInput}
              onChangeText={setProfileNameInput}
              placeholder="Your name"
              placeholderTextColor={BWColors.textSecondary}
              autoCapitalize="words"
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleLogout}
              >
                <Text style={styles.cancelButtonText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveName}
                disabled={!profileNameInput.trim()}
              >
                <Text style={styles.saveButtonText}>Save & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export default HomeScreen;
