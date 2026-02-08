// NetworkHelper.ts - Network status and connectivity checks
import { supabase } from '../../supabase';

export const isOnline = async (): Promise<boolean> => {
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

export const getSyncStatus = async (): Promise<{
  lastSync: string | null;
  pendingOperations: number;
  isOnline: boolean;
}> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { SyncManager } = await import('./SyncManager');
    
    const [lastSync, pendingOperations, online] = await Promise.all([
      SyncManager.getInstance().getLastSyncTime(),
      SyncManager.getInstance().getPendingCount(),
      isOnline(),
    ]);

    return {
      lastSync,
      pendingOperations,
      isOnline: online,
    };
  } catch {
    const online = await isOnline().catch(() => false);
    return { lastSync: null, pendingOperations: 0, isOnline: online };
  }
};
