// Storage.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_URL } from '../supabase';
import * as Keychain from 'react-native-keychain';
import * as CryptoJS from 'crypto-js';
import { queryPerformanceAnalyzer } from '../utils/performanceMonitor';

export interface Office {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

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
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
  created_by?: string;
  metadata?: string; // Add metadata field
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
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  delivery_status?: 'yes' | 'no';
  // New fields for Mumbai Delivery redesign
  billty_no?: string;
  consignee_name?: string;
  item_description?: string;
  confirmation_status?: 'pending' | 'confirmed';
  confirmed_at?: string;
  confirmed_amount?: number;
  bilty_photo_id?: string;
  signature_photo_id?: string;
  taken_from_godown?: boolean;
  payment_received?: boolean;
  payment_type?: 'cash' | 'gpay_sapan' | 'gpay_yash';
}

export interface DeliveryRecord extends AgencyEntry {
  // All fields inherited from AgencyEntry
  // New required fields for delivery workflow
  billty_no: string;
  consignee_name: string;
  item_description: string;
  confirmation_status: 'pending' | 'confirmed';
  taken_from_godown: boolean;
  payment_received: boolean;
}

export interface PaymentConfirmation {
  delivery_record_id: string;
  confirmed_amount: number;
  bilty_photo: PhotoData;
  signature_photo: PhotoData;
  confirmed_at: string;
  confirmed_by?: string;
  payment_type?: 'cash' | 'gpay_sapan' | 'gpay_yash';
}

export interface PhotoRecord {
  id: string;
  delivery_record_id: string;
  photo_type: 'bilty' | 'signature';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded: boolean;
  upload_url?: string;
  office_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoData {
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  timestamp: string;
}

export interface UppadJamaEntry {
  id: string;
  person_name: string;
  description: string;
  amount: number;
  entry_type: 'credit' | 'debit';
  entry_date: string;
  recorded_by?: string;
  office_id?: string;
  office_name?: string;
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
  office_id?: string;
  office_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyEntry {
  id: string;
  user_id: string;
  office_id?: string;
  entry_date: string;
  entries: Record<string, number>; // categoryId -> amount
  total_credit: number;
  total_debit: number;
  net_profit: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// 2. OFFLINE STORAGE KEYS
// =====================================================
export const OFFLINE_KEYS = {
  AGENCIES: 'offline_agencies',
  AGENCY_PAYMENTS: 'offline_agency_payments',
  DAILY_ENTRIES: 'offline_daily_entries',
  AGENCY_MAJURI: 'offline_agency_majuri',
  DRIVER_TRANSACTIONS: 'offline_driver_transactions',
  TRUCK_FUEL: 'offline_truck_fuel',
  GENERAL_ENTRIES: 'offline_general_entries',
  AGENCY_ENTRIES: 'offline_agency_entries',
  UPPAD_JAMA_ENTRIES: 'offline_uppad_jama_entries',
  PERSONS: 'offline_persons',
  CASH_RECORDS: 'offline_cash_records',
  PENDING_SYNC: 'pending_sync_operations',
  LAST_SYNC: 'last_sync_timestamp',
  // New keys for Mumbai Delivery redesign
  DELIVERY_RECORDS: 'offline_delivery_records',
  DELIVERY_PHOTOS: 'offline_delivery_photos',
  PENDING_PHOTO_UPLOADS: 'pending_photo_uploads',
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
// 4. SYNC MANAGER CLASS (Enhanced with Office Support)
// =====================================================

/**
 * Interface for pending sync operations
 */
interface PendingOperation {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  office_id?: string;
  timestamp: string;
  retryCount?: number;
}

/**
 * Interface for sync conflict
 */
interface SyncConflict {
  operationId: string;
  table: string;
  recordId: string;
  reason: string;
  localOfficeId?: string;
  serverOfficeId?: string;
  timestamp: string;
}

class SyncManager {
  private static instance: SyncManager;
  private syncInProgress = false;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly CONFLICT_LOG_KEY = 'sync_conflicts';

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Add a pending operation to the sync queue with office_id
   * @param operation - The operation to queue
   */
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      console.log('📝 SyncManager: Adding pending operation', { 
        table: operation.table, 
        action: operation.action,
        office_id: operation.office_id 
      });

      const existing = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC);
      const pending: PendingOperation[] = existing ? JSON.parse(existing) : [];
      
      const newOperation: PendingOperation = {
        ...operation,
        timestamp: new Date().toISOString(),
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        retryCount: 0
      };

      pending.push(newOperation);
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_SYNC, JSON.stringify(pending));
      
      console.log('✅ SyncManager: Operation queued successfully', { id: newOperation.id });
    } catch (error) {
      console.error('❌ SyncManager: Error adding pending operation:', error);
      throw error;
    }
  }

  /**
   * Sync all pending operations to the backend
   * @returns true if all operations synced successfully
   */
  async syncPendingOperations(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('⚠️ SyncManager: Sync already in progress');
      return false;
    }
    
    this.syncInProgress = true;
    console.log('🔄 SyncManager: Starting sync of pending operations...');
    
    try {
      const pendingStr = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC);
      if (!pendingStr) {
        console.log('✅ SyncManager: No pending operations to sync');
        return true;
      }

      const pending: PendingOperation[] = JSON.parse(pendingStr);
      console.log(`📊 SyncManager: Found ${pending.length} pending operations`);

      const successful: string[] = [];
      const failed: PendingOperation[] = [];

      for (const operation of pending) {
        try {
          // Validate office_id before syncing
          const validationResult = await this.validateOfficeId(operation);
          
          if (!validationResult.isValid) {
            console.warn('⚠️ SyncManager: Office validation failed', {
              operationId: operation.id,
              reason: validationResult.reason
            });
            
            // Log conflict
            await this.logSyncConflict({
              operationId: operation.id,
              table: operation.table,
              recordId: operation.data.id,
              reason: validationResult.reason || 'Unknown validation error',
              localOfficeId: operation.office_id,
              serverOfficeId: validationResult.serverOfficeId,
              timestamp: new Date().toISOString()
            });

            // Handle conflict resolution
            const resolved = await this.resolveOfficeConflict(operation, validationResult);
            
            if (resolved) {
              successful.push(operation.id);
              console.log('✅ SyncManager: Conflict resolved', { operationId: operation.id });
            } else {
              // Increment retry count
              operation.retryCount = (operation.retryCount || 0) + 1;
              
              if (operation.retryCount >= this.MAX_RETRY_COUNT) {
                console.error('❌ SyncManager: Max retries reached', { operationId: operation.id });
                // Keep in failed list but don't retry
              } else {
                failed.push(operation);
              }
            }
            continue;
          }

          // Execute the operation
          const result = await this.executePendingOperation(operation);
          
          if (result) {
            successful.push(operation.id);
            console.log('✅ SyncManager: Operation synced', { 
              operationId: operation.id,
              table: operation.table 
            });
          } else {
            operation.retryCount = (operation.retryCount || 0) + 1;
            if (operation.retryCount < this.MAX_RETRY_COUNT) {
              failed.push(operation);
            }
            console.warn('⚠️ SyncManager: Operation failed', { 
              operationId: operation.id,
              retryCount: operation.retryCount 
            });
          }
        } catch (error) {
          console.error('❌ SyncManager: Error syncing operation:', operation.id, error);
          operation.retryCount = (operation.retryCount || 0) + 1;
          if (operation.retryCount < this.MAX_RETRY_COUNT) {
            failed.push(operation);
          }
        }
      }

      // Update pending operations list with only failed operations
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_SYNC, JSON.stringify(failed));
      
      // Update last sync timestamp
      await AsyncStorage.setItem(OFFLINE_KEYS.LAST_SYNC, new Date().toISOString());
      
      console.log(`📊 SyncManager: Sync complete - ${successful.length} successful, ${failed.length} failed`);
      
      return successful.length === pending.length;
    } catch (error) {
      console.error('❌ SyncManager: Sync error:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Validate that the office_id in the operation is still valid
   * @param operation - The operation to validate
   * @returns Validation result with reason if invalid
   */
  private async validateOfficeId(operation: PendingOperation): Promise<{
    isValid: boolean;
    reason?: string;
    serverOfficeId?: string;
  }> {
    try {
      // If operation doesn't have office_id, it's valid (legacy data or non-office tables)
      if (!operation.office_id) {
        return { isValid: true };
      }

      // Check if the office still exists and is active
      const { data: office, error } = await supabase
        .from('offices')
        .select('id, is_active')
        .eq('id', operation.office_id)
        .single();

      if (error || !office) {
        return { 
          isValid: false, 
          reason: 'Office no longer exists' 
        };
      }

      if (!office.is_active) {
        return { 
          isValid: false, 
          reason: 'Office is inactive' 
        };
      }

      // For UPDATE operations, check if the record's office_id matches
      if (operation.action === 'UPDATE' && operation.data.id) {
        const { data: existingRecord } = await supabase
          .from(operation.table)
          .select('office_id')
          .eq('id', operation.data.id)
          .single();

        if (existingRecord && existingRecord.office_id !== operation.office_id) {
          return {
            isValid: false,
            reason: 'Office mismatch with server record',
            serverOfficeId: existingRecord.office_id
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ SyncManager: Error validating office_id:', error);
      // On validation error, assume valid to allow sync attempt
      return { isValid: true };
    }
  }

  /**
   * Resolve office_id conflicts
   * @param operation - The operation with conflict
   * @param validationResult - The validation result
   * @returns true if conflict was resolved
   */
  private async resolveOfficeConflict(
    operation: PendingOperation,
    validationResult: { reason?: string; serverOfficeId?: string }
  ): Promise<boolean> {
    try {
      console.log('🔧 SyncManager: Attempting to resolve office conflict', {
        operationId: operation.id,
        reason: validationResult.reason
      });

      // Strategy 1: If office no longer exists, try to find default office
      if (validationResult.reason === 'Office no longer exists' || 
          validationResult.reason === 'Office is inactive') {
        
        // Get the default office (first active office)
        const { data: defaultOffice } = await supabase
          .from('offices')
          .select('id, name')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (defaultOffice) {
          console.log('🔧 SyncManager: Reassigning to default office', { 
            officeId: defaultOffice.id,
            officeName: defaultOffice.name 
          });
          
          // Update operation with default office
          operation.office_id = defaultOffice.id;
          operation.data.office_id = defaultOffice.id;
          
          // Try to execute with new office_id
          return await this.executePendingOperation(operation);
        }
      }

      // Strategy 2: For office mismatch, prioritize server data
      if (validationResult.reason === 'Office mismatch with server record' && 
          validationResult.serverOfficeId) {
        
        console.log('🔧 SyncManager: Using server office_id', { 
          serverOfficeId: validationResult.serverOfficeId 
        });
        
        // Update operation to match server
        operation.office_id = validationResult.serverOfficeId;
        operation.data.office_id = validationResult.serverOfficeId;
        
        // Try to execute with server's office_id
        return await this.executePendingOperation(operation);
      }

      console.warn('⚠️ SyncManager: Could not resolve conflict');
      return false;
    } catch (error) {
      console.error('❌ SyncManager: Error resolving conflict:', error);
      return false;
    }
  }

  /**
   * Execute a pending operation
   * @param operation - The operation to execute
   * @returns true if successful
   */
  private async executePendingOperation(operation: PendingOperation): Promise<boolean> {
    const { table, action, data } = operation;
    
    try {
      console.log('⚡ SyncManager: Executing operation', { 
        table, 
        action, 
        id: data.id,
        office_id: operation.office_id 
      });

      switch (action) {
        case 'INSERT':
          const { error: insertError } = await supabase
            .from(table)
            .insert([data]);
          
          if (insertError) {
            console.error('❌ SyncManager: Insert error:', insertError);
            return false;
          }
          return true;
          
        case 'UPDATE':
          const { error: updateError } = await supabase
            .from(table)
            .update(data)
            .eq('id', data.id);
          
          if (updateError) {
            console.error('❌ SyncManager: Update error:', updateError);
            return false;
          }
          return true;
          
        case 'DELETE':
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('id', data.id);
          
          if (deleteError) {
            console.error('❌ SyncManager: Delete error:', deleteError);
            return false;
          }
          return true;
          
        default:
          console.error('❌ SyncManager: Unknown action:', action);
          return false;
      }
    } catch (error) {
      console.error('❌ SyncManager: Execution error:', error);
      return false;
    }
  }

  /**
   * Log a sync conflict for admin review
   * @param conflict - The conflict details
   */
  private async logSyncConflict(conflict: SyncConflict): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(this.CONFLICT_LOG_KEY);
      const conflicts: SyncConflict[] = existing ? JSON.parse(existing) : [];
      
      conflicts.push(conflict);
      
      // Keep only last 100 conflicts
      if (conflicts.length > 100) {
        conflicts.splice(0, conflicts.length - 100);
      }
      
      await AsyncStorage.setItem(this.CONFLICT_LOG_KEY, JSON.stringify(conflicts));
      
      console.log('📝 SyncManager: Conflict logged', { operationId: conflict.operationId });
    } catch (error) {
      console.error('❌ SyncManager: Error logging conflict:', error);
    }
  }

  /**
   * Get all logged sync conflicts
   * @returns Array of sync conflicts
   */
  async getSyncConflicts(): Promise<SyncConflict[]> {
    try {
      const existing = await AsyncStorage.getItem(this.CONFLICT_LOG_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('❌ SyncManager: Error getting conflicts:', error);
      return [];
    }
  }

  /**
   * Clear all logged sync conflicts
   */
  async clearSyncConflicts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CONFLICT_LOG_KEY);
      console.log('✅ SyncManager: Conflicts cleared');
    } catch (error) {
      console.error('❌ SyncManager: Error clearing conflicts:', error);
    }
  }

  /**
   * Get pending operations count
   * @returns Number of pending operations
   */
  async getPendingOperationsCount(): Promise<number> {
    try {
      const pendingStr = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_SYNC);
      if (!pendingStr) return 0;
      
      const pending: PendingOperation[] = JSON.parse(pendingStr);
      return pending.length;
    } catch (error) {
      console.error('❌ SyncManager: Error getting pending count:', error);
      return 0;
    }
  }
}

// Export SyncManager for testing and external use
export { SyncManager };

// =====================================================
// 11a. UPPAD/JAMA ENTRIES (separate from drivers)
// =====================================================
export const saveUppadJamaEntry = async (entry: Partial<UppadJamaEntry> & {
  person_name: string;
  amount: number;
  entry_type: 'credit' | 'debit';
  description?: string;
  entry_date?: string;
  office_id?: string;
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
      office_id: entry.office_id || null,
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
        office_id: entry.office_id || undefined
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

export const getUppadJamaEntries = async (officeId?: string): Promise<UppadJamaEntry[]> => {
  const startTime = performance.now();
  const queryName = officeId ? 'getUppadJamaEntries:filtered' : 'getUppadJamaEntries:all';
  
  console.log('Storage - getUppadJamaEntries - Function called');
  try {
    const online = await isOnline();
    console.log('Storage - getUppadJamaEntries - Online status:', online);
    
    if (online) {
      console.log('Storage - getUppadJamaEntries - Making Supabase query...');
      let query = supabase
        .from('uppad_jama_entries')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('entry_date', { ascending: false });
      
      console.log('Storage - getUppadJamaEntries - Supabase response:', { 
        dataLength: data?.length || 0, 
        error: error?.message || 'No error',
        hasData: !!data 
      });
      
      if (!error && data) {
        console.log('Storage - getUppadJamaEntries - Fetched from Supabase:', data.length, 'entries');
        console.log('Storage - getUppadJamaEntries - Sample data:', data.slice(0, 2));
        await AsyncStorage.setItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES, JSON.stringify(data));
        
        const duration = performance.now() - startTime;
        queryPerformanceAnalyzer.recordQuery(queryName, duration, officeId);
        
        return data as any;
      } else if (error) {
        console.error('Storage - getUppadJamaEntries - Supabase error:', error);
      }
    }
    console.log('Storage - getUppadJamaEntries - Falling back to offline data');
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
    let offlineData = offline ? JSON.parse(offline) : [];
    console.log('Storage - getUppadJamaEntries - Offline data length:', offlineData.length);
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery(`${queryName}:offline`, duration, officeId);
    
    return offlineData;
  } catch (error) {
    console.error('Storage - getUppadJamaEntries - Catch block error:', error);
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.UPPAD_JAMA_ENTRIES);
    let fallbackData = offline ? JSON.parse(offline) : [];
    console.log('Storage - getUppadJamaEntries - Fallback data length:', fallbackData.length);
    
    // Apply office filter to fallback data if provided
    if (officeId) {
      fallbackData = fallbackData.filter((item: any) => item.office_id === officeId);
    }
    
    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery(`${queryName}:error`, duration, officeId);
    
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
      .select('id, username, full_name, user_type, is_active, created_at, updated_at')
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

export const updateUserType = async (userId: string, userType: 'normal' | 'majur'): Promise<boolean> => {
  try {
    console.log(`🔄 Updating user ${userId} type to: ${userType}`);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ user_type: userType, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('❌ Database error updating user type:', error);
      throw error;
    }
    
    // Verify the update was successful
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error verifying user type update:', fetchError);
    } else {
      console.log(`✅ User type verified in database: ${updatedProfile.user_type}`);
    }
    
    console.log(`✅ Successfully updated user ${userId} type to: ${userType}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating user type:', error);
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
        data: agencyData,
        office_id: undefined // Agencies are not office-specific
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

/**
 * Get a single agency by its name.
 * Fetches from Supabase if online, falls back to AsyncStorage if offline.
 * @param agencyName - The name of the agency to retrieve.
 * @returns Promise<Agency | null> - The agency object if found, otherwise null.
 */
export const getAgencyByName = async (agencyName: string): Promise<Agency | null> => {
  try {
    const online = await isOnline();

    if (online) {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('name', agencyName)
        .single();

      if (!error && data) {
        return data as Agency;
      }
    }
    // Fallback to offline data if not found online or offline
    const offlineAgencies = await getAgencies(); // getAgencies already handles offline cache
    return offlineAgencies.find(agency => agency.name === agencyName) || null;
  } catch (error) {
    console.error('Error getting agency by name:', error);
    return null;
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
        data: personData,
        office_id: undefined // Persons are not office-specific
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

export const deliverOtpAlternative = async (opts: { email: string; code: string }): Promise<{ success: boolean; error?: string }> => {
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
          console.warn('⚠️ Rate limit hit');
          const retryAfter = json?.error?.includes('29s') ? 30 : 60;
          return { 
            success: false, 
            error: `RATE_LIMIT:${retryAfter}` 
          };
        }
        
        if (!res.ok) {
          return { 
            success: false, 
            error: `HTTP_ERROR:${res.status}` 
          };
        }
        
        const ok = (json?.success === true) || (json?.sent === true) || (json?.ok === true) || (json?.status === 'success') || (json?.status === 'sent');
        return { success: !!ok };
      } catch (fe) {
        console.error('Direct fetch fallback failed:', fe);
        return { 
          success: false, 
          error: 'NETWORK_ERROR' 
        };
      }
    }

    const isSuccessAlt = (data?.success === true) || (data?.sent === true) || (data?.ok === true) || (data?.status === 'success') || (data?.status === 'sent');

    if (isSuccessAlt) {
      console.log('OTP email sent successfully!');
      return { success: true };
    }

    console.error('Edge Function returned unsuccessful response:', data);
    return { 
      success: false, 
      error: 'FUNCTION_ERROR' 
    };

  } catch (error) {
    console.error('Complete OTP delivery failure:', error);
    return { 
      success: false, 
      error: 'UNKNOWN_ERROR' 
    };
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
export const saveAgencyPayment = async (payment: Partial<AgencyPayment> & { agency_name: string; amount: number; bill_no: string; office_id?: string; }): Promise<boolean> => {
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
      office_id: payment.office_id || null,
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
        data: paymentData,
        office_id: payment.office_id || undefined
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving agency payment:', error);
    return false;
  }
};

export const getAgencyPaymentsLocal = async (officeId?: string): Promise<AgencyPayment[]> => {
  const startTime = performance.now();
  const queryName = officeId ? 'getAgencyPayments:filtered' : 'getAgencyPayments:all';
  
  try {
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_PAYMENTS);
    let localData = offline ? JSON.parse(offline) : [];
    
    const online = await isOnline();
    if (online) {
      try {
        let query = supabase
          .from('agency_payments')
          .select('*');
        
        // Apply office filter if provided
        if (officeId) {
          query = query.eq('office_id', officeId);
        }
        
        const { data, error } = await query.order('payment_date', { ascending: false });

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
    
    // Apply office filter to local data if provided
    if (officeId) {
      localData = localData.filter((item: any) => item.office_id === officeId);
    }
    
    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery(queryName, duration, officeId);
    
    return localData;
  } catch (error) {
    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery(`${queryName}:error`, duration, officeId);
    console.error('Error getting agency payments:', error);
    return [];
  }
};

// =====================================================
// 10. AGENCY MAJURI
// =====================================================
export const saveAgencyMajuri = async (majuri: Partial<AgencyMajuri> & { agency_name: string; amount: number; description?: string; office_id?: string; }): Promise<boolean> => {
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
      office_id: majuri.office_id || null,
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
        data: majuriData,
        office_id: majuri.office_id || undefined
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving agency majuri:', error);
    return false;
  }
};

export const getAgencyMajuri = async (officeId?: string): Promise<AgencyMajuri[]> => {
  try {
    const online = await isOnline();

    if (online) {
      let query = supabase
        .from('agency_majuri')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('majuri_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_MAJURI, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_MAJURI);
    let offlineData = offline ? JSON.parse(offline) : [];
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    return offlineData;
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
  office_id?: string;
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
      office_id: transaction.office_id || null,
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
        data: transactionData,
        office_id: transaction.office_id || undefined
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving driver transaction:', error);
    return false;
  }
};

export const getDriverTransactions = async (officeId?: string): Promise<DriverTransaction[]> => {
  try {
    const online = await isOnline();

    if (online) {
      let query = supabase
        .from('driver_transactions')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('transaction_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.DRIVER_TRANSACTIONS);
    let offlineData = offline ? JSON.parse(offline) : [];
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    return offlineData;
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
  office_id?: string;
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
      office_id: fuelEntry.office_id || null,
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
        data: fuelData,
        office_id: fuelEntry.office_id || undefined
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving truck fuel:', error);
    return false;
  }
};

export const getTruckFuelEntries = async (officeId?: string): Promise<TruckFuelEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      let query = supabase
        .from('truck_fuel_entries')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('fuel_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.TRUCK_FUEL, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.TRUCK_FUEL);
    let offlineData = offline ? JSON.parse(offline) : [];
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    return offlineData;
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
  metadata?: string; // Add metadata field
  office_id?: string;
}

export const saveGeneralEntry = async (entry: GeneralEntryInput): Promise<boolean> => {
  try {
    const online = await isOnline();
    const isUpdate = !!entry.id;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    console.log('💾 saveGeneralEntry called:', {
      isUpdate,
      online,
      entry_date: entry.entry_date,
      amount: entry.amount,
      entry_type: entry.entry_type,
      description: entry.description
    });
    
    const entryData: any = {
      ...(isUpdate && { id: entry.id }),
      amount: entry.amount,
      entry_type: entry.entry_type,
      description: entry.description || '',
      agency_name: entry.agency_name || null,
      entry_date: entry.entry_date || new Date().toISOString(),
      office_id: entry.office_id || null,
      updated_at: new Date().toISOString(),
      metadata: entry.metadata || null, // Include metadata
      ...(!isUpdate && { 
        created_by: userId,
        created_at: new Date().toISOString()
      })
    };

    // Create a sanitized payload for Supabase (exclude columns not present in schema like `agency_name`)
    const { agency_name: _omitAgencyName, ...supabaseData } = entryData; // metadata is now part of entryData

    console.log('💾 Supabase payload:', supabaseData);

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
        
        console.log('💾 Insert result:', { data: inserted, error: insertError });
      }
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ General entry saved to Supabase:', data);
      
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
        data: supabaseData,
        office_id: entry.office_id || undefined
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error saving general entry:', error);
    return false;
  }
};

export const getGeneralEntries = async (officeId?: string): Promise<GeneralEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      let query = supabase
        .from('general_entries')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('entry_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.GENERAL_ENTRIES, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.GENERAL_ENTRIES);
    let offlineData = offline ? JSON.parse(offline) : [];
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    return offlineData;
  } catch (error) {
    console.error('Error getting general entries:', error);
    return [];
  }
};

// =====================================================
// 14. NEW: AGENCY GENERAL ENTRIES
// =====================================================
export const saveAgencyEntry = async (entry: Omit<AgencyEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'agency_id'> & { office_id?: string }): Promise<boolean> => {
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
      office_id: entry.office_id || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      delivery_status: entry.delivery_status,
      billty_no: entry.billty_no || null,
      consignee_name: entry.consignee_name || null,
      item_description: entry.item_description || null,
      confirmation_status: entry.confirmation_status || 'pending',
      confirmed_at: entry.confirmed_at || null,
      confirmed_amount: entry.confirmed_amount || null,
      bilty_photo_id: entry.bilty_photo_id || null
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
        data: entryData,
        office_id: entry.office_id || undefined
      });
      return true;
    }
  } catch (error) {
    console.error('Error saving agency entry:', error);
    return false;
  }
};

export const getAgencyEntry = async (officeId?: string): Promise<AgencyEntry[]> => {
  try {
    const online = await isOnline();

    if (online) {
      let query = supabase
        .from('agency_entries')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('entry_date', { ascending: false });

      if (!error && data) {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(data));
        return data;
      }
    }
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
    let offlineData = offline ? JSON.parse(offline) : [];
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineData = offlineData.filter((item: any) => item.office_id === officeId);
    }
    
    return offlineData;
  } catch (error) {
    console.error('Error getting agency entries:', error);
    return [];
  }
};

// =====================================================
// 14. DELIVERY RECORD FUNCTIONS (Mumbai Delivery Redesign)
// =====================================================

/**
 * Save a delivery record with validation and offline support
 * Handles both create and update operations
 * @param record - Partial delivery record with required fields
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const saveDeliveryRecord = async (
  record: Partial<DeliveryRecord> & {
    billty_no: string;
    consignee_name: string;
    item_description: string;
    amount: number;
    office_id?: string;
  }
): Promise<boolean> => {
  try {
    console.log('🔄 saveDeliveryRecord: Starting save operation...');
    
    // Validate required fields
    if (!record.billty_no || record.billty_no.trim() === '') {
      console.error('❌ Billty No is required');
      return false;
    }
    if (!record.consignee_name || record.consignee_name.trim() === '') {
      console.error('❌ Consignee Name is required');
      return false;
    }
    if (!record.item_description || record.item_description.trim() === '') {
      console.error('❌ Item Description is required');
      return false;
    }
    if (!record.amount || record.amount <= 0) {
      console.error('❌ Amount must be a positive number');
      return false;
    }

    console.log('✅ Validation passed');
    console.log('🌐 Checking online status...');
    const online = await isOnline();
    console.log(`📡 Online status: ${online}`);

    // Get Mumbai agency ID with timeout
    console.log('🔍 Looking for Mumbai agency...');
    const agency = await Promise.race([
      getAgencyByName('Mumbai'),
      new Promise<null>((resolve) => setTimeout(() => {
        console.warn('⏱️ Agency lookup timeout after 5 seconds');
        resolve(null);
      }, 5000))
    ]);
    
    if (!agency) {
      console.error('❌ Mumbai agency not found in database. Please ensure Mumbai agency exists.');
      console.error('💡 You can create it manually in Supabase or run ensureMumbaiAgency() utility.');
      return false;
    }
    
    console.log('✅ Mumbai agency found:', agency.id);

    console.log('✅ Mumbai agency found:', agency.id);

    // Prepare delivery record data for agency_entries table
    console.log('📝 Preparing delivery data...');
    const deliveryData = {
      agency_id: agency.id,
      agency_name: 'Mumbai',
      billty_no: record.billty_no.trim(),
      consignee_name: record.consignee_name.trim(),
      item_description: record.item_description.trim(),
      description: record.item_description.trim(), // Also set description for compatibility
      amount: record.amount,
      entry_type: 'credit' as 'credit',
      entry_date: record.entry_date || new Date().toISOString().split('T')[0],
      office_id: record.office_id || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      // Set default values for new records
      confirmation_status: record.confirmation_status || 'pending',
      taken_from_godown: record.taken_from_godown ?? false,
      payment_received: record.payment_received ?? false,
      delivery_status: 'yes' as 'yes',
    };

    console.log('✅ Delivery data prepared');

    // Handle update vs create
    const isUpdate = !!record.id && !record.id.startsWith('temp_');
    console.log(`📊 Operation type: ${isUpdate ? 'UPDATE' : 'CREATE'}`);

    if (online) {
      console.log('🌐 Online mode - saving to Supabase...');
      console.log('🌐 Online mode - saving to Supabase...');
      if (isUpdate) {
        // Update existing record in agency_entries table
        console.log('🔄 Updating existing record...');
        const { data, error } = await supabase
          .from('agency_entries')
          .update(deliveryData)
          .eq('id', record.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Supabase update error:', error);
          throw error;
        }
        
        console.log('✅ Record updated in Supabase');
        
        // Update local storage - both DELIVERY_RECORDS and AGENCY_ENTRIES
        await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_RECORDS, data);
        
        // Also update AGENCY_ENTRIES cache
        const agencyEntriesCache = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
        if (agencyEntriesCache) {
          let agencyEntries: AgencyEntry[] = JSON.parse(agencyEntriesCache);
          const agencyEntryIndex = agencyEntries.findIndex(e => e.id === data.id);
          if (agencyEntryIndex !== -1) {
            agencyEntries[agencyEntryIndex] = data as AgencyEntry;
          } else {
            agencyEntries.unshift(data as AgencyEntry);
          }
          await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(agencyEntries));
        }
        
        await logHistory('update', 'agency_entries', data.id, deliveryData);
        console.log('✅ Local cache updated');
        return true;
      } else {
        // Create new record in agency_entries table
        console.log('➕ Creating new record in Supabase...');
        const { data, error } = await supabase
          .from('agency_entries')
          .insert([deliveryData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Supabase insert error:', error);
          throw error;
        }
        
        console.log('✅ Record created in Supabase:', data.id);
        
        // Save to local storage - both DELIVERY_RECORDS and AGENCY_ENTRIES
        await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_RECORDS, data);
        
        // Also update AGENCY_ENTRIES cache
        const agencyEntriesCache = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
        if (agencyEntriesCache) {
          let agencyEntries: AgencyEntry[] = JSON.parse(agencyEntriesCache);
          agencyEntries.unshift(data as AgencyEntry);
          await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(agencyEntries));
        } else {
          await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify([data]));
        }
        
        await logHistory('add', 'agency_entries', data.id, deliveryData);
        console.log('✅ Local cache updated');
        return true;
      }
    } else {
      // Offline mode
      console.log('📴 Offline mode - saving locally...');
      const tempId = record.id || `temp_${Date.now()}`;
      const currentDate = new Date().toISOString();
      const offlineData = {
        ...deliveryData,
        id: tempId,
        created_at: currentDate,
        updated_at: currentDate,
      };
      
      // Save to offline storage - both DELIVERY_RECORDS and AGENCY_ENTRIES
      await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_RECORDS, offlineData);
      
      // Also save to AGENCY_ENTRIES cache for consistency
      const agencyEntriesCache = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
      if (agencyEntriesCache) {
        let agencyEntries: AgencyEntry[] = JSON.parse(agencyEntriesCache);
        const existingIndex = agencyEntries.findIndex(e => e.id === tempId);
        if (existingIndex !== -1) {
          agencyEntries[existingIndex] = offlineData as AgencyEntry;
        } else {
          agencyEntries.unshift(offlineData as AgencyEntry);
        }
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(agencyEntries));
      } else {
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify([offlineData]));
      }
      
      // Queue for sync
      await SyncManager.getInstance().addPendingOperation({
        table: 'agency_entries',
        action: isUpdate ? 'UPDATE' : 'INSERT',
        data: deliveryData,
        office_id: record.office_id || undefined,
      });
      
      console.log('✅ Saved offline, queued for sync');
      return true;
    }
  } catch (error) {
    console.error('❌ Error saving delivery record:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
};

/**
 * Get delivery records with filtering and ordering
 * Fetches from Supabase if online, falls back to AsyncStorage if offline
 * @param officeId - Optional office ID to filter records
 * @param status - Optional confirmation status filter: 'pending', 'confirmed', or 'all'
 * @returns Array of delivery records ordered by confirmation_status (pending first) then entry_date descending
 */
export const getDeliveryRecords = async (
  officeId?: string,
  status?: 'pending' | 'confirmed' | 'all'
): Promise<DeliveryRecord[]> => {
  try {
    const online = await isOnline();

    if (online) {
      // Build query for agency_entries table with Mumbai filter
      let query = supabase
        .from('agency_entries')
        .select('*')
        .eq('agency_name', 'Mumbai');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      // Apply confirmation status filter if provided
      if (status && status !== 'all') {
        query = query.eq('confirmation_status', status);
      }
      
      // Order by entry_date descending
      const { data, error } = await query.order('entry_date', { ascending: false });

      if (!error && data) {
        // Sort to ensure pending records come first, then by entry_date descending
        const sortedData = data.sort((a, b) => {
          // First sort by confirmation_status (pending before confirmed)
          if (a.confirmation_status === 'pending' && b.confirmation_status === 'confirmed') {
            return -1;
          }
          if (a.confirmation_status === 'confirmed' && b.confirmation_status === 'pending') {
            return 1;
          }
          // Then sort by entry_date descending
          return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
        });
        
        // Cache the data
        await AsyncStorage.setItem(OFFLINE_KEYS.DELIVERY_RECORDS, JSON.stringify(sortedData));
        return sortedData as DeliveryRecord[];
      } else if (error) {
        console.error('Error fetching delivery records from Supabase:', error);
        // Fall through to offline mode
      }
    }
    
    // Offline mode - fetch from AsyncStorage
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.DELIVERY_RECORDS);
    let offlineData: DeliveryRecord[] = offline ? JSON.parse(offline) : [];
    
    // If no offline data, try to get from agency entries cache
    if (offlineData.length === 0) {
      const agencyEntriesCache = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
      if (agencyEntriesCache) {
        const allEntries: AgencyEntry[] = JSON.parse(agencyEntriesCache);
        offlineData = allEntries.filter(entry => entry.agency_name === 'Mumbai') as DeliveryRecord[];
      }
    }
    
    // Apply filters to offline data
    offlineData = offlineData.filter((record) => {
      // Filter by office_id if provided
      if (officeId && record.office_id !== officeId) {
        return false;
      }
      
      // Filter by confirmation_status if provided
      if (status && status !== 'all' && record.confirmation_status !== status) {
        return false;
      }
      
      return true;
    });
    
    // Sort offline data: pending first, then by entry_date descending
    offlineData.sort((a, b) => {
      // First sort by confirmation_status (pending before confirmed)
      if (a.confirmation_status === 'pending' && b.confirmation_status === 'confirmed') {
        return -1;
      }
      if (a.confirmation_status === 'confirmed' && b.confirmation_status === 'pending') {
        return 1;
      }
      // Then sort by entry_date descending
      return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    });
    
    return offlineData;
  } catch (error) {
    console.error('Error getting delivery records:', error);
    return [];
  }
};

/**
 * Confirm payment for a delivery record
 * Updates delivery record with confirmation data, sets status to confirmed,
 * and links photo records
 * @param confirmation - Payment confirmation data including photos
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const confirmDeliveryPayment = async (
  confirmation: PaymentConfirmation
): Promise<boolean> => {
  try {
    // Validate required fields
    if (!confirmation.delivery_record_id) {
      console.error('Delivery record ID is required');
      return false;
    }
    if (!confirmation.confirmed_amount || confirmation.confirmed_amount <= 0) {
      console.error('Confirmed amount must be a positive number');
      return false;
    }
    if (!confirmation.bilty_photo) {
      console.error('Bilty photo is required');
      return false;
    }
    if (!confirmation.signature_photo) {
      console.error('Signature photo is required');
      return false;
    }

    const online = await isOnline();
    const currentUser = (await supabase.auth.getUser()).data.user;
    const confirmedAt = confirmation.confirmed_at || new Date().toISOString();

    // Validate office-based access control - Validates: Requirement 7.4
    // First, get the delivery record to check its office_id
    let deliveryRecord: AgencyEntry | null = null;
    
    if (online) {
      const { data, error } = await supabase
        .from('agency_entries')
        .select('*')
        .eq('id', confirmation.delivery_record_id)
        .single();
      
      if (error || !data) {
        console.error('Delivery record not found or access denied:', error);
        return false;
      }
      deliveryRecord = data as AgencyEntry;
    } else {
      // Offline mode - check local storage
      const offlineRecords = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
      const records: AgencyEntry[] = offlineRecords ? JSON.parse(offlineRecords) : [];
      deliveryRecord = records.find(r => r.id === confirmation.delivery_record_id) || null;
      
      if (!deliveryRecord) {
        console.error('Delivery record not found in offline storage');
        return false;
      }
    }

    // Prepare confirmation data
    const confirmationData = {
      confirmation_status: 'confirmed' as const,
      confirmed_at: confirmedAt,
      confirmed_amount: confirmation.confirmed_amount,
      taken_from_godown: true,
      payment_received: true,
      delivery_status: 'yes' as const, // Update legacy field for backward compatibility
      updated_at: new Date().toISOString(),
      payment_type: confirmation.payment_type || 'cash',
    };

    if (online) {
      // First, upload photos to Supabase storage
      console.log('📤 Uploading bilty photo to Supabase storage...');
      const biltyStoragePath = `${confirmation.delivery_record_id}/bilty_${Date.now()}.jpg`;
      
      // Convert photo URI to blob for upload
      const biltyPhotoUri = confirmation.bilty_photo.uri.replace('file://', '');
      const RNFS = await import('react-native-fs');
      const biltyBase64 = await RNFS.default.readFile(biltyPhotoUri, 'base64');
      const biltyBytes = Uint8Array.from(atob(biltyBase64), c => c.charCodeAt(0));
      
      const { data: biltyUploadData, error: biltyUploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(biltyStoragePath, biltyBytes, {
          contentType: confirmation.bilty_photo.mimeType,
          upsert: false,
        });
      
      if (biltyUploadError) {
        console.error('❌ Bilty photo upload error:', biltyUploadError);
        throw new Error('Failed to upload bilty photo');
      }
      
      console.log('✅ Bilty photo uploaded:', biltyUploadData.path);
      
      // Get public URL for bilty photo
      const { data: { publicUrl: biltyPublicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(biltyUploadData.path);
      
      console.log('📤 Uploading signature photo to Supabase storage...');
      const signatureStoragePath = `${confirmation.delivery_record_id}/signature_${Date.now()}.jpg`;
      
      const signaturePhotoUri = confirmation.signature_photo.uri.replace('file://', '');
      const signatureBase64 = await RNFS.default.readFile(signaturePhotoUri, 'base64');
      const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
      
      const { data: signatureUploadData, error: signatureUploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(signatureStoragePath, signatureBytes, {
          contentType: confirmation.signature_photo.mimeType,
          upsert: false,
        });
      
      if (signatureUploadError) {
        console.error('❌ Signature photo upload error:', signatureUploadError);
        throw new Error('Failed to upload signature photo');
      }
      
      console.log('✅ Signature photo uploaded:', signatureUploadData.path);
      
      // Get public URL for signature photo
      const { data: { publicUrl: signaturePublicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(signatureUploadData.path);
      
      // Now save photo records with storage paths
      const biltyPhotoId = await savePhotoRecord({
        delivery_record_id: confirmation.delivery_record_id,
        photo_type: 'bilty',
        file_path: biltyUploadData.path, // Use storage path, not local path
        file_name: confirmation.bilty_photo.fileName,
        file_size: confirmation.bilty_photo.fileSize,
        mime_type: confirmation.bilty_photo.mimeType,
        uploaded: true, // Mark as uploaded
        upload_url: biltyPublicUrl, // Save public URL
        created_by: currentUser?.id,
        office_id: deliveryRecord.office_id,
      });

      const signaturePhotoId = await savePhotoRecord({
        delivery_record_id: confirmation.delivery_record_id,
        photo_type: 'signature',
        file_path: signatureUploadData.path, // Use storage path, not local path
        file_name: confirmation.signature_photo.fileName,
        file_size: confirmation.signature_photo.fileSize,
        mime_type: confirmation.signature_photo.mimeType,
        uploaded: true, // Mark as uploaded
        upload_url: signaturePublicUrl, // Save public URL
        created_by: currentUser?.id,
        office_id: deliveryRecord.office_id,
      });

      // Update delivery record with confirmation data and photo IDs
      const { data, error } = await supabase
        .from('agency_entries')
        .update({
          ...confirmationData,
          bilty_photo_id: biltyPhotoId,
          signature_photo_id: signaturePhotoId,
        })
        .eq('id', confirmation.delivery_record_id)
        .select()
        .single();

      if (error) throw error;

      // Handle payment type logic
      const paymentType = confirmation.payment_type || 'cash';
      
      if (paymentType === 'cash') {
        // Cash payment: Create credit entry in general_entries (Daily Report)
        const creditEntry = {
          description: `Mumbai Delivery - ${deliveryRecord.billty_no}`,
          amount: confirmation.confirmed_amount,
          entry_type: 'credit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        const { error: creditError } = await supabase
          .from('general_entries')
          .insert([creditEntry]);
        
        if (creditError) {
          console.error('Error creating credit entry for cash payment:', creditError);
        }
      } else if (paymentType === 'gpay_yash') {
        // GPay Yash Roadlines: Create credit entry + debit entry for Yash Roadlines GPay
        const creditEntry = {
          description: `Mumbai Delivery - ${deliveryRecord.billty_no}`,
          amount: confirmation.confirmed_amount,
          entry_type: 'credit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        const { error: creditError } = await supabase
          .from('general_entries')
          .insert([creditEntry]);
        
        if (creditError) {
          console.error('Error creating credit entry for GPay Yash payment:', creditError);
        }
        
        // Create debit entry for Yash Roadlines GPay
        const debitEntry = {
          description: `Yash Roadlines GPay - Mumbai Delivery`,
          amount: confirmation.confirmed_amount,
          entry_type: 'debit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        const { error: debitError } = await supabase
          .from('general_entries')
          .insert([debitEntry]);
        
        if (debitError) {
          console.error('Error creating debit entry for Yash Roadlines GPay:', debitError);
        }
      }
      // else if paymentType === 'gpay_sapan': No entry in daily report, only confirmation

      // Update local storage
      await saveToOfflineStorage(OFFLINE_KEYS.AGENCY_ENTRIES, data);
      await logHistory('update', 'agency_entries', data.id, confirmationData);
      
      return true;
    } else {
      // Offline mode
      // Save photos locally first
      const biltyPhotoId = await savePhotoRecord({
        delivery_record_id: confirmation.delivery_record_id,
        photo_type: 'bilty',
        file_path: confirmation.bilty_photo.uri,
        file_name: confirmation.bilty_photo.fileName,
        file_size: confirmation.bilty_photo.fileSize,
        mime_type: confirmation.bilty_photo.mimeType,
        uploaded: false,
        created_by: currentUser?.id,
        office_id: deliveryRecord.office_id, // Inherit office_id from delivery record - Validates: Requirement 7.4
      });

      const signaturePhotoId = await savePhotoRecord({
        delivery_record_id: confirmation.delivery_record_id,
        photo_type: 'signature',
        file_path: confirmation.signature_photo.uri,
        file_name: confirmation.signature_photo.fileName,
        file_size: confirmation.signature_photo.fileSize,
        mime_type: confirmation.signature_photo.mimeType,
        uploaded: false,
        created_by: currentUser?.id,
        office_id: deliveryRecord.office_id, // Inherit office_id from delivery record - Validates: Requirement 7.4
      });

      // Update local delivery record
      const offlineRecords = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
      let records: AgencyEntry[] = offlineRecords ? JSON.parse(offlineRecords) : [];
      
      const recordIndex = records.findIndex(r => r.id === confirmation.delivery_record_id);
      if (recordIndex !== -1) {
        records[recordIndex] = {
          ...records[recordIndex],
          ...confirmationData,
          bilty_photo_id: biltyPhotoId,
          signature_photo_id: signaturePhotoId,
        };
        await AsyncStorage.setItem(OFFLINE_KEYS.AGENCY_ENTRIES, JSON.stringify(records));
      }

      // Handle payment type logic for offline mode
      const paymentType = confirmation.payment_type || 'cash';
      
      if (paymentType === 'cash') {
        // Cash payment: Create credit entry in general_entries (Daily Report)
        const creditEntry = {
          id: `temp_${Date.now()}_credit`,
          description: `Mumbai Delivery - ${deliveryRecord.billty_no}`,
          amount: confirmation.confirmed_amount,
          entry_type: 'credit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          created_at: confirmedAt,
          updated_at: confirmedAt,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        await saveToOfflineStorage(OFFLINE_KEYS.GENERAL_ENTRIES, creditEntry);
        await SyncManager.getInstance().addPendingOperation({
          table: 'general_entries',
          action: 'INSERT',
          data: creditEntry,
          office_id: deliveryRecord.office_id || undefined,
        });
      } else if (paymentType === 'gpay_yash') {
        // GPay Yash Roadlines: Create credit entry + debit entry for Yash Roadlines GPay
        const creditEntry = {
          id: `temp_${Date.now()}_credit`,
          description: `Mumbai Delivery - ${deliveryRecord.billty_no}`,
          amount: confirmation.confirmed_amount,
          entry_type: 'credit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          created_at: confirmedAt,
          updated_at: confirmedAt,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        await saveToOfflineStorage(OFFLINE_KEYS.GENERAL_ENTRIES, creditEntry);
        await SyncManager.getInstance().addPendingOperation({
          table: 'general_entries',
          action: 'INSERT',
          data: creditEntry,
          office_id: deliveryRecord.office_id || undefined,
        });
        
        // Create debit entry for Yash Roadlines GPay
        const debitEntry = {
          id: `temp_${Date.now()}_debit`,
          description: `Yash Roadlines GPay - Mumbai Delivery`,
          amount: confirmation.confirmed_amount,
          entry_type: 'debit' as const,
          entry_date: confirmedAt,
          office_id: deliveryRecord.office_id,
          created_by: currentUser?.id,
          created_at: confirmedAt,
          updated_at: confirmedAt,
          // Store metadata for display formatting
          metadata: JSON.stringify({
            consignee_name: deliveryRecord.consignee_name,
            item_description: deliveryRecord.item_description || deliveryRecord.description,
            billty_no: deliveryRecord.billty_no,
          }),
        };
        
        await saveToOfflineStorage(OFFLINE_KEYS.GENERAL_ENTRIES, debitEntry);
        await SyncManager.getInstance().addPendingOperation({
          table: 'general_entries',
          action: 'INSERT',
          data: debitEntry,
          office_id: deliveryRecord.office_id || undefined,
        });
      }
      // else if paymentType === 'gpay_sapan': No entry in daily report, only confirmation

      // Queue for sync
      await SyncManager.getInstance().addPendingOperation({
        table: 'agency_entries',
        action: 'UPDATE',
        data: {
          ...confirmationData,
          bilty_photo_id: biltyPhotoId,
          signature_photo_id: signaturePhotoId,
        },
        office_id: deliveryRecord.office_id || undefined, // Include office_id for validation - Validates: Requirement 7.4
      });

      return true;
    }
  } catch (error) {
    console.error('Error confirming delivery payment:', error);
    return false;
  }
};

/**
 * Save photo record to database and local storage
 * @param photo - Photo record data
 * @returns Promise<string> - Photo ID
 */
export const savePhotoRecord = async (
  photo: Partial<PhotoRecord> & {
    delivery_record_id: string;
    photo_type: 'bilty' | 'signature';
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }
): Promise<string> => {
  try {
    const online = await isOnline();
    const currentUser = (await supabase.auth.getUser()).data.user;

    const photoData = {
      delivery_record_id: photo.delivery_record_id,
      photo_type: photo.photo_type,
      file_path: photo.file_path,
      file_name: photo.file_name,
      file_size: photo.file_size,
      mime_type: photo.mime_type,
      uploaded: photo.uploaded ?? false,
      upload_url: photo.upload_url || null,
      office_id: photo.office_id || null,
      created_by: photo.created_by || currentUser?.id,
    };

    if (online) {
      // Save to database
      const { data, error } = await supabase
        .from('delivery_photos')
        .insert([photoData])
        .select()
        .single();

      if (error) throw error;

      // Save to local storage
      await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_PHOTOS, data);

      // Queue photo for upload if not already uploaded
      if (!photo.uploaded) {
        const pendingUploads = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_PHOTO_UPLOADS);
        const uploads = pendingUploads ? JSON.parse(pendingUploads) : [];
        uploads.push(data.id);
        await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_PHOTO_UPLOADS, JSON.stringify(uploads));
      }

      return data.id;
    } else {
      // Offline mode - generate temp ID
      const tempId = `temp_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentDate = new Date().toISOString();
      
      const offlinePhotoData = {
        ...photoData,
        id: tempId,
        created_at: currentDate,
        updated_at: currentDate,
      };

      // Save to local storage
      await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_PHOTOS, offlinePhotoData);

      // Queue for sync
      await SyncManager.getInstance().addPendingOperation({
        table: 'delivery_photos',
        action: 'INSERT',
        data: photoData,
        office_id: photo.office_id || undefined,
      });

      // Queue photo for upload
      const pendingUploads = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_PHOTO_UPLOADS);
      const uploads = pendingUploads ? JSON.parse(pendingUploads) : [];
      uploads.push(tempId);
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_PHOTO_UPLOADS, JSON.stringify(uploads));

      return tempId;
    }
  } catch (error) {
    console.error('Error saving photo record:', error);
    throw error;
  }
};

/**
 * Get photos for a delivery record
 * @param deliveryRecordId - Delivery record ID
 * @param officeId - Optional office ID for access control validation
 * @returns Promise<PhotoRecord[]> - Array of photo records
 */
export const getDeliveryPhotos = async (
  deliveryRecordId: string,
  officeId?: string
): Promise<PhotoRecord[]> => {
  try {
    const online = await isOnline();

    // Validate office-based access control - Validates: Requirement 7.4
    if (officeId) {
      // First verify the delivery record belongs to the specified office
      const deliveryRecords = await getDeliveryRecords(officeId, 'all');
      const hasAccess = deliveryRecords.some(r => r.id === deliveryRecordId);
      
      if (!hasAccess) {
        console.error('Access denied: Delivery record does not belong to the specified office');
        return [];
      }
    }

    if (online) {
      let query = supabase
        .from('delivery_photos')
        .select('*')
        .eq('delivery_record_id', deliveryRecordId);
      
      // Apply office filter if provided - Validates: Requirement 7.4
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });

      if (!error && data) {
        // Cache the data
        for (const photo of data) {
          await saveToOfflineStorage(OFFLINE_KEYS.DELIVERY_PHOTOS, photo);
        }
        return data as PhotoRecord[];
      }
    }

    // Offline mode - fetch from AsyncStorage
    const offline = await AsyncStorage.getItem(OFFLINE_KEYS.DELIVERY_PHOTOS);
    let offlineData: PhotoRecord[] = offline ? JSON.parse(offline) : [];

    // Filter by delivery_record_id
    offlineData = offlineData.filter(photo => photo.delivery_record_id === deliveryRecordId);
    
    // Apply office filter if provided - Validates: Requirement 7.4
    if (officeId) {
      offlineData = offlineData.filter(photo => photo.office_id === officeId);
    }

    // Sort by created_at
    offlineData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return offlineData;
  } catch (error) {
    console.error('Error getting delivery photos:', error);
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
      
      // Get the record to extract office_id before deleting
      const recordToDelete = allItems[itemIndex];
      const officeId = recordToDelete?.office_id;
      
      const updatedItems = allItems.filter((item: any) => item.id !== id);
      await AsyncStorage.setItem(key, JSON.stringify(updatedItems));
      
      if (online && !supabaseDeleteSuccess) {
        await SyncManager.getInstance().addPendingOperation({
          table: tableName,
          action: 'DELETE',
          data: { id: id },
          office_id: officeId
        });
      } else if (!online) {
        await SyncManager.getInstance().addPendingOperation({
          table: tableName,
          action: 'DELETE',
          data: { id: id },
          office_id: officeId
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

export const getAllTransactionsForDate = async (targetDate: Date, officeId?: string): Promise<any[]> => {
  try {
    const online = await isOnline();
    
    console.log('🔍 getAllTransactionsForDate called:', {
      date: targetDate.toISOString().split('T')[0],
      officeId: officeId || 'ALL',
      online
    });
    
    if (online) {
      // Create date strings in YYYY-MM-DD format to avoid timezone issues
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Query for the entire day in UTC (00:00 to 23:59)
     // IST offset = 330 minutes
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const startOfDayIST = new Date(
  Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()) - IST_OFFSET
);
const endOfDayIST = new Date(startOfDayIST.getTime() + 24 * 60 * 60 * 1000 - 1);

const startISO = startOfDayIST.toISOString();
const endISO = endOfDayIST.toISOString();
      
      console.log('🔍 Query date range:', {
        dateString,
        startISO,
        endISO
      });
      
      // Build queries with optional office filter
      const buildQuery = (table: string, dateField: string) => {
        let query = supabase
          .from(table)
          .select('*')
          .gte(dateField, startISO)
          .lte(dateField, endISO);
        
        if (officeId) {
          query = query.eq('office_id', officeId);
        }
        
        return query;
      };
      
      const [payments, majuri, driverTxn, fuelEntries, generalEntries, agencyEntries, uppadJamaEntries] = await Promise.all([
        buildQuery('agency_payments', 'payment_date'),
        buildQuery('agency_majuri', 'majuri_date'),
        buildQuery('driver_transactions', 'transaction_date'),
        buildQuery('truck_fuel_entries', 'fuel_date'),
        buildQuery('general_entries', 'entry_date'),
        buildQuery('agency_entries', 'entry_date'),
        buildQuery('uppad_jama_entries', 'entry_date'),
      ]);
      
      console.log('📊 Query results:', {
        payments: payments.data?.length || 0,
        majuri: majuri.data?.length || 0,
        driverTxn: driverTxn.data?.length || 0,
        fuelEntries: fuelEntries.data?.length || 0,
        generalEntries: generalEntries.data?.length || 0,
        agencyEntries: agencyEntries.data?.length || 0,
        uppadJamaEntries: uppadJamaEntries.data?.length || 0,
      });
      
      // Debug general entries specifically
      if (generalEntries.data && generalEntries.data.length > 0) {
        console.log('📝 General Entries found:', generalEntries.data.length);
        generalEntries.data.forEach((entry: any, index: number) => {
          console.log(`   [${index}] ID: ${entry.id}, Amount: ${entry.amount}, Type: ${entry.entry_type}, Date: ${entry.entry_date}, Desc: ${entry.description}`);
        });
      } else {
        console.log('⚠️ No general entries found for this date');
        if (generalEntries.error) {
          console.error('   Error:', generalEntries.error);
        }
      }
      
      // Debug agency entries specifically
      const mumbaiEntries = (agencyEntries.data || []).filter((e: any) => e.agency_name === 'Mumbai');
      console.log('🏙️ Mumbai entries in agencyEntries:', mumbaiEntries.length);
      if (mumbaiEntries.length > 0) {
        console.log('   Sample Mumbai entry:', {
          id: mumbaiEntries[0].id,
          billty_no: mumbaiEntries[0].billty_no,
          amount: mumbaiEntries[0].amount,
          confirmation_status: mumbaiEntries[0].confirmation_status,
          entry_date: mumbaiEntries[0].entry_date,
        });
      }
      
      const allTransactions = [
        ...(payments.data || []),
        ...(majuri.data || []),
        ...(driverTxn.data || []),
        ...(fuelEntries.data || []),
        ...(generalEntries.data || []),
        ...(agencyEntries.data || []),
        ...(uppadJamaEntries.data || [])
      ];
      
      console.log('✅ Total transactions returned:', allTransactions.length);
      
      return allTransactions;
      
    } else {
      console.log('📴 Offline mode - loading from cache');
      
      const [payments, majuri, driverTxn, fuelEntries, generalEntries, agencyEntries, uppadJamaEntries] = await Promise.all([
        getAgencyPaymentsLocal(officeId),
        getAgencyMajuri(officeId), 
        getDriverTransactions(officeId),
        getTruckFuelEntries(officeId),
        getGeneralEntries(officeId),
        getAgencyEntry(officeId),
        getUppadJamaEntries(officeId)
      ]);
      
      console.log('📊 Cache results:', {
        payments: payments.length,
        majuri: majuri.length,
        driverTxn: driverTxn.length,
        fuelEntries: fuelEntries.length,
        generalEntries: generalEntries.length,
        agencyEntries: agencyEntries.length,
        uppadJamaEntries: uppadJamaEntries.length,
      });
      
      // Debug Mumbai entries in cache
      const mumbaiEntries = agencyEntries.filter((e: any) => e.agency_name === 'Mumbai');
      console.log('🏙️ Mumbai entries in cache:', mumbaiEntries.length);
      
      const filteredTransactions = [
        ...payments.filter((item: { payment_date: string; }) => isSameDate(item.payment_date, targetDate)),
        ...majuri.filter((item: { majuri_date: string; }) => isSameDate(item.majuri_date, targetDate)),
        ...driverTxn.filter((item: { transaction_date: string; }) => isSameDate(item.transaction_date, targetDate)),
        ...fuelEntries.filter((item: { fuel_date: string; }) => isSameDate(item.fuel_date, targetDate)),
        ...generalEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate)),
        ...agencyEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate)),
        ...uppadJamaEntries.filter((item: { entry_date: string; }) => isSameDate(item.entry_date, targetDate))
      ];
      
      console.log('✅ Total filtered transactions:', filteredTransactions.length);
      
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

export const getMonthlyTransactions = async (month: string, year: string, officeId?: string): Promise<any[]> => {
  try {
    // Start date: First day of the month at 00:00:00
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // End date: Last day of the month at 23:59:59.999
    // new Date(year, month, 0) gives the last day of the previous month
    // So new Date(year, month, 0) where month is the NEXT month gives us the last day of current month
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    console.log('📅 getMonthlyTransactions - Month:', month, 'Year:', year);
    console.log('📅 Date Range:', startISO, 'to', endISO);
    console.log('📅 Office ID:', officeId);

    // Build queries with optional office_id filter
    let paymentsQuery = supabase
      .from('agency_payments')
      .select('*')
      .gte('payment_date', startISO)
      .lte('payment_date', endISO);
    if (officeId) paymentsQuery = paymentsQuery.eq('office_id', officeId);

    let majuriQuery = supabase
      .from('agency_majuri')
      .select('*')
      .gte('majuri_date', startISO)
      .lte('majuri_date', endISO);
    if (officeId) majuriQuery = majuriQuery.eq('office_id', officeId);

    let agencyGeneralQuery = supabase
      .from('agency_entries')
      .select('*')
      .gte('entry_date', startISO)
      .lte('entry_date', endISO);
    if (officeId) agencyGeneralQuery = agencyGeneralQuery.eq('office_id', officeId);

    let generalQuery = supabase
      .from('general_entries')
      .select('*')
      .gte('entry_date', startISO)
      .lte('entry_date', endISO);
    if (officeId) generalQuery = generalQuery.eq('office_id', officeId);

    let driverQuery = supabase
      .from('driver_transactions')
      .select('*')
      .gte('transaction_date', startISO)
      .lte('transaction_date', endISO);
    if (officeId) driverQuery = driverQuery.eq('office_id', officeId);

    let fuelQuery = supabase
      .from('truck_fuel_entries')
      .select('*')
      .gte('fuel_date', startISO)
      .lte('fuel_date', endISO);
    if (officeId) fuelQuery = fuelQuery.eq('office_id', officeId);

    let uppadJamaQuery = supabase
      .from('uppad_jama_entries')
      .select('*')
      .gte('entry_date', startISO)
      .lte('entry_date', endISO);
    if (officeId) uppadJamaQuery = uppadJamaQuery.eq('office_id', officeId);

    const [
      payments,
      majuri,
      agencyGeneralEntries,
      generalEntries,
      driverTransactions,
      fuelEntries,
      uppadJamaEntries
    ] = await Promise.all([
      paymentsQuery,
      majuriQuery,
      agencyGeneralQuery,
      generalQuery,
      driverQuery,
      fuelQuery,
      uppadJamaQuery,
    ]);

    console.log('📊 Fetched Data Counts:');
    console.log('  - Payments:', payments.data?.length || 0);
    console.log('  - Majuri:', majuri.data?.length || 0);
    console.log('  - Agency Entries:', agencyGeneralEntries.data?.length || 0);
    console.log('  - General Entries:', generalEntries.data?.length || 0);
    console.log('  - Driver Transactions:', driverTransactions.data?.length || 0);
    console.log('  - Fuel Entries:', fuelEntries.data?.length || 0);
    console.log('  - Uppad/Jama:', uppadJamaEntries.data?.length || 0);

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

export const saveLeaveCashRecord = async (recordData: Omit<CashRecord, 'id' | 'created_at' | 'updated_at'> & { office_id?: string }): Promise<void> => {
  try {
    const currentTime = new Date().toISOString();
    const newRecord: CashRecord = {
      id: `cash_${Date.now()}`,
      ...recordData,
      office_id: recordData.office_id || undefined,
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

export const getCashRecords = async (officeId?: string): Promise<CashRecord[]> => {
  try {
    console.log('🔍 DEBUG: Getting cash records from Supabase...');
    // Try to get from Supabase first
    try {
      let query = supabase
        .from('cash_records')
        .select('*');
      
      // Apply office filter if provided
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

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
    let offlineRecords = storedData ? JSON.parse(storedData) : [];
    console.log('🔍 DEBUG: Offline cash records:', offlineRecords);
    
    // Apply office filter to offline data if provided
    if (officeId) {
      offlineRecords = offlineRecords.filter((item: any) => item.office_id === officeId);
    }
    
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

// =====================================================
// OFFICE MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Fetch all offices from the database
 * @returns Promise<Office[]> - Array of all offices
 */
export const getOffices = async (): Promise<Office[]> => {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('offices')
      .select('*')
      .eq('is_active', true)
      .order('name');

    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery('getOffices', duration);

    if (error) {
      console.error('Error fetching offices:', error);
      throw error;
    }

    return (data || []) as Office[];
  } catch (error) {
    const duration = performance.now() - startTime;
    queryPerformanceAnalyzer.recordQuery('getOffices:error', duration);
    console.error('Error getting offices:', error);
    return [];
  }
};

/**
 * Fetch a single office by ID
 * @param id - Office UUID
 * @returns Promise<Office | null> - Office object or null if not found
 */
export const getOfficeById = async (id: string): Promise<Office | null> => {
  try {
    const { data, error } = await supabase
      .from('offices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching office by ID:', error);
      throw error;
    }

    return data as Office;
  } catch (error) {
    console.error('Error getting office by ID:', error);
    return null;
  }
};

/**
 * Create a new office with uniqueness validation
 * @param name - Office name (must be unique)
 * @param address - Optional office address
 * @returns Promise<Office | null> - Created office or null if failed
 */
export const createOffice = async (name: string, address?: string): Promise<Office | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found.');
      return null;
    }

    // Trim and validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error('Office name cannot be empty');
      return null;
    }

    // Check for uniqueness (case-insensitive)
    const { data: existingOffices, error: checkError } = await supabase
      .from('offices')
      .select('id, name')
      .ilike('name', trimmedName);

    if (checkError) {
      console.error('Error checking office name uniqueness:', checkError);
      throw checkError;
    }

    if (existingOffices && existingOffices.length > 0) {
      console.error('Office with this name already exists');
      return null;
    }

    // Create the office
    const officeData = {
      name: trimmedName,
      address: address?.trim() || null,
      is_active: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('offices')
      .insert([officeData])
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        console.error('Office name already exists (unique constraint)');
        return null;
      }
      console.error('Error creating office:', error);
      throw error;
    }

    await logHistory('add', 'offices', data.id, officeData);
    console.log('✅ Office created successfully:', data.name);
    
    return data as Office;
  } catch (error) {
    console.error('Error creating office:', error);
    return null;
  }
};

/**
 * Update an existing office
 * @param id - Office UUID
 * @param updates - Partial office data to update
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const updateOffice = async (id: string, updates: Partial<Office>): Promise<boolean> => {
  try {
    // Validate that we're not updating to an empty name
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        console.error('Office name cannot be empty');
        return false;
      }

      // Check for uniqueness (case-insensitive), excluding current office
      const { data: existingOffices, error: checkError } = await supabase
        .from('offices')
        .select('id, name')
        .ilike('name', trimmedName)
        .neq('id', id);

      if (checkError) {
        console.error('Error checking office name uniqueness:', checkError);
        throw checkError;
      }

      if (existingOffices && existingOffices.length > 0) {
        console.error('Office with this name already exists');
        return false;
      }

      updates.name = trimmedName;
    }

    // Trim address if provided
    if (updates.address !== undefined) {
      updates.address = updates.address?.trim() || undefined;
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('offices')
      .update(updateData)
      .eq('id', id);

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        console.error('Office name already exists (unique constraint)');
        return false;
      }
      console.error('Error updating office:', error);
      throw error;
    }

    await logHistory('update', 'offices', id, updateData);
    console.log('✅ Office updated successfully');
    
    return true;
  } catch (error) {
    console.error('Error updating office:', error);
    return false;
  }
};

/**
 * Delete an office (only if no transactions are associated)
 * @param id - Office UUID
 * @returns Promise<boolean> - True if successful, false if office has transactions or error
 */
export const deleteOffice = async (id: string): Promise<boolean> => {
  try {
    // Check if office has any associated transactions
    const transactionTables = [
      'agency_payments',
      'agency_majuri',
      'driver_transactions',
      'truck_fuel_entries',
      'general_entries',
      'agency_entries',
      'uppad_jama_entries',
      'cash_records'
    ];

    for (const table of transactionTables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('office_id', id)
        .limit(1);

      if (error) {
        console.error(`Error checking ${table} for office transactions:`, error);
        throw error;
      }

      if (data && data.length > 0) {
        console.error(`Cannot delete office: has associated transactions in ${table}`);
        return false;
      }
    }

    // Check if office has any assigned users
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('office_id', id)
      .limit(1);

    if (userError) {
      console.error('Error checking users for office assignment:', userError);
      throw userError;
    }

    if (users && users.length > 0) {
      console.error('Cannot delete office: has assigned users');
      return false;
    }

    // No transactions or users found, safe to delete
    const { error: deleteError } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting office:', deleteError);
      throw deleteError;
    }

    await logHistory('delete', 'offices', id, { deleted_at: new Date().toISOString() });
    console.log('✅ Office deleted successfully');
    
    return true;
  } catch (error) {
    console.error('Error deleting office:', error);
    return false;
  }
};

/**
 * Get the office assignment for a user
 * @param userId - User UUID
 * @returns Promise<string | null> - Office ID or null if not assigned
 */
export const getUserOfficeAssignment = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('office_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No user profile found
        return null;
      }
      console.error('Error fetching user office assignment:', error);
      throw error;
    }

    return data?.office_id || null;
  } catch (error) {
    console.error('Error getting user office assignment:', error);
    return null;
  }
};

/**
 * Set or update the office assignment for a user
 * @param userId - User UUID
 * @param officeId - Office UUID
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const setUserOfficeAssignment = async (userId: string, officeId: string): Promise<boolean> => {
  try {
    // Verify that the office exists
    const office = await getOfficeById(officeId);
    if (!office) {
      console.error('Office not found');
      return false;
    }

    // Update user profile with office assignment
    const { error } = await supabase
      .from('user_profiles')
      .update({
        office_id: officeId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error setting user office assignment:', error);
      throw error;
    }

    await logHistory('update', 'user_profiles', userId, { 
      office_id: officeId
    });
    console.log('✅ User office assignment updated successfully');
    
    return true;
  } catch (error) {
    console.error('Error setting user office assignment:', error);
    return false;
  }
};

// =====================================================
// OFFLINE SYNC MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Manually trigger sync of all pending operations
 * @returns Promise<boolean> - true if all operations synced successfully
 */
export const syncPendingOperations = async (): Promise<boolean> => {
  try {
    console.log('🔄 Manually triggering sync of pending operations...');
    const syncManager = SyncManager.getInstance();
    const result = await syncManager.syncPendingOperations();
    console.log(`✅ Sync completed: ${result ? 'All operations synced' : 'Some operations failed'}`);
    return result;
  } catch (error) {
    console.error('❌ Error syncing pending operations:', error);
    return false;
  }
};

/**
 * Get the count of pending sync operations
 * @returns Promise<number> - Number of pending operations
 */
export const getPendingOperationsCount = async (): Promise<number> => {
  try {
    const syncManager = SyncManager.getInstance();
    return await syncManager.getPendingOperationsCount();
  } catch (error) {
    console.error('❌ Error getting pending operations count:', error);
    return 0;
  }
};

/**
 * Get all logged sync conflicts
 * @returns Promise<SyncConflict[]> - Array of sync conflicts
 */
export const getSyncConflicts = async (): Promise<any[]> => {
  try {
    const syncManager = SyncManager.getInstance();
    return await syncManager.getSyncConflicts();
  } catch (error) {
    console.error('❌ Error getting sync conflicts:', error);
    return [];
  }
};

/**
 * Clear all logged sync conflicts
 * @returns Promise<void>
 */
export const clearSyncConflicts = async (): Promise<void> => {
  try {
    const syncManager = SyncManager.getInstance();
    await syncManager.clearSyncConflicts();
    console.log('✅ Sync conflicts cleared');
  } catch (error) {
    console.error('❌ Error clearing sync conflicts:', error);
  }
};

/**
 * Get detailed sync status including pending operations and conflicts
 * @returns Promise<object> - Detailed sync status
 */
export const getDetailedSyncStatus = async (): Promise<{
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
  conflicts: any[];
}> => {
  try {
    const [pendingCount, conflicts, lastSync] = await Promise.all([
      getPendingOperationsCount(),
      getSyncConflicts(),
      AsyncStorage.getItem(OFFLINE_KEYS.LAST_SYNC)
    ]);

    return {
      pendingCount,
      conflictCount: conflicts.length,
      lastSync,
      conflicts
    };
  } catch (error) {
    console.error('❌ Error getting detailed sync status:', error);
    return {
      pendingCount: 0,
      conflictCount: 0,
      lastSync: null,
      conflicts: []
    };
  }
};


// =====================================================
// ADMIN OTP APPROVAL SYSTEM
// =====================================================

export interface LoginRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  otp_code?: string;
  approved_by?: string;
  approved_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a login request that requires admin approval
 * @param userId - User ID requesting login
 * @param email - User email
 * @param userName - User name
 * @returns Login request ID or null
 */
export const createLoginRequest = async (
  userId: string,
  email: string,
  userName: string
): Promise<string | null> => {
  try {
    console.log('🔄 Creating login request with:', { userId, email, userName });
    
    // Use database function to bypass RLS issues
    const { data, error } = await supabase
      .rpc('create_login_request', {
        p_user_id: userId,
        p_user_email: email,
        p_user_name: userName,
      });

    console.log('📊 RPC Response:', { data, error });

    if (error) {
      console.error('❌ RPC Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    if (!data) {
      console.error('❌ No data returned from RPC');
      throw new Error('No request ID returned');
    }

    console.log('✅ Login request created:', data);
    
    // Send notification to all admins
    await notifyAdminsOfLoginRequest(email, userName);

    return data;
  } catch (error: any) {
    console.error('❌ Error creating login request:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });
    return null;
  }
};

/**
 * Check if a login request has been approved and get the OTP
 * @param requestId - Login request ID
 * @returns OTP code if approved, null otherwise
 */
export const checkLoginRequestStatus = async (
  requestId: string
): Promise<{ status: string; otp?: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('login_requests')
      .select('status, otp_code, expires_at')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return { status: 'expired' };
    }

    return {
      status: data.status,
      otp: data.otp_code || undefined,
    };
  } catch (error) {
    console.error('Error checking login request status:', error);
    return null;
  }
};

/**
 * Verify OTP from admin-approved login request
 * @param requestId - Login request ID
 * @param otpCode - OTP code entered by user
 * @returns true if OTP matches
 */
export const verifyAdminOtp = async (
  requestId: string,
  otpCode: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('login_requests')
      .select('otp_code, status, expires_at')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      console.log('❌ Login request expired');
      return false;
    }

    // Check if approved
    if (data.status !== 'approved') {
      console.log('❌ Login request not approved yet');
      return false;
    }

    // Verify OTP
    const isValid = data.otp_code === otpCode.trim();
    
    if (isValid) {
      console.log('✅ Admin OTP verified successfully');
    } else {
      console.log('❌ Invalid OTP code');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying admin OTP:', error);
    return false;
  }
};

/**
 * Send push notification to all admins about new login request
 * @param userEmail - Email of user requesting login
 * @param userName - Name of user requesting login
 */
const notifyAdminsOfLoginRequest = async (
  userEmail: string,
  userName: string
): Promise<void> => {
  try {
    // Get all admin users
    const { data: admins, error } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('is_admin', true)
      .eq('is_active', true);

    if (error) throw error;

    console.log(`📢 Notifying ${admins?.length || 0} admins about login request`);

    if (!admins || admins.length === 0) {
      console.warn('⚠️ No active admins found to notify');
      return;
    }

    // Import notification services
    const NotificationService = require('../services/NotificationService').default;
    const PushNotificationService = require('../services/PushNotificationService').default;

    // Send admin notification (in-app database record)
    try {
      await NotificationService.sendAdminNotification({
        title: '🔐 New Login Request',
        message: `${userName} (${userEmail}) is requesting access to the app`,
        type: 'system',
        severity: 'warning',
        metadata: {
          user_email: userEmail,
          user_name: userName,
          request_type: 'login_approval',
          timestamp: new Date().toISOString(),
        },
      });
      console.log('✅ In-app notification saved to database');
    } catch (notifError) {
      console.error('❌ Failed to save in-app notification:', notifError);
    }

    // Send FCM push notification to admin devices (works when app is closed/background)
    // Note: This requires proper Firebase setup and edge function deployment
    try {
      console.log('📤 Attempting to send FCM push notification to admin devices...');
      
      // Get admin email from first admin (assuming single admin setup)
      const adminEmail = 'yashbhavsar175@gmail.com';
      
      const { data: fcmResult, error: fcmError } = await supabase.functions.invoke('quick-processor', {
        body: {
          action: 'send_push',
          target_email: adminEmail,
          title: '🔐 New Login Request',
          body: `${userName} (${userEmail}) is requesting access to the app. Please review and approve.`,
          data: {
            type: 'login_request',
            user_email: userEmail,
            user_name: userName,
            screen: 'AdminPanel',
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (fcmError) {
        console.warn('⚠️ FCM notification failed (non-critical):', fcmError.message);
      } else {
        console.log('✅ FCM push notification sent:', fcmResult);
      }
    } catch (fcmError: any) {
      console.warn('⚠️ FCM notification error (non-critical):', fcmError?.message || fcmError);
      // Don't throw - FCM is optional, other notifications still work
    }

    console.log(`🔔 All notifications sent for login request from ${userName}`);
    
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

/**
 * Get all pending login requests (for admin screen)
 * @returns Array of pending login requests
 */
export const getPendingLoginRequests = async (): Promise<LoginRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('login_requests')
      .select('*')
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting pending login requests:', error);
    return [];
  }
};

// =====================================================
// 24. DAILY ENTRIES MANAGEMENT
// =====================================================

/**
 * Save a new daily entry to Supabase
 */
export async function saveDailyEntry(
  entries: Record<string, number>,
  totalCredit: number,
  totalDebit: number,
  netProfit: number,
  officeId?: string
): Promise<DailyEntry | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    const entryData = {
      user_id: user.id,
      office_id: officeId || null,
      entry_date: new Date().toISOString().split('T')[0],
      entries: entries,
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_profit: netProfit,
    };

    const { data, error } = await supabase
      .from('daily_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      console.error('Error saving daily entry:', error);
      return null;
    }

    console.log('✅ Daily entry saved successfully:', data);
    await logHistory('add', 'daily_entries', data.id, entryData);
    
    // Clear local cache
    await AsyncStorage.removeItem(OFFLINE_KEYS.DAILY_ENTRIES);
    
    return data;
  } catch (error) {
    console.error('Error in saveDailyEntry:', error);
    return null;
  }
}

/**
 * Get all daily entries for the current user
 */
export async function getDailyEntries(officeId?: string, forceRefresh: boolean = false): Promise<DailyEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return [];
    }

    // Try to get from cache first (unless force refresh)
    const cacheKey = officeId 
      ? `${OFFLINE_KEYS.DAILY_ENTRIES}_${officeId}`
      : OFFLINE_KEYS.DAILY_ENTRIES;
    
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 5 * 60 * 1000) {
          console.log('📦 Returning cached daily entries');
          return parsedCache.data;
        }
      }
    } else {
      console.log('🔄 Force refresh - skipping cache');
    }

    let query = supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (officeId) {
      query = query.eq('office_id', officeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily entries:', error);
      return [];
    }

    console.log('🔄 Fetched fresh data from database:', data?.length || 0, 'entries');

    // Cache the results
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: data || [],
      timestamp: Date.now()
    }));

    return data || [];
  } catch (error) {
    console.error('Error in getDailyEntries:', error);
    return [];
  }
}

/**
 * Get a single daily entry by ID
 */
export async function getDailyEntryById(id: string): Promise<DailyEntry | null> {
  try {
    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching daily entry:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDailyEntryById:', error);
    return null;
  }
}

/**
 * Update an existing daily entry
 */
export async function updateDailyEntry(
  id: string,
  entries: Record<string, number>,
  totalCredit: number,
  totalDebit: number,
  netProfit: number
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    const updateData = {
      entries: entries,
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_profit: netProfit,
    };

    const { error } = await supabase
      .from('daily_entries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating daily entry:', error);
      return false;
    }

    console.log('✅ Daily entry updated successfully');
    await logHistory('update', 'daily_entries', id, updateData);
    
    // Clear cache
    await AsyncStorage.removeItem(OFFLINE_KEYS.DAILY_ENTRIES);
    
    return true;
  } catch (error) {
    console.error('Error in updateDailyEntry:', error);
    return false;
  }
}

/**
 * Delete a daily entry
 */
export async function deleteDailyEntry(id: string): Promise<boolean> {
  try {
    console.log('🗑️ deleteDailyEntry called with id:', id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return false;
    }
    console.log('👤 User ID:', user.id);

    const { error } = await supabase
      .from('daily_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error deleting daily entry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Daily entry deleted successfully');
    await logHistory('delete', 'daily_entries', id, { deleted_at: new Date().toISOString() });
    
    // Clear ALL cache variations
    await AsyncStorage.removeItem(OFFLINE_KEYS.DAILY_ENTRIES);
    // Also clear office-specific caches
    const keys = await AsyncStorage.getAllKeys();
    const dailyEntriesKeys = keys.filter(key => key.startsWith(OFFLINE_KEYS.DAILY_ENTRIES));
    if (dailyEntriesKeys.length > 0) {
      await AsyncStorage.multiRemove(dailyEntriesKeys);
      console.log('🧹 Cleared all daily entries caches:', dailyEntriesKeys.length);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error in deleteDailyEntry:', error);
    return false;
  }
}

/**
 * Get daily entries for a specific date range
 */
export async function getDailyEntriesByDateRange(
  startDate: string,
  endDate: string,
  officeId?: string
): Promise<DailyEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return [];
    }

    let query = supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false });

    if (officeId) {
      query = query.eq('office_id', officeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily entries by date range:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDailyEntriesByDateRange:', error);
    return [];
  }
}
