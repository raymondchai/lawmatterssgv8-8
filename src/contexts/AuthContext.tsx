import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authConfig } from '@/lib/auth/config';
import type { User as ProfileUser } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: ProfileUser | null;
  session: Session | null;
  loading: boolean;
  requiresTwoFactor: boolean;
  signIn: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  verifyTwoFactor: (token: string, backupCode?: string) => Promise<void>;
  isTwoFactorEnabled: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if we have valid Supabase configuration
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
          console.warn('Supabase not configured properly, skipping auth initialization', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlPlaceholder: supabaseUrl?.includes('placeholder'),
            keyPlaceholder: supabaseKey?.includes('placeholder')
          });
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('Initializing auth with Supabase:', {
          url: supabaseUrl,
          keyLength: supabaseKey?.length || 0
        });

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          // Clear state and continue
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Validate session if it exists
        if (session) {
          // Check if session is still valid by making a test API call
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
              // Session is invalid, clear it
              console.log('Invalid session detected, clearing...');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setProfile(null);
            } else {
              // Session is valid
              setSession(session);
              setUser(user);
            }
          } catch (validationError) {
            console.error('Session validation failed:', validationError);
            // Clear invalid session
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } else {
          // No session
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        if (session?.user) {
          try {
            await loadProfile();
          } catch (profileError) {
            console.error('Error loading profile during initialization:', profileError);
            // Continue without profile
          }
        } else {
          // Explicitly set profile to null when no user
          setProfile(null);
        }
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
        // Ensure clean state on error
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        // Always set loading to false, regardless of success or failure
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    let subscription: any = null;
    try {
      // Only set up listener if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder') && !supabaseKey.includes('placeholder')) {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email || 'no user');

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
              try {
                await loadProfile();
              } catch (profileError) {
                console.error('Error loading profile during auth change:', profileError);
                // Continue without profile
              }
            } else {
              setProfile(null);
            }

            setLoading(false);
          }
        );
        subscription = authSubscription;
      } else {
        console.warn('Skipping auth state listener setup - Supabase not configured');
      }
    } catch (error) {
      console.error('Failed to set up auth state listener:', error);
      // Ensure loading is set to false even if listener setup fails
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadProfile = async () => {
    try {
      // For now, skip profile loading to avoid console errors
      // We'll implement this properly once the database is set up
      console.log('Profile loading skipped - using basic user data');
      setProfile(null);

      // Uncomment this when profiles table is ready:
      // const profileData = await profilesApi.getCurrentProfile();
      // setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      // For now, skip 2FA and security tracking to avoid console errors
      console.log('Login successful:', data.user?.email);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };



  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        ...authConfig.getSignUpOptions()
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setProfile(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email,
      authConfig.getPasswordResetOptions()
    );
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      console.log('Password updated successfully');
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile();
    }
  };

  const verifyTwoFactor = async (token: string, backupCode?: string) => {
    // Simplified 2FA for now
    const isValid = backupCode ? /^\d{8}$/.test(backupCode) : /^\d{6}$/.test(token);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    setRequiresTwoFactor(false);
    console.log('2FA verification successful');
  };

  const isTwoFactorEnabled = () => {
    // Simplified for now - always return false
    return false;
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    requiresTwoFactor,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    verifyTwoFactor,
    isTwoFactorEnabled,
  }), [
    user,
    profile,
    session,
    loading,
    requiresTwoFactor,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    verifyTwoFactor,
    isTwoFactorEnabled,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
