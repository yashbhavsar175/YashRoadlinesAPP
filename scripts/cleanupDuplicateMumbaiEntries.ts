// Script to cleanup duplicate Mumbai delivery entries from general_entries table
// Run this once to remove duplicate entries created before the fix

import { supabase } from '../src/supabase';

async function cleanupDuplicateMumbaiEntries() {
  try {
    console.log('🧹 Starting cleanup of duplicate Mumbai delivery entries...');

    // Find all general_entries that were created for Mumbai deliveries
    // These have description starting with "Mumbai Delivery Payment"
    const { data: duplicateEntries, error: fetchError } = await supabase
      .from('general_entries')
      .select('*')
      .ilike('description', 'Mumbai Delivery Payment%');

    if (fetchError) {
      console.error('❌ Error fetching duplicate entries:', fetchError);
      return;
    }

    if (!duplicateEntries || duplicateEntries.length === 0) {
      console.log('✅ No duplicate entries found. Database is clean!');
      return;
    }

    console.log(`📊 Found ${duplicateEntries.length} duplicate entries to remove`);

    // Delete all these duplicate entries
    const { error: deleteError } = await supabase
      .from('general_entries')
      .delete()
      .ilike('description', 'Mumbai Delivery Payment%');

    if (deleteError) {
      console.error('❌ Error deleting duplicate entries:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${duplicateEntries.length} duplicate Mumbai delivery entries`);
    console.log('✅ Cleanup complete! Mumbai deliveries will now show only once in daily report.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateMumbaiEntries()
  .then(() => {
    console.log('🎉 Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
