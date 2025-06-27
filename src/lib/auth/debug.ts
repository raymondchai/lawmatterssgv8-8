/**
 * Authentication debugging utilities
 * Helps diagnose authentication configuration issues
 */

import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config/env';

export interface AuthDebugInfo {
  environment: {
    nodeEnv: string;
    viteEnv: string;
    appUrl: string;
    supabaseUrl: string;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
  };
  supabaseConfig: {
    url: string;
    anonKeyPrefix: string;
    authConfig: any;
  };
  urlConfiguration: {
    currentUrl: string;
    origin: string;
    hostname: string;
    protocol: string;
    expectedRedirectUrls: string[];
  };
  authState: {
    hasSession: boolean;
    user: any;
    sessionExpiry: string | null;
  };
  localStorage: {
    hasSupabaseSession: boolean;
    sessionKeys: string[];
    skipSessionRestore: boolean;
  };
  recommendations: string[];
}

/**
 * Comprehensive authentication debugging
 */
export async function debugAuthentication(): Promise<AuthDebugInfo> {
  const recommendations: string[] = [];
  
  // Environment information
  const environment = {
    nodeEnv: process.env.NODE_ENV || 'unknown',
    viteEnv: import.meta.env.VITE_ENVIRONMENT || 'unknown',
    appUrl: config.app.url,
    supabaseUrl: config.supabase.url,
    hasAnonKey: !!config.supabase.anonKey && config.supabase.anonKey !== 'placeholder-key',
    hasServiceKey: !!config.supabase.serviceRoleKey,
  };

  // Supabase configuration
  const supabaseConfig = {
    url: config.supabase.url,
    anonKeyPrefix: config.supabase.anonKey.substring(0, 20) + '...',
    authConfig: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  };

  // URL configuration
  const currentUrl = window.location.href;
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  const expectedRedirectUrls = [
    `${origin}`,
    `${origin}/auth/callback`,
    `${origin}/auth/confirm`,
    `${origin}/auth/reset-password`,
    `${origin}/**`,
  ];

  const urlConfiguration = {
    currentUrl,
    origin,
    hostname,
    protocol,
    expectedRedirectUrls,
  };

  // Current auth state
  let authState = {
    hasSession: false,
    user: null,
    sessionExpiry: null,
  };

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      recommendations.push(`Auth session error: ${error.message}`);
    } else if (session) {
      authState = {
        hasSession: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'user',
        },
        sessionExpiry: new Date(session.expires_at! * 1000).toISOString(),
      };
    }
  } catch (error) {
    recommendations.push(`Failed to get auth session: ${error}`);
  }

  // Local storage information
  const localStorage = {
    hasSupabaseSession: false,
    sessionKeys: [] as string[],
    skipSessionRestore: false,
  };

  try {
    const storageKeys = Object.keys(window.localStorage);
    localStorage.sessionKeys = storageKeys.filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    localStorage.hasSupabaseSession = localStorage.sessionKeys.length > 0;
    localStorage.skipSessionRestore = window.localStorage.getItem('skipSessionRestore') === 'true';
  } catch (error) {
    recommendations.push('Cannot access localStorage');
  }

  // Generate recommendations
  if (!environment.hasAnonKey) {
    recommendations.push('Missing or invalid Supabase anonymous key');
  }

  if (environment.supabaseUrl.includes('placeholder')) {
    recommendations.push('Supabase URL appears to be a placeholder');
  }

  if (protocol === 'http:' && hostname !== 'localhost' && !hostname.startsWith('127.0.0.1')) {
    recommendations.push('Using HTTP in production - consider HTTPS for security');
  }

  if (!authState.hasSession && localStorage.hasSupabaseSession) {
    recommendations.push('Local storage has session data but no active session - possible session corruption');
  }

  if (authState.hasSession && authState.sessionExpiry) {
    const expiryTime = new Date(authState.sessionExpiry).getTime();
    const now = Date.now();
    if (expiryTime < now) {
      recommendations.push('Current session has expired');
    } else if (expiryTime - now < 5 * 60 * 1000) { // 5 minutes
      recommendations.push('Current session expires soon');
    }
  }

  return {
    environment,
    supabaseConfig,
    urlConfiguration,
    authState,
    localStorage,
    recommendations,
  };
}

/**
 * Clear all authentication data
 */
export async function clearAuthData(): Promise<void> {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear localStorage
    const storageKeys = Object.keys(window.localStorage);
    storageKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        window.localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    const sessionKeys = Object.keys(window.sessionStorage);
    sessionKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        window.sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Authentication data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    throw error;
  }
}

/**
 * Test authentication flow
 */
export async function testAuthFlow(email: string, password: string): Promise<{
  success: boolean;
  steps: Array<{ step: string; success: boolean; error?: string; data?: any }>;
}> {
  const steps: Array<{ step: string; success: boolean; error?: string; data?: any }> = [];
  
  try {
    // Step 1: Clear existing session
    steps.push({ step: 'Clear existing session', success: true });
    await clearAuthData();
    
    // Step 2: Test sign up
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        steps.push({ 
          step: 'Sign up', 
          success: false, 
          error: error.message 
        });
      } else {
        steps.push({ 
          step: 'Sign up', 
          success: true, 
          data: { userId: data.user?.id, needsConfirmation: !data.session } 
        });
      }
    } catch (error) {
      steps.push({ 
        step: 'Sign up', 
        success: false, 
        error: String(error) 
      });
    }
    
    // Step 3: Test sign in
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        steps.push({ 
          step: 'Sign in', 
          success: false, 
          error: error.message 
        });
      } else {
        steps.push({ 
          step: 'Sign in', 
          success: true, 
          data: { userId: data.user?.id, hasSession: !!data.session } 
        });
      }
    } catch (error) {
      steps.push({ 
        step: 'Sign in', 
        success: false, 
        error: String(error) 
      });
    }
    
    // Step 4: Test session persistence
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        steps.push({ 
          step: 'Session persistence', 
          success: false, 
          error: error.message 
        });
      } else {
        steps.push({ 
          step: 'Session persistence', 
          success: !!session, 
          data: { hasSession: !!session, userId: session?.user?.id } 
        });
      }
    } catch (error) {
      steps.push({ 
        step: 'Session persistence', 
        success: false, 
        error: String(error) 
      });
    }
    
    const success = steps.every(step => step.success);
    return { success, steps };
    
  } catch (error) {
    steps.push({ 
      step: 'Test flow', 
      success: false, 
      error: String(error) 
    });
    return { success: false, steps };
  }
}

/**
 * Log debug information to console
 */
export async function logAuthDebug(): Promise<void> {
  console.group('🔍 Authentication Debug Information');
  
  try {
    const debugInfo = await debugAuthentication();
    
    console.group('🌍 Environment');
    console.table(debugInfo.environment);
    console.groupEnd();
    
    console.group('⚙️ Supabase Configuration');
    console.table(debugInfo.supabaseConfig);
    console.groupEnd();
    
    console.group('🌐 URL Configuration');
    console.table(debugInfo.urlConfiguration);
    console.log('Expected redirect URLs:', debugInfo.urlConfiguration.expectedRedirectUrls);
    console.groupEnd();
    
    console.group('🔐 Auth State');
    console.table(debugInfo.authState);
    console.groupEnd();
    
    console.group('💾 Local Storage');
    console.table(debugInfo.localStorage);
    console.groupEnd();
    
    if (debugInfo.recommendations.length > 0) {
      console.group('💡 Recommendations');
      debugInfo.recommendations.forEach((rec, index) => {
        console.warn(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }
    
  } catch (error) {
    console.error('❌ Failed to generate debug info:', error);
  }
  
  console.groupEnd();
}
