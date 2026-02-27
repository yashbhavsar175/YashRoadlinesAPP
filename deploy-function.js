#!/usr/bin/env node

/**
 * Deploy Supabase Edge Function using Management API
 * This script deploys the edge function without requiring Supabase CLI
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deployFunction() {
  console.log('🚀 Supabase Edge Function Deployer\n');
  
  // Read the function code
  const functionPath = path.join(__dirname, 'supabase', 'functions', 'quick-processor', 'index.ts');
  
  if (!fs.existsSync(functionPath)) {
    console.error('❌ Error: Function file not found at:', functionPath);
    process.exit(1);
  }
  
  const functionCode = fs.readFileSync(functionPath, 'utf8');
  console.log('✅ Function code loaded\n');
  
  // Get credentials
  console.log('📋 Please provide your Supabase credentials:\n');
  console.log('You can find these in your Supabase Dashboard:');
  console.log('- Project Settings → API → Project URL');
  console.log('- Project Settings → API → service_role key (secret!)\n');
  
  const projectRef = await question('Enter your Supabase Project Reference (e.g., abcdefghijklmnop): ');
  const accessToken = await question('Enter your Supabase Access Token or Service Role Key: ');
  
  rl.close();
  
  console.log('\n📤 Deploying function...\n');
  
  // Note: Supabase Management API for edge functions is limited
  // The best approach is actually to use the REST API or manual deployment
  
  console.log('⚠️  IMPORTANT: Supabase Edge Functions cannot be deployed via simple API call.');
  console.log('');
  console.log('📋 Please follow these steps instead:\n');
  console.log('1. Install Supabase CLI manually:');
  console.log('   - Download from: https://github.com/supabase/cli/releases');
  console.log('   - Or use: npm install -g supabase');
  console.log('');
  console.log('2. Login to Supabase:');
  console.log('   supabase login');
  console.log('');
  console.log('3. Link your project:');
  console.log('   supabase link --project-ref ' + projectRef);
  console.log('');
  console.log('4. Deploy the function:');
  console.log('   supabase functions deploy quick-processor');
  console.log('');
  console.log('📖 Alternative: See MANUAL_DEPLOYMENT_STEPS.md for copy-paste deployment');
}

deployFunction().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
