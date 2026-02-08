// CacheManager.ts - Manages offline cache
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const saveToOfflineStorage = async (key: string, data: any): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(key);
    const items = existing ? JSON.parse(existing) : [];
    
    if (Array.isArray(data)) {
      items.push(...data);
    } else {
      items.push(data);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving to offline storage:', error);
  }
};

export const getFromOfflineStorage = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting from offline storage:', error);
    return [];
  }
};
