// Network diagnostic utility
export const testSupabaseConnection = async () => {
  const supabaseUrl = 'https://rejkocbdaeyvsxdiamhu.supabase.co';
  
  console.log('🔍 Testing Supabase connection...');
  console.log('Target URL:', supabaseUrl);
  
  try {
    // Test 1: Basic fetch to Supabase REST endpoint
    console.log('\n📡 Test 1: Basic connectivity test...');
    const startTime = Date.now();
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamtvY2JkYWV5dnN4ZGlhbWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUzNzUsImV4cCI6MjA2OTc5MTM3NX0.WHcp7lSxisXFJ9Waz_MzY2KJ1J934odeDI_3iQh8lBw'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Connection successful!');
    console.log('Status:', response.status);
    console.log('Response time:', responseTime, 'ms');
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    // Test 2: DNS resolution test (skip for now as it might also hang)
    console.log('\n📡 Test 2: Skipping DNS test to avoid timeout');
    
    return {
      success: true,
      status: response.status,
      responseTime,
      message: 'Connection successful'
    };
    
  } catch (error: any) {
    console.error('❌ Connection failed!');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.error('\n🔴 Request Timeout - Supabase server not responding');
      console.error('Possible causes:');
      console.error('1. Supabase instance might be paused/sleeping');
      console.error('2. Network firewall blocking the connection');
      console.error('3. DNS resolution issue');
      console.error('4. Server is down or unreachable');
      
      return {
        success: false,
        error: 'Connection timeout after 10 seconds',
        errorType: 'TIMEOUT',
        message: 'Supabase server not responding'
      };
    }
    
    // Detailed error analysis
    if (error.message.includes('Network request failed')) {
      console.error('\n🔴 Network Request Failed - Possible causes:');
      console.error('1. No internet connection');
      console.error('2. Firewall blocking the request');
      console.error('3. DNS resolution failure');
      console.error('4. SSL/TLS certificate issue');
      console.error('5. Proxy configuration issue');
    }
    
    return {
      success: false,
      error: error.message,
      errorType: error.name,
      message: 'Connection failed'
    };
  }
};

// Test general internet connectivity
export const testInternetConnection = async () => {
  console.log('\n🌐 Testing general internet connectivity...');
  
  const testUrls = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://api.github.com'
  ];
  
  const results = [];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing ${url}...`);
      const startTime = Date.now();
      const response = await fetch(url, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ ${url} - ${response.status} (${responseTime}ms)`);
      results.push({ url, success: true, status: response.status, responseTime });
    } catch (error: any) {
      console.log(`❌ ${url} - Failed: ${error.message}`);
      results.push({ url, success: false, error: error.message });
    }
  }
  
  return results;
};

// Comprehensive network diagnostic
export const runNetworkDiagnostics = async () => {
  console.log('🔧 Starting comprehensive network diagnostics...\n');
  console.log('='.repeat(50));
  
  // Test 1: General internet
  const internetTest = await testInternetConnection();
  const internetWorking = internetTest.some(r => r.success);
  
  console.log('\n' + '='.repeat(50));
  
  // Test 2: Supabase connection
  const supabaseTest = await testSupabaseConnection();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('Internet connectivity:', internetWorking ? '✅ Working' : '❌ Failed');
  console.log('Supabase connectivity:', supabaseTest.success ? '✅ Working' : '❌ Failed');
  
  if (!internetWorking) {
    console.log('\n⚠️ ISSUE: No internet connection detected');
    console.log('Solution: Check your device WiFi/mobile data');
  } else if (!supabaseTest.success) {
    console.log('\n⚠️ ISSUE: Internet works but Supabase is unreachable');
    console.log('Possible solutions:');
    console.log('1. Firewall/antivirus blocking Supabase');
    console.log('2. VPN/proxy interfering');
    console.log('3. Supabase service might be down');
    console.log('4. SSL certificate issue');
  } else {
    console.log('\n✅ All systems operational!');
  }
  
  console.log('='.repeat(50));
  
  return {
    internetWorking,
    supabaseWorking: supabaseTest.success,
    details: {
      internet: internetTest,
      supabase: supabaseTest
    }
  };
};
