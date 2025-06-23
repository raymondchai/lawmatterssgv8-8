/**
 * URL utilities for handling dynamic URL configuration
 * Prevents hardcoded URL issues across different environments
 */

/**
 * Get the current application URL based on environment
 * Falls back to window.location in browser environments
 */
export function getAppUrl(): string {
  // In development, use environment variable
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_APP_URL || 'http://localhost:8082';
  }

  // In production, use environment variable or current origin
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_APP_URL || window.location.origin;
  }

  // Fallback for SSR or other environments
  return import.meta.env.VITE_APP_URL || 'https://lawmatterssg.com';
}

/**
 * Get the API URL based on environment
 */
export function getApiUrl(): string {
  // In development, use environment variable
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:8082/api';
  }

  // In production, use environment variable or construct from app URL
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl;
  }

  // Construct API URL from app URL
  const appUrl = getAppUrl();
  return `${appUrl}/api`;
}

/**
 * Get redirect URLs for authentication
 * Returns an array of valid redirect URLs for the current environment
 */
export function getAuthRedirectUrls(): string[] {
  const appUrl = getAppUrl();
  const urls = [appUrl];

  // In development, add common localhost variations
  if (import.meta.env.DEV) {
    const port = new URL(appUrl).port || '8082';
    urls.push(
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `https://localhost:${port}`,
      `https://127.0.0.1:${port}`
    );
  }

  // Remove duplicates and return
  return [...new Set(urls)];
}

/**
 * Validate if a URL is allowed for authentication redirects
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const redirectUrls = getAuthRedirectUrls();
    const targetUrl = new URL(url);
    
    return redirectUrls.some(allowedUrl => {
      const allowed = new URL(allowedUrl);
      return allowed.origin === targetUrl.origin;
    });
  } catch {
    return false;
  }
}

/**
 * Get the current environment-appropriate site URL for Supabase
 */
export function getSupabaseSiteUrl(): string {
  return getAppUrl();
}

/**
 * Configuration object for URL-related settings
 */
export const urlConfig = {
  app: getAppUrl(),
  api: getApiUrl(),
  redirectUrls: getAuthRedirectUrls(),
  supabaseSite: getSupabaseSiteUrl(),
} as const;

/**
 * Debug function to log current URL configuration
 * Useful for troubleshooting URL-related issues
 */
export function debugUrlConfig(): void {
  if (import.meta.env.DEV) {
    console.group('🔗 URL Configuration Debug');
    console.log('Environment:', import.meta.env.MODE);
    console.log('App URL:', getAppUrl());
    console.log('API URL:', getApiUrl());
    console.log('Redirect URLs:', getAuthRedirectUrls());
    console.log('Supabase Site URL:', getSupabaseSiteUrl());
    console.log('Window Location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.groupEnd();
  }
}
