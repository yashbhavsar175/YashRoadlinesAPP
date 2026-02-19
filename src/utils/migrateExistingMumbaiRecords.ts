import { supabase } from '../supabase';
import { AgencyEntry } from '../data/Storage';

/**
 * Migration utility for existing Mumbai delivery records
 * Migrates legacy AgencyEntry records to the new Mumbai Delivery schema
 */

/**
 * Fetches all AgencyEntry records with agency_name='Mumbai'
 * Filters out records that already have new fields populated
 * @returns Array of legacy Mumbai records that need migration
 */
export const fetchLegacyMumbaiRecords = async (): Promise<AgencyEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('agency_entries')
      .select('*')
      .eq('agency_name', 'Mumbai');

    if (error) {
      console.error('Error fetching Mumbai records:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No Mumbai records found');
      return [];
    }

    // Filter out records that already have new fields populated
    const legacyRecords = data.filter(record => {
      // A record needs migration if it doesn't have billty_no
      return !record.billty_no;
    });

    console.log(`Found ${data.length} total Mumbai records, ${legacyRecords.length} need migration`);
    return legacyRecords;
  } catch (error) {
    console.error('Error in fetchLegacyMumbaiRecords:', error);
    throw error;
  }
};

/**
 * Checks if a specific record already has new fields populated
 * @param record AgencyEntry record to check
 * @returns true if record has been migrated, false otherwise
 */
export const isRecordMigrated = (record: AgencyEntry): boolean => {
  return !!record.billty_no;
};

/**
 * Maps legacy AgencyEntry fields to new Mumbai Delivery schema
 * @param record Legacy AgencyEntry record
 * @returns Partial update object with mapped fields
 */
export const mapLegacyRecordFields = (record: AgencyEntry): Partial<AgencyEntry> => {
  // Generate placeholder billty_no: MIGRATED-{first 8 chars of id}
  const billty_no = `MIGRATED-${record.id.slice(0, 8)}`;
  
  // Set consignee_name to 'Legacy Record'
  const consignee_name = 'Legacy Record';
  
  // Map description to item_description
  const item_description = record.description || '';
  
  // Map delivery_status to confirmation_status
  const confirmation_status = record.delivery_status === 'yes' ? 'confirmed' : 'pending';
  
  // Set taken_from_godown and payment_received based on delivery_status
  const taken_from_godown = record.delivery_status === 'yes';
  const payment_received = record.delivery_status === 'yes';
  
  // Set confirmed_at if the record was delivered
  const confirmed_at = record.delivery_status === 'yes' ? record.updated_at : undefined;
  
  // Set confirmed_amount to the original amount if confirmed
  const confirmed_amount = record.delivery_status === 'yes' ? record.amount : undefined;

  return {
    billty_no,
    consignee_name,
    item_description,
    confirmation_status,
    taken_from_godown,
    payment_received,
    confirmed_at,
    confirmed_amount,
  };
};


/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  errors: Array<{ recordId: string; error: string }>;
}

/**
 * Migration progress callback
 */
export type MigrationProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
}) => void;

/**
 * Executes the migration for all legacy Mumbai records
 * Updates records in batches of 50 for performance
 * @param onProgress Optional callback for progress updates
 * @returns Migration result with statistics
 */
export const executeMigration = async (
  onProgress?: MigrationProgressCallback
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: true,
    totalRecords: 0,
    migratedRecords: 0,
    skippedRecords: 0,
    errors: [],
  };

  try {
    // Fetch all legacy records
    console.log('Fetching legacy Mumbai records...');
    const legacyRecords = await fetchLegacyMumbaiRecords();
    result.totalRecords = legacyRecords.length;

    if (legacyRecords.length === 0) {
      console.log('No records to migrate');
      return result;
    }

    console.log(`Found ${legacyRecords.length} records to migrate`);

    // Process records in batches of 50
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < legacyRecords.length; i += BATCH_SIZE) {
      batches.push(legacyRecords.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches...`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);

      // Map each record in the batch
      const updates = batch.map(record => {
        const mappedFields = mapLegacyRecordFields(record);
        return {
          id: record.id,
          ...mappedFields,
        };
      });

      try {
        // Update batch in Supabase
        const { error } = await supabase
          .from('agency_entries')
          .upsert(updates, { onConflict: 'id' });

        if (error) {
          console.error(`Error updating batch ${batchIndex + 1}:`, error);
          // Log individual errors
          batch.forEach(record => {
            result.errors.push({
              recordId: record.id,
              error: error.message,
            });
          });
          result.success = false;
        } else {
          result.migratedRecords += batch.length;
          console.log(`Successfully migrated batch ${batchIndex + 1}`);
        }
      } catch (error) {
        console.error(`Exception updating batch ${batchIndex + 1}:`, error);
        batch.forEach(record => {
          result.errors.push({
            recordId: record.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
        result.success = false;
      }

      // Report progress
      if (onProgress) {
        const current = Math.min((batchIndex + 1) * BATCH_SIZE, legacyRecords.length);
        const percentage = Math.round((current / legacyRecords.length) * 100);
        onProgress({
          current,
          total: legacyRecords.length,
          percentage,
        });
      }
    }

    result.skippedRecords = result.totalRecords - result.migratedRecords - result.errors.length;

    console.log('Migration complete:');
    console.log(`  Total records: ${result.totalRecords}`);
    console.log(`  Migrated: ${result.migratedRecords}`);
    console.log(`  Skipped: ${result.skippedRecords}`);
    console.log(`  Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    console.error('Fatal error during migration:', error);
    result.success = false;
    result.errors.push({
      recordId: 'MIGRATION',
      error: error instanceof Error ? error.message : 'Unknown fatal error',
    });
    return result;
  }
};

/**
 * Displays migration status to user via console
 * Can be extended to use Alert or Toast notifications
 * @param result Migration result
 */
export const displayMigrationStatus = (result: MigrationResult): void => {
  if (result.success && result.errors.length === 0) {
    console.log(`✓ Migration successful! Migrated ${result.migratedRecords} records.`);
  } else if (result.migratedRecords > 0 && result.errors.length > 0) {
    console.warn(
      `⚠ Migration partially successful. Migrated ${result.migratedRecords} records, ${result.errors.length} errors.`
    );
  } else {
    console.error(`✗ Migration failed. ${result.errors.length} errors occurred.`);
  }

  if (result.errors.length > 0) {
    console.error('Migration errors:');
    result.errors.forEach(({ recordId, error }) => {
      console.error(`  - Record ${recordId}: ${error}`);
    });
  }
};
