/**
 * Diagnostic and Fix Script for Admin Status and Office Issues
 * 
 * This script will:
 * 1. Check if admin user profile exists and has is_admin = true
 * 2. Check if offices exist and are active
 * 3. Provide SQL commands to fix the issues
 */

const { createClient } = require('@supabase/supabase-js');

// You need to add your Supabase credentials here
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseAndFix() {
  console.log('🔍 Starting diagnosis...\n');

  // 1. Check admin user profile
  console.log('1️⃣ Checking admin user profile...');
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'yashbhavsar175@gmail.com');

    if (error) {
      console.error('❌ Error fetching profile:', error);
    } else if (!profiles || profiles.length === 0) {
      console.log('❌ No profile found for yashbhavsar175@gmail.com');
      console.log('\n📝 SQL to create admin profile:');
      console.log(`
-- First, get the user ID from auth.users table
SELECT id FROM auth.users WHERE email = 'yashbhavsar175@gmail.com';

-- Then insert/update the profile (replace USER_ID with actual ID)
INSERT INTO user_profiles (id, email, full_name, is_admin, is_active, user_type)
VALUES ('USER_ID', 'yashbhavsar175@gmail.com', 'Yash', true, true, 'normal')
ON CONFLICT (id) 
DO UPDATE SET is_admin = true, is_active = true;
      `);
    } else {
      const profile = profiles[0];
      console.log('✅ Profile found:', {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        is_admin: profile.is_admin,
        is_active: profile.is_active,
        user_type: profile.user_type,
        office_id: profile.office_id
      });

      if (profile.is_admin !== true) {
        console.log('\n⚠️ is_admin is NOT true!');
        console.log('\n📝 SQL to fix admin status:');
        console.log(`
UPDATE user_profiles 
SET is_admin = true, is_active = true 
WHERE id = '${profile.id}';
        `);
      } else {
        console.log('✅ Admin status is correct');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // 2. Check offices
  console.log('\n2️⃣ Checking offices...');
  try {
    const { data: offices, error } = await supabase
      .from('offices')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching offices:', error);
    } else if (!offices || offices.length === 0) {
      console.log('❌ No offices found in database');
      console.log('\n📝 SQL to create sample offices:');
      console.log(`
INSERT INTO offices (name, address, is_active)
VALUES 
  ('Main Office', 'Main Location', true),
  ('Branch Office', 'Branch Location', true);
      `);
    } else {
      console.log(`✅ Found ${offices.length} office(s):`);
      offices.forEach(office => {
        console.log(`  - ${office.name} (ID: ${office.id}, Active: ${office.is_active})`);
      });

      const inactiveOffices = offices.filter(o => !o.is_active);
      if (inactiveOffices.length > 0) {
        console.log('\n⚠️ Some offices are inactive!');
        console.log('\n📝 SQL to activate all offices:');
        console.log(`
UPDATE offices SET is_active = true;
        `);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n✅ Diagnosis complete!');
  console.log('\n📱 After running the SQL commands:');
  console.log('1. Completely close and restart the app');
  console.log('2. Log out and log back in');
  console.log('3. The admin status and offices should now appear correctly');
}

// Run the diagnosis
diagnoseAndFix().catch(console.error);
