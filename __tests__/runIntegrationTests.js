/**
 * Integration Test Runner for Multi-Office Support
 * 
 * This script provides a simple way to run integration tests
 * with proper environment setup and error handling.
 * 
 * Usage:
 *   node __tests__/runIntegrationTests.js
 */

const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('Multi-Office Integration Test Runner');
console.log('='.repeat(60));
console.log('');

// Check if Supabase credentials are configured
console.log('Checking environment setup...');
try {
  const supabaseConfig = require('../src/supabase');
  console.log('✓ Supabase configuration found');
} catch (error) {
  console.error('✗ Supabase configuration not found');
  console.error('  Please ensure src/supabase.ts is properly configured');
  process.exit(1);
}

console.log('');
console.log('Running integration tests...');
console.log('-'.repeat(60));
console.log('');

try {
  // Run the tests
  execSync('npm test -- MultiOfficeIntegration.test.tsx --verbose', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✓ All integration tests passed!');
  console.log('='.repeat(60));
  
} catch (error) {
  console.log('');
  console.log('='.repeat(60));
  console.log('✗ Some integration tests failed');
  console.log('='.repeat(60));
  console.log('');
  console.log('Troubleshooting tips:');
  console.log('1. Verify Supabase connection is active');
  console.log('2. Check that migrations 009, 010, 011, 012 are applied');
  console.log('3. Ensure test data can be created/deleted');
  console.log('4. Review test output above for specific errors');
  console.log('');
  console.log('For detailed testing instructions, see:');
  console.log('  __tests__/MULTI_OFFICE_INTEGRATION_TEST_GUIDE.md');
  console.log('');
  
  process.exit(1);
}
