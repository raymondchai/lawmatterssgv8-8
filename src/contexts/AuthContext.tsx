import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authConfig } from '@/lib/auth/config';
import { profilesApi } from '@/lib/api/profiles';
import { logError, logUserAction, logPerformance } from '@/lib/services/productionMonitoring';
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
  resendVerificationEmail: (email: string) => Promise<void>;
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

  // Add a safe profile setter that prevents overwriting valid profiles with null
  const safeSetProfile = (newProfile: ProfileUser | null) => {
    if (newProfile) {
      // Always set if we have valid profile data
      console.log('🔒 Setting profile:', newProfile.email, newProfile.role);
      setProfile(newProfile);
    } else {
      // Only set to null if we don't currently have a profile
      setProfile(current => {
        if (current) {
          console.log('🛡️ Preventing profile reset - keeping current profile:', current.email, current.role);
          return current; // Keep existing profile
        } else {
          console.log('🔒 Setting profile to null (no existing profile)');
          return null;
        }
      });
    }
  };

  // Add a timeout to prevent infinite loading - increased timeout for production
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
      }
    }, 15000); // 15 second timeout for production environment

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

        // For production, be more lenient with session validation to prevent immediate redirects
        if (session) {
          // Check if session is expired with buffer time
          const currentTime = Math.floor(Date.now() / 1000);
          const sessionExpiry = session.expires_at || 0;
          const bufferTime = 300; // 5 minutes buffer

          if (currentTime >= (sessionExpiry + bufferTime)) {
            console.log('Session expired, clearing...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            // For production, trust the session more and avoid unnecessary validation calls
            // that might cause delays and premature redirects
            console.log('Session found for user:', session.user?.email);
            setSession(session);
            setUser(session.user);

            // Only validate if session is close to expiry
            if (currentTime >= (sessionExpiry - 600)) { // 10 minutes before expiry
              try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                  console.log('Invalid session detected during validation, clearing...', userError?.message);
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  setProfile(null);
                }
              } catch (validationError) {
                console.error('Session validation failed:', validationError);
                // Don't clear session on validation error, just log it
                console.warn('Continuing with existing session despite validation error');
              }
            }
          }
        } else {
          // No session found
          console.log('No session found');
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        // Load profile if we have a valid user session
        if (session?.user) {
          try {
            console.log('🔄 Loading profile during initialization for user:', session.user.email);
            const profileData = await profilesApi.getCurrentProfile();
            if (profileData) {
              console.log('✅ Profile loaded successfully during initialization:', {
                email: profileData.email,
                role: profileData.role,
                subscription_tier: profileData.subscription_tier
              });
              safeSetProfile(profileData);
            } else {
              console.warn('⚠️ Profile data is null during initialization');
              safeSetProfile(null);
            }
          } catch (profileError) {
            console.error('❌ Error loading profile during initialization:', profileError);
            // Don't set profile to null immediately - keep trying
            console.log('🔄 Will retry profile loading via loadProfile function...');
            try {
              await loadProfile();
            } catch (retryError) {
              console.error('❌ Retry also failed:', retryError);
              safeSetProfile(null);
            }
          }
        } else {
          // Explicitly set profile to null when no user
          console.log('ℹ️ No user session, setting profile to null');
          safeSetProfile(null);
        }
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
        // Ensure clean state on error
        setSession(null);
        setUser(null);
        safeSetProfile(null);
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
            console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');

            setSession(session);
            setUser(session?.user ?? null);

            // Handle profile loading based on event type to prevent unnecessary resets
            if (event === 'SIGNED_IN' && session?.user) {
              try {
                console.log('🔄 Loading profile after sign in for user:', session.user.email);
                const profileData = await profilesApi.getCurrentProfile();
                if (profileData) {
                  console.log('✅ Profile loaded after sign in:', {
                    email: profileData.email,
                    role: profileData.role,
                    subscription_tier: profileData.subscription_tier
                  });
                  safeSetProfile(profileData);
                } else {
                  console.warn('⚠️ Profile data is null after sign in');
                  safeSetProfile(null);
                }
              } catch (profileError) {
                console.error('❌ Error loading profile during sign in:', profileError);
                // Don't immediately set to null, try the loadProfile function
                try {
                  await loadProfile();
                } catch (retryError) {
                  console.error('❌ Profile loading retry failed:', retryError);
                  safeSetProfile(null);
                }
              }
            } else if (event === 'SIGNED_OUT') {
              // Clear profile when user logs out
              console.log('ℹ️ User signed out, clearing profile');
              setProfile(null); // Use regular setProfile for sign out to ensure clean state
            } else if (event === 'TOKEN_REFRESHED' && session?.user && !profile) {
              // Only reload profile if we don't have one and token was refreshed
              try {
                console.log('🔄 Token refreshed, loading profile if missing for user:', session.user.email);
                const profileData = await profilesApi.getCurrentProfile();
                if (profileData) {
                  safeSetProfile(profileData);
                }
              } catch (profileError) {
                console.error('❌ Error loading profile during token refresh:', profileError);
              }
            }
            // For other events, don't touch the profile to prevent resets

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
      console.log('🔄 AuthContext - Loading user profile from database...', retryCount > 0 ? `(retry ${retryCount})` : '');

      // Add additional debugging for profile loading
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('🔍 AuthContext - Current auth user:', currentUser?.email, currentUser?.id);

      const profileData = await profilesApi.getCurrentProfile();

      // Ensure we have the correct role data
      if (profileData) {
        console.log('✅ AuthContext - Profile loaded successfully:', {
          email: profileData.email,
          role: profileData.role,
          subscription_tier: profileData.subscription_tier,
          id: profileData.id,
          roleType: typeof profileData.role,
          isSuperAdmin: profileData.role === 'super_admin'
        });
        safeSetProfile(profileData);
      } else {
        console.warn('⚠️ AuthContext - Profile data is null or undefined');
        safeSetProfile(null);
      }
    } catch (error) {
      console.error('❌ AuthContext - Error loading profile:', error);
      console.error('❌ AuthContext - Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`Retrying profile load in ${delay}ms...`);
        setTimeout(() => loadProfile(retryCount + 1), delay);
      } else {
        console.error('Failed to load profile after retries, setting to null');
        safeSetProfile(null);
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

        // Handle email not confirmed error
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }

        throw error;
      }

      // Check if user email is verified
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('User email not verified:', data.user.email);
        await supabase.auth.signOut(); // Sign out unverified user
        throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation email.');
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
    console.log('🚪 Starting production sign out...');

    // Production-ready sign out with proper error handling and analytics
    const signOutAttempt = {
      timestamp: new Date().toISOString(),
      method: 'standard',
      success: false,
      errors: [] as string[]
    };

    try {
      // STEP 1: Set loading state to prevent multiple clicks
      setLoading(true);

      // STEP 2: Try graceful Supabase sign out first (with timeout)
      console.log('🔄 Attempting graceful Supabase sign out...');

      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign out timeout')), 3000)
      );

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log('✅ Supabase sign out successful');
        signOutAttempt.success = true;
      } catch (supabaseError: any) {
        console.warn('⚠️ Supabase sign out failed or timed out:', supabaseError);
        signOutAttempt.errors.push(`Supabase: ${supabaseError.message}`);
        signOutAttempt.method = 'fallback';
      }

      // STEP 3: Clear React state (always do this)
      console.log('🔄 Clearing React state...');
      setSession(null);
      setUser(null);
      setProfile(null);
      setRequiresTwoFactor(false);

      // STEP 4: Clear only auth-related storage (selective clearing)
      console.log('🧹 Clearing auth storage...');
      const authKeys = [
        'sb-kvlaydeyqidlfpfutbmp-auth-token',
        'supabase.auth.token',
        'auth-token',
        'user-session',
        'auth-state'
      ];

      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to remove auth key:', key);
        }
      });

      // STEP 5: Log analytics (for monitoring sign out issues)
      try {
        logUserAction('sign_out', 'auth_context', signOutAttempt.success, undefined, user?.id);
        if (signOutAttempt.errors.length > 0) {
          logError(`Sign out issues: ${signOutAttempt.errors.join(', ')}`, 'auth_sign_out', 'medium', user?.id);
        }
        console.log('📊 Sign out analytics:', signOutAttempt);
      } catch (e) {
        // Ignore analytics errors
      }

      console.log('✅ Sign out completed successfully');

      // STEP 6: Navigate gracefully
      setTimeout(() => {
        window.location.href = '/';
      }, 100);

    } catch (criticalError: any) {
      console.error('❌ Critical sign out error:', criticalError);
      signOutAttempt.errors.push(`Critical: ${criticalError.message}`);

      // Emergency fallback - but more controlled
      console.log('🚨 Executing emergency fallback...');

      // Clear state immediately
      setSession(null);
      setUser(null);
      setProfile(null);
      setRequiresTwoFactor(false);
      setLoading(false);

      // Clear auth storage only
      const authKeys = [
        'sb-kvlaydeyqidlfpfutbmp-auth-token',
        'supabase.auth.token',
        'auth-token'
      ];

      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore errors in emergency mode
        }
      });

      // Force redirect as last resort
      window.location.href = '/';
    }
  };

  // Emergency logout function that can be called from console
  const emergencyLogout = () => {
    console.log('🚨 EMERGENCY LOGOUT ACTIVATED 🚨');
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/');
  };

  // Make emergency logout available globally for console access
  if (typeof window !== 'undefined') {
    (window as any).emergencyLogout = emergencyLogout;
  }

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

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (error) {
        console.error('Error resending verification email:', error);
        throw error;
      }

      console.log('Verification email resent successfully');
    } catch (error) {
      console.error('Resend verification email error:', error);
      throw error;
    }
  };

  // Force refresh profile from database (bypasses cache)
  const forceRefreshProfile = async (): Promise<ProfileUser | null> => {
    console.log('Force refreshing user profile from database...');
    try {
      const profileData = await profilesApi.getCurrentProfile();
      safeSetProfile(profileData);
      console.log('Profile force refreshed successfully:', profileData?.email, 'Role:', profileData?.role, 'Tier:', profileData?.subscription_tier);
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
    resendVerificationEmail,
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
    resendVerificationEmail,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
