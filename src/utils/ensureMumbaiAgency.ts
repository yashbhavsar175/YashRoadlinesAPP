/**
 * Utility to ensure Mumbai agency exists in the database
 * This should be called during app initialization
 */

import { supabase } from '../supabase';
import { isOnline } from '../data/modules/NetworkHelper';

export const ensureMumbaiAgency = async (): Promise<boolean> => {
  try {
    const online = await isOnline();
    
    if (!online) {
      console.log('⚠️ Offline - cannot check Mumbai agency');
      return false;
    }

    // Check if Mumbai agency exists
    const { data: existingAgency, error: checkError } = await supabase
      .from('agencies')
      .select('*')
      .eq('name', 'Mumbai')
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking Mumbai agency:', checkError);
      return false;
    }

    if (existingAgency) {
      console.log('✅ Mumbai agency already exists:', existingAgency.id);
      return true;
    }

    // Create Mumbai agency if it doesn't exist
    console.log('📝 Creating Mumbai agency...');
    const { data: newAgency, error: createError } = await supabase
      .from('agencies')
      .insert([
        {
          name: 'Mumbai',
          contact_person: 'Mumbai Office',
          phone: '',
          address: 'Mumbai',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating Mumbai agency:', createError);
      return false;
    }

    console.log('✅ Mumbai agency created successfully:', newAgency.id);
    return true;

  } catch (error) {
    console.error('❌ Error in ensureMumbaiAgency:', error);
    return false;
  }
};
