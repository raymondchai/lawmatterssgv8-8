import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { sessionManager, type SessionUser } from '@/lib/services/sessionManager';
import { authConfig } from '@/lib/auth/config';
import { profilesApi } from '@/lib/api/profiles';
// Removed analytics imports to simplify sign-out process
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
  const isInitialLoadRef = useRef(true); // Shared ref for initial load state
  const isSigningOutRef = useRef(false); // Flag to prevent auth handler interference during sign out

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

  // 🔧 STEP 2: SERVER-CONTROLLED SESSION INITIALIZATION
  useEffect(() => {
    let mounted = true;
    let maxLoadingTimeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      console.log('🔧 AUTH INIT: Starting server-controlled session initialization...');

      try {
        // Check if we should force sign out (for testing purposes)
        const forceSignOut = sessionStorage.getItem('force-signout') === 'true';

        if (forceSignOut) {
          console.log('🔧 AUTH INIT: Force sign out requested - clearing all data...');

          try {
            // Clear session manager memory state
            sessionManager.clearMemoryState();

            // Clear any remaining client-side storage
            const authKeys = [
              'user-profile-cache',
              'force-signout'
            ];

            authKeys.forEach(key => {
              try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
              } catch (e) {
                // Ignore individual key errors
              }
            });

            // Force sign out from session manager (clears server-side session)
            await sessionManager.signOut();

            console.log('✅ Force sign out completed');

            // Set clean signed-out state
            if (mounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
              setRequiresTwoFactor(false);
            }

            return; // Skip normal session restoration
          } catch (e) {
            console.warn('Force sign out failed:', e);
          }
        }

        // Load cached profile immediately for UI (prevents role flicker)
        const cachedProfile = loadCachedProfile();
        if (cachedProfile && mounted) {
          console.log('🔧 AUTH INIT: Using cached profile:', cachedProfile.role);
          setProfile(cachedProfile);
        }

        // CRITICAL: Maximum loading timeout - force clear loading after 5 seconds no matter what
        maxLoadingTimeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('🚨 AUTH INIT: MAXIMUM LOADING TIMEOUT (5s) - forcing loading to false');
            setLoading(false);
            // Also mark initial load as complete to prevent auth listener from interfering
            isInitialLoadRef.current = false;
          }
        }, 5000);

        // Validate current session with server
        console.log('🔧 AUTH INIT: Validating server-side session...');

        try {
          const sessionData = await sessionManager.validateSession();

          if (!mounted) return;

          if (sessionData) {
            console.log('🔧 AUTH INIT: Valid session found for user:', sessionData.user.email);

            // Convert SessionUser to Supabase User format for compatibility
            const supabaseUser: User = {
              id: sessionData.user.id,
              email: sessionData.user.email,
              aud: 'authenticated',
              role: 'authenticated',
              email_confirmed_at: new Date().toISOString(),
              phone_confirmed_at: null,
              confirmed_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              identities: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Create a minimal session object for compatibility
            const session: Session = {
              access_token: 'server-managed',
              refresh_token: 'server-managed',
              expires_in: 86400,
              expires_at: Math.floor(Date.now() / 1000) + 86400,
              token_type: 'bearer',
              user: supabaseUser
            };

            setSession(session);
            setUser(supabaseUser);

            if (sessionData.profile) {
              console.log('🔧 AUTH INIT: Profile loaded:', sessionData.profile.role);
              safeSetProfile(sessionData.profile);
            } else {
              safeSetProfile(null);
            }
          } else {
            console.log('🔧 AUTH INIT: No valid session found');
            setSession(null);
            setUser(null);
            safeSetProfile(null);
          }
        } catch (sessionError) {
          console.error('🔧 AUTH INIT: Session validation failed:', sessionError);
          // Handle gracefully - set signed out state
          if (mounted) {
            setSession(null);
            setUser(null);
            safeSetProfile(null);
          }
        }
      } catch (error) {
        console.error('🔧 AUTH INIT: Critical error (handled gracefully):', error);
        if (mounted) {
          // Don't clear cached profile on network errors
          setSession(null);
          setUser(null);
          // Keep cached profile if available
          const cached = loadCachedProfile();
          if (!cached) {
            safeSetProfile(null);
          }
        }
      } finally {
        if (mounted) {
          console.log('🔧 AUTH INIT: Initialization complete, guaranteed loading cleanup');
          setLoading(false);
          // Mark initial load as complete
          isInitialLoadRef.current = false;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (maxLoadingTimeoutId) {
          clearTimeout(maxLoadingTimeoutId);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxLoadingTimeoutId) {
        clearTimeout(maxLoadingTimeoutId);
      }
    };
  }, []); // Only run once on mount

  // 🔧 STEP 5: ROBUST SESSION STATE MANAGEMENT + EDGE CASES
  useEffect(() => {
    let subscription: any = null;

    try {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔧 AUTH LISTENER: State change -', event, session?.user?.email || 'no user');

          // Skip processing if we're in the middle of signing out
          if (isSigningOutRef.current) {
            console.log('🔧 AUTH LISTENER: Skipping event processing - sign out in progress');
            return;
          }

          // Handle edge case: revoked tokens
          if (session?.user && session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000);
            const now = new Date();

            if (expiresAt <= now) {
              console.warn('🔧 AUTH LISTENER: Session expired, clearing state');
              setSession(null);
              setUser(null);
              setProfile(null);
              persistProfile(null);
              setLoading(false); // Always clear loading on session expiry
              return;
            }
          }

          // Handle edge case: browser storage cleared mid-session
          if (event === 'SIGNED_OUT' && session === null) {
            console.log('🔧 AUTH LISTENER: Storage cleared or session revoked');
            setSession(null);
            setUser(null);
            setProfile(null);
            persistProfile(null);
            setLoading(false); // Always clear loading on sign out
            return;
          }

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
              // Keep any cached profile for better UX
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🔧 AUTH LISTENER: User signed out, clearing profile');
            setProfile(null);
            persistProfile(null);
          }

          // CRITICAL FIX: Always clear loading state after processing any auth event
          // This prevents infinite loading spinners, but only after initial load
          if (!isInitialLoadRef.current) {
            console.log('🔧 AUTH LISTENER: Clearing loading state after event processing');
            setLoading(false);
          }

          // Mark that initial load is complete
          isInitialLoadRef.current = false;
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
      console.log('🔐 Starting server-controlled sign-in...');

      const { user, profile } = await sessionManager.signIn(email, password);

      // Convert SessionUser to Supabase User format for compatibility
      const supabaseUser: User = {
        id: user.id,
        email: user.email,
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create a minimal session object for compatibility
      const session: Session = {
        access_token: 'server-managed',
        refresh_token: 'server-managed',
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        token_type: 'bearer',
        user: supabaseUser
      };

      // Update state
      setSession(session);
      setUser(supabaseUser);
      safeSetProfile(profile);

      console.log('✅ Server-controlled sign-in successful:', user.email);
      return {};
    } catch (error) {
      console.error('❌ Server-controlled sign-in failed:', error);
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
    console.log('🚪 SIGN OUT - Starting bulletproof sign out process...');

    try {
      // STEP 1: Set a flag to prevent auth state change handler from interfering
      console.log('🔧 Setting sign out in progress flag...');
      isSigningOutRef.current = true;

      // STEP 2: Clear all auth storage FIRST (before any async operations)
      console.log('🧹 Clearing all auth storage...');
      const authKeys = [
        'sb-kvlaydeyqidlfpfutbmp-auth-token',
        'supabase.auth.token',
        'auth-token',
        'user-session',
        'auth-state',
        'user-profile-cache',
        'supabase-auth-token',
        'auth-session'
      ];

      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore individual key errors
        }
      });

      // Clear all localStorage keys that start with 'sb-'
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ Storage cleared');

      // STEP 3: Clear React state immediately
      console.log('🔧 Clearing React auth state...');
      setLoading(false);
      setSession(null);
      setUser(null);
      setProfile(null);
      setRequiresTwoFactor(false);
      console.log('✅ React state cleared');

      // STEP 4: Clear profile cache
      persistProfile(null);
      console.log('✅ Profile cache cleared');

      // STEP 5: Sign out from session manager (clears server-side session and HTTP-only cookie)
      console.log('🔧 Attempting server-controlled sign out...');
      try {
        await sessionManager.signOut();
        console.log('✅ Server-controlled sign out completed');
      } catch (e) {
        console.warn('⚠️ Server sign out failed (local state already cleared):', e);
      }

      // STEP 6: Force immediate redirect (don't wait for anything else)
      console.log('🔄 Forcing immediate redirect to homepage...');

      // Reset the flag before redirect
      isSigningOutRef.current = false;
      window.location.replace('/');

    } catch (error) {
      console.error('❌ Sign out error:', error);

      // CRITICAL: Always ensure we're signed out locally and redirect
      console.log('🚨 Error during sign out - forcing emergency cleanup...');
      setLoading(false);
      setSession(null);
      setUser(null);
      setProfile(null);
      setRequiresTwoFactor(false);

      // Clear session manager memory state
      sessionManager.clearMemoryState();

      // Reset the flag before redirect
      isSigningOutRef.current = false;

      // Force redirect even if there's an error
      window.location.replace('/');
    }
  };

  // Emergency logout function that can be called from console
  const emergencyLogout = () => {
    console.log('🚨 EMERGENCY LOGOUT ACTIVATED 🚨');
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/');
  };

  // Emergency loading clear function that can be called from console
  const emergencyLoadingClear = () => {
    console.log('🚨 EMERGENCY LOADING CLEAR ACTIVATED 🚨');
    setLoading(false);
    console.log('Loading state forcefully cleared');
  };

  // Expose emergency functions to global window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).emergencyLogout = emergencyLogout;
      (window as any).emergencyLoadingClear = emergencyLoadingClear;
      console.log('🔧 Emergency functions available: window.emergencyLogout(), window.emergencyLoadingClear()');
    }
  }, []);

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
