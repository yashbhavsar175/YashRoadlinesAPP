import 'react-native-url-polyfill/auto'; // Must be imported at the very top
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration with hardcoded values (temporary fix)
const supabaseUrl = 'https://rejkocbdaeyvsxdiamhu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamtvY2JkYWV5dnN4ZGlhbWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUzNzUsImV4cCI6MjA2OTc5MTM3NX0.WHcp7lSxisXFJ9Waz_MzY2KJ1J934odeDI_3iQh8lBw';

export const SUPABASE_URL = supabaseUrl;

// Custom fetch with DNS fallback for ISP blocking issues
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    // Try normal fetch first
    return await fetch(url, options);
  } catch (error: any) {
    // If network request fails, it might be DNS/ISP blocking
    if (error.message?.includes('Network request failed')) {
      console.warn('⚠️ Network request failed, DNS/ISP might be blocking. Please use VPN or change DNS settings.');
      console.warn('💡 Quick fix: Settings → WiFi → Modify Network → DNS 1: 8.8.8.8, DNS 2: 8.8.4.4');
    }
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    fetch: customFetch, // Use custom fetch with better error messages
  },
});
