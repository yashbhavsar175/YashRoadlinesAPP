// DailyReportScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Platform, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  TextInput, 
  Image, 
  Modal, 
  PermissionsAndroid, 
  Linking, 
  ScrollView, 
  Dimensions,
  useWindowDimensions  
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useIsFocused } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const { width, height } = Dimensions.get('window');

// Responsive scaling function
const scale = (size: number) => {
  const baseWidth = 375;
  const scaleFactor = width / baseWidth;
  const newSize = size * scaleFactor;
  return Math.round(newSize);
};

import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { 
  deleteTransactionByIdImproved, 
  getAllTransactionsForDate,
  getProfile,
  AgencyPayment, 
  AgencyMajuri, 
  DriverTransaction, 
  GeneralEntry, 
  TruckFuelEntry,
  AgencyEntry,
  OFFLINE_KEYS,
  syncAllDataFixed,
  saveAgencyPayment,
  saveAgencyMajuri,
  saveDriverTransaction,
  saveTruckFuel,
  saveGeneralEntry,
  saveAgencyEntry as saveAgencyGeneralEntry,
  UppadJamaEntry,
  saveUppadJamaEntry,
} from '../data/Storage';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../supabase';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions, Asset } from 'react-native-image-picker';
import { useAlert } from '../context/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_EMAIL = 'yashbhavsar175@gmail.com';

interface OriginalTransaction {
  id: string;
  agency_name?: string;
  driver_name?: string;
  vehicle_number?: string;
  amount: number;
  description?: string;
  bill_no?: string;
  // Add other possible fields that might exist in your transaction objects
  [key: string]: any;
}

interface TransactionItem {
    id: string;
    type: 'credit' | 'debit';
    label: string;
    amount: number;
    time: string;
    subLabel?: string;
    storageKey: string;
    agencyName?: string;
    originalTransactions?: OriginalTransaction[];
    edited?: boolean;
}

interface EditableTransaction {
    id: string;
    type: 'credit' | 'debit';
    label: string;
    amount: number;
    subLabel?: string;
    storageKey: string;
    originalData: any;
}

type DailyReportScreenProps = { navigation: NavigationProp<RootStackParamList, 'DailyReport'> };

const formatDateForComparison = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const TransactionItemComponent = memo(({ item, index, onPress, onLongPress, isExpanded, isAdmin, isSelected, onEdit, selectionMode, onDelete }: { 
  item: TransactionItem; 
  index: number;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  isExpanded: boolean;
  isAdmin: boolean;
  isSelected?: boolean;
  onEdit?: (item: TransactionItem) => void;
  selectionMode?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const { width } = useWindowDimensions();
  const lastTap = useRef<number | null>(null);
  
  // Memoized responsive calculations
  const isSmallScreen = useMemo(() => width < 375, [width]);
  
  const handlePress = useCallback((e?: any) => {
    e?.stopPropagation();
    if (onEdit && !selectionMode) {
      // Check if this is a double tap
      const now = Date.now();
      if (lastTap.current && (now - lastTap.current) < 300) {
        // Double tap detected
        lastTap.current = null;
        onEdit(item);
      } else {
        // Single tap
        lastTap.current = now;
        setTimeout(() => {
          if (lastTap.current === now) {
            onPress(item.id);
          }
        }, 300);
      }
    } else {
      onPress(item.id);
    }
  }, [onPress, onEdit, item, selectionMode]);
  
  const handleLongPress = useCallback(() => {
    onLongPress(item.id);
  }, [onLongPress, item.id]);
  
  const handleDelete = useCallback((e: any) => {
    e.stopPropagation();
    onDelete?.(item.id);
  }, [onDelete, item.id]);

  return (
    <View style={styles.transactionItem}>
      <TouchableOpacity 
        style={[
          styles.transactionItem,
          isSelected && styles.selectedItem,
          {
            paddingVertical: scale(10),
            borderLeftWidth: 4,
            borderLeftColor: isSelected ? Colors.primary : 'transparent',
          }
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {isAdmin && !selectionMode && (
          <View style={styles.editHint}>
            <Icon name="pencil" size={12} color="#666" />
            <Text style={styles.editHintText}>Double tap to edit</Text>
          </View>
        )}
        <View style={styles.transactionContent}>
          <View style={[styles.transactionLabelContainer, { maxWidth: isSmallScreen ? '60%' : '70%' }]}>
            <Text 
              style={[
                styles.transactionLabel, 
                isExpanded && styles.expandedLabel,
                { fontSize: isSmallScreen ? 14 : 16 }
              ]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {item.label}
            </Text>
            {item.subLabel && (
              <Text 
                style={[
                  styles.transactionSubLabel,
                  { fontSize: isSmallScreen ? 12 : 14 }
                ]} 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {item.subLabel}
              </Text>
            )}
          </View>
          <View style={styles.amountContainer}>
            <Text style={[
              styles.transactionAmount, 
              { 
                color: item.type === 'credit' ? Colors.success : Colors.error,
                fontSize: isSmallScreen ? 14 : 16
              }
            ]}>
              {item.type === 'credit' ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString('en-IN')}
            </Text>
            <View style={styles.timeAndActions}>
              <Text style={[styles.transactionTime, { fontSize: isSmallScreen ? 10 : 12 }]}>
                {item.time}
              </Text>
              {isAdmin && !selectionMode && (
                <TouchableOpacity 
                  onPress={handleDelete}
                  style={styles.deleteButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Icon name="trash-outline" size={18} color="#ff3b30" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {isExpanded && item.originalTransactions?.map((txn, idx) => (
        <View key={idx} style={styles.subTransaction}>
          <Text style={styles.subTransactionText}>
            {txn.agency_name || txn.driver_name || txn.vehicle_number || 'N/A'}
          </Text>
          <Text style={styles.subTransactionAmount}>
            ₹{txn.amount?.toLocaleString('en-IN')}
          </Text>
        </View>
      ))}
    </View>
  );
});

function DailyReportScreen({ navigation }: DailyReportScreenProps): React.JSX.Element {
  const alert = useAlert();
  const { goBack } = navigation;
  const { showAlert } = alert;
  const isFocused = useIsFocused();
  const isMountedRef = useRef(true);
  
  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [proofCounts, setProofCounts] = useState<Record<string, number>>({});
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ url: string; name: string; path: string; canDelete?: boolean }[]>([]);
  const [galleryTxnId, setGalleryTxnId] = useState<string | null>(null);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string; path?: string; canDelete?: boolean } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [gallerySelectionMode, setGallerySelectionMode] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Set<string>>(new Set());
  
  // Transaction Data
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [netBalance, setNetBalance] = useState<number>(0); // This will be credit - debit + cash adjustment
  const [manageCashAdjustment, setManageCashAdjustment] = useState<number>(0);
  
  // User & Auth State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Selection & Expansion
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableTransaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBillNo, setEditBillNo] = useState("");
  
  
  // Constants
  const PROOF_BUCKET = 'paid_proofs';
  const DOUBLE_TAP_DELAY = 300; // milliseconds

  // Error handling helper
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (isMountedRef.current) {
      showAlert(`Something went wrong in ${context}. Please try again.`);
    }
  }, [showAlert]);

  // Handle delete item
  const handleDeleteItem = useCallback(async (item: TransactionItem) => {
    try {
      await deleteTransactionByIdImproved(item.id, item.storageKey);
      setRefreshKey(prev => prev + 1);
      showAlert('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showAlert('Failed to delete transaction');
    }
  }, [showAlert, deleteTransactionByIdImproved]);

  // Open gallery viewer

  // Handle capture proof

  // Load current user ID and admin flag for ownership checks
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id ?? null;
        const emailLower = (data.user?.email || '').toLowerCase();
        if (mounted) setCurrentUserId(userId);

        // Determine if current user is admin via profiles.is_admin (fallback to email check)
        try {
          if (userId) {
            const { data: meProfile } = await supabase
              .from('user_profiles')
              .select('id, is_admin, username')
              .eq('id', userId)
              .single();
            if (mounted) {
              const byFlag = (meProfile as any)?.is_admin === true;
              const byEmail = !!emailLower && emailLower === ADMIN_EMAIL.toLowerCase();
              setIsAdmin(byFlag || byEmail);
            }
          } else if (mounted) {
            setIsAdmin(false);
          }
        } catch {
          if (mounted) {
            setIsAdmin(!!emailLower && emailLower === ADMIN_EMAIL.toLowerCase());
          }
        }

        // Resolve Admin user's ID from profiles using is_admin flag (fallback to username local part)
        try {
          const { data: adminByFlag } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('is_admin', true)
            .limit(1)
            .single();
          if (mounted && adminByFlag?.id) {
            setAdminUserId(adminByFlag.id);
          } else {
            // Fallback: resolve by username local-part of ADMIN_EMAIL
            const adminLocal = ADMIN_EMAIL.split('@')[0].toLowerCase();
            const { data: adminByUsername } = await supabase
              .from('user_profiles')
              .select('id, username')
              .eq('username', adminLocal)
              .single();
            if (mounted) setAdminUserId(adminByUsername?.id || null);
          }
        } catch {
          if (mounted) setAdminUserId(null);
        }
      } catch (e) {
        // ignore
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const profile = await getProfile(user.id);
        if (profile) {
          setProfile(profile);
          // Check if user is admin based on email
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const email = authUser?.email?.toLowerCase();
          setIsAdmin(email === ADMIN_EMAIL.toLowerCase());
        }
      }
    } catch (error) {
      handleError(error, 'loading profile');
    }
  };


  // Load profile, cash adjustment and transactions when selectedDate changes
  useEffect(() => {
    console.log('🚀 useEffect triggered for selectedDate:', selectedDate.toISOString().split('T')[0]);
    const loadData = async () => {
      console.log('🔄 Loading data for date:', selectedDate.toISOString().split('T')[0]);
      try {
        console.log('📋 Loading profile...');
        await loadProfile();
        
        // Load cash adjustment first
        console.log('💰 Loading cash adjustment for date:', selectedDate.toISOString().split('T')[0]);
        const cashAdjustment = await loadManageCashAdjustment(selectedDate); 
        console.log('💰 Cash adjustment loaded:', cashAdjustment);
        setManageCashAdjustment(cashAdjustment || 0);
        
        // Then load transactions with the correct cash adjustment
        console.log('📊 Loading transactions for date:', selectedDate.toISOString().split('T')[0]);
        setLoading(true);
        const allTransactions = await getAllTransactionsForDate(selectedDate);
        console.log('📊 AUTO REFRESH: Raw transactions loaded:', allTransactions.length, 'items');
        console.log('📊 AUTO REFRESH: Raw transactions details:', allTransactions);
        
        const groupedPayments = new Map<string, { amount: number; count: number; date: string; transactions: AgencyPayment[] }>();
        const agencyEntries: AgencyEntry[] = [];
        const otherTransactions: (DriverTransaction | GeneralEntry | TruckFuelEntry | UppadJamaEntry | AgencyMajuri)[] = [];

        allTransactions.forEach(item => {
          const dateKey =
            'payment_date' in item ? item.payment_date :
            'majuri_date' in item ? item.majuri_date :
            'transaction_date' in item ? item.transaction_date :
            'fuel_date' in item ? item.fuel_date :
            'entry_date' in item ? item.entry_date :
            new Date().toISOString();

          // Filter out UppadJama entries from Admin Panel
          if ('person_name' in item && 'entry_type' in item && (item as any).description && 
              (item as any).description.includes('Admin Panel')) {
            return;
          }

          if ('bill_no' in item && 'agency_name' in item) {
            const agencyName = item.agency_name;
            const currentTotal = groupedPayments.get(agencyName) || { amount: 0, count: 0, date: dateKey, transactions: [] };
            groupedPayments.set(agencyName, {
              amount: currentTotal.amount + item.amount,
              count: currentTotal.count + 1,
              date: currentTotal.date > dateKey ? currentTotal.date : dateKey,
              transactions: [...currentTotal.transactions, item as AgencyPayment]
            });
          } else if ('majuri_date' in item && 'agency_name' in item) {
            otherTransactions.push(item as AgencyMajuri);
          } else if ('entry_type' in item && 'agency_id' in item) {
            agencyEntries.push(item as AgencyEntry);
          } else {
            otherTransactions.push(item as DriverTransaction | GeneralEntry | TruckFuelEntry | UppadJamaEntry);
          }
        });

        const processedGroupedTransactions: TransactionItem[] = [];
        groupedPayments.forEach((value, key) => {
          const time = new Date(value.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          processedGroupedTransactions.push({
            id: `paid-group-${key}-${formatDateForComparison(selectedDate)}`,
            type: 'credit',
            label: `Total Paid to ${key}`,
            subLabel: `${value.count} payments`,
            amount: value.amount,
            time: time,
            storageKey: OFFLINE_KEYS.AGENCY_PAYMENTS,
            agencyName: key,
            originalTransactions: value.transactions.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
            edited: value.transactions.some(t => ('updated_at' in t && 'created_at' in t) && (t as any).updated_at && (t as any).created_at && new Date((t as any).updated_at).getTime() > new Date((t as any).created_at).getTime())
          });
        });

        // Process other transactions (simplified to avoid type errors)
        const processedOtherTransactions: TransactionItem[] = [];
        
        for (const item of otherTransactions) {
          let transactionType: 'credit' | 'debit' = 'debit';
          let label = '';
          let subLabel = '';
          let amount = 0;
          let storageKey = '';
          let dateKey = new Date().toISOString();
          let edited = false;
          
          if ('majuri_date' in item && 'agency_name' in item) {
            const majuriItem = item as AgencyMajuri;
            transactionType = 'debit';
            label = 'Majuri';
            subLabel = majuriItem.agency_name;
            amount = majuriItem.amount;
            storageKey = OFFLINE_KEYS.AGENCY_MAJURI;
            dateKey = majuriItem.majuri_date;
          } else if ('transaction_date' in item && 'driver_name' in item) {
            const driverItem = item as DriverTransaction;
            transactionType = driverItem.type === 'earned' ? 'credit' : 'debit';
            label = driverItem.type === 'earned' ? 'Driver Earning' : 'Driver Payment';
            subLabel = driverItem.driver_name;
            amount = driverItem.amount;
            storageKey = OFFLINE_KEYS.DRIVER_TRANSACTIONS;
            dateKey = driverItem.transaction_date;
          } else if ('fuel_date' in item && 'truck_number' in item) {
            const fuelItem = item as TruckFuelEntry;
            transactionType = 'debit';
            label = 'Fuel Expense';
            subLabel = `${fuelItem.truck_number} - ${(fuelItem as any).quantity || 0}L`;
            amount = (fuelItem as any).amount || fuelItem.price_per_liter * ((fuelItem as any).quantity || 0);
            storageKey = OFFLINE_KEYS.TRUCK_FUEL;
            dateKey = fuelItem.fuel_date;
          } else if ('person_name' in item && 'entry_type' in item) {
            const uppadJamaItem = item as UppadJamaEntry;
            transactionType = uppadJamaItem.entry_type === 'credit' ? 'credit' : 'debit';
            label = uppadJamaItem.entry_type === 'credit' ? 'Jama' : 'Uppad';
            subLabel = uppadJamaItem.person_name;
            amount = uppadJamaItem.amount;
            storageKey = OFFLINE_KEYS.UPPAD_JAMA_ENTRIES;
            dateKey = uppadJamaItem.entry_date;
          } else if ('entry_type' in item) {
            const generalItem = item as GeneralEntry;
            transactionType = generalItem.entry_type;
            label = generalItem.description || 'General Entry';
            subLabel = '';
            amount = generalItem.amount;
            storageKey = OFFLINE_KEYS.GENERAL_ENTRIES;
            dateKey = generalItem.entry_date;
          }

          const time = new Date(dateKey).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

          processedOtherTransactions.push({
            id: item.id,
            type: transactionType,
            label,
            subLabel,
            amount,
            time,
            storageKey,
            originalTransactions: [item as any],
            edited
          });
        }

        const allProcessedTransactions = [...processedGroupedTransactions, ...processedOtherTransactions];
        
        // Sort like manual refresh: credits first, then debits, each sorted by time
        const credits = allProcessedTransactions.filter(t => t.type === 'credit');
        const debits = allProcessedTransactions.filter(t => t.type === 'debit');

        const sortedTransactions = [...credits, ...debits].sort((a, b) => {
          const timeA = new Date(`2024-01-01 ${a.time}`).getTime();
          const timeB = new Date(`2024-01-01 ${b.time}`).getTime();
          return timeB - timeA;
        });

        setTransactions(sortedTransactions);
        console.log('✅ AUTO REFRESH: Transactions processed:', sortedTransactions.length, 'items');
        console.log('📊 AUTO REFRESH: Processed transactions details:', sortedTransactions);
        
        // Calculate and update totals using the loaded cash adjustment
        console.log('🧮 AUTO REFRESH: Starting calculations...');
        const creditTotal = sortedTransactions
          .filter(tx => tx.type === 'credit')
          .reduce((sum, tx) => sum + tx.amount, 0);

        const debitTotal = sortedTransactions
          .filter(tx => tx.type === 'debit')
          .reduce((sum, tx) => sum + tx.amount, 0);

        // Calculate net total with the correct cash adjustment
        const netTotal = creditTotal - debitTotal + (cashAdjustment || 0);
        
        console.log('🧮 AUTO REFRESH: Calculations:');
        console.log('   Credit Total:', creditTotal);
        console.log('   Debit Total:', debitTotal);
        console.log('   Cash Adjustment:', cashAdjustment || 0);
        console.log('   Net Total:', netTotal);
        
        setNetBalance(netTotal);
        setTotalCredit(creditTotal);
        setTotalDebit(debitTotal);
        console.log('✅ AUTO REFRESH: All totals updated in state');
        
      } catch (error) {
        console.error('❌ Error loading data:', error);
        handleError(error, 'loading data');
        setTransactions([]);
        setTotalCredit(0);
        setTotalDebit(0);
        setNetBalance(0);
      } finally {
        console.log('🏁 Loading finished');
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedDate, showAlert]);


  // Refresh cash adjustment when screen gains focus (e.g., returning from ManageCash)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const adj = await loadManageCashAdjustment(selectedDate);
          if (active) setManageCashAdjustment(adj || 0);
        } catch {}
      })();
      return () => { active = false; };
    }, [selectedDate])
  );

  // ---------- Paid Proofs (Camera/Gallery) Handlers ----------
  const base64ToArrayBuffer = useCallback((b64: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = b64.replace(/[^A-Za-z0-9+/=]/g, '');
    let bufferLength = str.length * 0.75;
    if (str.endsWith('==')) bufferLength -= 2;
    else if (str.endsWith('=')) bufferLength -= 1;
    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < str.length; i += 4) {
      const enc1 = chars.indexOf(str[i]);
      const enc2 = chars.indexOf(str[i + 1]);
      const enc3 = chars.indexOf(str[i + 2]);
      const enc4 = chars.indexOf(str[i + 3]);
      const triplet = (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);
      bytes[p++] = (triplet >> 16) & 0xff;
      if (str[i + 2] !== '=') bytes[p++] = (triplet >> 8) & 0xff;
      if (str[i + 3] !== '=') bytes[p++] = triplet & 0xff;
    }
    return bytes.buffer as ArrayBuffer;
  }, []);

  const ensureCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      // Check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (hasPermission) return true;

      // Request permission with rationale
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Required',
          message: 'This app needs access to camera to take photos for transaction proofs.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (result === PermissionsAndroid.RESULTS.DENIED) {
        showAlert('Camera permission denied. You can enable it manually from app settings.');
        return false;
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Camera Permission Required',
          'Camera permission is permanently denied. Please enable it manually from app settings:\n\nSettings > Apps > Yash Roadlines > Permissions > Camera',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }, []);

  const deleteProof = useCallback(async (transactionId: string, fileName: string) => {
    try {
      const fullPath = `${transactionId}/${fileName}`;
      const { error } = await supabase.storage.from(PROOF_BUCKET).remove([fullPath]);
      if (error) {
        console.error('Delete proof error:', error);
        showAlert('Could not delete the image. Please try again.');
        return false;
      }

      // Best-effort: remove index row if present
      try {
        await supabase.from('payment_proofs').delete().eq('file_path', fullPath);
      } catch {
        // ignore
      }

      // Update local state and auto-close modal if list becomes empty
      setGalleryImages(prev => {
        const next = prev.filter(it => it.path !== fullPath);
        if (next.length === 0) {
          setGallerySelectionMode(false);
          setSelectedGallery(new Set());
          setPhotoPreviewVisible(false);
          setSelectedPhoto(null);
          setGalleryVisible(false);
          setGalleryTxnId(null);
        }
        return next;
      });
      setProofCounts(prev => ({ ...prev, [transactionId]: Math.max(0, (prev[transactionId] || 0) - 1) }));
    } catch (e) {
      console.error('deleteProof unexpected error:', e);
      showAlert('Failed to delete image');
      return false;
    }
  }, []);

  // Convenience: delete by full storage path like `${txnId}/${filename}`
  const deleteProofByPath = useCallback(async (fullPath: string) => {
    try {
      const { error } = await supabase.storage.from(PROOF_BUCKET).remove([fullPath]);
      if (error) {
        console.error('Delete proof error:', error);
        showAlert(error.message || 'Could not delete the image.');
        return false;
      }
      const [txnId, fileName] = fullPath.split('/');
      try {
        await supabase.from('payment_proofs').delete().eq('file_path', fullPath);
      } catch {}
      setGalleryImages(prev => {
        const next = prev.filter(it => it.path !== fullPath);
        if (next.length === 0) {
          setGallerySelectionMode(false);
          setSelectedGallery(new Set());
          setPhotoPreviewVisible(false);
          setSelectedPhoto(null);
          setGalleryVisible(false);
          setGalleryTxnId(null);
        }
        return next;
      });
      if (txnId) {
        setProofCounts(prev => ({ ...prev, [txnId]: Math.max(0, (prev[txnId] || 0) - 1) }));
      }
      setSelectedPhoto(curr => {
        if (curr && (curr.path === fullPath || curr.name === fileName)) {
          setPhotoPreviewVisible(false);
          return null;
        }
        return curr;
      });
      return true;
    } catch (e) {
      console.error('deleteProofByPath unexpected error:', e);
      showAlert('Failed to delete image');
      return false;
    }
  }, []);

  const shareCurrentPhoto = useCallback(async () => {
    if (!selectedPhoto) return;
    try {
      setPreviewBusy(true);
      const cachePath = `${RNFS.CachesDirectoryPath}/${selectedPhoto.name}`;
      await RNFS.downloadFile({ fromUrl: selectedPhoto.url, toFile: cachePath }).promise;
      await Share.open({ url: `file://${cachePath}`, type: 'image/*' });
    } catch (e) {
      console.error('share photo error:', e);
      showAlert('Could not share the image.');
    } finally {
      setPreviewBusy(false);
    }
  }, [selectedPhoto]);

  const downloadCurrentPhoto = useCallback(async () => {
    if (!selectedPhoto) return;
    try {
      setPreviewBusy(true);
      const dir = Platform.OS === 'android' ? `${RNFS.DownloadDirectoryPath}/Yash Roadlines/Paid Proofs` : RNFS.DocumentDirectoryPath;
      try { await RNFS.mkdir(dir); } catch {}
      const dest = `${dir}/${selectedPhoto.name}`;
      await RNFS.downloadFile({ fromUrl: selectedPhoto.url, toFile: dest }).promise;
      showAlert(Platform.OS === 'android' ? 'Saved to Downloads/Yash Roadlines/Paid Proofs' : 'Saved to Documents');
    } catch (e) {
      console.error('download photo error:', e);
      showAlert('Could not save the image.');
    } finally {
      setPreviewBusy(false);
    }
  }, [selectedPhoto]);

  const handleDeleteSelectedPhotos = useCallback(() => {
    if (!galleryTxnId || selectedGallery.size === 0) return;
    Alert.alert(
      'Delete Photos',
      `Delete ${selectedGallery.size} selected photo(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const path of Array.from(selectedGallery)) {
              await deleteProofByPath(path);
            }
            setSelectedGallery(new Set());
            setGallerySelectionMode(false);
          }
        }
      ]
    );
  }, [galleryTxnId, selectedGallery, deleteProofByPath]);

  const refreshProofCounts = useCallback(async (items: TransactionItem[]) => {
    try {
      const updates: Record<string, number> = {};
      const allTxnIdsToFetch: string[] = [];

      items.forEach(item => {
        if (item.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS && item.originalTransactions) {
          item.originalTransactions.forEach(txn => {
            if (txn.id) {
              allTxnIdsToFetch.push(txn.id);
            }
          });
        }
      });

      const uniqueTxnIds = [...new Set(allTxnIdsToFetch)];

      await Promise.all(uniqueTxnIds.map(async (txnId) => {
        const { data: files, error } = await supabase.storage.from(PROOF_BUCKET).list(txnId, { limit: 100 });
        if (!error) updates[txnId] = files?.length || 0;
      }));
      
      if (isMountedRef.current) setProofCounts(prev => ({ ...prev, ...updates }));
    } catch (e) {
      console.log('refreshProofCounts error:', e);
    }
  }, []);

  const ensureGalleryPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      // For Android 13+ (API 33+), check READ_MEDIA_IMAGES
      if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES) {
        const hasMediaPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        if (hasMediaPermission) return true;
        
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photos Permission Required',
            message: 'This app needs access to photos to select images for transaction proofs.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Photos Permission Required',
            'Photos permission is permanently denied. Please enable it manually from app settings:\n\nSettings > Apps > Yash Roadlines > Permissions > Photos and videos',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return false;
        }
        showAlert('Photos permission denied. You can enable it manually from app settings.');
        return false;
      }
      
      // Fallback for older Android versions
      const hasStoragePermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      if (hasStoragePermission) return true;
      
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to storage to select images for transaction proofs.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Storage Permission Required',
          'Storage permission is permanently denied. Please enable it manually from app settings:\n\nSettings > Apps > Yash Roadlines > Permissions > Files and media',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      showAlert('Storage permission denied. You can enable it manually from app settings.');
      return false;
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  }, []);

  const incrementProofCount = useCallback((txnId: string, delta: number) => {
    setProofCounts(prev => ({ ...prev, [txnId]: Math.max(0, (prev[txnId] || 0) + delta) }));
  }, []);

  const uploadProof = useCallback(async (transactionId: string, storageKey: string, asset: Asset) => {
    try {
      if (!asset?.uri) {
        showAlert('Could not get image URI. Please try again.');
        return false;
      }
      const name = asset.fileName || `proof_${Date.now()}.jpg`;
      const mime = asset.type || 'image/jpeg';
      const path = `${transactionId}/${Date.now()}_${name}`;
      // Prefer base64 -> ArrayBuffer (more reliable on RN). If absent, attempt to read via RNFS.
      let data: ArrayBuffer;
      const b64: string | undefined = (asset as any).base64;
      if (b64) {
        data = base64ToArrayBuffer(b64);
      } else if (asset.uri) {
        try {
          const localPath = asset.uri.startsWith('file://') ? asset.uri.replace('file://', '') : asset.uri;
          const fileB64 = await RNFS.readFile(localPath, 'base64');
          data = base64ToArrayBuffer(fileB64);
        } catch (e) {
          console.error('uploadProof file read error:', e);
          showAlert('Could not read image file for upload.');
          return false;
        }
      } else {
        showAlert('Invalid image data.');
        return false;
      }

      const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(path, data as any, { contentType: mime, upsert: false });
      if (upErr) {
        console.error('Upload error:', upErr);
        showAlert('Could not upload image. Please ensure Storage bucket exists.');
        return false;
      }

      // Optional: index in a table for easier querying (if table exists)
      try {
        await supabase.from('payment_proofs').insert({
          transaction_id: transactionId,
          storage_key: storageKey,
          file_path: path,
          uploader_id: currentUserId,
        });
      } catch (e) {
        // Table may not exist or RLS may block. Don't block UX.
      }

      incrementProofCount(transactionId, 1);
      return true;
    } catch (e) {
      console.error('uploadProof error:', e);
      showAlert('Unexpected error while uploading image.');
      return false;
    }
  }, [incrementProofCount, currentUserId, base64ToArrayBuffer]);

  const handleCaptureProof = useCallback(async (transactionId: string, storageKey: string) => {
    const ok = await ensureCameraPermission();
    if (!ok) {
      showAlert('Camera permission is needed to take a photo.');
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'back',
      saveToPhotos: false,
      quality: 0.8,
      includeBase64: true,
    };
    const res = await launchCamera(options);
    if (res.didCancel) return;
    if (res.errorMessage) {
      showAlert(`Camera Error: ${res.errorMessage}`);
      return;
    }
    const asset = res.assets && res.assets[0];
    if (asset) {
      await uploadProof(transactionId, storageKey, asset);
    }
  }, [uploadProof, ensureCameraPermission]);

  const handlePickFromLibrary = useCallback(async (transactionId: string, storageKey: string) => {
    const ok = await ensureGalleryPermission();
    if (!ok) {
      showAlert('Photos permission is needed to pick images.');
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1, // ensure base64 is returned reliably
      includeBase64: true,
    };
    const res = await launchImageLibrary(options);
    if (res.didCancel) return;
    if (res.errorMessage) {
      showAlert(`Gallery Error: ${res.errorMessage}`);
      return;
    }
    const assets = res.assets || [];
    for (const a of assets) {
      await uploadProof(transactionId, storageKey, a);
    }
  }, [uploadProof, ensureGalleryPermission]);

  const openGalleryViewer = useCallback(async (transactionId: string) => {
    try {
      setGalleryVisible(true);
      setGalleryLoading(true);
      setGalleryTxnId(transactionId);
      const { data: files, error } = await supabase.storage.from(PROOF_BUCKET).list(transactionId, { limit: 100 });
      if (error) throw error;
      // fetch uploader map for this transaction
      let uploaderMap: Record<string, string> = {};
      try {
        const { data: rows } = await supabase
          .from('payment_proofs')
          .select('file_path, uploader_id')
          .eq('transaction_id', transactionId);
        rows?.forEach((r: any) => { if (r?.file_path) uploaderMap[r.file_path] = r.uploader_id; });
      } catch {}
      const results: { url: string; name: string; path: string; canDelete?: boolean }[] = [];
      if (files && files.length) {
        for (const f of files) {
          const fullPath = `${transactionId}/${f.name}`;
          // Try public URL, fallback to signed URL
          const pub = supabase.storage.from(PROOF_BUCKET).getPublicUrl(fullPath);
          const canDelete = isAdmin || (!!currentUserId && uploaderMap[fullPath] === currentUserId);
          if (pub?.data?.publicUrl) {
            results.push({ url: pub.data.publicUrl, name: f.name, path: fullPath, canDelete });
          } else {
            const { data: signed } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(fullPath, 600);
            if (signed?.signedUrl) results.push({ url: signed.signedUrl, name: f.name, path: fullPath, canDelete });
          }
        }
      }
      setGalleryImages(results);
      setProofCounts(prev => ({ ...prev, [transactionId]: files?.length || 0 }));
    } catch (e) {
      console.error('openGalleryViewer error:', e);
      showAlert('Failed to load proof images.');
    } finally {
      setGalleryLoading(false);
    }
  }, [isAdmin, currentUserId]);

  const loadDailyTransactions = useCallback(async (dateToLoad: Date) => {
    console.log('🔄 loadDailyTransactions called for date:', dateToLoad.toISOString().split('T')[0]);
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      setProofCounts({});
      setGalleryVisible(false);
      setGalleryImages([]);
      setGalleryTxnId(null);
      setPhotoPreviewVisible(false);
      setSelectedPhoto(null);
      setGallerySelectionMode(false);
      setSelectedGallery(new Set());
      
      console.log('📊 MANUAL REFRESH: Loading raw transactions...');
      const allTransactions = await getAllTransactionsForDate(dateToLoad); // This now includes majuri
      console.log('📊 MANUAL REFRESH: Raw transactions loaded:', allTransactions.length, 'items');
      console.log('📊 MANUAL REFRESH: Raw transactions details:', allTransactions);

      const groupedPayments = new Map<string, { amount: number; count: number; date: string; transactions: AgencyPayment[] }>();
      const agencyEntries: AgencyEntry[] = [];
      const otherTransactions: (DriverTransaction | GeneralEntry | TruckFuelEntry | UppadJamaEntry | AgencyMajuri)[] = [];

      allTransactions.forEach(item => {
        const dateKey =
          'payment_date' in item ? item.payment_date :
          'majuri_date' in item ? item.majuri_date :
          'transaction_date' in item ? item.transaction_date :
          'fuel_date' in item ? item.fuel_date :
          'entry_date' in item ? item.entry_date :
          new Date().toISOString();

        // Filter out UppadJama entries from Admin Panel
        if ('person_name' in item && 'entry_type' in item && (item as any).description && 
            (item as any).description.includes('Admin Panel')) {
          // Skip admin panel uppad/jama entries
          return;
        }

        if ('bill_no' in item && 'agency_name' in item) {
          const agencyName = item.agency_name;
          const currentTotal = groupedPayments.get(agencyName) || { amount: 0, count: 0, date: dateKey, transactions: [] };
          groupedPayments.set(agencyName, {
            amount: currentTotal.amount + item.amount,
            count: currentTotal.count + 1,
            date: currentTotal.date > dateKey ? currentTotal.date : dateKey,
            transactions: [...currentTotal.transactions, item as AgencyPayment]
          });
        } else if ('majuri_date' in item && 'agency_name' in item) {
          otherTransactions.push(item as AgencyMajuri);
        } else if ('entry_type' in item && 'agency_id' in item) {
          agencyEntries.push(item as AgencyEntry);
        } else {
          otherTransactions.push(item as DriverTransaction | GeneralEntry | TruckFuelEntry | UppadJamaEntry);
        }
      });

      const processedGroupedTransactions: TransactionItem[] = [];
      groupedPayments.forEach((value, key) => {
        const time = new Date(value.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        processedGroupedTransactions.push({
          id: `paid-group-${key}-${formatDateForComparison(selectedDate)}`,
          type: 'credit',
          label: `Total Paid to ${key}`,
          subLabel: `${value.count} payments`,
          amount: value.amount,
          time: time,
          storageKey: OFFLINE_KEYS.AGENCY_PAYMENTS,
          agencyName: key,
          originalTransactions: value.transactions.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
          edited: value.transactions.some(t => ('updated_at' in t && 'created_at' in t) && (t as any).updated_at && (t as any).created_at && new Date((t as any).updated_at).getTime() > new Date((t as any).created_at).getTime())
        });
      });

      const processedOtherTransactions: TransactionItem[] = otherTransactions.map(item => {
        let transactionType: 'credit' | 'debit' = 'debit';
        let label = '';
        let subLabel = '';
        let amount = 0;
        let storageKey = '';
        let dateKey = new Date().toISOString();
        let edited = false;
        
        if ('majuri_date' in item && 'agency_name' in item) { // Handle individual Majuri entries
          transactionType = 'debit';
          label = `Majuri: ${item.agency_name}`;
          subLabel = `Desc: ${item.description || 'N/A'}`;
          amount = item.amount;
          storageKey = OFFLINE_KEYS.AGENCY_MAJURI;
          dateKey = item.majuri_date;
        } else if ('driver_name' in item && 'description' in item) {
          transactionType = item.transaction_type;
          label = `${item.transaction_type === 'debit' ? 'Uppad' : 'Jama'} ${item.driver_name}`;
          subLabel = `Desc: ${item.description || 'N/A'}`;
          amount = item.amount;
          storageKey = OFFLINE_KEYS.DRIVER_TRANSACTIONS;
          dateKey = item.transaction_date;
        } else if ('truck_number' in item) {
          transactionType = 'debit';
          label = `Truck Fuel: ${item.truck_number}`;
          subLabel = `Fuel Type: ${item.fuel_type}`;
          amount = item.total_price;
          storageKey = OFFLINE_KEYS.TRUCK_FUEL;
          dateKey = item.fuel_date;
        } else if ('person_name' in item && 'entry_type' in item) {
          // Uppad/Jama Entry (separate table)
          transactionType = item.entry_type;
          // Show description instead of generic Uppad/Jama label
          label = (item as any).description || `${item.entry_type === 'debit' ? 'Uppad' : 'Jama'} : ${item.person_name}`;
          subLabel = `Person: ${item.person_name}`;
          amount = (item as any).amount;
          storageKey = OFFLINE_KEYS.UPPAD_JAMA_ENTRIES;
          dateKey = (item as any).entry_date;
        } else if ('entry_type' in item) {
          transactionType = item.entry_type;
          const agency = (item as any).agency_name;
          // Show description instead of "General Entry" heading
          label = item.description || 'General Entry';
          subLabel = agency ? `Agency: ${agency}` : '';
          amount = item.amount;
          storageKey = OFFLINE_KEYS.GENERAL_ENTRIES;
          dateKey = item.entry_date;
        }

        // Determine if this entry was edited (updated_at > created_at)
        if ('updated_at' in item && 'created_at' in item && (item as any).updated_at && (item as any).created_at) {
          try {
            edited = new Date((item as any).updated_at).getTime() > new Date((item as any).created_at).getTime();
          } catch {
            edited = false;
          }
        }

        const time = new Date(dateKey).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
          id: item.id,
          type: transactionType,
          label: label,
          amount: amount,
          time: time,
          storageKey: storageKey,
          edited: edited,
          // Attach original item so we have created_by for permission checks and originalData for editing
          originalTransactions: [item as any],
        };
      });
      
      const processedAgencyEntries: TransactionItem[] = agencyEntries.map(item => {
        const time = new Date(item.entry_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
          id: item.id,
          type: item.entry_type,
          // Show description instead of "Agency Entry" heading
          label: item.description || 'Agency Entry',
          subLabel: `Agency: ${item.agency_name}`,
          amount: item.amount,
          time: time,
          storageKey: OFFLINE_KEYS.AGENCY_ENTRIES,
          edited: new Date(item.updated_at).getTime() > new Date(item.created_at).getTime(),
          // Attach original item for proper permission checks and editing
          originalTransactions: [item as any],
        };
      });

      const validTransactions = [...processedGroupedTransactions, ...processedOtherTransactions, ...processedAgencyEntries].filter(t => t && t.amount > 0);

      const credits = validTransactions.filter(t => t.type === 'credit');
      const debits = validTransactions.filter(t => t.type === 'debit');

      const sortedTransactions = [...credits, ...debits].sort((a, b) => {
        const timeA = new Date(`2024-01-01 ${a.time}`).getTime();
        const timeB = new Date(`2024-01-01 ${b.time}`).getTime();
        return timeB - timeA;
      });

      if (!isMountedRef.current) return;
      
      console.log('✅ MANUAL REFRESH: Transactions processed:', sortedTransactions.length, 'items');
      console.log('📊 MANUAL REFRESH: Processed transactions details:', sortedTransactions);
      
      setTransactions(sortedTransactions);
      // Refresh proof counts so gallery icon doesn't disappear on refresh
      refreshProofCounts(sortedTransactions);

      const calculateTotals = (transactions: TransactionItem[]) => {
        try {
          console.log('🧮 MANUAL REFRESH: Calculating totals for', transactions.length, 'transactions');
          console.log('🧮 MANUAL REFRESH: Current manageCashAdjustment:', manageCashAdjustment);
          
          const creditTotal = transactions
            .filter(tx => tx.type === 'credit')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const debitTotal = transactions
            .filter(tx => tx.type === 'debit')
            .reduce((sum, tx) => sum + tx.amount, 0);

          // Calculate net total with cash adjustment
          const netTotal = creditTotal - debitTotal + manageCashAdjustment;
          
          console.log('🧮 MANUAL REFRESH: Calculations:');
          console.log('   Credit Total:', creditTotal);
          console.log('   Debit Total:', debitTotal);
          console.log('   Cash Adjustment:', manageCashAdjustment);
          console.log('   Net Total:', netTotal);
          
          if (isMountedRef.current) {
            // Set netBalance to just the day's net total
            setNetBalance(netTotal);
            setTotalCredit(creditTotal);
            setTotalDebit(debitTotal);
            console.log('✅ MANUAL REFRESH: All totals updated in state');
          }
          
          return { creditTotal, debitTotal, netTotal };
        } catch (e) {
          console.error('❌ MANUAL REFRESH: Error calculating totals:', e);
          return { creditTotal: 0, debitTotal: 0, netTotal: 0 };
        }
      };

      calculateTotals(sortedTransactions);
    } catch (error) {
      console.error('Error in loadDailyTransactions:', error);
      if (isMountedRef.current) {
        showAlert('Failed to load transactions. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedDate, manageCashAdjustment, refreshProofCounts, showAlert]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleRefresh = async () => {
    console.log('🔄 MANUAL REFRESH started for date:', selectedDate.toISOString().split('T')[0]);
    setRefreshing(true);
    try {
      console.log('🔄 MANUAL REFRESH: Syncing all data...');
      await syncAllDataFixed();
      console.log('🔄 MANUAL REFRESH: Loading daily transactions...');
      await loadDailyTransactions(selectedDate);
      console.log('✅ MANUAL REFRESH completed successfully');
    } catch (error) {
      console.error('❌ MANUAL REFRESH: Sync failed:', error);
      await loadDailyTransactions(selectedDate);
    }
  };

  // Handle date change
  const handleDateChange = useCallback((event: any, date?: Date) => {
    console.log('📅 Date change event triggered:', date?.toISOString().split('T')[0]);
    
    // Hide the date picker on Android after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      console.log('📅 Setting new selected date:', date.toISOString().split('T')[0]);
      setSelectedDate(date);
      // Reset cash adjustment for new date; will be loaded from DB
      console.log('💰 Resetting cash adjustment to 0');
      setManageCashAdjustment(0);
      // Load from supabase (assuming loadManageCashAdjustment is a function that fetches this)
      // The function `loadManageCashAdjustment` is not defined in the provided context.
      // If it's meant to be a call to a function, it needs to be defined or imported. 
    }
  }, []);

  // Function to load manage cash adjustment from Supabase
  const loadManageCashAdjustment = useCallback(async (date: Date): Promise<number> => {
    try {
      const dateKey = formatDateKey(date);
      const { data, error } = await supabase
        .from('daily_cash_adjustments')
        .select('adjustment')
        .eq('date_key', dateKey)
        .single();
      return data?.adjustment || 0;
    } catch (e) {
      return 0;
    }
  }, []);
  // Handle item edit
  const handleEditItemInternal = useCallback(async (item: TransactionItem) => {
    // Vibration feedback for edit action
    if (Platform.OS === 'android') {
      // Add haptic feedback if available
    }
    // Ownership guard: block editing if not created by current user unless admin
    const ownerId: string | undefined = (item.originalTransactions && item.originalTransactions[0])
      ? (item.originalTransactions[0] as any).created_by
      : (item as any).created_by;
    if (!isAdmin && currentUserId && ownerId && ownerId !== currentUserId) {
      const ownerIsAdmin = await isOwnerAdminUser(ownerId);
      if (ownerIsAdmin) {
        showAlert("You are not permitted to edit entries created by Yash Bhavsar (Admin).");
      } else {
        showAlert('You can only edit your own entries.');
      }
      return;
    }
    
    setIsEditing(true);
    setEditingItem({
      id: item.id,
      type: item.type,
      label: item.label,
      amount: item.amount,
      subLabel: item.subLabel,
      storageKey: item.storageKey,
      originalData: item.originalTransactions ? item.originalTransactions[0] : item,
    });

    setEditAmount(item.amount.toString());
    setEditDescription(item.subLabel || '');

    if (item.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS) {
      setEditBillNo(item.originalTransactions?.[0]?.bill_no || '');
    } else {
      setEditBillNo('');
    }
  }, [isAdmin, currentUserId, showAlert]);



  const toggleExpansion = useCallback((id: string) => {
    setExpandedAgencyId(prev => prev === id ? null : id);
  }, []);

  const saveManageCashAdjustment = async (date: Date, value: number) => {
    try {
      const dateKey = formatDateKey(date);
      const { error } = await supabase
        .from('daily_cash_adjustments')
        .upsert({ date_key: dateKey, adjustment: value }, { onConflict: 'date_key' });
      if (error) console.warn('Failed saving manage cash:', error.message);
    } catch (e) {
      console.warn('Failed saving manage cash');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete ${selectedIds.size} selected transaction(s)? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const allItemsMap = new Map<string, { id: string, storageKey: string }>();
            transactions.forEach(t => {
              if (t.originalTransactions) {
                t.originalTransactions.forEach((sub: any) => {
                  allItemsMap.set(sub.id, { id: sub.id, storageKey: t.storageKey });
                });
              } else {
                allItemsMap.set(t.id, { id: t.id, storageKey: t.storageKey });
              }
            });

            let successCount = 0;
            for (const id of selectedIds) {
              const itemToDelete = allItemsMap.get(id);
              if (itemToDelete) {
                const success = await deleteTransactionByIdImproved(itemToDelete.id, itemToDelete.storageKey);
                if (success) successCount++;
              }
            }

            setSelectionMode(false);
            setSelectedIds(new Set());
            await loadDailyTransactions(selectedDate);

            showAlert(`Deleted ${successCount} item(s)`);
          }
        }
      ]
    );
  };

  // Helper to check if a given user id belongs to Admin
  const isOwnerAdminUser = async (ownerId: string): Promise<boolean> => {
    if (adminUserId && ownerId === adminUserId) return true;
    try {
      const adminLocal = ADMIN_EMAIL.split('@')[0].toLowerCase();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, is_admin')
        .eq('id', ownerId)
        .single();
      if (!profile) return false;
      if ((profile as any).is_admin === true) return true;
      const username = (profile.username || '').toLowerCase();
      const fullName = (profile.full_name || '').toLowerCase();
      return username === adminLocal || fullName === 'yash bhavsar';
    } catch {
      return false;
    }
  };



  const handleUpdateSave = async () => {
    if (!editingItem) return;

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert('Please enter a valid positive number.');
      return;
    }

    let success = false;
    setLoading(true);
    try {
      const originalData = editingItem.originalData;
      switch (editingItem.storageKey) {
        case OFFLINE_KEYS.AGENCY_PAYMENTS: {
          const updatedPayment = { 
            ...originalData, 
            amount: numAmount, 
            bill_no: editBillNo,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveAgencyPayment(updatedPayment);
          break;
        }
        case OFFLINE_KEYS.AGENCY_MAJURI: {
          const updatedMajuri = { 
            ...originalData, 
            amount: numAmount, 
            description: editDescription,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveAgencyMajuri(updatedMajuri);
          break;
        }
        case OFFLINE_KEYS.DRIVER_TRANSACTIONS: {
          const updatedDriverTxn = { 
            ...originalData, 
            amount: numAmount, 
            description: editDescription,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveDriverTransaction(updatedDriverTxn);
          break;
        }
        case OFFLINE_KEYS.TRUCK_FUEL: {
          const updatedFuel = { 
            ...originalData, 
            total_price: numAmount,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveTruckFuel(updatedFuel);
          break;
        }
        case OFFLINE_KEYS.GENERAL_ENTRIES: {
          const updatedGeneral = { 
            ...originalData, 
            amount: numAmount, 
            description: editDescription,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveGeneralEntry(updatedGeneral);
          break;
        }
        case OFFLINE_KEYS.AGENCY_ENTRIES: {
          const updatedAgencyEntry = { 
            ...originalData, 
            amount: numAmount, 
            description: editDescription,
            id: originalData.id, // Ensure ID is preserved
            updated_at: new Date().toISOString()
          };
          success = await saveAgencyGeneralEntry(updatedAgencyEntry);
          break;
        }
        case OFFLINE_KEYS.UPPAD_JAMA_ENTRIES: {
            const updatedUppadJamaEntry = {
                ...originalData,
                amount: numAmount,
                description: editDescription,
                id: originalData.id,
                updated_at: new Date().toISOString()
            };
            success = await saveUppadJamaEntry(updatedUppadJamaEntry);
            break;
        }
      }

      if (success) {
        showAlert('Entry updated');
        setIsEditing(false);
        setEditingItem(null);
        await loadDailyTransactions(selectedDate);
      } else {
        showAlert('Failed to update entry. Please try again.');
      }
    } catch (error) {
      console.error('Update error:', error);
      showAlert('An error occurred while updating the entry.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEntry = useCallback((id: string, storageKey: string, label: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to remove this transaction?\n\n"${label}"\n\nThis action cannot be undone.`, 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTransactionByIdImproved(id, storageKey);
              if (success) {
                showAlert('Transaction deleted');
                await loadDailyTransactions(selectedDate);
              } else {
                showAlert('Failed to delete transaction');
              }
            } catch (error) {
              console.error('Delete error:', error);
              showAlert('Failed to delete transaction. Please try again.');
            }
          }
        }
      ]
    );
  }, [showAlert, selectedDate, loadDailyTransactions]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 80, // Approximate height of each item
    offset: 80 * index, // This should be dynamic based on item height
    index,
  }), []);

  // Toggle selection of an item
  const toggleSelectionInternal = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []); // Renamed to avoid redeclaration

  // Handle item press for the list items
  const handleItemPress = useCallback((item: TransactionItem) => {
    // Check if this is a group parent item
    const isGroupParent = item.agencyName && item.originalTransactions && item.originalTransactions.length > 1;
    const isProcessedGroup = item.id.includes('paid-group-') || item.id.includes('majuri-group-');
    
    if (isGroupParent || isProcessedGroup) {
      // This is a group parent - only allow expansion
      toggleExpansion(item.id);
    } else if (selectionMode) {
      // Allow selection of individual items (non-group items)
      toggleSelectionInternal(item.id);
    } else {
      // Handle double tap for editing individual items
      const now = Date.now();
      if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
        // Double tap detected - edit the item
        setLastTap(null);
        handleEditItemInternal(item);
      } else {
        // Single tap
        setLastTap(now);
      }
    }
  }, [selectionMode, toggleExpansion, toggleSelectionInternal, lastTap, handleEditItemInternal]);

  // Main renderItem function for FlatList
  const renderItem = useCallback(({ item }: { item: TransactionItem, index: number }) => {
    const isExpanded = expandedAgencyId === item.id;
    const isSelected = selectedIds.has(item.id);
    // Check if this is a group parent item (has agencyName and multiple transactions)
    const isGroupParent = item.agencyName && item.originalTransactions && item.originalTransactions.length > 1;
    // Check if this is a processed grouped transaction (like "Total Paid to Botad")
    const isProcessedGroup = item.id.includes('paid-group-') || item.id.includes('majuri-group-');
    const canSelect = !isGroupParent && !isProcessedGroup; // Never show select on group parents

    return (
      <View key={item.id} style={styles.listItemContainer}>
        <TouchableOpacity 
          onPress={() => handleItemPress(item)}
          onLongPress={() => {
            if (!selectionMode && canSelect) {
              // Only allow long press to enter selection mode for selectable items
              setSelectionMode(true);
              // Select the item immediately
              toggleSelectionInternal(item.id);
            }
          }}
          style={[
            styles.transactionItem,
            isSelected && styles.selectedItem,
            isExpanded && styles.expandedItem
          ]}
        >
          <View style={styles.transactionContent}>
            {selectionMode && canSelect && (
              <TouchableOpacity
                onPress={() => toggleSelectionInternal(item.id)}
                style={styles.checkboxContainer}
              >
                <Icon
                  name={isSelected ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={isSelected ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            <View style={styles.transactionTextContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.transactionLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.edited && (
                  <View style={styles.editedBadge}>
                    <Text style={styles.editedBadgeText}>Edited</Text>
                  </View>
                )}
              </View>
              {item.subLabel && (
                <Text style={styles.transactionSubLabel} numberOfLines={1}>
                  {item.subLabel}
                </Text>
              )}
              {!selectionMode && canSelect && (
                <View style={styles.editHintContainer}>
                  <Icon name="pencil" size={10} color="#666" />
                  <Text style={styles.editHintText}>Double tap to edit</Text>
                </View>
              )}
            </View>
            <View style={styles.amountContainer}>
              <Text 
                style={[
                  styles.amountText,
                  item.type === 'credit' ? styles.creditText : styles.debitText
                ]}
              >
                {item.type === 'credit' ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.timeText}>
                {item.time}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && item.originalTransactions && (
          <View style={styles.subItemsContainer}>
            {item.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS && item.originalTransactions.length > 0 && (
              <View style={styles.proofRow}>
                {(() => {
                  const firstChildId = item.originalTransactions && item.originalTransactions[0]?.id;
                  if (!firstChildId) return null;
                  return (
                    <>
                      <TouchableOpacity onPress={() => handleCaptureProof(firstChildId, item.storageKey)} style={styles.proofIconButton}>
                        <Icon name="camera-outline" size={22} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openGalleryViewer(firstChildId)} style={styles.proofIconButton}>
                        <Icon name="images-outline" size={22} color={Colors.primary} />
                        {proofCounts[firstChildId] > 0 && (
                          <Text style={styles.proofCountBadge}>{proofCounts[firstChildId]}</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            )}
            {item.originalTransactions.map((subItem: any) => {
              const subItemAsTransaction: TransactionItem = {
                id: subItem.id,
                type: item.type,
                label: item.label,
                amount: subItem.amount || 0,
                time: item.time,
                subLabel: item.type === 'credit'
                  ? `Bill No: ${subItem.bill_no || 'N/A'}`
                  : subItem.description || '',
                storageKey: item.storageKey,
                originalTransactions: [subItem],
              };

              const description = item.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS 
                ? `Bill No: ${subItem.bill_no || 'N/A'}` 
                : `Desc: ${subItem.description || 'N/A'}`;

              return (
                <View key={subItem.id} style={styles.subItem}>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectionMode) {
                        toggleSelectionInternal(subItem.id);
                      } else {
                        // Handle double tap for editing sub-items
                        const now = Date.now();
                        if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
                          // Double tap detected - edit the sub-item
                          setLastTap(null);
                          handleEditItemInternal(subItemAsTransaction);
                        } else {
                          // Single tap
                          setLastTap(now);
                        }
                      }
                    }}
                    onLongPress={() => {
                      if (!selectionMode) setSelectionMode(true);
                      toggleSelectionInternal(subItem.id);
                    }}
                    delayLongPress={500}
                    activeOpacity={0.7}
                    style={styles.subItemTouchable}
                  >
                    <View style={styles.subItemContent}>
                      {selectionMode && (
                        <TouchableOpacity
                          onPress={() => toggleSelectionInternal(subItem.id)}
                          style={styles.checkboxContainer}
                        >
                          <Icon
                            name={selectedIds.has(subItem.id) ? 'checkbox-outline' : 'square-outline'}
                            size={20}
                            color={selectedIds.has(subItem.id) ? Colors.primary : Colors.textSecondary}
                          />
                        </TouchableOpacity>
                      )}
                      <View style={styles.subItemTextContainer}>
                                                 <View style={styles.subItemLabelRow}>
                           <Text style={styles.subItemText} numberOfLines={1}>
                             {description}
                           </Text>
                           {subItem.edited && (
                             <View style={styles.editedBadgeSmall}>
                               <Text style={styles.editedBadgeText}>Edited</Text>
                             </View>
                           )}
                         </View>
                        <Text style={styles.subItemAmount}>
                          ₹{subItem.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {!selectionMode && (
                    <View style={styles.subItemActions}>
                      <View style={styles.editHintContainer}>
                        <Icon name="pencil" size={12} color="#666" />
                        <Text style={styles.editHintText}>Double tap to edit</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}


      </View>
    );
  }, [expandedAgencyId, handleEditItemInternal, handleDeleteItem, handleItemPress, selectedIds, selectionMode, toggleSelectionInternal, handleDeleteEntry, handleCaptureProof, openGalleryViewer, proofCounts]);

  const renderSubItem = useCallback(({ subItem, item }: { subItem: OriginalTransaction; item: TransactionItem }) => {
    const isSubItemSelected = selectedIds.has(subItem.id);
    const isSubEdited = subItem.edited; // Assuming subItem has an 'edited' property

    return (
      <TouchableOpacity
        key={subItem.id}
        activeOpacity={0.7}
        onPress={() => {
          if (selectionMode) {
            toggleSelectionInternal(subItem.id); // Use the renamed function
          } else {
            // Handle double tap for sub items
            const now = Date.now();
            if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
              // Create a transaction item from sub item for editing
              const subItemAsTransaction: TransactionItem = {
                id: subItem.id,
                type: item.type,
                label: item.label,
                amount: 'amount' in subItem ? subItem.amount : 0,
                time: item.time,
                subLabel: item.type === 'credit'
                  ? ('bill_no' in subItem ? `Bill No: ${subItem.bill_no}` : '')
                  : ('description' in subItem ? subItem.description : ''),
                storageKey: item.storageKey,
                originalTransactions: [subItem]
              };
              handleEditItemInternal(subItemAsTransaction); // Renamed handleEditItem to handleEditItemInternal
              setLastTap(null);
            } else {
              setLastTap(now);
            } 
          }
        }}
        onLongPress={() => {
          if (!selectionMode) setSelectionMode(true);
          toggleSelectionInternal(subItem.id); // Use the renamed function
        }}
        delayLongPress={500}
      >
        <View style={[styles.subItemCard, isSubItemSelected && styles.selectedItemStyle]}>
          {isSubEdited && (
            <View style={styles.editedBadgeAbsolute}>
              <View style={styles.editedBadgeSmall}>
                <Text style={styles.editedBadgeText}>Edited</Text>
              </View>
            </View>
          )}
          <View style={styles.subItemHeader}>
            {selectionMode && (
              <Icon
                name={isSubItemSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={Colors.primary}
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={styles.subItemText}>
              {item.type === 'credit'
                ? `Bill No: ${'bill_no' in subItem ? subItem.bill_no || 'N/A' : 'N/A'}`
                : `Desc: ${'description' in subItem ? subItem.description || 'N/A' : 'N/A'}`}
            </Text>
            <Text style={styles.subItemText}>
              {new Date('payment_date' in subItem ? subItem.payment_date : subItem.majuri_date)
                .toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true})}
            </Text>
          </View>
          <View style={styles.subItemFooter}>
            <Text style={[
              styles.subItemAmount,
              item.type === 'debit' ? styles.debitAmount : styles.creditAmount
            ]}>
              ₹{subItem.amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity> // Removed toggleSelection from dependency array as it's not used directly here
    );
  }, [selectionMode, selectedIds, lastTap, handleEditItemInternal, toggleSelectionInternal]);

  const renderEmptyState = () => (
    <View style={[GlobalStyles.card, styles.emptyStateCard]}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Transactions Found</Text>
      <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
        There are no recorded transactions for {selectedDate.toLocaleDateString('en-IN')}.
      </Text>
    </View>
  );

  const generatePdfHtml = () => {
    const transactionSummaryHtml = transactions.map(item => {
      let descriptionText = '';
      let typeLabel = '';
      if (item.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS) {
        typeLabel = 'Paid';
        const agencyN = (item as any).agencyName ?? '';
        const anyDelivery = (item as any).originalTransactions?.some((t: any) => {
          const v = (t?.delivery ?? t?.is_delivery ?? t?.delivery_yes ?? t?.isDelivery);
          return v === true || v === 'yes' || v === 'Yes' || v === 'YES' || v === 'yea' || v === 1;
        }) || false;
        descriptionText = anyDelivery ? `${agencyN || 'Agency'} : Delivery` : `${agencyN}`;
      } else if (item.storageKey === OFFLINE_KEYS.AGENCY_MAJURI) {
        // Type: Majuri; Description: Agency Name
        typeLabel = 'Majuri';
        const agencyN = (item as any).agencyName
          || (item as any).originalTransactions?.[0]?.agency_name
          || (item.label || '').replace(/^\s*Majuri:\s*/i, '');
        descriptionText = `${agencyN || ''}`;
      } else if (item.storageKey === OFFLINE_KEYS.AGENCY_ENTRIES) {
        // Type: Agency Credit/Debit; Description: AgencyName (Description)
        typeLabel = item.type === 'credit' ? 'Agency Credit' : 'Agency Debit';
        const agencyN = (item as any).originalTransactions?.[0]?.agency_name
          || (item.subLabel || '').replace(/^\s*Agency:\s*/i, '');
        const desc = item.label || '';
        descriptionText = agencyN ? (desc ? `${agencyN} (${desc})` : agencyN) : desc;
      } else if (item.storageKey === OFFLINE_KEYS.GENERAL_ENTRIES) {
        // Type: General Credit/Debit; Description: User's description
        typeLabel = item.type === 'credit' ? 'General Credit' : 'General Debit';
        descriptionText = `${item.label || ''}`;
      } else if (item.storageKey === OFFLINE_KEYS.TRUCK_FUEL) {
        typeLabel = 'Fuel';
        descriptionText = `${item.label ?? ''}`;
      } else if (item.storageKey === OFFLINE_KEYS.DRIVER_TRANSACTIONS) {
        // Hinglish labels per preference; hide driver name in PDF
        typeLabel = item.type === 'credit' ? 'Jama' : 'Uppad';
        descriptionText = '';
      } else if (item.storageKey === OFFLINE_KEYS.UPPAD_JAMA_ENTRIES) {
        // Uppad/Jama entries for general persons
        typeLabel = item.type === 'credit' ? 'Jama' : 'Uppad';
        // Strip prefix from label like "Jama : <Person>" or "Uppad : <Person>"
        descriptionText = (item.label || '').replace(/^\s*(Jama|Uppad)\s*:\s*/i, '');
      }

      const amountStyle = item.type === 'credit' ? 'style="color: #2E7D32;"' : 'style="color: #C62828;"';
      return `
        <tr>
          <td>${item.time}</td>
          <td>${typeLabel}</td>
          <td>${descriptionText}</td>
          <td align="right" ${amountStyle}>₹${item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html><html><head>
      <title>Daily Report</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; background: white; color: #333; line-height: 1.4; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1976D2; padding-bottom: 15px; }
        .header h1 { font-size: 24px; color: #1976D2; margin-bottom: 8px; font-weight: bold; }
        .header h2 { font-size: 18px; color: #555; margin-bottom: 10px; }
        .summary { padding: 15px; border: 2px solid #1976D2; border-radius: 8px; background-color: #f5f5f5; page-break-inside: avoid; }
        .summary h3 { margin-top: 0; margin-bottom: 15px; text-align: center; color: #1976D2; border-bottom: none; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .total-credit { color: #2E7D32; font-weight: bold; }
        .total-debit { color: #C62828; font-weight: bold; }
        .net-balance { font-size: 16px; font-weight: bold; color: ${netBalance >= 0 ? '#2E7D32' : '#C62828'}; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section h3 { color: #1976D2; font-size: 16px; margin-bottom: 15px; padding: 8px 0; border-bottom: 2px solid #E3F2FD; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; page-break-inside: avoid; }
        th, td { border: 1px solid #ddd; padding: 8px 6px; text-align: left; vertical-align: top; }
        th { background-color: #f8f9fa; color: #333; font-weight: bold; font-size: 12px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
      </style></head><body>
      <div class="header">
        <h1>YASH ROADLINES</h1>
        <h2>Daily Report - ${selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</h2>
      </div>
      <div class="section">
        <h3>Transaction Breakdown (${transactions.length})</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Time</th>
              <th style="width: 20%;">Type</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionSummaryHtml}
          </tbody>
        </table>
      </div>
      <div class="summary">
        <h3>📊 Daily Financial Summary</h3>
        <div class="summary-row">
          <span>Total Credit:</span>
          <span class="total-credit">₹${totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row">
          <span>Total Debit:</span>
          <span class="total-debit">₹${totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
        </div>
        ${manageCashAdjustment !== 0 ? `
        <div class="summary-row">
          <span>Cash Adjustment:</span>
          <span class="${manageCashAdjustment >= 0 ? 'total-credit' : 'total-debit'}">${manageCashAdjustment >= 0 ? '+' : '-'}₹${Math.abs(manageCashAdjustment).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
        </div>` : ''}
        <div class="summary-row net-balance">
          <span>Net (Credit - Debit${manageCashAdjustment !== 0 ? ' + Cash Adj' : ''}):</span>
          <span>₹${Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}${netBalance < 0 ? ' (Loss)' : ' (Profit)'}</span>
        </div>
      </div>
      <div class="footer">
        <div><strong>YASH ROADLINES</strong></div>
        <div>Report Generated on: ${new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}</div>
      </div></body></html>`;
  };

  const handleViewPdf = async () => {
    if (isGeneratingPdf) return;

    try {
      setIsGeneratingPdf(true);
      const htmlContent = generatePdfHtml();
      const now = new Date();
      const fileName = `Daily_Report_${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

      // Create PDF in temp directory first
      const tempPdfOptions = {
        html: htmlContent,
        fileName: fileName,
        directory: 'Documents',
        base64: false,
        width: 595,
        height: 842,
      };

      console.log('Generating Daily Report PDF...');
      console.log('generatePDF function:', generatePDF);
      
      if (!generatePDF) {
        throw new Error('generatePDF function is not available. Please restart the app and try again.');
      }
      
      const tempPdf = await generatePDF(tempPdfOptions);
      
      if (tempPdf && tempPdf.filePath) {
        console.log('Temp PDF generated successfully at:', tempPdf.filePath);
        
        // Create organized folder structure (Downloads on Android, Documents on iOS)
        const pdfFileName = `${fileName}.pdf`;
        const baseDir = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
        const appFolderPath = `${baseDir}/Yash Roadlines`;
        const dailyFolderPath = `${appFolderPath}/Daily Report`;
        const finalFilePath = `${dailyFolderPath}/${pdfFileName}`;
        
        // Create directories if they don't exist
        try { await RNFS.mkdir(appFolderPath); } catch {}
        try { await RNFS.mkdir(dailyFolderPath); } catch {}
        console.log('Created folder structure in Downloads:', dailyFolderPath);
        
        try {
          // Copy file to organized folder in Downloads
          await RNFS.copyFile(tempPdf.filePath, finalFilePath);
          console.log('PDF copied to organized Downloads folder:', finalFilePath);
          
          // Clean up temp file
          await RNFS.unlink(tempPdf.filePath).catch(() => {
            console.log('Could not delete temp file');
          });
          
          // Try sharing the PDF file from organized Downloads folder
          try {
            console.log('Attempting to share Daily Report PDF from organized Downloads folder:', finalFilePath);
            
            const shareOptions = {
              title: 'Share Daily Report',
              message: `Daily Report for ${selectedDate.toLocaleDateString()}`,
              url: `file://${finalFilePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('Daily Report PDF shared successfully from Downloads folder');
            
          } catch (shareError) {
            console.log('Sharing failed, showing Downloads location:', shareError);
            
            // Show success message with organized folder location
            const folderHint = Platform.OS === 'android'
              ? 'File Manager > Downloads > Yash Roadlines > Daily Report'
              : 'Files app > On My iPhone/iPad > Yash Roadlines > Daily Report';
            const humanPath = Platform.OS === 'android'
              ? 'Downloads/Yash Roadlines/Daily Report/'
              : 'Documents/Yash Roadlines/Daily Report/';
            showAlert('PDF saved to Downloads/Yash Roadlines');
          }
          
        } catch (copyError) {
          console.log('Failed to copy to Downloads folder:', copyError);
          
          // Fallback to temp file sharing
          try {
            const shareOptions = {
              title: 'Share Daily Report',
              message: `Daily Report for ${selectedDate.toLocaleDateString()}`,
              url: `file://${tempPdf.filePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('Daily Report PDF shared successfully from temp location');
            
          } catch (shareError) {
            showAlert('PDF generated');
          }
        }
        
      } else {
        throw new Error("PDF file path is null.");
      }
    } catch (error: any) {
      console.error('PDF generation error:', error);
      if (isMountedRef.current) {
        showAlert('Failed to generate PDF');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingPdf(false);
      }
    }
  };
  
  const renderTotals = () => {
    return (
      <View style={styles.totalsContainer}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Credit </Text>
          <Text style={[styles.totalAmount, styles.creditAmount]}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Debit </Text>
          <Text style={[styles.totalAmount, styles.debitAmount]}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        {manageCashAdjustment !== 0 && (
          <View style={[styles.totalItem, styles.manageCashRow]}>
            <Text style={styles.totalLabel}>Cash Adjustment</Text>
            <Text style={[styles.totalAmount, manageCashAdjustment >= 0 ? styles.creditAmount : styles.debitAmount]}>
              {manageCashAdjustment >= 0 ? '+' : ''}₹{Math.abs(manageCashAdjustment).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}
        <View style={styles.netBalanceContainer}>
          <View style={styles.netBalanceHeader}>
            <Text style={styles.netBalanceLabel}>Net Balance</Text>
            <TouchableOpacity 
              onPress={() => {
                const dateKey = formatDateKey(selectedDate);
                navigation.navigate('ManageCash', {
                  selectedDateKey: dateKey,
                  initialAdjustment: manageCashAdjustment,
                } as any);
              }}
              style={styles.manageCashButton}
            >
              <Text style={styles.manageCashButtonText}>Manage Cash</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.netBalanceAmount, netBalance >= 0 ? styles.netPositive : styles.netNegative]}>
            {netBalance >= 0 ? '+' : ''}₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  };

  const keyExtractor = useCallback((item: TransactionItem) => item.id, []);

  const renderEditModal = () => {
    if (!editingItem) return null;

    return (
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />

            {editingItem.storageKey === OFFLINE_KEYS.AGENCY_PAYMENTS && (
              <>
                <Text style={styles.inputLabel}>Bill Number</Text>
                <TextInput
                  style={styles.input}
                  value={editBillNo}
                  onChangeText={setEditBillNo}
                  placeholder="Enter bill number"
                />
              </>
            )}

            {editingItem.storageKey !== OFFLINE_KEYS.AGENCY_PAYMENTS && (
              <>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter description"
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateSave}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };




  return (
    <View style={styles.container}>
      {renderEditModal()}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Report</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleViewPdf} style={styles.shareButton}>
            <Icon name="share-social-outline" size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.middleContainer}>
        <View style={styles.dateSelector}>
          <Text style={styles.dateText}>{selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>Change Date</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={selectedDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
          />
        )}
        
        {/* Summary Section at the Top */}
        <View style={styles.summaryContainer}>
          {renderTotals()}
        </View>
        
        {/* Transaction List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </View>
      
      {/* Gallery Modal */}
      {galleryVisible && (
        <Modal
          visible={galleryVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setGalleryVisible(false)}
        >
          <View style={styles.galleryModalBackdrop}>
            <View style={styles.galleryModalContent}>
              <View style={styles.galleryHeader}>
                <Text style={styles.galleryTitle}>Paid Proofs</Text>
                <TouchableOpacity onPress={() => setGalleryVisible(false)} style={styles.galleryCloseBtn}>
                  <Icon name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>
              {galleryLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.galleryGrid}>
                  {galleryImages.map((img) => (
                    <TouchableOpacity key={img.path} onPress={() => { setSelectedPhoto(img); setPhotoPreviewVisible(true); }}>
                      <Image source={{ uri: img.url }} style={styles.galleryThumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                  {galleryImages.length === 0 && (
                    <Text style={styles.emptyStateText}>No images found.</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Photo Preview Modal */}
      {photoPreviewVisible && selectedPhoto && (
        <Modal
          visible={photoPreviewVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPhotoPreviewVisible(false)}
        >
          <View style={styles.previewModalBackdrop}>
            <View style={styles.previewModalContent}>
              <Image source={{ uri: selectedPhoto.url }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewActions}>
                <TouchableOpacity onPress={shareCurrentPhoto} disabled={previewBusy} style={styles.previewActionBtn}>
                  <Icon name="share-social-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={downloadCurrentPhoto} disabled={previewBusy} style={styles.previewActionBtn}>
                  <Icon name="download-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                {selectedPhoto.canDelete && (
                  <TouchableOpacity onPress={() => selectedPhoto.path && deleteProofByPath(selectedPhoto.path)} disabled={previewBusy} style={styles.previewActionBtn}>
                    <Icon name="trash-outline" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setPhotoPreviewVisible(false)} style={styles.previewActionBtn}>
                  <Icon name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Multi-select actions at bottom */}
      {selectionMode && (
        <View style={styles.multiSelectActions}>
          <TouchableOpacity
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            style={[styles.multiSelectButton, styles.cancelMultiSelectButton]}
          >
            <Text style={styles.multiSelectButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            style={[styles.multiSelectButton, styles.deleteMultiSelectButton, selectedIds.size === 0 && styles.disabledButton]}
          >
            <Text style={styles.multiSelectButtonText}>Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Complete Styles - Organized and Fixed
const styles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
    backgroundColor: '#e3f2fd',
  },
  
  // Transaction List Item Styles
  listItemContainer: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionItem: {
    padding: 16,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
  expandedItem: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  transactionSubLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  creditText: {
    color: '#4CAF50',
  },
  debitText: {
    color: '#F44336',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  subItemsContainer: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subItemTouchable: {
    flex: 1,
  },
  subItemContent: {
    flex: 1,
    marginRight: 8,
  },
  subItemText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  subItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  subItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subItemActionButton: {
    padding: 5,
    marginLeft: 5,
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    elevation: 1,
  },
  middleContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    padding: 8,
    marginRight: 8,
  },
  trashButton: {
    padding: 8,
    marginRight: 8,
  },
  shareButton: {
    backgroundColor: Colors.accent,
    width: 50,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  
  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  
  // List
  listContent: {
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  editHint: {
    position: 'absolute',
    top: 4,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  editHintText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  editHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  transactionLabelContainer: {
    flex: 1,
    marginRight: 10,
  },
  expandedLabel: {
    fontWeight: 'bold',
  },
  timeAndActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  expandedSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginBottom: 10,
    marginTop: -5,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandedSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  expandArrow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  
  // Sub Items
  subTransaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginVertical: 5,
    backgroundColor: 'white',
    borderRadius: 5,
    borderLeftWidth: 3,
  },
  subTransactionText: {
    fontSize: 14,
  },
  subTransactionAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  subItemCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
  },
  subItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subItemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  
  // Entry Styles
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  entrySubTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  serialNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  
  // Transaction Actions
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Amount Colors
  creditAmount: {
    color: Colors.success,
  },
  debitAmount: {
    color: Colors.error,
  },
  
  // Selection & Editing
  selectedItemStyle: {
    backgroundColor: '#E3F2FD',
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  subItemTextContainer: {
    flex: 1,
  },
  subItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  editedBadge: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFB74D',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 8,
    marginRight: 8,
  },
  editedBadgeSmall: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFB74D',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 1,
    paddingHorizontal: 5,
    marginLeft: 6,
    marginRight: 8,
  },
  editedBadgeAbsolute: {
    position: 'absolute',
    top: 6,
    right: 8,
    zIndex: 1,
  },
  editedBadgeText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Proof Photos
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 6,
  },
  proofIconButton: {
    padding: 5,
    marginLeft: 10,
  },
  proofCountBadge: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  galleryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryModalContent: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  galleryCloseBtn: {
    padding: 6,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryThumb: {
    width: 90,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  previewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '70%',
    marginBottom: 12,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActionBtn: {
    padding: 10,
    marginHorizontal: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  
  // Empty State
  emptyStateCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 50,
    color: '#9e9e9e',
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  
  // Totals Section
  totalsContainer: {
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 16,
    color: '#424242',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  netBalanceContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  netBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  netBalanceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  netBalanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  netPositive: {
    color: '#2e7d32',
  },
  netNegative: {
    color: '#d32f2f',
  },
  
  // Manage Cash
  manageCashRow: {
    backgroundColor: 'rgba(255, 243, 224, 0.5)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  manageCashButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 10,
  },
  manageCashButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Multi-select actions at bottom
  multiSelectActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  multiSelectButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelMultiSelectButton: {
    backgroundColor: Colors.textSecondary,
  },
  deleteMultiSelectButton: {
    backgroundColor: Colors.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  multiSelectButtonText: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DailyReportScreen;