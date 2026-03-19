import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// Lazy singleton — client is only created on first access, never at module load time.
// This prevents the "status 0" / empty-URL crash when react-native-config hasn't
// bridged yet during the very first JS execution frame.
let _supabase: SupabaseClient | null = null;

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    return await fetch(url, options);
  } catch (error: any) {
    if (error.message?.includes('Network request failed')) {
      console.warn('⚠️ Network request failed — DNS/ISP may be blocking. Try changing DNS to 8.8.8.8.');
    }
    throw error;
  }
};

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    const url = Config.SUPABASE_URL || '';
    const key = Config.SUPABASE_ANON_KEY || '';

    if (!url || url === 'your_supabase_url_here') {
      throw new Error('SUPABASE_URL is not configured in .env');
    }
    if (!key || key === 'your_supabase_anon_key_here') {
      throw new Error('SUPABASE_ANON_KEY is not configured in .env');
    }

    _supabase = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        fetch: customFetch,
      },
    });
  }
  return _supabase;
};

// Proxy keeps full backward compatibility — every existing `supabase.auth.xxx`,
// `supabase.from(...)` etc. call works without any changes in other files.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

// Exported for files that reference SUPABASE_URL directly
export const SUPABASE_URL = Config.SUPABASE_URL || '';
