// Authentication Diagnostic Script
// This script tests the authentication flow to identify issues

import { supabase } from '@/lib/supabase';

export const runAuthDiagnostic = async () => {
  console.log('🔧 STARTING AUTHENTICATION DIAGNOSTIC');
  console.log('=====================================');

  const results = {
    supabaseConnection: false,
    sessionCheck: false,
    authStateListener: false,
    profileAccess: false,
    errors: [] as string[]
  };

  try {
    // Test 1: Supabase Connection
    console.log('🔧 TEST 1: Supabase Connection');
    try {
      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 3000)
        )
      ]);
      
      if (error) {
        results.errors.push(`Supabase connection error: ${error.message}`);
        console.error('❌ Supabase connection failed:', error);
      } else {
        results.supabaseConnection = true;
        console.log('✅ Supabase connection successful');
        console.log('Session data:', data?.session ? 'Present' : 'None');
      }
    } catch (error: any) {
      results.errors.push(`Supabase connection timeout: ${error.message}`);
      console.error('❌ Supabase connection timeout:', error);
    }

    // Test 2: Session State Check
    console.log('\n🔧 TEST 2: Session State Check');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        results.errors.push(`Session check error: ${error.message}`);
        console.error('❌ Session check failed:', error);
      } else {
        results.sessionCheck = true;
        console.log('✅ Session check successful');
        console.log('User:', session?.user ? session.user.email : 'Not signed in');
        console.log('Session expires:', session?.expires_at ? new Date(session.expires_at * 1000) : 'N/A');
      }
    } catch (error: any) {
      results.errors.push(`Session check exception: ${error.message}`);
      console.error('❌ Session check exception:', error);
    }

    // Test 3: Auth State Listener
    console.log('\n🔧 TEST 3: Auth State Listener');
    try {
      let listenerTriggered = false;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔧 Auth state change detected:', event, session?.user?.email || 'no user');
        listenerTriggered = true;
      });

      // Wait a moment to see if listener triggers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (listenerTriggered) {
        results.authStateListener = true;
        console.log('✅ Auth state listener working');
      } else {
        console.log('⚠️ Auth state listener not triggered (may be normal)');
      }

      subscription.unsubscribe();
    } catch (error: any) {
      results.errors.push(`Auth listener error: ${error.message}`);
      console.error('❌ Auth listener setup failed:', error);
    }

    // Test 4: Profile Access (if user is signed in)
    console.log('\n🔧 TEST 4: Profile Access');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          results.errors.push(`Profile access error: ${error.message}`);
          console.error('❌ Profile access failed:', error);
        } else {
          results.profileAccess = true;
          console.log('✅ Profile access successful');
          console.log('Profile role:', profile?.role || 'undefined');
        }
      } else {
        console.log('ℹ️ No user session - skipping profile test');
      }
    } catch (error: any) {
      results.errors.push(`Profile access exception: ${error.message}`);
      console.error('❌ Profile access exception:', error);
    }

  } catch (criticalError: any) {
    results.errors.push(`Critical diagnostic error: ${criticalError.message}`);
    console.error('❌ CRITICAL DIAGNOSTIC ERROR:', criticalError);
  }

  // Summary
  console.log('\n🔧 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log('Supabase Connection:', results.supabaseConnection ? '✅' : '❌');
  console.log('Session Check:', results.sessionCheck ? '✅' : '❌');
  console.log('Auth State Listener:', results.authStateListener ? '✅' : '⚠️');
  console.log('Profile Access:', results.profileAccess ? '✅' : 'ℹ️');
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ NO CRITICAL ERRORS FOUND');
  }

  return results;
};

// Auto-run diagnostic in development
if (import.meta.env.DEV) {
  console.log('🔧 Auto-running auth diagnostic in development mode...');
  setTimeout(() => {
    runAuthDiagnostic().catch(console.error);
  }, 2000); // Wait 2 seconds for app to initialize
}
