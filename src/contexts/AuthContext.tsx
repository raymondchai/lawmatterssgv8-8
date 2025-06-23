import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { profilesApi } from '@/lib/api/profiles';
import { twoFactorService } from '@/lib/services/twoFactor';
import { sessionSecurityService } from '@/lib/services/sessionSecurity';
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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          // Don't throw error in development with placeholder config
          if (!import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')) {
            throw error;
          }
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
      const profileData = await profilesApi.getCurrentProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Profile might not exist yet for new users - create one
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Try to create a basic profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email ?? '',
              first_name: user.user_metadata?.first_name ?? null,
              last_name: user.user_metadata?.last_name ?? null,
            })
            .select()
            .single();

          if (!createError && newProfile) {
            setProfile(newProfile);
          } else {
            console.error('Error creating profile:', createError);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (createError) {
        console.error('Error creating profile:', createError);
        setProfile(null);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Get IP address for security tracking
      const ipAddress = await getUserIP();

      // Check rate limiting
      const rateLimit = await sessionSecurityService.checkRateLimit(ipAddress);
      if (!rateLimit.allowed) {
        const resetTime = rateLimit.resetTime ? ` Try again ${rateLimit.resetTime.toLocaleTimeString()}.` : '';
        throw new Error(`Too many failed login attempts.${resetTime}`);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed login attempt
        await sessionSecurityService.recordFailedLogin(ipAddress);
        await sessionSecurityService.logSecurityEvent('failed_login', {
          email,
          error: error.message
        });
        throw error;
      }

      // Reset login attempts on successful login
      await sessionSecurityService.resetLoginAttempts(ipAddress);

      // Check if user has 2FA enabled
      if (data.user && twoFactorService.isTwoFactorEnabled(data.user)) {
        setRequiresTwoFactor(true);
        // Sign out temporarily until 2FA is verified
        await supabase.auth.signOut();
        return { requiresTwoFactor: true };
      }

      // Track successful login
      if (data.session && data.user) {
        await sessionSecurityService.trackSession(data.session.access_token, data.user.id);
        await sessionSecurityService.logSecurityEvent('login', {
          sessionId: data.session.access_token
        });
      }

      return {};
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Helper function to get user IP
  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return 'unknown';
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
      // Log security event before signing out
      await sessionSecurityService.logSecurityEvent('logout');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setProfile(null);
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

      // Log password change event
      await sessionSecurityService.logSecurityEvent('password_change');
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
    if (import.meta.env.DEV) {
      // In development, accept any 6-digit code or 8-digit backup code
      const isValid = backupCode ? /^\d{8}$/.test(backupCode) : /^\d{6}$/.test(token);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }
    } else {
      const isValid = await twoFactorService.verifyTwoFactor({
        token,
        backupCode
      });
      if (!isValid) {
        throw new Error('Invalid verification code');
      }
    }

    setRequiresTwoFactor(false);
    // Re-authenticate the user after successful 2FA verification
    // In a real implementation, you'd have a backend endpoint to complete the login
  };

  const isTwoFactorEnabled = () => {
    return user ? twoFactorService.isTwoFactorEnabled(user) : false;
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
