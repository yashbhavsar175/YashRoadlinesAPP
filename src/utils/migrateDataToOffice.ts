// migrateDataToOffice.ts - Migrate all legacy data to Prem Darwaja office
import { supabase } from '../supabase';

export const migrateAllDataToPremDarwaja = async () => {
  try {
    console.log('🔄 Starting data migration to Prem Darawaja office...');

    // Step 1: Get Prem Darawaja office ID (flexible search)
    const { data: offices, error: officeError } = await supabase
      .from('offices')
      .select('id, name')
      .ilike('name', '%prem%darawaja%');

    if (officeError || !offices || offices.length === 0) {
      console.error('❌ Prem Darawaja office not found:', officeError);
      return {
        success: false,
        error: 'Prem Darawaja office not found. Please create it first.',
      };
    }

    // Use the first matching office (should be "Prem Darawaja(Main Office)")
    const office = offices[0];

    console.log('✅ Found Prem Darawaja office:', office);
    const premDarawajaId = office.id;

    // Step 2: Update all tables with null office_id
    const tables = [
      'uppad_jama_entries',
      'agency_payments',
      'agency_majuri',
      'majuri_entries',
      'truck_fuel_entries',
      'general_entries',
      'driver_statements',
      'cash_adjustments',
      'mumbai_delivery_records',
      'delivery_photos',
      'agency_entries',
      'cash_records',
    ];

    const results: any = {};

    for (const table of tables) {
      try {
        console.log(`📝 Updating ${table}...`);

        const { data, error } = await supabase
          .from(table)
          .update({ office_id: premDarawajaId })
          .is('office_id', null)
          .select('id');

        if (error) {
          console.error(`❌ Error updating ${table}:`, error);
          results[table] = { success: false, error: error.message };
        } else {
          const count = data?.length || 0;
          console.log(`✅ Updated ${count} records in ${table}`);
          results[table] = { success: true, count };
        }
      } catch (err: any) {
        console.error(`❌ Exception updating ${table}:`, err);
        results[table] = { success: false, error: err.message };
      }
    }

    // Step 3: Summary
    const totalUpdated = Object.values(results).reduce(
      (sum: number, r: any) => sum + (r.count || 0),
      0
    );

    console.log('🎉 Migration complete!');
    console.log('📊 Summary:', results);
    console.log(`✅ Total records updated: ${totalUpdated}`);

    return {
      success: true,
      officeId: premDarwajaId,
      officeName: office.name,
      totalUpdated,
      details: results,
    };
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Function to check how many records need migration
export const checkMigrationNeeded = async () => {
  try {
    const tables = [
      'uppad_jama_entries',
      'agency_payments',
      'agency_majuri',
      'majuri_entries',
      'truck_fuel_entries',
      'general_entries',
      'driver_statements',
      'cash_adjustments',
      'mumbai_delivery_records',
      'delivery_photos',
      'agency_entries',
      'cash_records',
    ];

    const counts: any = {};
    let total = 0;

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('office_id', null);

        if (!error) {
          counts[table] = count || 0;
          total += count || 0;
        }
      } catch (err) {
        console.error(`Error checking ${table}:`, err);
      }
    }

    console.log('📊 Records needing migration:', counts);
    console.log(`📈 Total: ${total} records`);

    return { total, details: counts };
  } catch (error) {
    console.error('Error checking migration:', error);
    return { total: 0, details: {} };
  }
};
