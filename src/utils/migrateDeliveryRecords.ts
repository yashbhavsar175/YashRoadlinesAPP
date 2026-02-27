/**
 * Migration utility to update legacy Mumbai delivery records
 * Sets confirmation_status based on payment_received field
 */

import { supabase } from '../supabase';

export const migrateDeliveryRecords = async (): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> => {
  try {
    console.log('🔄 Starting migration of legacy delivery records...');

    // Fetch all Mumbai delivery records where confirmation_status is null
    const { data: legacyRecords, error: fetchError } = await supabase
      .from('agency_entries')
      .select('id, payment_received, confirmation_status')
      .eq('agency_name', 'Mumbai')
      .is('confirmation_status', null);

    if (fetchError) {
      console.error('❌ Error fetching legacy records:', fetchError);
      return {
        success: false,
        migratedCount: 0,
        error: fetchError.message,
      };
    }

    if (!legacyRecords || legacyRecords.length === 0) {
      console.log('✅ No legacy records found to migrate');
      return {
        success: true,
        migratedCount: 0,
      };
    }

    console.log(`📊 Found ${legacyRecords.length} legacy records to migrate`);

    // Update each record based on payment_received status
    const updates = legacyRecords.map(record => ({
      id: record.id,
      confirmation_status: record.payment_received ? 'confirmed' : 'pending',
    }));

    // Batch update all records
    const { error: updateError } = await supabase
      .from('agency_entries')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('❌ Error updating records:', updateError);
      return {
        success: false,
        migratedCount: 0,
        error: updateError.message,
      };
    }

    console.log(`✅ Successfully migrated ${legacyRecords.length} records`);
    return {
      success: true,
      migratedCount: legacyRecords.length,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if migration is needed
 */
export const checkMigrationNeeded = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('agency_entries')
      .select('id', { count: 'exact', head: true })
      .eq('agency_name', 'Mumbai')
      .is('confirmation_status', null);

    if (error) {
      console.error('Error checking migration status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};
