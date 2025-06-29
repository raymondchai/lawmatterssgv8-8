import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseSiteUrl, debugUrlConfig } from '@/lib/utils/url';

// 🚨 PRODUCTION FIX: Ensure environment variables are available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kvlaydeyqidlfpfutbmp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bGF5ZGV5cWlkbGZwZnV0Ym1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODgzNzAsImV4cCI6MjA2NTg2NDM3MH0.XVSO5W_0v6wW-MYlM7i0MTNKprOWp_O4ON-5LqqVnzw';

// 🔧 PRODUCTION DEBUG: Log environment variable status
console.log('🔧 Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlSource: import.meta.env.VITE_SUPABASE_URL ? 'env' : 'fallback',
  keySource: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'env' : 'fallback',
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE
});

// Check if we're using placeholder values (development mode)
const isPlaceholder = supabaseUrl?.includes('placeholder') ?? supabaseAnonKey?.includes('placeholder');

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing Supabase environment variables');
  console.error('🚨 CRITICAL: Supabase configuration error:', error);
  throw error;
}

if (isPlaceholder) {
  console.warn('Using placeholder Supabase configuration. Some features may not work properly.');
}

// Debug URL configuration in development
if (import.meta.env.DEV) {
  debugUrlConfig();
}

// 🚨 PRODUCTION FIX: Create client with error handling
let supabaseClient;
try {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use dynamic site URL for redirects
      redirectTo: getSupabaseSiteUrl()
    },
    realtime: {
      // Completely disable realtime to prevent WebSocket errors
      enabled: false
    }
  });
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('🚨 CRITICAL: Failed to create Supabase client:', error);
  throw error;
}

export const supabase = supabaseClient;

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
