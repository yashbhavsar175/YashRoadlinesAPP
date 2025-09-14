import 'react-native-url-polyfill/auto'; // Must be imported at the very top
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration with hardcoded values (temporary fix)
const supabaseUrl = 'https://rejkocbdaeyvsxdiamhu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamtvY2JkYWV5dnN4ZGlhbWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUzNzUsImV4cCI6MjA2OTc5MTM3NX0.WHcp7lSxisXFJ9Waz_MzY2KJ1J934odeDI_3iQh8lBw';

export const SUPABASE_URL = supabaseUrl;

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
});
