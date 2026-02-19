// SyncManager.ts - Handles offline sync operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabase';
import PhotoManager from '../../services/PhotoManager';

const PENDING_SYNC_KEY = 'pending_sync_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const SYNC_CONFLICT_LOG_KEY = 'sync_conflicts';

interface PendingOperation {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'PHOTO_UPLOAD';
  data: any;
  office_id?: string;
  timestamp: string;
  retryCount?: number;
}

interface SyncConflict {
  operationId: string;
  table: string;
  recordId: string;
  reason: string;
  localOfficeId?: string;
  serverOfficeId?: string;
  timestamp: string;
}

export class SyncManager {
  private static instance: SyncManager;
  private syncInProgress = false;
  private readonly MAX_RETRY_COUNT = 3;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      console.log('📝 SyncManager: Adding pending operation', { 
        table: operation.table, 
        action: operation.action,
        office_id: operation.office_id 
      });

      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const pending: PendingOperation[] = existing ? JSON.parse(existing) : [];
      
      const newOperation: PendingOperation = {
        ...operation,
        timestamp: new Date().toISOString(),
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        retryCount: 0
      };

      pending.push(newOperation);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
      
      console.log('✅ SyncManager: Operation queued successfully', { id: newOperation.id });
    } catch (error) {
      console.error('❌ SyncManager: Error adding pending operation:', error);
      throw error;
    }
  }

  async syncPendingOperations(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('⚠️ SyncManager: Sync already in progress');
      return false;
    }
    
    this.syncInProgress = true;
    console.log('🔄 SyncManager: Starting sync of pending operations...');
    
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (!pendingStr) {
        console.log('✅ SyncManager: No pending operations to sync');
        
        // Still try to sync photos even if no pending operations
        try {
          console.log('📸 SyncManager: Syncing pending photos...');
          const photoSyncResult = await PhotoManager.syncPendingPhotos();
          if (photoSyncResult.failed > 0) {
            console.warn(`⚠️ SyncManager: ${photoSyncResult.failed} photos failed to sync`);
          }
        } catch (photoError) {
          console.error('❌ SyncManager: Photo sync error:', photoError);
        }
        
        return true;
      }

      const pending: PendingOperation[] = JSON.parse(pendingStr);
      console.log(`📊 SyncManager: Found ${pending.length} pending operations`);

      const successful: string[] = [];
      const failed: PendingOperation[] = [];

      for (const operation of pending) {
        try {
          // Validate office_id before syncing (except for photo uploads)
          if (operation.action !== 'PHOTO_UPLOAD') {
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
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(failed));
      
      // Sync photos after database operations - Validates: Requirements 4.6, 4.7, 6.5
      try {
        console.log('📸 SyncManager: Syncing pending photos...');
        const photoSyncResult = await PhotoManager.syncPendingPhotos();
        if (photoSyncResult.failed > 0) {
          console.warn(`⚠️ SyncManager: ${photoSyncResult.failed} photos failed to sync`);
        } else if (photoSyncResult.uploaded > 0) {
          console.log(`✅ SyncManager: ${photoSyncResult.uploaded} photos synced successfully`);
        }
      } catch (photoError) {
        console.error('❌ SyncManager: Photo sync error:', photoError);
      }
      
      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      
      console.log(`📊 SyncManager: Sync complete - ${successful.length} successful, ${failed.length} failed`);
      
      return successful.length === pending.length;
    } catch (error) {
      console.error('❌ SyncManager: Sync error:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

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

        case 'PHOTO_UPLOAD':
          // Handle photo upload operations
          try {
            const syncResult = await PhotoManager.syncPendingPhotos();
            return syncResult.success;
          } catch (error) {
            console.error('❌ SyncManager: Photo upload error:', error);
            return false;
          }
          
        default:
          console.error('❌ SyncManager: Unknown action:', action);
          return false;
      }
    } catch (error) {
      console.error('❌ SyncManager: Execution error:', error);
      return false;
    }
  }

  private async logSyncConflict(conflict: SyncConflict): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(SYNC_CONFLICT_LOG_KEY);
      const conflicts: SyncConflict[] = existing ? JSON.parse(existing) : [];
      
      conflicts.push(conflict);
      
      // Keep only last 100 conflicts
      if (conflicts.length > 100) {
        conflicts.splice(0, conflicts.length - 100);
      }
      
      await AsyncStorage.setItem(SYNC_CONFLICT_LOG_KEY, JSON.stringify(conflicts));
      
      console.log('📝 SyncManager: Conflict logged', { operationId: conflict.operationId });
    } catch (error) {
      console.error('❌ SyncManager: Error logging conflict:', error);
    }
  }

  async getSyncConflicts(): Promise<SyncConflict[]> {
    try {
      const existing = await AsyncStorage.getItem(SYNC_CONFLICT_LOG_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('❌ SyncManager: Error getting conflicts:', error);
      return [];
    }
  }

  async clearSyncConflicts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_CONFLICT_LOG_KEY);
      console.log('✅ SyncManager: Conflicts cleared');
    } catch (error) {
      console.error('❌ SyncManager: Error clearing conflicts:', error);
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (!pendingStr) return 0;
      const pending: PendingOperation[] = JSON.parse(pendingStr);
      return pending.length;
    } catch (error) {
      console.error('❌ SyncManager: Error getting pending count:', error);
      return 0;
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('❌ SyncManager: Error getting last sync time:', error);
      return null;
    }
  }
}
