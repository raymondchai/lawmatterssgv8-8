import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseSiteUrl, debugUrlConfig } from '@/lib/utils/url';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're using placeholder values (development mode)
const isPlaceholder = supabaseUrl?.includes('placeholder') ?? supabaseAnonKey?.includes('placeholder');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

if (isPlaceholder) {
  console.warn('Using placeholder Supabase configuration. Some features may not work properly.');
}

// Debug URL configuration in development
if (import.meta.env.DEV) {
  debugUrlConfig();
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
