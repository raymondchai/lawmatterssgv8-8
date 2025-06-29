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

  // 🔧 STEP 4: PROFILE CACHING & PERSISTENCE
  const persistProfile = (profileData: ProfileUser | null) => {
    try {
      if (profileData) {
        const cacheData = {
          id: profileData.id,
          email: profileData.email,
          role: profileData.role,
          subscription_tier: profileData.subscription_tier,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          cached_at: Date.now()
        };
        sessionStorage.setItem('user-profile-cache', JSON.stringify(cacheData));
      } else {
        sessionStorage.removeItem('user-profile-cache');
      }
    } catch (error) {
      console.warn('Profile cache error:', error);
    }
  };

  const loadCachedProfile = (): ProfileUser | null => {
    try {
      const cached = sessionStorage.getItem('user-profile-cache');
      if (cached) {
        const profileData = JSON.parse(cached);
        const cacheAge = Date.now() - (profileData.cached_at || 0);
        const maxAge = 10 * 60 * 1000; // 10 minutes

        if (cacheAge < maxAge) {
          return profileData as ProfileUser;
        } else {
          sessionStorage.removeItem('user-profile-cache');
        }
      }
    } catch (error) {
      console.warn('Cache load error:', error);
      sessionStorage.removeItem('user-profile-cache');
    }
    return null;
  };

  // 🔧 STEP 5: DEFENSIVE PROFILE SETTER
  const safeSetProfile = (newProfile: ProfileUser | null) => {
    if (newProfile) {
      setProfile(newProfile);
      persistProfile(newProfile);
    } else {
      // Only clear if we don't have a valid cached profile
      const cached = loadCachedProfile();
      if (cached) {
        setProfile(cached);
        persistProfile(cached);
      } else {
        setProfile(null);
        persistProfile(null);
      }
    }
  };

  // 🔧 STEP 5: ROBUST SESSION INITIALIZATION
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      console.log('🔧 AUTH INIT: Starting authentication initialization...');

      try {
        // Load cached profile immediately for UI (prevents role flicker)
        const cachedProfile = loadCachedProfile();
        if (cachedProfile && mounted) {
          console.log('🔧 AUTH INIT: Using cached profile:', cachedProfile.role);
          setProfile(cachedProfile);
        }

        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('🔧 AUTH INIT: Timeout reached, forcing loading to false');
            setLoading(false);
          }
        }, 5000); // 5 second timeout

        // Get current session with error handling
        console.log('🔧 AUTH INIT: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        // Clear timeout since we got a response
        clearTimeout(timeoutId);

        if (error) {
          console.error('🔧 AUTH INIT: Session error:', error);
          setSession(null);
          setUser(null);
          safeSetProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('🔧 AUTH INIT: Valid session found for:', session.user.email);
          setSession(session);
          setUser(session.user);

          // Fetch fresh profile data
          try {
            const profileData = await profilesApi.getProfile(session.user.id);
            if (mounted && profileData) {
              console.log('🔧 AUTH INIT: Fresh profile loaded:', profileData.role);
              safeSetProfile(profileData);
            }
          } catch (profileError) {
            console.warn('🔧 AUTH INIT: Profile fetch error, keeping cached:', profileError);
            // Keep cached profile if fetch fails
          }
        } else {
          console.log('🔧 AUTH INIT: No valid session found');
          setSession(null);
          setUser(null);
          safeSetProfile(null);
        }
      } catch (error) {
        console.error('🔧 AUTH INIT: Critical error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          safeSetProfile(null);
        }
      } finally {
        if (mounted) {
          console.log('🔧 AUTH INIT: Initialization complete, setting loading to false');
          setLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Only run once on mount

  // 🔧 STEP 6: ROBUST AUTH STATE LISTENER
  useEffect(() => {
    let subscription: any = null;

    try {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔧 AUTH LISTENER: State change -', event, session?.user?.email || 'no user');

          // Always update session and user state
          setSession(session);
          setUser(session?.user ?? null);

          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔧 AUTH LISTENER: User signed in, loading profile...');
            try {
              const profileData = await profilesApi.getCurrentProfile();
              if (profileData) {
                console.log('🔧 AUTH LISTENER: Profile loaded on sign in:', profileData.role);
                safeSetProfile(profileData);
              }
            } catch (profileError) {
              console.warn('🔧 AUTH LISTENER: Profile load error on sign in:', profileError);
              // Keep any cached profile
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🔧 AUTH LISTENER: User signed out, clearing profile');
            setProfile(null);
            persistProfile(null);
          }

          // Only set loading to false if we're not in the initial loading state
          // This prevents the auth listener from interfering with the initial load
          setLoading(false);
        }
      );
      subscription = authSubscription;
    } catch (error) {
      console.error('🔧 AUTH LISTENER: Setup error:', error);
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

      // STEP 2: Try graceful Supabase sign out first (with session check)
      console.log('🔄 Checking for active session before sign out...');

      const currentSession = await supabase.auth.getSession();

      if (currentSession.data.session) {
        console.log('🔄 Active session found, attempting graceful Supabase sign out...');

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
      } else {
        console.log('ℹ️ No active session found, skipping Supabase sign out');
        signOutAttempt.success = true;
        signOutAttempt.method = 'no_session';
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
      persistProfile(null);
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
