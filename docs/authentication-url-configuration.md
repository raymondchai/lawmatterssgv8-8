# Authentication URL Configuration Guide

This document explains how to properly configure URLs for Supabase authentication to prevent common authentication issues.

## Problem Overview

Authentication failures often occur due to URL mismatches between:
- Supabase Dashboard configuration
- Local development server settings
- Environment variables
- Application configuration

## Configuration Layers

### 1. Supabase Dashboard Configuration

**Location**: Supabase Dashboard → Authentication → URL Configuration

**Required Settings**:
- **Site URL**: `http://localhost:8082` (for development)
- **Redirect URLs**: 
  - `http://localhost:8082`
  - `http://127.0.0.1:8082`

### 2. Local Supabase Configuration

**File**: `supabase/config.toml`

```toml
[auth]
enabled = true
site_url = "http://localhost:8082"
additional_redirect_urls = ["http://localhost:8082", "http://127.0.0.1:8082"]
```

### 3. Environment Variables

**File**: `.env`

```env
VITE_APP_URL=http://localhost:8082
VITE_API_URL=http://localhost:8082/api
```

### 4. Vite Configuration

**File**: `vite.config.ts`

```typescript
export default defineConfig({
  server: {
    host: "localhost",
    port: 8082,
  },
  // ... other config
});
```

## Dynamic URL Configuration

The application now includes dynamic URL utilities to prevent hardcoded URL issues:

### URL Utilities (`src/lib/utils/url.ts`)

- `getAppUrl()`: Returns the current application URL
- `getApiUrl()`: Returns the API URL
- `getAuthRedirectUrls()`: Returns valid redirect URLs
- `isValidRedirectUrl(url)`: Validates redirect URLs

### Auth Configuration (`src/lib/auth/config.ts`)

- `authConfig.getSiteUrl()`: Dynamic site URL
- `authConfig.getSignInOptions()`: Sign-in with proper redirects
- `authConfig.getSignUpOptions()`: Sign-up with proper redirects
- `authConfig.getPasswordResetOptions()`: Password reset with proper redirects

## Troubleshooting

### Common Issues

1. **Authentication redirects fail**
   - Check Site URL in Supabase Dashboard
   - Verify redirect URLs are whitelisted

2. **Email verification links broken**
   - Ensure Site URL matches your development server
   - Check email template URLs

3. **OAuth providers reject callbacks**
   - Verify redirect URLs in OAuth provider settings
   - Ensure URLs match exactly (no trailing slashes)

### Debug Tools

Use the debug function to check current configuration:

```typescript
import { debugUrlConfig } from '@/lib/utils/url';

// In development console
debugUrlConfig();
```

### Verification Steps

1. **Check Supabase Dashboard**:
   - Site URL: `http://localhost:8082`
   - Redirect URLs include your development URL

2. **Verify Local Config**:
   ```bash
   # Check supabase/config.toml
   grep -A 5 "\[auth\]" supabase/config.toml
   ```

3. **Test Environment Variables**:
   ```bash
   # Check .env file
   grep "VITE_APP_URL" .env
   ```

4. **Confirm Server Port**:
   ```bash
   # Check vite.config.ts
   grep -A 5 "server:" vite.config.ts
   ```

## Production Configuration

For production deployment:

1. **Update Supabase Dashboard**:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com`

2. **Environment Variables**:
   ```env
   VITE_APP_URL=https://yourdomain.com
   VITE_API_URL=https://yourdomain.com/api
   VITE_ENVIRONMENT=production
   ```

3. **OAuth Providers**:
   - Update callback URLs to production domain
   - Verify SSL certificates are valid

## Best Practices

1. **Use Dynamic URLs**: Always use the URL utilities instead of hardcoded URLs
2. **Environment-Specific Config**: Use different configurations for dev/staging/prod
3. **Consistent Ports**: Use the same port across all configuration files
4. **URL Validation**: Validate redirect URLs before using them
5. **Documentation**: Keep this document updated when changing URLs

## Migration Checklist

When changing development URLs:

- [ ] Update Supabase Dashboard Site URL
- [ ] Update Supabase Dashboard Redirect URLs
- [ ] Update `supabase/config.toml`
- [ ] Update `.env` file
- [ ] Update `vite.config.ts` if needed
- [ ] Test authentication flow
- [ ] Test email verification
- [ ] Test password reset
- [ ] Update OAuth provider settings if applicable

## Support

If you encounter authentication issues:

1. Run `debugUrlConfig()` in the browser console
2. Check browser network tab for failed requests
3. Verify all URLs are consistent across configurations
4. Test with a fresh browser session (clear cookies/localStorage)
