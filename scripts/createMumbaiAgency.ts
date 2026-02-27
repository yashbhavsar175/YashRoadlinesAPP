/**
 * Script to manually create Mumbai agency in Supabase
 * Run this if Mumbai agency is missing from database
 * 
 * Usage: npx ts-node scripts/createMumbaiAgency.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMumbaiAgency() {
  try {
    console.log('🔍 Checking if Mumbai agency exists...');
    
    // Check if Mumbai agency already exists
    const { data: existing, error: checkError } = await supabase
      .from('agencies')
      .select('*')
      .eq('name', 'Mumbai')
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking for Mumbai agency:', checkError.message);
      process.exit(1);
    }

    if (existing) {
      console.log('✅ Mumbai agency already exists!');
      console.log('   ID:', existing.id);
      console.log('   Name:', existing.name);
      console.log('   Created:', existing.created_at);
      return;
    }

    console.log('📝 Creating Mumbai agency...');
    
    // Create Mumbai agency
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
      console.error('❌ Error creating Mumbai agency:', createError.message);
      process.exit(1);
    }

    console.log('✅ Mumbai agency created successfully!');
    console.log('   ID:', newAgency.id);
    console.log('   Name:', newAgency.name);
    console.log('   Created:', newAgency.created_at);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
createMumbaiAgency()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
