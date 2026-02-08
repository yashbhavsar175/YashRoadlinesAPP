// SyncManager.ts - Handles offline sync operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabase';

const PENDING_SYNC_KEY = 'pending_sync_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export class SyncManager {
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
      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const pending = existing ? JSON.parse(existing) : [];
      pending.push({
        ...operation,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      });
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    } catch (error) {
      console.error('Error adding pending operation:', error);
    }
  }

  async syncPendingOperations(): Promise<boolean> {
    if (this.syncInProgress) return false;
    
    this.syncInProgress = true;
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
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
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
      
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      
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

  async getPendingCount(): Promise<number> {
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (!pendingStr) return 0;
      const pending = JSON.parse(pendingStr);
      return Array.isArray(pending) ? pending.length : 0;
    } catch {
      return 0;
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  }
}
