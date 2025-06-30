import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// 🔧 STEP 1: ENHANCED RUNTIME CONFIG VALIDATION
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://kvlaydeyqidlfpfutbmp.supabase.co';
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bGF5ZGV5cWlkbGZwZnV0Ym1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODgzNzAsImV4cCI6MjA2NTg2NDM3MH0.XVSO5W_0v6wW-MYlM7i0MTNKprOWp_O4ON-5LqqVnzw';

// Enhanced startup logging for environment validation
console.log('🔧 SUPABASE CONFIG CHECK:', {
  SUPA_URL: SUPA_URL,
  SUPA_KEY_LENGTH: SUPA_KEY?.length,
  HAS_URL: !!SUPA_URL,
  HAS_KEY: !!SUPA_KEY,
  ENV_MODE: import.meta.env.MODE,
  URL_VALID: SUPA_URL?.includes('supabase.co'),
  KEY_VALID: SUPA_KEY?.length > 100,
  TIMESTAMP: new Date().toISOString()
});

// Validate configuration with detailed error messages
if (!SUPA_URL || SUPA_URL.includes('placeholder')) {
  throw new Error('🚨 CRITICAL: Invalid or missing VITE_SUPABASE_URL');
}
if (!SUPA_KEY || SUPA_KEY.includes('placeholder') || SUPA_KEY.length < 100) {
  throw new Error('🚨 CRITICAL: Invalid or missing VITE_SUPABASE_ANON_KEY');
}

// 🔧 STEP 2: BULLETPROOF SUPABASE CLIENT (SINGLE SOURCE OF TRUTH)
export const supabase = createClient<Database>(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    // Add timeout for auth operations
    debug: import.meta.env.DEV
  },
  realtime: {
    enabled: false  // Disable to prevent WebSocket errors
  },
  global: {
    headers: {
      'X-Client-Info': 'lawmatterssg-webapp',
      'X-Client-Version': '1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
});

// 🔧 STEP 3: DISABLE ALL TELEMETRY TO PREVENT 404s
// Ensure no telemetry calls are made
if (typeof window !== 'undefined') {
  // Override any potential telemetry functions
  (window as any).supabase = undefined;

  // Log successful client creation
  console.log('✅ Supabase client created successfully:', {
    url: SUPA_URL,
    timestamp: new Date().toISOString(),
    clientReady: true
  });
}

// Export same instance for consistency
export const supabaseAuth = supabase;

// Helper functions for common operations
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, metadata?: Record<string, any>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  if (error) throw error;
  return data;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
};

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};
