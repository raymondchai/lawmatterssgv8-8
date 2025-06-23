/**
 * Authentication configuration utilities
 * Handles dynamic URL configuration for Supabase auth
 */

import { getAppUrl, getAuthRedirectUrls, isValidRedirectUrl } from '@/lib/utils/url';

/**
 * Authentication configuration for Supabase
 */
export const authConfig = {
  /**
   * Get the site URL for authentication
   */
  getSiteUrl: () => getAppUrl(),

  /**
   * Get all valid redirect URLs for authentication
   */
  getRedirectUrls: () => getAuthRedirectUrls(),

  /**
   * Validate if a redirect URL is allowed
   */
  isValidRedirectUrl: (url: string) => isValidRedirectUrl(url),

  /**
   * Get authentication options for Supabase client
   */
  getAuthOptions: () => ({
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    redirectTo: getAppUrl(),
  }),

  /**
   * Get sign-in options with proper redirect URL
   */
  getSignInOptions: (redirectTo?: string) => {
    const baseUrl = getAppUrl();
    const finalRedirectTo = redirectTo && isValidRedirectUrl(redirectTo) 
      ? redirectTo 
      : `${baseUrl}/dashboard`;

    return {
      redirectTo: finalRedirectTo,
    };
  },

  /**
   * Get sign-up options with proper redirect URL
   */
  getSignUpOptions: (redirectTo?: string) => {
    const baseUrl = getAppUrl();
    const finalRedirectTo = redirectTo && isValidRedirectUrl(redirectTo) 
      ? redirectTo 
      : `${baseUrl}/dashboard`;

    return {
      redirectTo: finalRedirectTo,
    };
  },

  /**
   * Get password reset options with proper redirect URL
   */
  getPasswordResetOptions: (redirectTo?: string) => {
    const baseUrl = getAppUrl();
    const finalRedirectTo = redirectTo && isValidRedirectUrl(redirectTo) 
      ? redirectTo 
      : `${baseUrl}/auth/reset-password`;

    return {
      redirectTo: finalRedirectTo,
    };
  },

  /**
   * Get email verification options with proper redirect URL
   */
  getEmailVerificationOptions: (redirectTo?: string) => {
    const baseUrl = getAppUrl();
    const finalRedirectTo = redirectTo && isValidRedirectUrl(redirectTo) 
      ? redirectTo 
      : `${baseUrl}/auth/verify-email`;

    return {
      redirectTo: finalRedirectTo,
    };
  },
} as const;

/**
 * Helper function to construct auth URLs
 */
export function constructAuthUrl(path: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Common auth redirect paths
 */
export const AUTH_PATHS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
} as const;

/**
 * Get full auth URLs
 */
export const AUTH_URLS = {
  LOGIN: () => constructAuthUrl(AUTH_PATHS.LOGIN),
  REGISTER: () => constructAuthUrl(AUTH_PATHS.REGISTER),
  RESET_PASSWORD: () => constructAuthUrl(AUTH_PATHS.RESET_PASSWORD),
  VERIFY_EMAIL: () => constructAuthUrl(AUTH_PATHS.VERIFY_EMAIL),
  DASHBOARD: () => constructAuthUrl(AUTH_PATHS.DASHBOARD),
  PROFILE: () => constructAuthUrl(AUTH_PATHS.PROFILE),
} as const;
