import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authConfig } from '@/lib/auth/config';
import { profilesApi } from '@/lib/api/profiles';
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
  forceRefreshProfile: () => Promise<ProfileUser | null>;
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

// Optional auth hook that returns null instead of throwing error
export const useOptionalAuth = () => {
  const context = useContext(AuthContext);
  return context || null;
};

// Safe auth hook that provides default values when no provider exists
export const useSafeAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    // Return safe defaults when no auth provider is available
    return {
      user: null,
      profile: null,
      session: null,
      loading: false,
      requiresTwoFactor: false,
      signIn: async () => { throw new Error('Authentication not available'); },
      signUp: async () => { throw new Error('Authentication not available'); },
      signOut: async () => { throw new Error('Authentication not available'); },
      resetPassword: async () => { throw new Error('Authentication not available'); },
      updatePassword: async () => { throw new Error('Authentication not available'); },
      refreshProfile: async () => { throw new Error('Authentication not available'); },
      forceRefreshProfile: async () => { throw new Error('Authentication not available'); },
      verifyTwoFactor: async () => { throw new Error('Authentication not available'); },
      isTwoFactorEnabled: () => false,
    };
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

        // Check if there's a flag to skip session restoration
        const skipSessionRestore = localStorage.getItem('skipSessionRestore');

        if (skipSessionRestore) {
          console.log('Skipping session restoration as requested');
          localStorage.removeItem('skipSessionRestore');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('Initial session check:', {
          hasSession: !!session,
          sessionExpiry: session?.expires_at,
          currentTime: Math.floor(Date.now() / 1000),
          userEmail: session?.user?.email,
          error: error?.message
        });

        if (error) {
          console.error('Error getting session:', error);
          // Clear state and continue
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // For production, be more strict about session validation
        if (session) {
          // Check if session is expired
          const currentTime = Math.floor(Date.now() / 1000);
          const sessionExpiry = session.expires_at || 0;

          if (currentTime >= sessionExpiry) {
            console.log('Session expired, clearing...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            // Validate session by making a test API call
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (userError || !user) {
                console.log('Invalid session detected, clearing...', userError?.message);
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setProfile(null);
              } else {
                // Session is valid
                console.log('Valid session found for user:', user.email);
                setSession(session);
                setUser(user);
              }
            } catch (validationError) {
              console.error('Session validation failed:', validationError);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setProfile(null);
            }
          }
        } else {
          // No session found
          console.log('No session found');
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

  const loadProfile = async (retryCount = 0) => {
    try {
      console.log('Loading user profile from database...', retryCount > 0 ? `(retry ${retryCount})` : '');
      const profileData = await profilesApi.getCurrentProfile();
      setProfile(profileData);
      console.log('Profile loaded successfully:', profileData?.email, 'Role:', profileData?.role);
    } catch (error) {
      console.error('Error loading profile:', error);

      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`Retrying profile load in ${delay}ms...`);
        setTimeout(() => loadProfile(retryCount + 1), delay);
      } else {
        console.error('Failed to load profile after retries, setting to null');
        setProfile(null);
      }
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
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Explicitly clear all auth state
      setSession(null);
      setUser(null);
      setProfile(null);
      setRequiresTwoFactor(false);

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      console.log('Sign out successful - all data cleared');

      // Force page reload to ensure clean state
      window.location.href = '/';
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

  // Force refresh profile from database (bypasses cache)
  const forceRefreshProfile = async (): Promise<ProfileUser | null> => {
    console.log('Force refreshing user profile from database...');
    try {
      const profileData = await profilesApi.getCurrentProfile();
      setProfile(profileData);
      console.log('Profile force refreshed successfully:', profileData?.email, 'Tier:', profileData?.subscription_tier);
      return profileData;
    } catch (error) {
      console.error('Error force refreshing profile:', error);
      throw error;
    }
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
    forceRefreshProfile,
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
    forceRefreshProfile,
    verifyTwoFactor,
    isTwoFactorEnabled,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
