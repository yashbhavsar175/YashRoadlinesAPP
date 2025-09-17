// Storage.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_URL } from '../supabase';
import * as Keychain from 'react-native-keychain';
import * as CryptoJS from 'crypto-js';

export interface Agency {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyPayment {
  date: string | number | Date;
  id: string;
  agency_id: string;
  agency_name: string;
  amount: number;
  bill_no: string;
  payment_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyMajuri {
  date: string | number | Date;
  id: string;
  agency_id: string;
  agency_name: string;
  amount: number;
  description?: string;
  majuri_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverTransaction {
  editedAt: any;
  date: string;
  type: string;
  id: string;
  driver_name: string;
  description: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  recorded_by: string;
  transaction_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TruckFuelEntry {
  date: any;
  id: string;
  truck_number: string;
  fuel_type: 'Diesel' | 'Petrol' | 'CNG';
  quantity: number;
  price_per_liter: number;
  total_price: number;
  fuel_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneralEntry {
  id: string;
  description: string;
  amount: number;
  entry_type: 'debit' | 'credit';
  entry_date: string;
  agency_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryLog {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string;
  action: 'add' | 'delete';
  table_name: string;
  record_id: string;
  details: any;
}

export interface UserProfile {
  id: string;
  username?: string;
  full_name: string;
  phone_number?: string;
  user_type?: 'normal' | 'majur';
  is_admin?: boolean;
  is_active?: boolean;
  screen_access?: string[];
  created_at: string;
  updated_at?: string;
}

export interface AgencyEntry {
  id: string;
  agency_id: string;
  agency_name: string;
  description: string;
  amount: number;
  entry_type: 'credit' | 'debit';
  entry_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  delivery_status?: 'yes' | 'no';
}

export interface UppadJamaEntry {
  id: string;
  person_name: string;
  description: string;
  amount: number;
  entry_type: 'credit' | 'debit';
  entry_date: string;
  recorded_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // source?: 'home_screen' | 'admin_panel'; // Field doesn't exist in database
}

export interface CashRecord {
  id: string;
  expected_amount: number;
  actual_amount?: number;
  notes: string;
  setup_time: string;
  verification_time?: string;
  status: 'pending_verification' | 'verified_correct' | 'verified_incorrect';
  admin_id: string;
  difference?: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// 2. OFFLINE STORAGE KEYS
// =====================================================
export const OFFLINE_KEYS = {
  AGENCIES: 'offline_agencies',
  AGENCY_PAYMENTS: 'offline_agency_payments',
  AGENCY_MAJURI: 'offline_agency_majuri',
  DRIVER_TRANSACTIONS: 'offline_driver_transactions',
  TRUCK_FUEL: 'offline_truck_fuel',
  GENERAL_ENTRIES: 'offline_general_entries',
  AGENCY_ENTRIES: 'offline_agency_entries',
  UPPAD_JAMA_ENTRIES: 'offline_uppad_jama_entries',
  PERSONS: 'offline_persons',
  CASH_RECORDS: 'offline_cash_records',
  PENDING_SYNC: 'pending_sync_operations',
  LAST_SYNC: 'last_sync_timestamp'
};
 
// =====================================================
// CACHE CLEAR FUNCTION - To refresh data after filter changes
// =====================================================
export const clearPaymentCache = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing payment cache to refresh data...');
    await AsyncStorage.removeItem(OFFLINE_KEYS.AGENCY_PAYMENTS);
    await AsyncStorage.removeItem(OFFLINE_KEYS.AGENCY_ENTRIES);
    console.log('✅ Payment cache cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing payment cache:', error);
  }
};

export const clearAllCache = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing all offline cache...');
    const keys = Object.values(OFFLINE_KEYS);
    await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    console.log('✅ All cache cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

// =====================================================
// 3. DATE UTILITY FUNCTIONS
// =====================================================
const isSameDate = (date1: string | Date, date2: string | Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const formatDateForComparison = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// =====================================================
// 4. SYNC MANAGER CLASS
// =====================================================
class SyncManager {
  private static instance: SyncManager;
  private syncInProgress = false;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async addPendingOperation(operation: any): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC);
      const pending = existing ? JSON.parse(existing) : [];
      pending.push({
        ...operation,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      });
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_SYNC, JSON.stringify(pending));
    } catch (error) {
      console.error('Error adding pending operation:', error);
    }
  }

  async syncPendingOperations(): Promise<boolean> {
    if (this.syncInProgress) return false;
    
    this.syncInProgress = true;
    try {
      const pendingStr = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC);
      if (!pendingStr) return true;

      const pending = JSON.parse(pendingStr);
      const successful: string[] = [];

      for (const operation of pending) {
        try {
          const result = await this.executePendingOperation(operation);
          if (result) {
            successful.push(operation.id);
          }
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);
        }
      }

      const remaining = pending.filter((op: any) => !successful.includes(op.id));
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_SYNC, JSON.stringify(remaining));
      
      await AsyncStorage.setItem(OFFLINE_KEYS.LAST_SYNC, new Date().toISOString());
      
      return successful.length === pending.length;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executePendingOperation(operation: any): Promise<boolean> {
    const { table, action, data } = operation;
    
    try {
      switch (action) {
        case 'INSERT':
          const { error: insertError } = await supabase
            .from(table)
            .insert([data]);
          return !insertError;
          
        case 'UPDATE':
          const { error: updateError } = await supabase
            .from(table)
            .update(data)
            .eq('id', data.id);
          return !updateError;
          
        case 'DELETE':
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('id', data.id);
          return !deleteError;
          
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
};

// =====================================================
// 11a. UPPAD/JAMA ENTRIES (separate from drivers)
// =====================================================
export const saveUppadJamaEntry = async (entry: Partial<UppadJamaEntry> & {
  person_name: string;
  amount: number;
  entry_type: 'credit' | 'debit';
  description?: string;
  entry_date?: string;
  // source?: 'home_screen' | 'admin_panel'; // Removed - not in DB
}): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found.');
      // Allow offline-only save below
    }

    const online = await isOnline();
    const isUpdate = !!entry.id;
    const recordedBy = user ? ((await getProfile(user.id))?.full_name || user.email?.split('@')[0] || user.id) : undefined;

    const entryData: any = {
      ...(isUpdate && { id: entry.id }),
      person_name: entry.person_name?.trim(),
      description: (entry.description || '').trim(),
      amount: entry.amount,
      entry_type: entry.entry_type,
      recorded_by: recordedBy,
      entry_date: entry.entry_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // source: entry.source || 'home_screen', // Removed - column doesn't exist in DB
      ...(!isUpdate && user && { 
        created_by: user.id,
        created_at: new Date().toISOString()
      })
    };

    if (online) {
      let data: any, error;
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('uppad_jama_entries')
          .update(entryData)
          .eq('id', entry.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('uppad_jama_entries')
          .insert([entryData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }

      if (error) throw error;

      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
      let localData = currentData ? JSON.parse(currentData) : [];
      if (isUpdate) {
        localData = localData.map((item: any) => item.id === entry.id ? { ...item, ...data } : item);
      } else if (data) {
        localData.push(data);
      }
      await AsyncStorage.setItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES, JSON.stringify(localData));

      if (!isUpdate && data) {
        await logHistory('add', 'uppad_jama_entries', data.id, entryData);
      } else if (isUpdate) {
        await logHistory('update', 'uppad_jama_entries', entry.id!, entryData);
      }
      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = {
        ...entryData,
        ...(isUpdate ? {} : {
          id: `temp_${Date.now()}`,
          created_by: user?.id,
          created_at: currentDate,
        }),
        updated_at: currentDate,
        entry_date: entry.entry_date || currentDate,
      };

      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
      let localData = currentData ? JSON.parse(currentData) : [];
      if (isUpdate) {
        localData = localData.map((item: any) => item.id === entry.id ? { ...item, ...offlineData } : item);
      } else {
        localData.push(offlineData);
      }
      await AsyncStorage.setItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES, JSON.stringify(localData));

      await SyncManager.getInstance().addPendingOperation({
        table: 'uppad_jama_entries',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: entryData,
      });
      return true;
    }
  } catch (error) {
    console.error('Error saving uppad/jama entry:', error);
    // Fallback: best-effort local save when anything fails
    try {
      const currentDate = new Date().toISOString();
      const offlineData = {
        id: `temp_${Date.now()}`,
        person_name: (entry as any)?.person_name || '',
        description: (entry as any)?.description || '',
        amount: (entry as any)?.amount || 0,
        entry_type: (entry as any)?.entry_type || 'debit',
        entry_date: (entry as any)?.entry_date || currentDate,
        created_at: currentDate,
        updated_at: currentDate,
      };
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
      const localData = currentData ? JSON.parse(currentData) : [];
      localData.push(offlineData);
      await AsyncStorage.setItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES, JSON.stringify(localData));
      return true;
    } catch {}
    return false;
  }
};

export const getUppadJamaEntries = async (): Promise<UppadJamaEntry[]> => {
  console.log('Storage - getUppadJamaEntries - Function called');
  try {
    const online = await isOnline();
    console.log('Storage - getUppadJamaEntries - Online status:', online);
    
    if (online) {
      console.log('Storage - getUppadJamaEntries - Making Supabase query...');
      const { data, error } = await supabase
        .from('uppad_jama_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      console.log('Storage - getUppadJamaEntries - Supabase response:', { 
        dataLength: data?.length || 0, 
        error: error?.message || 'No error',
        hasData: !!data 
      });
      
      if (!error && data) {
        console.log('Storage - getUppadJamaEntries - Fetched from Supabase:', data.length, 'entries');
        console.log('Storage - getUppadJamaEntries - Sample data:', data.slice(0, 2));
        await AsyncStorage.setItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES, JSON.stringify(data));
        return data as any;
      } else if (error) {
        console.error('Storage - getUppadJamaEntries - Supabase error:', error);
      }
    }
    console.log('Storage - getUppadJamaEntries - Falling back to offline data');
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
    const offlineData = offline ? JSON.parse(offline) : [];
    console.log('Storage - getUppadJamaEntries - Offline data length:', offlineData.length);
    return offlineData;
  } catch (error) {
    console.error('Storage - getUppadJamaEntries - Catch block error:', error);
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
    const fallbackData = offline ? JSON.parse(offline) : [];
    console.log('Storage - getUppadJamaEntries - Fallback data length:', fallbackData.length);
    return fallbackData;
  }
};

// =====================================================
// 6c. E-WAY BILL PREFERENCES (cloud + local fallback)
// =====================================================
export interface EWayBillPrefs {
  vehicle_from: string;
  vehicle_no: string;
}

const EWB_VEHICLE_FROM_KEY = 'ewb_vehicle_from';
const EWB_VEHICLE_NO_KEY = 'ewb_vehicle_no';

export const getEWayBillPrefs = async (): Promise<EWayBillPrefs> => {
  try {
    // Start with local defaults
    const [localFrom, localNo] = await Promise.all([
      AsyncStorage.getItem(EWB_VEHICLE_FROM_KEY),
      AsyncStorage.getItem(EWB_VEHICLE_NO_KEY),
    ]);

    const base: EWayBillPrefs = {
      vehicle_from: localFrom || '',
      vehicle_no: localNo || '',
    };

    // Try cloud profile
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) return base;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('ewb_vehicle_from, ewb_vehicle_no')
      .eq('id', uid)
      .single();

    if (error) {
      // Column might not exist yet (schema not migrated) — ignore and use local
      return base;
    }

    const cloudFrom = (data as any)?.ewb_vehicle_from || '';
    const cloudNo = (data as any)?.ewb_vehicle_no || '';

    // Prefer cloud if available; also sync to local for quick startup
    const resolved: EWayBillPrefs = {
      vehicle_from: cloudFrom || base.vehicle_from,
      vehicle_no: cloudNo || base.vehicle_no,
    };
    await AsyncStorage.multiSet([
      [EWB_VEHICLE_FROM_KEY, resolved.vehicle_from],
      [EWB_VEHICLE_NO_KEY, resolved.vehicle_no],
    ]);
    return resolved;
  } catch (e) {
    return { vehicle_from: '', vehicle_no: '' };
  }
};

export const saveEWayBillPrefs = async (prefs: EWayBillPrefs): Promise<boolean> => {
  try {
    // Always persist locally
    await AsyncStorage.multiSet([
      [EWB_VEHICLE_FROM_KEY, prefs.vehicle_from || ''],
      [EWB_VEHICLE_NO_KEY, prefs.vehicle_no || ''],
    ]);

    // Try cloud update (best-effort)
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) return true;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        // These columns are optional — safe to ignore if schema doesn't have them
        ewb_vehicle_from: prefs.vehicle_from || null,
        ewb_vehicle_no: (prefs.vehicle_no || '').toUpperCase() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uid);

    if (error) {
      // If schema missing columns (e.g., PGRST204/42703), ignore and succeed with local-only save
      return true;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// =====================================================
// 6d. E-WAY BILL SETTINGS (username/password + prefs)
//     Stored in DB with client-side encryption for creds
// =====================================================
export interface EWayBillSettings {
  username: string;
  password: string;
  vehicle_from: string;
  vehicle_no: string;
}

const EWB_CRYPTO_SERVICE = 'ewb_crypto_key';
const EWB_LOGIN_SERVICE = 'ewaybill_login'; // for backward-compat fallback

const ensureEwbCryptoKey = async (): Promise<string> => {
  try {
    const existing = await Keychain.getGenericPassword({ service: EWB_CRYPTO_SERVICE });
    if (existing && existing.password) return existing.password;
  } catch {}
  // generate new 32-byte hex key
  const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  try {
    await Keychain.setGenericPassword('ewb', key, { service: EWB_CRYPTO_SERVICE });
  } catch {}
  return key;
};

const enc = (plain: string, key: string): string => {
  try { return CryptoJS.AES.encrypt(plain || '', key).toString(); } catch { return ''; }
};
const dec = (cipher: string, key: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher || '', key);
    return bytes.toString(CryptoJS.enc.Utf8) || '';
  } catch { return ''; }
};

export const getEWayBillSettings = async (): Promise<EWayBillSettings> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id || null;

    // Start with local prefs (existing mechanism)
    const basePrefs = await getEWayBillPrefs();

    // 1) Try Edge Function (server-side encryption)
    if (uid) {
      try {
        const { data, error } = await supabase.functions.invoke('quick-processor', {
          body: { action: 'ewb_get_settings' },
          headers: { 'Content-Type': 'application/json' },
        });
        if (!error && (data as any)?.ok) {
          const s = (data as any).settings || {};
          const username = (s.username || '') as string;
          const password = (s.password || '') as string;
          const vFrom = (s.vehicle_from || basePrefs.vehicle_from || '') as string;
          const vNo = ((s.vehicle_no || basePrefs.vehicle_no || '') as string).toUpperCase();
          // Sync local cache for fast startup and legacy flows
          await AsyncStorage.multiSet([
            [EWB_VEHICLE_FROM_KEY, vFrom || ''],
            [EWB_VEHICLE_NO_KEY, vNo || ''],
          ]);
          // Also keep legacy Keychain login for offline autofill
          try {
            if (username || password) {
              await Keychain.setGenericPassword(username || '', password || '', { service: EWB_LOGIN_SERVICE });
            }
          } catch {}
          return { username, password, vehicle_from: vFrom, vehicle_no: vNo };
        }
      } catch {}
    }

    // 2) Fallback: previous DB (client-side encryption) path
    let username = '';
    let password = '';
    if (uid) {
      const { data, error } = await supabase
        .from('ewb_settings')
        .select('ewb_username_enc, ewb_password_enc, vehicle_from, vehicle_no')
        .eq('id', uid)
        .single();
      if (!error && data) {
        const key = await ensureEwbCryptoKey();
        username = dec((data as any)?.ewb_username_enc || '', key);
        password = dec((data as any)?.ewb_password_enc || '', key);
        const vFrom = (data as any)?.vehicle_from ?? basePrefs.vehicle_from;
        const vNo = (data as any)?.vehicle_no ?? basePrefs.vehicle_no;
        await AsyncStorage.multiSet([
          [EWB_VEHICLE_FROM_KEY, vFrom || ''],
          [EWB_VEHICLE_NO_KEY, (vNo || '').toUpperCase()],
        ]);
        return {
          username: username || '',
          password: password || '',
          vehicle_from: vFrom || '',
          vehicle_no: (vNo || '').toUpperCase(),
        };
      }
    }

    // 3) Last fallback: legacy Keychain only + local prefs
    try {
      const creds = await Keychain.getGenericPassword({ service: EWB_LOGIN_SERVICE });
      if (creds) {
        username = creds.username || '';
        password = creds.password || '';
      }
    } catch {}

    return {
      username,
      password,
      vehicle_from: basePrefs.vehicle_from || '',
      vehicle_no: (basePrefs.vehicle_no || '').toUpperCase(),
    };
  } catch {
    return { username: '', password: '', vehicle_from: '', vehicle_no: '' };
  }
};

export const saveEWayBillSettings = async (settings: EWayBillSettings): Promise<boolean> => {
  try {
    // Always keep local cache for fast startup and legacy flows
    await AsyncStorage.multiSet([
      [EWB_VEHICLE_FROM_KEY, settings.vehicle_from || ''],
      [EWB_VEHICLE_NO_KEY, (settings.vehicle_no || '').toUpperCase()],
    ]);

    // Also keep legacy Keychain login (for immediate offline autofill)
    try {
      if ((settings.username || settings.password)) {
        await Keychain.setGenericPassword(settings.username || '', settings.password || '', { service: EWB_LOGIN_SERVICE });
      }
    } catch {}

    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id || null;
    if (!uid) return true; // succeed locally when offline/not authed

    // 1) Try Edge Function (server-side encryption)
    try {
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'ewb_save_settings',
          username: settings.username || '',
          password: settings.password || '',
          vehicle_from: settings.vehicle_from || '',
          vehicle_no: (settings.vehicle_no || '').toUpperCase(),
        },
        headers: { 'Content-Type': 'application/json' },
      });
      if (!error && (data as any)?.ok) return true;
    } catch {}
    
    // 2) Fallback: client-side encryption upsert
    const key = await ensureEwbCryptoKey();
    const payload = {
      id: uid,
      ewb_username_enc: enc(settings.username || '', key),
      ewb_password_enc: enc(settings.password || '', key),
      vehicle_from: settings.vehicle_from || null,
      vehicle_no: (settings.vehicle_no || '').toUpperCase() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('ewb_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
};

// =====================================================
// 5. NETWORK STATUS HELPER
// =====================================================
const isOnline = async (): Promise<boolean> => {
  try {
    // Require an authenticated session to consider "online"
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return false;

    // Perform a lightweight, RLS-compatible check
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', uid)
      .limit(1);

    return !error;
  } catch {
    return false;
  }
};

// =====================================================
// 5a. SYNC STATUS (used by App.tsx)
// =====================================================
export const getSyncStatus = async (): Promise<{
  lastSync: string | null;
  pendingOperations: number;
  isOnline: boolean;
}> => {
  try {
    const [lastSync, pendingStr, online] = await Promise.all([
      AsyncStorage.getItem(OFFLINE_KEYS.LAST_SYNC),
      AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC),
      isOnline(),
    ]);

    const pending = pendingStr ? JSON.parse(pendingStr) : [];
    const pendingOperations = Array.isArray(pending) ? pending.length : 0;

    return {
      lastSync: lastSync || null,
      pendingOperations,
      isOnline: online,
    };
  } catch {
    const online = await isOnline().catch(() => false);
    return { lastSync: null, pendingOperations: 0, isOnline: online };
  }
};

// =====================================================
// 6. USER PROFILE MANAGEMENT
// =====================================================
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return data as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const checkCashVerificationAccess = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('🔍 Checking cash verification access...');
    console.log('User:', user ? { id: user.id, email: user.email } : 'No user');
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false; // No authenticated user
    }

    // Check if user email is the admin email
    if (user.email === 'yashbhavsar175@gmail.com') {
      console.log('✅ Access granted - Admin email');
      return true;
    }

    // Check if user is admin or has screen access
    const profile = await getProfile(user.id);
    console.log('Profile:', profile);
    
    if (profile?.is_admin === true) {
      console.log('✅ Access granted - Admin user');
      return true;
    }

    // Check if user has specific screen access
    const screenAccess = profile?.screen_access || [];
    if (screenAccess.includes('CashVerificationScreen') || screenAccess.includes('CashHistoryScreen')) {
      console.log('✅ Access granted - Screen access permissions');
      return true;
    }

    console.log('❌ Access denied - Not admin, not authorized email, and no screen access');
    return false;
  } catch (error) {
    console.error('💥 Error checking cash verification access:', error);
    return false;
  }
};

export const checkScreenAccess = async (screenName: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Admin email has access to all screens
    if (user.email === 'yashbhavsar175@gmail.com') {
      return true;
    }

    // Check if user is admin (admin has access to all screens)
    const profile = await getProfile(user.id);
    if (profile?.is_admin === true) {
      return true;
    }

    // Check specific screen access
    const screenAccess = profile?.screen_access || [];
    return screenAccess.includes(screenName);
  } catch (error) {
    console.error('Error checking screen access:', error);
    return false;
  }
};

export const updateProfile = async (userId: string, fullName: string): Promise<boolean> => {
  try {
    const profile = await getProfile(userId);
    
    if (profile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;
      console.log('✅ Profile updated successfully.');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email?.split('@')[0] || '';
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({ id: userId, full_name: fullName, username: username });
      
      if (insertError) throw insertError;
      console.log('✅ New profile created successfully.');
    }

    return true;
  } catch (error) {
    console.error('💥 Error updating user profile:', error);
    return false;
  }
};

// =====================================================
// 6b. USER ADMIN HELPERS
// =====================================================
export const listAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserProfile[];
  } catch (error) {
    console.error('Error listing user profiles:', error);
    return [];
  }
};

export const listProfilesExceptCurrent = async (): Promise<UserProfile[]> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id || null;
    const email = (authData.user?.email || '').toLowerCase();
    const emailLocal = email.split('@')[0] || '';
    let query = supabase
      .from('user_profiles')
      .select('id, username, full_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (uid) {
      query = query.neq('id', uid);
    }
    if (emailLocal) {
      query = query
        .not('username', 'ilike', `%${emailLocal}%`)
        .not('full_name', 'ilike', `%${emailLocal}%`);
    }
    if (email) {
      query = query
        .not('username', 'ilike', `%${email}%`)
        .not('full_name', 'ilike', `%${email}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as UserProfile[];
  } catch (error) {
    console.error('Error listing user profiles (except current):', error);
    return [];
  }
};

export const setUserActive = async (userId: string, active: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user active status:', error);
    return false;
  }
};

export const createProfileIfMissing = async (userId: string, email: string, userType: 'normal' | 'majur' = 'normal'): Promise<boolean> => {
  try {
    // First check if profile already exists
    const existing = await getProfile(userId);
    if (existing) {
      console.log('✅ Profile already exists for user:', userId);
      return true;
    }

    console.log('🔄 Creating new profile for user:', userId);
    
    const username = email?.split('@')[0] || email || '';
    const { error } = await supabase
      .from('user_profiles')
      .insert({ 
        id: userId, 
        full_name: username, 
        username, 
        user_type: userType, 
        is_active: true,
        screen_access: []
      });

    if (error) {
      console.error('❌ Error creating profile for new user:', error);
      
      // Check if error is because profile already exists
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('already exists')) {
        console.log('ℹ️ Profile already exists (duplicate key error), returning success');
        return true;
      }
      
      throw error;
    }
    
    console.log('✅ Profile created successfully for user:', userId);
    return true;
  } catch (error: any) {
    console.error('💥 Failed to create profile for new user:', error);
    
    // If it's a duplicate key error, consider it success
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      console.log('ℹ️ Profile creation failed due to duplicate, but profile exists - returning success');
      return true;
    }
    
    throw error;
  }
};

// =====================================================
// 6c. PHONE AND OTP HELPERS
// =====================================================
export const setUserPhoneNumber = async (userId: string, phone: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ phone_number: (phone || '').trim(), updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error updating phone number:', e);
    return false;
  }
};

export const generateAndStoreOtp = async (userId: string): Promise<{ code: string } | null> => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    
    // Store OTP in database
    const { error } = await supabase
      .from('otp_codes')
      .insert([{ user_id: userId, code, expires_at: expiresAt }]);
    if (error) throw error;
    
    // Get user email to send OTP
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      console.log('📧 Attempting to send OTP to:', user.email);
      
      // Try to send OTP via email
      const emailSent = await deliverOtpAlternative({ 
        email: user.email, 
        code: code 
      });
      
      if (emailSent) {
        console.log('✅ OTP email sent successfully');
      } else {
        console.warn('⚠️ OTP email failed, but OTP stored in database');
        // For debugging - log OTP to console
        console.log(`🔐 DEBUG OTP for ${user.email}: ${code}`);
      }
    }
    
    return { code };
  } catch (e) {
    const err: any = e;
    console.error('Error generating OTP:', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
      raw: err,
    });
    return null;
  }
};

export const verifyOtpCode = async (userId: string, code: string): Promise<boolean> => {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', (code || '').trim())
      .eq('used', false)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const hit = (data || [])[0];
    if (!hit) return false;

    const { error: updErr } = await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', hit.id);
    if (updErr) throw updErr;

    return true;
  } catch (e) {
    console.error('Error verifying OTP:', e);
    return false;
  }
};

// Attempt to deliver OTP via Supabase Edge Function (email only). Falls back to false if not configured.
// Fixed deliverOtp function in Storage.ts
export const deliverOtp = async (opts: { email: string; code: string }): Promise<boolean> => {
  try {
    // Try to get the current session (optional)
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    // Prepare the request payload
    const payload = {
      action: 'send_otp',
      email: opts.email,
      code: opts.code,
      timestamp: new Date().toISOString()
    };

    console.log('Sending Edge Function request with payload:', payload);

    // Make the Edge Function call with explicit headers
    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      }
    });
    
    console.log('Edge Function response:', { data, error });
    
    if (error) {
      console.error('Edge Function error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      });
      return false;
    }
    
    // Check if the response indicates success (data might be empty object if function returns nothing)
    const isSuccess = data?.success === true || 
                     data?.sent === true || 
                     data?.status === 'sent' ||
                     data?.status === 'success';
    // @ts-ignore
    return isSuccess;
    
  } catch (e) {
    const err: any = e;
    console.error('deliverOtp failed with exception:', {
      message: err?.message,
      status: err?.status,
      context: err?.context,
      stack: err?.stack
    });
    return false;
  }
};

// Enhanced OTP delivery with fallback options
export const deliverOtpRobust = async (opts: { email: string; code: string }): Promise<{
  success: boolean;
  method: 'edge_function' | 'fallback' | 'failed';
  message: string;
}> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    try {
      console.log('🚀 Attempting to send OTP via Edge Function...');

      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_otp',
          email: opts.email,
          code: opts.code,
          timestamp: new Date().toISOString()
        },
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
      });

      if (!error && data && (data.success === true || data.sent === true)) {
        return {
          success: true,
          method: 'edge_function',
          message: data.message || 'OTP sent via email successfully'
        };
      }

      throw new Error(data?.error || error?.message || 'Edge Function failed');

    } catch (edgeFunctionError: any) {
      console.error('💥 Edge Function failed:', edgeFunctionError);
      return {
        success: false,
        method: 'failed',
        message: `Email delivery failed: ${edgeFunctionError.message || 'Unknown error'}`
      };
    }
    
  } catch (error: any) {
    console.error('💥 Complete OTP delivery failure:', error);
    return {
      success: false,
      method: 'failed',
      message: 'Unexpected error occurred during email delivery'
    };
  }
};
export const deliverOtpSimple = async (opts: { email: string; code: string }): Promise<boolean> => {
  const result = await deliverOtpRobust(opts);
  return result.success;
};
export const deliverOtpBypass = async (opts: { email: string; code: string }): Promise<boolean> => {
  // For immediate testing - always return true and log OTP
  console.log(`🔐 DEBUG OTP for ${opts.email}: ${opts.code}`);
  
  // You can also store it temporarily in AsyncStorage for manual retrieval
  try {
    await AsyncStorage.setItem('debug_last_otp', JSON.stringify({
      email: opts.email,
      code: opts.code,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Failed to store debug OTP:', e);
  }
  
  return true;
};

// =====================================================
// 7. HISTORY LOGGING
// =====================================================
export const logHistory = async (action: 'add' | 'update' | 'delete', tableName: string, recordId: string, details: any): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const profile = await getProfile(user.id);
    const logData = {
      user_id: user.id,
      user_name: profile?.full_name || 'Anonymous',
      action: action,
      table_name: tableName,
      record_id: recordId,
      details: details,
    };

    const { error } = await supabase
      .from('history_logs')
      .insert([logData]);

    if (error) {
      console.error('Error logging history:', error);
    }
  } catch (error) {
    console.error('Failed to create history log:', error);
  }
};

export const getHistoryLogs = async (): Promise<HistoryLog[]> => {
  try {
    const { data, error } = await supabase
      .from('history_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as HistoryLog[];
  } catch (error) {
    console.error('Error fetching history logs:', error);
    return [];
  }
};

// =====================================================
// 8. AGENCY MANAGEMENT
// =====================================================
export const saveAgency = async (agencyName: string): Promise<boolean> => {
  try {
    const online = await isOnline();
    const agencyData = {
      name: agencyName.trim(),
      created_by: (await supabase.auth.getUser()).data.user?.id
    };

    if (online) {
      const { data, error } = await supabase
        .from('agencies')
        .insert([agencyData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { 
          return false;
        }
        throw error;
      }
      await saveToOfflineStorage(OFFLINE_KEYS.AGENCIES, data);
      await logHistory('add', 'agencies', data.id, { name: agencyName });
      return true;
    } else {
      const tempId = `temp_${Date.now()}`;
      const offlineData = { ...agencyData, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await saveToOfflineStorage(OFFLINE_KEYS.AGENCIES, offlineData);
      await SyncManager.getInstance().addPendingOperation({
        table: 'agencies',
        action: 'INSERT',
        data: agencyData
      });
      return true;
    }
  } catch (error) {
    console.error('Error saving agency:', error);
    return false;
  }
};

export const getAgencies = async (): Promise<Agency[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name');

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCIES, JSON.stringify(data));
        return data;
      }
    }

    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCIES);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting agencies:', error);
    return [];
  }
};

// =====================================================
// 8b. PERSON MANAGEMENT
// =====================================================
export interface SavePersonResult {
  ok: boolean;
  reason?: 'duplicate' | 'offline' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

export const savePerson = async (personName: string): Promise<SavePersonResult> => {
  try {
    const online = await isOnline();
    const nowIso = new Date().toISOString();
    const personData = {
      name: personName.trim(),
      created_by: (await supabase.auth.getUser()).data.user?.id,
      created_at: nowIso,
      updated_at: nowIso,
    } as any;

    if (online) {
      const { data, error } = await supabase
        .from('persons')
        .insert([personData])
        .select()
        .single();

      if (error) {
        const errAny: any = error;
        const code = errAny?.code;
        const detail = errAny?.details || errAny?.hint || errAny?.message || '';
        if (code === '23505') {
          // duplicate (unique constraint violation)
          return { ok: false, reason: 'duplicate', errorCode: code, errorMessage: detail };
        }
        return { ok: false, reason: 'error', errorCode: code, errorMessage: detail };
      }
      await saveToOfflineStorage(OFFLINE_KEYS.PERSONS, data);
      await logHistory('add', 'persons', (data as any).id, { name: personName });
      return { ok: true };
    } else {
      const tempId = `temp_${Date.now()}`;
      const offlineData = { ...personData, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await saveToOfflineStorage(OFFLINE_KEYS.PERSONS, offlineData);
      await SyncManager.getInstance().addPendingOperation({
        table: 'persons',
        action: 'INSERT',
        data: personData
      });
      return { ok: true, reason: 'offline' };
    }
  } catch (error) {
    console.error('Error saving person:', error);
    const err: any = error;
    return { ok: false, reason: 'error', errorCode: err?.code, errorMessage: err?.message };
  }
};

export const getPersons = async (): Promise<Person[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .order('name');

      console.log('[getPersons] Supabase data:', data, 'error:', error);

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.PERSONS, JSON.stringify(data));
        return data as Person[];
      }
    }

    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.PERSONS);
    console.log('[getPersons] Offline data:', offline);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting persons:', error);
    return [];
  }
};
export const deliverOtpWithDetailedLogging = async (opts: { email: string; code: string }): Promise<{
  success: boolean;
  method: string;
  error?: string;
  statusCode?: number;
  responseData?: any;
}> => {
  try {
    console.log('🚀 Starting OTP delivery process...');
    
    // Get the current session with detailed logging
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return {
        success: false,
        method: 'session_check',
        error: `Session error: ${sessionError.message}`
      };
    }

    const accessToken = sessionData?.session?.access_token;
    const user = sessionData?.session?.user;
    
    console.log('🔐 Session info:', {
      hasAccessToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (!accessToken) {
      console.log('ℹ️ No access token available; proceeding without Authorization header.');
    }

    // Prepare the request payload
    const payload = {
      action: 'send_otp',
      email: opts.email,
      code: opts.code,
      timestamp: new Date().toISOString(),
      userId: user?.id
    };

    console.log('📤 Sending Edge Function request:', {
      functionName: 'quick-processor',
      payload: payload,
      hasToken: !!accessToken
    });

    // Make the Edge Function call with enhanced error handling
    try {
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      });
      
      console.log('📨 Edge Function raw response:', {
        data: data,
        error: error,
        hasData: !!data,
        hasError: !!error
      });
      
      if (error) {
        console.error('❌ Edge Function error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: error.status,
          context: error.context
        });

        // Fallback: direct fetch to functions endpoint without Authorization header
        try {
          console.log('🔁 Trying direct fetch fallback to Edge Function...');
          const res = await fetch(`${SUPABASE_URL}/functions/v1/quick-processor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json: any = await res.json().catch(() => null);
          console.log('📨 Fallback response:', res.status, json);
          const ok = res.ok && ((json?.success === true) || (json?.sent === true) || (json?.ok === true) || (json?.status === 'success') || (json?.status === 'sent'));
          return { // Property 'success' does not exist on type '{}'.
            success: !!ok,
            method: ok ? 'fallback_direct_fetch' : 'edge_function',
            error: ok ? undefined : (json?.error || json?.message || error.message || 'Edge Function error'),
            statusCode: res.status,
            responseData: json
          };
        } catch (fallbackError: any) {
          console.error('❌ Direct fetch fallback failed:', fallbackError);
          return {
            success: false,
            method: 'edge_function',
            error: `Invoke error: ${error.message} | Fallback error: ${fallbackError.message}`,
            statusCode: error.status,
            responseData: { invokeError: error, fallbackError }
          };
        }
      }
      
      // Check if the response indicates success
      const isSuccess = data?.success === true || 
                       data?.sent === true || 
                       data?.status === 'sent' ||
                       data?.status === 'success';
      
      console.log('✅ Edge Function success check:', {
        isSuccess,
        dataSuccess: data?.success,
        dataSent: data?.sent,
        dataStatus: data?.status,
        message: data?.message
      });
      
      return {
        success: isSuccess,
        method: 'edge_function',
        responseData: data,
        error: isSuccess ? undefined : (data?.error || data?.message || 'Unknown edge function error')
      };
      
    } catch (invokeError: any) {
      console.error('❌ Edge Function invoke error:', invokeError);
      
      return {
        success: false,
        method: 'edge_function_invoke',
        error: `Invoke error: ${invokeError.message}`,
        responseData: invokeError
      };
    }
    
  } catch (outerError: any) {
    console.error('❌ Outer delivery error:', outerError);
    return {
      success: false,
      method: 'outer_catch',
      error: `Unexpected error: ${outerError.message}`
    };
  }
};
export const testEdgeFunctionConnection = async (): Promise<{
  available: boolean;
  response?: any;
  error?: string;
}> => {
  try {
    console.log('🧪 Testing Edge Function connection...');
    
    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: {
        action: 'test',
        timestamp: new Date().toISOString()
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 Test response:', { data, error });
    
    if (error) {
      // Fallback: direct fetch to functions endpoint (works like your PowerShell test)
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/quick-processor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test', timestamp: new Date().toISOString() })
        });
        const json = await res.json().catch(() => null);
        console.log('🧪 Direct fetch test response:', res.status, json);
        if (res.ok) {
          return { available: true, response: json };
        }
        return { available: false, error: `HTTP ${res.status}`, response: json };
      } catch (fe: any) {
        return { available: false, error: fe?.message || 'Direct fetch failed', response: fe };
      }
    }
    
    return {
      available: true,
      response: data
    };
    
  } catch (error: any) {
    return {
      available: false,
      error: error.message,
      response: error
    };
  }
};

export const deliverOtpAlternative = async (opts: { email: string; code: string }): Promise<boolean> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    console.log('Sending OTP via Edge Function to:', opts.email);

    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: {
        action: 'send_otp',
        email: opts.email,
        code: opts.code,
        timestamp: new Date().toISOString()
      },
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      }
    });

    if (error) {
      console.warn('Edge Function invoke error (will try fallback):', error?.message || error);
      // Fallback: direct fetch to functions endpoint without Authorization header
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/quick-processor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_otp',
            email: opts.email,
            code: opts.code,
            timestamp: new Date().toISOString()
          })
        });
        const json: any = await res.json().catch(() => null);
        console.log('📨 Direct fetch response:', res.status, json);
        
        // Handle rate limiting
        if (res.status === 429) {
          console.warn('⚠️ Rate limit hit, waiting 30 seconds...');
          const retryAfter = json?.error?.includes('29s') ? 30 : 60;
          console.log(`⏳ Waiting ${retryAfter} seconds before retry...`);
          return false; // Don't retry automatically, let user try again
        }
        
        if (!res.ok) return false;
        const ok = (json?.success === true) || (json?.sent === true) || (json?.ok === true) || (json?.status === 'success') || (json?.status === 'sent');
        return !!ok;
      } catch (fe) {
        console.error('Direct fetch fallback failed:', fe);
        return false;
      }
    }

    const isSuccessAlt = (data?.success === true) || (data?.sent === true) || (data?.ok === true) || (data?.status === 'success') || (data?.status === 'sent');

    if (isSuccessAlt) {
      console.log('OTP email sent successfully!');
      return true;
    }

    console.error('Edge Function returned unsuccessful response:', data);
    return false;

  } catch (error) {
    console.error('Complete OTP delivery failure:', error);
    return false;
  }
};
export const debugEdgeFunctionStatus = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user:', {
      id: user?.id,
      email: user?.email,
      authenticated: !!user
    });
    
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('🔐 Session data:', {
      hasSession: !!sessionData?.session,
      hasAccessToken: !!sessionData?.session?.access_token,
      tokenPreview: sessionData?.session?.access_token?.substring(0, 20) + '...'
    });
    
    // Test a simple Edge Function call
    const testResult = await testEdgeFunctionConnection();
    console.log('🧪 Edge Function test result:', testResult);
    
    // Check if you can access other Supabase features
    const { data: tableTest, error: tableError } = await supabase
      .from('agencies')
      .select('count')
      .limit(1);
    
    console.log('📊 Database access test:', {
      success: !tableError,
      error: tableError?.message,
      data: tableTest
    });
    
  } catch (error: any) {
    console.error('❌ Debug function failed:', error);
  }
};
export const deliverOtpWithDetailedDebug = async (opts: { 
  email: string; 
  code: string; 
}): Promise<{
  success: boolean;
  method: string;
  error?: string;
  debugInfo?: any;
}> => {
  try {
    console.log('🚀 Starting enhanced OTP delivery...');
    
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const user = sessionData?.session?.user;

    console.log('📋 Session details:', {
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none',
      userEmail: user?.email,
      userId: user?.id?.substring(0, 8) + '...'
    });

    const payload = {
      action: 'send_otp',
      email: opts.email,
      code: opts.code,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending payload:', {
      action: payload.action,
      email: payload.email.substring(0, 3) + '***@' + payload.email.split('@')[1],
      codeLength: payload.code.length,
      timestamp: payload.timestamp
    });

    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      }
    });

    console.log('📨 Edge Function response:', {
      hasData: !!data,
      hasError: !!error,
      data: data,
      error: error
    });

    if (error) {
      // Try direct fetch fallback like deliverOtpAlternative
      console.warn('⚠️ Invoke error, attempting direct fetch fallback...', error);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/quick-processor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json: any = await res.json().catch(() => null);
        console.log('📨 Direct fetch response:', res.status, json);
        const ok = res.ok && ((json?.success === true) || (json?.sent === true) || (json?.ok === true) || (json?.status === 'success') || (json?.status === 'sent'));
        return {
          success: !!ok,
          method: ok ? 'fallback_direct_fetch' : 'edge_function_error',
          error: ok ? undefined : (json?.error || json?.message || error.message || 'Edge Function error'),
          debugInfo: {
            invokeError: error,
            statusCode: res.status,
            fallbackResponse: json
          }
        };
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error('❌ Direct fetch fallback failed:', error);
        return {
          success: false,
          method: 'edge_function_error',
          error: `Invoke error: ${error.message} | Fallback error: ${errorMessage}`,
          debugInfo: {
            invokeError: error,
            fallbackError: error
          }
        };
      }
    }

    const isSuccess = (data?.success === true) || (data?.sent === true) || (data?.ok === true) || (data?.status === 'success') || (data?.status === 'sent');
    
    return {
      success: isSuccess,
      method: 'edge_function',
      error: isSuccess ? undefined : (data?.error || 'Unknown error'),
      debugInfo: {
        responseData: data,
        emailId: data?.emailId
      }
    };

  } catch (outerError: any) {
    console.error('💥 Outer delivery error:', outerError);
    return {
      success: false,
      method: 'exception',
      error: outerError.message,
      debugInfo: {
        stack: outerError.stack,
        name: outerError.name
      }
    };
  }
};
export const comprehensiveEdgeFunctionDebug = async (): Promise<{
  results: any[];
  summary: {
    authentication: boolean;
    edgeFunction: boolean;
    emailService: boolean;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  };
}> => {
  const results = [];
  const summary: {
    authentication: boolean;
    edgeFunction: boolean;
    emailService: boolean;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } = {
    authentication: false,
    edgeFunction: false,
    emailService: false,
    overallHealth: 'critical'
  };

  console.log('🔍 Starting comprehensive Edge Function debugging...');

  // Step 1: Check Authentication
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    const authResult = {
      step: 'Authentication Check',
      success: !!user && !!sessionData?.session,
      details: {
        hasUser: !!user,
        userId: user?.id?.substring(0, 8) + '...' || 'none',
        userEmail: user?.email || 'none',
        hasSession: !!sessionData?.session,
        hasAccessToken: !!sessionData?.session?.access_token,
        tokenLength: sessionData?.session?.access_token?.length || 0,
        userError: userError?.message,
        sessionError: sessionError?.message
      }
    };
    
    results.push(authResult);
    summary.authentication = authResult.success;
    console.log('👤 Auth check:', authResult);
    
  } catch (error: any) {
    results.push({
      step: 'Authentication Check',
      success: false,
      error: error.message
    });
    console.error('❌ Auth check failed:', error);
  }

  // Step 2: Test Edge Function Connectivity
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    console.log('🧪 Testing Edge Function connectivity...');
    
    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: {
        action: 'test',
        timestamp: new Date().toISOString(),
        debug: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const connectivityResult = {
      step: 'Edge Function Connectivity',
      success: !error && data?.success === true,
      details: {
        hasError: !!error,
        errorMessage: error?.message,
        errorContext: error?.context,
        responseData: data,
        hasSuccessResponse: data?.success === true
      }
    };
    
    results.push(connectivityResult);
    summary.edgeFunction = connectivityResult.success;
    console.log('🔌 Edge Function connectivity:', connectivityResult);
    
  } catch (error: any) {
    results.push({
      step: 'Edge Function Connectivity',
      success: false,
      error: error.message
    });
    console.error('❌ Edge Function connectivity failed:', error);
  }

  // Step 3: Test Email Service (if Edge Function is working)
  if (summary.edgeFunction) {
    try {
      console.log('📧 Testing email service...');
      
      const { data: sessionData } = await supabase.auth.getSession();
      const testEmail = 'test@example.com'; // Use a test email
      const testOtp = '123456';
      
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_otp',
          email: testEmail,
          code: testOtp,
          timestamp: new Date().toISOString(),
          isTest: true
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData?.session?.access_token}`
        }
      });
      
      const emailResult = {
        step: 'Email Service Test',
        success: !error && (data?.success === true || data?.sent === true),
        details: {
          hasError: !!error,
          errorMessage: error?.message,
          responseData: data,
          emailSent: data?.sent === true || data?.success === true
        }
      };
      
      results.push(emailResult);
      summary.emailService = emailResult.success;
      console.log('📨 Email service test:', emailResult);
      
    } catch (error: any) {
      results.push({
        step: 'Email Service Test',
        success: false,
        error: error.message
      });
      console.error('❌ Email service test failed:', error);
    }
  } else {
    results.push({
      step: 'Email Service Test',
      success: false,
      error: 'Skipped due to Edge Function connectivity issues'
    });
  }

  // Step 4: Database connectivity check
  try {
    console.log('🗄️ Testing database connectivity...');
    
    const { data, error } = await supabase
      .from('agencies')
      .select('count')
      .limit(1);
    
    const dbResult = {
      step: 'Database Connectivity',
      success: !error,
      details: {
        hasError: !!error,
        errorMessage: error?.message,
        canQueryData: !!data
      }
    };
    
    results.push(dbResult);
    console.log('💾 Database connectivity:', dbResult);
    
  } catch (error: any) {
    results.push({
      step: 'Database Connectivity',
      success: false,
      error: error.message
    });
    console.error('❌ Database connectivity failed:', error);
  }

  // Determine overall health
  if (summary.authentication && summary.edgeFunction && summary.emailService) {
    summary.overallHealth = 'healthy';
  } else if (summary.authentication && summary.edgeFunction) {
    summary.overallHealth = 'degraded'; // This line is intentionally kept as 'degraded'
  } else {
    summary.overallHealth = 'critical';
  }

  console.log('🏥 Health Summary:', summary);
  console.log('📋 Full Results:', results);

  return { results, summary };
}; 

export const debugEdgeFunctionDetailed = async (): Promise<{
  success: boolean;
  details: any;
  recommendations: string[];
}> => {
  const details: any = {
    authentication: {},
    edgeFunction: {},
    environment: {},
    connectivity: {}
  };
  const recommendations: string[] = [];

  try {
    console.log('🔍 Starting detailed Edge Function debugging...');
    
    // Step 1: Check authentication thoroughly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    details.authentication = {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + '...' || 'none',
      userEmail: user?.email || 'none',
      hasSession: !!sessionData?.session,
      hasAccessToken: !!sessionData?.session?.access_token,
      tokenLength: sessionData?.session?.access_token?.length || 0,
      userError: userError?.message,
      sessionError: sessionError?.message,
      sessionValid: !!sessionData?.session && !sessionError
    };

    if (!user || !sessionData?.session) {
      recommendations.push('Authentication issue: User not logged in or session invalid');
    }

    // Step 2: Test basic Edge Function connectivity with minimal payload
    if (sessionData?.session?.access_token) {
      try {
        console.log('🧪 Testing basic Edge Function connectivity...');
        
        const response = await supabase.functions.invoke('quick-processor', {
          body: { action: 'test' },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          }
        });
        
        details.edgeFunction = {
          invocationSuccess: !response.error,
          responseData: response.data,
          errorMessage: response.error?.message,
          errorStatus: response.error?.status,
          errorContext: response.error?.context,
          hasData: !!response.data
        };

        if (response.error) {
          recommendations.push(`Edge Function error: ${response.error.message}`);
          
          // Specific error analysis
          if (response.error.message?.includes('non-2xx status code')) {
            recommendations.push('Edge Function is returning an error status code - check function logs');
          }
          if (response.error.message?.includes('timeout')) {
            recommendations.push('Edge Function is timing out - check function performance');
          }
          if (response.error.message?.includes('not found')) {
            recommendations.push('Edge Function not found - verify function name and deployment');
          }
        }
        
      } catch (invokeError: any) {
        details.edgeFunction = {
          invocationSuccess: false,
          invokeError: invokeError.message,
          errorType: 'invoke_exception'
        };
        recommendations.push(`Edge Function invoke error: ${invokeError.message}`);
      }
    } else {
      details.edgeFunction = {
        skipped: true,
        reason: 'No access token available'
      };
      recommendations.push('Cannot test Edge Function - no access token');
    }

    // Step 3: Check database connectivity
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('count')
        .limit(1);
      
      details.connectivity = {
        databaseSuccess: !error,
        databaseError: error?.message,
        canQueryData: !!data
      };

      if (error) {
        recommendations.push(`Database connectivity issue: ${error.message}`);
      }
    } catch (dbError: any) {
      details.connectivity = {
        databaseSuccess: false,
        databaseError: dbError.message
      };
      recommendations.push(`Database error: ${dbError.message}`);
    }

    // Step 4: Environment checks
    details.environment = {
      hasSupabase: !!supabase,
      currentUrl: (typeof globalThis !== 'undefined' && (globalThis as any).location?.href) || 'native-app',
      timestamp: new Date().toISOString()
    };

    const success = details.authentication.sessionValid && 
                   details.edgeFunction.invocationSuccess && 
                   details.connectivity.databaseSuccess;

    if (recommendations.length === 0) {
      recommendations.push('All systems appear to be functioning correctly');
    }

    return {
      success,
      details,
      recommendations
    };

  } catch (outerError: any) {
    return {
      success: false,
      details: {
        ...details,
        outerError: outerError.message
      },
      recommendations: [`Critical error during debugging: ${outerError.message}`]
    };
  }
};

export const testEdgeFunctionWithLogs = async (): Promise<{
  success: boolean;
  logs: string[];
  response?: any;
  error?: string;
}> => {
  const logs: string[] = [];
  
  try {
    logs.push('🚀 Starting Edge Function test with detailed logging...');
    
    // Get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logs.push(`❌ Session error: ${sessionError.message}`);
      return { success: false, logs, error: sessionError.message };
    }
    
    if (!sessionData?.session?.access_token) {
      logs.push('❌ No access token available');
      return { success: false, logs, error: 'No access token' };
    }
    
    logs.push('✅ Session and token validated');
    
    // Test with minimal payload first
    logs.push('📤 Testing with minimal test payload...');
    
    const testPayload = {
      action: 'test',
      timestamp: new Date().toISOString()
    };
    
    logs.push(`📦 Payload: ${JSON.stringify(testPayload)}`);
    
    const { data, error } = await supabase.functions.invoke('quick-processor', {
      body: testPayload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    });
    
    logs.push(`📨 Response received - Has error: ${!!error}, Has data: ${!!data}`);
    
    if (error) {
      logs.push(`❌ Error details: ${JSON.stringify({
        message: error.message,
        status: error.status,
        context: error.context
      })}`);
      return { success: false, logs, error: error.message, response: { error, data } };
    }
    
    if (data) {
      logs.push(`✅ Success data: ${JSON.stringify(data)}`);
    }
    
    logs.push('🎉 Edge Function test completed successfully');
    
    return { success: true, logs, response: data };
    
  } catch (exception: any) {
    logs.push(`💥 Exception during test: ${exception.message}`);
    return { success: false, logs, error: exception.message };
  }
};

export const validateEdgeFunctionEnvironment = async (): Promise<{
  valid: boolean;
  issues: string[];
  environment: any;
}> => {
  const issues: string[] = [];
  const environment: any = {};
  
  try {
    // Check Supabase client
    environment.hasSupabaseClient = !!supabase;
    if (!supabase) {
      issues.push('Supabase client not initialized');
    }
    
    // Check auth state
    const { data: { user } } = await supabase.auth.getUser();
    environment.authenticated = !!user;
    if (!user) {
      issues.push('User not authenticated');
    }
    
    // Check session
    const { data: sessionData } = await supabase.auth.getSession();
    environment.hasValidSession = !!sessionData?.session;
    environment.hasAccessToken = !!sessionData?.session?.access_token;
    
    if (!sessionData?.session) {
      issues.push('No valid session available');
    }
    
    if (!sessionData?.session?.access_token) {
      issues.push('No access token in session');
    }
    
    // Try to check if functions are available
    try {
      // This is a way to check if the functions client exists
      environment.hasFunctionsClient = !!supabase.functions;
      if (!supabase.functions) {
        issues.push('Supabase Functions client not available');
      }
    } catch (e) {
      issues.push('Cannot access Supabase Functions client');
      environment.hasFunctionsClient = false;
    }
    
    const valid = issues.length === 0;
    
    return {
      valid,
      issues,
      environment
    };
    
  } catch (error: any) {
    issues.push(`Environment validation error: ${error.message}`);
    return {
      valid: false,
      issues,
      environment
    };
  }
};

// =====================================================
// 9. AGENCY PAYMENTS
// =====================================================
export const saveAgencyPayment = async (payment: Partial<AgencyPayment> & { agency_name: string; amount: number; bill_no: string; }): Promise<boolean> => {
  try {
    const online = await isOnline();
    const agencies = await getAgencies();
    const agency = agencies.find(a => a.name === payment.agency_name);
    const isUpdate = !!payment.id;
    
    const paymentData: any = {
      ...(isUpdate && { id: payment.id }),
      agency_name: payment.agency_name,
      amount: payment.amount,
      bill_no: payment.bill_no,
      payment_date: payment.payment_date || new Date().toISOString(),
      agency_id: agency?.id || null,
      updated_at: new Date().toISOString(),
      ...(!isUpdate && { created_by: (await supabase.auth.getUser()).data.user?.id })
    };

    if (online) {
      let data: any, error;
      
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('agency_payments')
          .update(paymentData)
          .eq('id', payment.id as string)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('agency_payments')
          .insert([paymentData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }

      if (error) throw error;

      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_PAYMENTS);
      let localData = currentData ? JSON.parse(currentData) : [];

      if (isUpdate && payment.id) {
        if (payment.id.startsWith('temp_')) {
          // Replace the temp record with the inserted server record
          localData = localData.map((item: any) =>
            item.id === payment.id ? { ...item, ...data } : item
          );
        } else {
          localData = localData.map((item: any) =>
            item.id === payment.id ? { ...item, ...data } : item
          );
        }
      } else if (data) {
        localData.push(data);
      }

      await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_PAYMENTS, JSON.stringify(localData));

      if ((!isUpdate || (payment.id && payment.id.startsWith('temp_'))) && data) {
        await logHistory('add', 'agency_payments', data.id, paymentData);
      } else if (isUpdate && payment.id && !payment.id.startsWith('temp_')) {
        await logHistory('update', 'agency_payments', payment.id, paymentData);
      }

      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = { 
        ...paymentData,
        ...(isUpdate ? {} : { id: `temp_${Date.now()}` }),
        created_at: isUpdate ? payment.created_at : currentDate,
        updated_at: currentDate,
        payment_date: payment.payment_date || currentDate
      };
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_PAYMENTS);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate && payment.id) {
        localData = localData.map((item: any) => 
          item.id === payment.id ? { ...item, ...offlineData } : item
        );
      } else {
        localData.push(offlineData);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_PAYMENTS, JSON.stringify(localData));
      
      await SyncManager.getInstance().addPendingOperation({
        table: 'agency_payments',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: paymentData
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving agency payment:', error);
    return false;
  }
};

export const getAgencyPaymentsLocal = async (): Promise<AgencyPayment[]> => {
  try {
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_PAYMENTS);
    let localData = offline ? JSON.parse(offline) : [];
    
    const online = await isOnline();
    if (online) {
      try {
        const { data, error } = await supabase
          .from('agency_payments')
          .select('*')
          .order('payment_date', { ascending: false });

        if (!error && data) {
          const localIds = localData.map((item: any) => item.id);
          const supabaseDataWithDate = data.map(item => ({
            ...item,
            date: item.payment_date || item.created_at
          }));
          
          const newItems = supabaseDataWithDate.filter(item => !localIds.includes(item.id));
          
          if (newItems.length > 0) {
            localData = [...localData, ...newItems];
            localData.sort((a: any, b: any) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime());
            
            await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_PAYMENTS, JSON.stringify(localData));
          }
        }
      } catch (error) {
        console.error('Failed to fetch from Supabase, using local data:', error);
      }
    }
    
    // Filter out deleted entries from local data
    localData = localData.filter((item: any) => !item.deleted_at);
    
    return localData;
  } catch (error) {
    console.error('Error getting agency payments:', error);
    return [];
  }
};

// =====================================================
// 10. AGENCY MAJURI
// =====================================================
export const saveAgencyMajuri = async (majuri: Partial<AgencyMajuri> & { agency_name: string; amount: number; description?: string }): Promise<boolean> => {
  try {
    const online = await isOnline();
    const agencies = await getAgencies();
    const agency = agencies.find(a => a.name === majuri.agency_name);
    const isUpdate = !!majuri.id;
    
    const majuriData: any = {
      ...(isUpdate && { id: majuri.id }),
      agency_name: majuri.agency_name,
      amount: majuri.amount,
      description: majuri.description || '',
      majuri_date: majuri.majuri_date || new Date().toISOString(),
      agency_id: agency?.id || null,
      updated_at: new Date().toISOString(),
      ...(!isUpdate && { created_by: (await supabase.auth.getUser()).data.user?.id })
    };

    if (online) {
      let data: any, error;
      
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('agency_majuri')
          .update(majuriData)
          .eq('id', majuri.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else if (agency?.id) {
        const { data: inserted, error: insertError } = await supabase
          .from('agency_majuri')
          .insert([{
            ...majuriData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }
      
      if (error) throw error;
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_MAJURI);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === majuri.id ? { ...item, ...data } : item
        );
      } else if (data) {
        localData.push(data);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_MAJURI, JSON.stringify(localData));
      
      if (!isUpdate && data) {
        await logHistory('add', 'agency_majuri', data.id, majuriData);
      } else if (isUpdate) {
        await logHistory('update', 'agency_majuri', majuri.id!, majuriData);
      }
      
      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = { 
        ...majuriData,
        ...(isUpdate ? {} : { id: `temp_${Date.now()}` }),
        created_at: isUpdate ? majuri.created_at : currentDate,
        updated_at: currentDate,
        majuri_date: majuri.majuri_date || currentDate
      };
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_MAJURI);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === majuri.id ? { ...item, ...offlineData } : item
        );
      } else {
        localData.push(offlineData);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_MAJURI, JSON.stringify(localData));
      
      await SyncManager.getInstance().addPendingOperation({
        table: 'agency_majuri',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: majuriData
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving agency majuri:', error);
    return false;
  }
};

export const getAgencyMajuri = async (): Promise<AgencyMajuri[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('agency_majuri')
        .select('*')
        .order('majuri_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_MAJURI, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_MAJURI);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting agency majuri:', error);
    return [];
  }
};

// =====================================================
// 11. DRIVER TRANSACTIONS
// =====================================================
export const saveDriverTransaction = async (transaction: Partial<DriverTransaction> & { 
  driver_name: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description?: string;
}): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found.');
      return false;
    }

    const online = await isOnline();
    const isUpdate = !!transaction.id;
    const recordedBy = (await getProfile(user.id))?.full_name || user.email?.split('@')[0] || user.id;
    
    const transactionData: any = {
      ...(isUpdate && { id: transaction.id }),
      driver_name: transaction.driver_name.trim(),
      description: (transaction.description || '').trim(),
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      recorded_by: recordedBy,
      transaction_date: transaction.transaction_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(!isUpdate && { 
        created_by: user.id,
        created_at: new Date().toISOString()
      })
    };

    if (online) {
      let data: any, error;
      
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('driver_transactions')
          .update(transactionData)
          .eq('id', transaction.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('driver_transactions')
          .insert([transactionData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }
      
      if (error) throw error;
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === transaction.id ? { ...item, ...data } : item
        );
      } else if (data) {
        localData.push(data);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS, JSON.stringify(localData));
      
      if (!isUpdate && data) {
        await logHistory('add', 'driver_transactions', data.id, transactionData);
      } else if (isUpdate) {
        await logHistory('update', 'driver_transactions', transaction.id!, transactionData);
      }
      
      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = {
        ...transactionData,
        ...(isUpdate ? {} : { 
          id: `temp_${Date.now()}`,
          created_by: user.id,
          created_at: currentDate 
        }),
        updated_at: currentDate,
        transaction_date: transaction.transaction_date || currentDate
      };
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === transaction.id ? { ...item, ...offlineData } : item
        );
      } else {
        localData.push(offlineData);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS, JSON.stringify(localData));
      
      await SyncManager.getInstance().addPendingOperation({
        table: 'driver_transactions',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: transactionData
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving driver transaction:', error);
    return false;
  }
};

export const getDriverTransactions = async (): Promise<DriverTransaction[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('driver_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting driver transactions:', error);
    return [];
  }
};

// =====================================================
// 12. TRUCK FUEL ENTRIES
// =====================================================
export const saveTruckFuel = async (fuelEntry: Partial<TruckFuelEntry> & {
  truck_number: string;
  fuel_type: 'Diesel' | 'Petrol' | 'CNG';
  quantity: number;
  price_per_liter: number;
  total_price: number;
}): Promise<boolean> => {
  try {
    const online = await isOnline();
    const isUpdate = !!fuelEntry.id;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const fuelData: any = {
      ...(isUpdate && { id: fuelEntry.id }),
      truck_number: fuelEntry.truck_number,
      fuel_type: fuelEntry.fuel_type,
      quantity: fuelEntry.quantity,
      price_per_liter: fuelEntry.price_per_liter,
      total_price: fuelEntry.total_price,
      fuel_date: fuelEntry.fuel_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(!isUpdate && { 
        created_by: userId,
        created_at: new Date().toISOString()
      })
    };

    if (online) {
      let data: any, error;
      
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('truck_fuel_entries')
          .update(fuelData)
          .eq('id', fuelEntry.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('truck_fuel_entries')
          .insert([fuelData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }
      
      if (error) throw error;
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.TRUCK_FUEL);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === fuelEntry.id ? { ...item, ...data } : item
        );
      } else if (data) {
        localData.push(data);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.TRUCK_FUEL, JSON.stringify(localData));
      
      if (!isUpdate && data) {
        await logHistory('add', 'truck_fuel_entries', data.id, fuelData);
      } else if (isUpdate) {
        await logHistory('update', 'truck_fuel_entries', fuelEntry.id!, fuelData);
      }
      
      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = { 
        ...fuelData,
        ...(isUpdate ? {} : { 
          id: `temp_${Date.now()}`,
          created_by: userId,
          created_at: currentDate 
        }),
        updated_at: currentDate,
        fuel_date: fuelEntry.fuel_date || currentDate
      };
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.TRUCK_FUEL);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === fuelEntry.id ? { ...item, ...offlineData } : item
        );
      } else {
        localData.push(offlineData);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.TRUCK_FUEL, JSON.stringify(localData));
      
      await SyncManager.getInstance().addPendingOperation({
        table: 'truck_fuel_entries',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: fuelData
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving truck fuel:', error);
    return false;
  }
};

export const getTruckFuelEntries = async (): Promise<TruckFuelEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('truck_fuel_entries')
        .select('*')
        .order('fuel_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.TRUCK_FUEL, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.TRUCK_FUEL);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting truck fuel entries:', error);
    return [];
  }
};

// =====================================================
// 13. GENERAL ENTRIES
// =====================================================
export interface GeneralEntryInput {
  id?: string;
  amount: number;
  entry_type: 'debit' | 'credit';
  description?: string;
  entry_date?: string;
  agency_name?: string;
  title?: string;
}

export const saveGeneralEntry = async (entry: GeneralEntryInput): Promise<boolean> => {
  try {
    const online = await isOnline();
    const isUpdate = !!entry.id;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const entryData: any = {
      ...(isUpdate && { id: entry.id }),
      amount: entry.amount,
      entry_type: entry.entry_type,
      description: entry.description || '',
      agency_name: entry.agency_name || null,
      entry_date: entry.entry_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(!isUpdate && { 
        created_by: userId,
        created_at: new Date().toISOString()
      })
    };

    // Create a sanitized payload for Supabase (exclude columns not present in schema like `agency_name`)
    const { agency_name: _omitAgencyName, ...supabaseData } = entryData;

    if (online) {
      let data: any, error;
      
      if (isUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('general_entries')
          .update(supabaseData)
          .eq('id', entry.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('general_entries')
          .insert([supabaseData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }
      
      if (error) throw error;
      
      // Update local storage, preserving agency_name locally for UI usage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.GENERAL_ENTRIES);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === entry.id ? { ...item, ...data, agency_name: entry.agency_name ?? item.agency_name } : item
        );
      } else if (data) {
        localData.push({ ...data, agency_name: entry.agency_name || null });
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.GENERAL_ENTRIES, JSON.stringify(localData));
      
      if (!isUpdate && data?.id) {
        await logHistory('add', 'general_entries', data.id, entryData);
      } else if (isUpdate && entry.id) {
        await logHistory('update', 'general_entries', entry.id, entryData);
      }
      
      return true;
    } else {
      const currentDate = new Date().toISOString();
      const offlineData = { 
        ...entryData,
        ...(isUpdate ? {} : { 
          id: `temp_${Date.now()}`,
          created_by: userId,
          created_at: currentDate 
        }),
        updated_at: currentDate,
        entry_date: entry.entry_date || currentDate
      };
      
      // Update local storage
      const currentData = await AsyncStorage.getItem(OFFLINE_KEYS.GENERAL_ENTRIES);
      let localData = currentData ? JSON.parse(currentData) : [];
      
      if (isUpdate) {
        localData = localData.map((item: any) => 
          item.id === entry.id ? { ...item, ...offlineData } : item
        );
      } else {
        localData.push(offlineData);
      }
      
      await AsyncStorage.setItem(OFFLINE_KEYS.GENERAL_ENTRIES, JSON.stringify(localData));
      
      await SyncManager.getInstance().addPendingOperation({
        table: 'general_entries',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: supabaseData
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving general entry:', error);
    return false;
  }
};

export const getGeneralEntries = async (): Promise<GeneralEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('general_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.GENERAL_ENTRIES, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.GENERAL_ENTRIES);
    return offline ? JSON.parse(offline) : [];
  } catch (error) {
    console.error('Error getting general entries:', error);
    return [];
  }
};

// =====================================================
// 14. NEW: AGENCY GENERAL ENTRIES
// =====================================================
export const saveAgencyEntry = async (entry: Omit<AgencyEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'agency_id'>): Promise<boolean> => {
  try {
    const online = await isOnline();
    const agencies = await getAgencies();
    const agency = agencies.find(a => a.name === entry.agency_name);
    
    if (entry.agency_name === 'Mumbai' && !entry.delivery_status) {
        console.error("Delivery status is required for Mumbai agency.");
        return false;
    }

    const entryData = {
      agency_name: entry.agency_name,
      description: entry.description,
      amount: entry.amount,
      entry_type: entry.entry_type,
      entry_date: entry.entry_date,
      agency_id: agency?.id || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      delivery_status: entry.delivery_status
    };

    if (online && agency?.id) {
      const { data, error } = await supabase
        .from('agency_entries')
        .insert([entryData])
        .select()
        .single();
      if (error) throw error;
      await saveToOfflineStorage(OFFLINE_KEYS.AGENCY_ENTRIES, data);
      await logHistory('add', 'agency_entries', data.id, entryData);
      return true;
    } else {
      const tempId = `temp_${Date.now()}`;
      const currentDate = new Date().toISOString();
      const offlineData = { 
        ...entryData, 
        id: tempId, 
        created_at: currentDate, 
        updated_at: currentDate,
      };
      await saveToOfflineStorage(OFFLINE_KEYS.AGENCY_ENTRIES, offlineData);
      await SyncManager.getInstance().addPendingOperation({
        table: 'agency_entries',
        action: 'INSERT',
        data: entryData
      });
      return true;
    }
  } catch (error) {
    console.error('Error saving agency entry:', error);
    return false;
  }
};

export const getAgencyEntry = async (): Promise<AgencyEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('agency_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
    const offlineData = offline ? JSON.parse(offline) : [];
    
    return offlineData;
  } catch (error) {
    console.error('Error getting agency entries:', error);
    return [];
  }
};

// =====================================================
// 15. HELPER FUNCTIONS
// =====================================================
const saveToOfflineStorage = async (key: string, newData: any): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(key);
    const existingData = existing ? JSON.parse(existing) : [];
    
    const filtered = existingData.filter((item: any) => item.id !== newData.id);
    filtered.unshift(newData);
    
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error saving to offline storage:', error);
  }
};

export const deleteTransactionByIdImproved = async (id: string, key: string): Promise<boolean> => {
  try {
    const tableNameMap: { [key: string]: string } = {
      'offline_agency_payments': 'agency_payments',
      'offline_agency_majuri': 'agency_majuri',
      'offline_driver_transactions': 'driver_transactions',
      'offline_truck_fuel': 'truck_fuel_entries',
      'offline_general_entries': 'general_entries',
      'offline_agency_entries': 'agency_entries',
      'offline_uppad_jama_entries': 'uppad_jama_entries',
      'offline_agencies': 'agencies'
    };
    const tableName = tableNameMap[key];
    if (!tableName) return false;

    let supabaseDeleteSuccess = false;
    const online = await isOnline();
    // ... (rest of the function remains the same)
    
    if (online) {
      const { data: record, error: selectError } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
      if (selectError) throw selectError;
      
      const { error: deleteError } = await supabase.from(tableName).delete().eq('id', id);
      if (!deleteError) {
        supabaseDeleteSuccess = true;
        await logHistory('delete', tableName, id, { deleted_data: record });
      }
    }

    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue != null) {
      const allItems = JSON.parse(jsonValue);
      const itemIndex = allItems.findIndex((item: any) => item.id === id);
      if (itemIndex === -1) return false;
      
      const updatedItems = allItems.filter((item: any) => item.id !== id);
      await AsyncStorage.setItem(key, JSON.stringify(updatedItems));
      
      if (online && !supabaseDeleteSuccess) {
        await SyncManager.getInstance().addPendingOperation({
          table: tableName,
          action: 'DELETE',
          data: { id: id }
        });
      } else if (!online) {
        await SyncManager.getInstance().addPendingOperation({
          table: tableName,
          action: 'DELETE',
          data: { id: id }
        });
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`💥 Improved delete error:`, error);
    return false;
  }
};

// =====================================================
// 16. REAL-TIME SUBSCRIPTIONS
// =====================================================
export class RealTimeManager {
  private subscriptions: any[] = [];
  
  subscribeToTable(tableName: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`${tableName}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: tableName }, 
        callback
      )
      .subscribe();
    this.subscriptions.push(subscription);
    return subscription;
  }
  
  subscribeToAllTables(onDataChange: () => void) {
    const tables = [
      'agencies',
      'agency_payments', 
      'agency_majuri',
      'driver_transactions',
      'truck_fuel_entries',
      'general_entries',
      'agency_entries',
      'uppad_jama_entries',
      'history_logs'
    ];
    tables.forEach(table => {
      this.subscribeToTable(table, (payload) => {
        onDataChange();
      });
    });
  }
  
  unsubscribeAll() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }
}

// =====================================================
// 17. SYNC UTILITIES
// =====================================================
export const syncAllDataFixed = async (): Promise<boolean> => {
  try {
    const syncManager = SyncManager.getInstance();
    const pendingSuccess = await syncManager.syncPendingOperations();
    if (!pendingSuccess) {
      console.log('⚠️ Some pending operations failed to sync');
    }
    
    const online = await isOnline();
    if (online) {
      await Promise.all([
        getAgencies(),
        getAgencyPaymentsLocal(),
        getAgencyMajuri(),
        getDriverTransactions(),
        getTruckFuelEntries(),
        getGeneralEntries(),
        getAgencyEntry(),
        getUppadJamaEntries(),
      ]);
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('💥 Sync failed:', error);
    return false;
  }
};

export const getAllTransactionsForDate = async (targetDate: Date): Promise<any[]> => {
  try {
    const online = await isOnline();
    
    if (online) {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startISO = startOfDay.toISOString();
      const endISO = endOfDay.toISOString();
      
      const [payments, majuri, driverTxn, fuelEntries, generalEntries, agencyEntries, uppadJamaEntries] = await Promise.all([
        supabase.from('agency_payments').select('*').gte('payment_date', startISO).lte('payment_date', endISO),
        supabase.from('agency_majuri').select('*').gte('majuri_date', startISO).lte('majuri_date', endISO),
        supabase.from('driver_transactions').select('*').gte('transaction_date', startISO).lte('transaction_date', endISO),
        supabase.from('truck_fuel_entries').select('*').gte('fuel_date', startISO).lte('fuel_date', endISO),
        supabase.from('general_entries').select('*').gte('entry_date', startISO).lte('entry_date', endISO),
        supabase.from('agency_entries').select('*').gte('entry_date', startISO).lte('entry_date', endISO),
        supabase.from('uppad_jama_entries').select('*').gte('entry_date', startISO).lte('entry_date', endISO),
      ]);
      
      const allTransactions = [
        ...(payments.data || []),
        ...(majuri.data || []),
        ...(driverTxn.data || []),
        ...(fuelEntries.data || []),
        ...(generalEntries.data || []),
        ...(agencyEntries.data || []),
        ...(uppadJamaEntries.data || [])
      ];
      
      return allTransactions;
      
    } else {
      const [payments, majuri, driverTxn, fuelEntries, generalEntries, agencyEntries, uppadJamaEntries] = await Promise.all([
        getAgencyPaymentsLocal(),
        getAgencyMajuri(), 
        getDriverTransactions(),
        getTruckFuelEntries(),
        getGeneralEntries(),
        getAgencyEntry(),
        getUppadJamaEntries()
      ]);
      
      const filteredTransactions = [
        ...payments.filter((item: { payment_date: string; }) => isSameDate(item.payment_date, targetDate)),
        ...majuri.filter((item: { majuri_date: string; }) => isSameDate(item.majuri_date, targetDate)),
        ...driverTxn.filter((item: { transaction_date: string; }) => isSameDate(item.transaction_date, targetDate)),
        ...fuelEntries.filter((item: { fuel_date: string; }) => isSameDate(item.fuel_date, targetDate)),
        ...generalEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate)),
        ...agencyEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate)),
        ...uppadJamaEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate))
      ];
      
      return filteredTransactions;
    }
  } catch (error) {
    console.error('💥 Error getting transactions for date:', error);
    return [];
  }
};

// ... (rest of the code remains the same)
// 18. INITIALIZATION FUNCTION
// =====================================================
export const initializeSupabaseStorage = async (): Promise<void> => {
  try {
    await syncAllDataFixed();
    const realtimeManager = new RealTimeManager();
    realtimeManager.subscribeToAllTables(() => {});
  } catch (error) {
    console.error('💥 Initialization failed:', error);
  }
};

export const getMonthlyTransactions = async (month: string, year: string): Promise<any[]> => {
  try {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const [
      payments,
      majuri,
      agencyGeneralEntries,
      generalEntries,
      driverTransactions,
      fuelEntries,
      uppadJamaEntries
    ] = await Promise.all([
      supabase
        .from('agency_payments')
        .select('*')
        .gte('payment_date', startISO)
        .lte('payment_date', endISO),
      supabase
        .from('agency_majuri')
        .select('*')
        .gte('majuri_date', startISO)
        .lte('majuri_date', endISO),
      supabase
        .from('agency_entries')
        .select('*')
        .gte('entry_date', startISO)
        .lte('entry_date', endISO),
      supabase
        .from('general_entries')
        .select('*')
        .gte('entry_date', startISO)
        .lte('entry_date', endISO),
      supabase
        .from('driver_transactions')
        .select('*')
        .gte('transaction_date', startISO)
        .lte('transaction_date', endISO),
      supabase
        .from('truck_fuel_entries')
        .select('*')
        .gte('fuel_date', startISO)
        .lte('fuel_date', endISO),
      supabase
        .from('uppad_jama_entries')
        .select('*')
        .gte('entry_date', startISO)
        .lte('entry_date', endISO),
    ]);

    // Filter out admin panel transactions and include only home screen Uppad/Jama entries
    const allTransactions = [
      // Only include Uppad/Jama entries that are from home screen
      ...(uppadJamaEntries.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'uppad_jama', 
          data: d,
          source: d.source || 'home_screen' // Ensure source is set
        })),
      
      // Include other transaction types but filter out admin panel entries
      ...(payments.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'paid', 
          data: d,
          source: d.source || 'unknown'
        })),
      
      ...(majuri.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'majuri', 
          data: d,
          source: d.source || 'unknown'
        })),
      
      ...(agencyGeneralEntries.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'agency_general', 
          data: d,
          source: d.source || 'unknown'
        })),
      
      ...(generalEntries.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'general', 
          data: d,
          source: d.source || 'unknown'
        })),
      
      ...(driverTransactions.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'driver', 
          data: d,
          source: d.source || 'unknown'
        })),
      
      ...(fuelEntries.data || [])
        .filter((d: any) => d.source !== 'admin_panel')
        .map((d: any) => ({ 
          type: 'fuel', 
          data: d,
          source: d.source || 'unknown'
        }))
    ];

    return allTransactions;
  } catch (error) {
    console.error('💥 Error getting all monthly transactions:', error);
    return [];
  }
}

// =====================================================
// CASH TRACKING FUNCTIONS
// =====================================================

export const saveLeaveCashRecord = async (recordData: Omit<CashRecord, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
  try {
    const currentTime = new Date().toISOString();
    const newRecord: CashRecord = {
      id: `cash_${Date.now()}`,
      ...recordData,
      created_at: currentTime,
      updated_at: currentTime
    };

    console.log('🔍 DEBUG: Saving new cash record:', newRecord);

    // Save to offline storage
    const existingRecords = await getCashRecords();
    const updatedRecords = [...existingRecords, newRecord];
    await AsyncStorage.setItem(OFFLINE_KEYS.CASH_RECORDS, JSON.stringify(updatedRecords));
    console.log('🔍 DEBUG: Saved to offline storage. Total records:', updatedRecords.length);

    // Try to save to Supabase
    try {
      const { error } = await supabase
        .from('cash_records')
        .insert([newRecord]);

      if (error) {
        console.warn('Failed to save to Supabase, saved offline:', error);
      } else {
        console.log('🔍 DEBUG: Successfully saved to Supabase');
      }
    } catch (supabaseError) {
      console.warn('Supabase unavailable, saved offline:', supabaseError);
    }

    console.log('💰 Cash record saved successfully');
  } catch (error) {
    console.error('💥 Error saving cash record:', error);
    throw error;
  }
};

export const getCashRecords = async (): Promise<CashRecord[]> => {
  try {
    console.log('🔍 DEBUG: Getting cash records from Supabase...');
    // Try to get from Supabase first
    try {
      const { data, error } = await supabase
        .from('cash_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        console.log('🔍 DEBUG: Supabase cash records:', data);
        // Also save to offline storage for backup
        await AsyncStorage.setItem(OFFLINE_KEYS.CASH_RECORDS, JSON.stringify(data));
        return data;
      } else {
        console.log('🔍 DEBUG: Supabase error or no data:', error);
        console.log('🔍 DEBUG: Falling back to offline storage...');
      }
    } catch (supabaseError) {
      console.warn('Supabase unavailable, using offline data:', supabaseError);
    }

    // Fallback to offline storage
    console.log('🔍 DEBUG: Getting cash records from offline storage...');
    const storedData = await AsyncStorage.getItem(OFFLINE_KEYS.CASH_RECORDS);
    const offlineRecords = storedData ? JSON.parse(storedData) : [];
    console.log('🔍 DEBUG: Offline cash records:', offlineRecords);
    return offlineRecords;
  } catch (error) {
    console.error('💥 Error getting cash records:', error);
    return [];
  }
};

export const getPendingCashRecord = async (): Promise<CashRecord | null> => {
  try {
    console.log('🔍 DEBUG: Getting all cash records...');
    const records = await getCashRecords();
    console.log('🔍 DEBUG: All cash records:', records);
    console.log('🔍 DEBUG: Looking for records with status "pending_verification"...');
    
    const pendingRecord = records.find(record => record.status === 'pending_verification');
    console.log('🔍 DEBUG: Found pending record:', pendingRecord);
    
    return pendingRecord || null;
  } catch (error) {
    console.error('💥 Error getting pending cash record:', error);
    return null;
  }
};

export const updateCashRecord = async (id: string, updates: Partial<CashRecord>): Promise<void> => {
  try {
    const records = await getCashRecords();
    const recordIndex = records.findIndex(record => record.id === id);
    
    if (recordIndex === -1) {
      throw new Error('Cash record not found');
    }

    const updatedRecord = {
      ...records[recordIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    records[recordIndex] = updatedRecord;

    // Save to offline storage
    await AsyncStorage.setItem(OFFLINE_KEYS.CASH_RECORDS, JSON.stringify(records));

    // Try to update in Supabase
    try {
      const { error } = await supabase
        .from('cash_records')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.warn('Failed to update in Supabase, updated offline:', error);
      }
    } catch (supabaseError) {
      console.warn('Supabase unavailable, updated offline:', supabaseError);
    }

    console.log('💰 Cash record updated successfully');
  } catch (error) {
    console.error('💥 Error updating cash record:', error);
    throw error;
  }
};

export const verifyCashAmount = async (recordId: string, actualAmount: number): Promise<{ isCorrect: boolean; difference: number }> => {
  try {
    const records = await getCashRecords();
    const record = records.find(r => r.id === recordId);
    
    if (!record) {
      throw new Error('Cash record not found');
    }

    const difference = actualAmount - record.expected_amount;
    const isCorrect = difference === 0;

    await updateCashRecord(recordId, {
      actual_amount: actualAmount,
      verification_time: new Date().toISOString(),
      status: isCorrect ? 'verified_correct' : 'verified_incorrect',
      difference: difference
    });

    return { isCorrect, difference };
  } catch (error) {
    console.error('💥 Error verifying cash amount:', error);
    throw error;
  }
};

export const deleteCashRecord = async (id: string): Promise<void> => {
  try {
    const records = await getCashRecords();
    const filteredRecords = records.filter(record => record.id !== id);

    // Save to offline storage
    await AsyncStorage.setItem(OFFLINE_KEYS.CASH_RECORDS, JSON.stringify(filteredRecords));

    // Try to delete from Supabase
    try {
      const { error } = await supabase
        .from('cash_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Failed to delete from Supabase, deleted offline:', error);
      }
    } catch (supabaseError) {
      console.warn('Supabase unavailable, deleted offline:', supabaseError);
    }

    console.log('💰 Cash record deleted successfully');
  } catch (error) {
    console.error('💥 Error deleting cash record:', error);
    throw error;
  }
};

export const revertCashRecordToPending = async (id: string): Promise<void> => {
  try {
    const records = await getCashRecords();
    const recordIndex = records.findIndex(record => record.id === id);
    
    if (recordIndex === -1) {
      throw new Error('Cash record not found');
    }

    const record = records[recordIndex];
    
    // Only allow reverting verified records
    if (record.status === 'pending_verification') {
      throw new Error('Record is already pending verification');
    }

    // Revert the record to pending status
    const revertedRecord: CashRecord = {
      ...record,
      status: 'pending_verification',
      actual_amount: undefined,
      verification_time: undefined,
      difference: undefined
    };

    records[recordIndex] = revertedRecord;

    // Save to offline storage
    await AsyncStorage.setItem(OFFLINE_KEYS.CASH_RECORDS, JSON.stringify(records));

    // Try to update in Supabase
    try {
      const { error } = await supabase
        .from('cash_records')
        .update({
          status: 'pending_verification',
          actual_amount: null,
          verification_time: null,
          difference: null
        })
        .eq('id', id);

      if (error) {
        console.warn('Failed to revert in Supabase, reverted offline:', error);
      }
    } catch (supabaseError) {
      console.warn('Supabase unavailable, reverted offline:', supabaseError);
    }

    console.log('💰 Cash record reverted to pending verification successfully');
  } catch (error) {
    console.error('💥 Error reverting cash record:', error);
    throw error;
  }
};