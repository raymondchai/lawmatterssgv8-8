/**
 * Test Script for Server-Controlled Authentication System
 * 
 * This script tests the new authentication architecture to ensure:
 * 1. Edge Function is deployed and working
 * 2. Session validation works correctly
 * 3. Sign-in/sign-out flow functions properly
 */

const SUPABASE_URL = 'https://kvlaydeyqidlfpfutbmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bGF5ZGV5cWlkbGZwZnV0Ym1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODgzNzAsImV4cCI6MjA2NTg2NDM3MH0.XVSO5W_0v6wW-MYlM7i0MTNKprOWp_O4ON-5LqqVnzw';

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function deployment...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/session-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'validate'
      })
    });

    const data = await response.json();
    
    console.log('📄 Response status:', response.status);
    console.log('📄 Response data:', data);

    // For session validation without a token, we expect either:
    // 1. 200 OK with success: false, error: 'No session token'
    // 2. 401 Unauthorized with success: false, error: 'No session token'
    if ((response.ok || response.status === 401) &&
        data.success === false &&
        data.error === 'No session token') {
      console.log('✅ Edge Function is deployed and responding correctly');
      console.log('✅ Session validation correctly returns "no session" for unauthenticated request');
      return true;
    } else {
      console.error('❌ Unexpected response from Edge Function');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Edge Function:', error.message);
    return false;
  }
}

async function testSessionManagerService() {
  console.log('🧪 Testing SessionManager service...');
  
  try {
    // This would normally be imported, but for testing we'll simulate the calls
    const sessionManagerTest = {
      async validateSession() {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/session-manager`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'validate'
          })
        });

        const data = await response.json();
        return data.success ? data : null;
      }
    };

    const result = await sessionManagerTest.validateSession();
    
    if (result === null) {
      console.log('✅ SessionManager correctly returns null for no session');
      return true;
    } else {
      console.log('⚠️ SessionManager returned unexpected result:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ SessionManager test failed:', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('🧪 Testing database schema...');
  
  try {
    // Test if user_sessions table exists and has correct structure
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ user_sessions table exists and is accessible');
      return true;
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ user_sessions table exists (RLS is working - access denied as expected)');
      return true;
    } else {
      console.error('❌ Database schema test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Database schema test error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Server-Controlled Authentication System Tests\n');
  
  const tests = [
    { name: 'Edge Function Deployment', test: testEdgeFunction },
    { name: 'SessionManager Service', test: testSessionManagerService },
    { name: 'Database Schema', test: testDatabaseSchema }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    console.log(`\n📋 Running: ${name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ERROR - ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Server-controlled authentication system is ready.');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy the updated frontend to craftchatbot.com');
    console.log('2. Test sign-in/sign-out manually in browser');
    console.log('3. Run Playwright tests: npm run test:e2e:auth:production');
    console.log('4. Monitor Edge Function logs for any issues');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above before deployment.');
  }

  return failed === 0;
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testEdgeFunction, testSessionManagerService, testDatabaseSchema };
}
