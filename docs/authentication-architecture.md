# LawMattersSG Authentication Architecture

## Overview

LawMattersSG uses a **server-controlled authentication system** with HTTP-only cookies to ensure reliable sign-out functionality and prevent client-side session persistence issues.

## Architecture Principles

### 1. Server-Controlled Sessions
- All session validation happens server-side
- HTTP-only cookies store session tokens (not accessible to JavaScript)
- Client never stores authentication tokens in localStorage or sessionStorage
- Browser cannot "secretly remember" authentication state

### 2. No Client-Side Persistence
- Supabase client configured with `persistSession: false`
- Supabase client configured with `autoRefreshToken: false`
- No authentication data stored in browser storage
- Fresh page loads always start unauthenticated unless server validates session

### 3. Bulletproof Sign-Out
- Sign-out destroys server-side session
- HTTP-only cookie is cleared
- Client-side state is immediately cleared
- Page redirects to ensure clean state

## Implementation Details

### Supabase Client Configuration

```typescript
// src/lib/supabase.ts
export const supabase = createClient<Database>(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: false,        // 🚨 DISABLED: No localStorage/IndexedDB session storage
    detectSessionInUrl: false,    // 🚨 DISABLED: No URL-based session detection
    autoRefreshToken: false,      // 🚨 DISABLED: No automatic token refresh
    flowType: 'pkce',
    debug: import.meta.env.DEV
  }
});
```

### Session Manager Service

The `SessionManager` class (`src/lib/services/sessionManager.ts`) handles:
- Server-side authentication via Edge Functions
- HTTP-only cookie management
- Memory-only session state storage
- Clean sign-out process

### Edge Function

The `session-manager` Edge Function (`supabase/functions/session-manager/index.ts`) provides:
- `create` - Authenticate user and create server-side session
- `validate` - Validate existing session via HTTP-only cookie
- `destroy` - Destroy server-side session and clear cookie

### Database Schema

```sql
-- user_sessions table stores server-side session data
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT true
);
```

## Authentication Flow

### Sign-In Process
1. User submits credentials to client
2. Client calls `sessionManager.signIn(email, password)`
3. Session manager calls Edge Function with credentials
4. Edge Function authenticates with Supabase
5. Edge Function creates session record in database
6. Edge Function returns user data and sets HTTP-only cookie
7. Client updates UI state with user data (stored in memory only)

### Session Validation
1. On page load, client calls `sessionManager.validateSession()`
2. Session manager calls Edge Function (cookie sent automatically)
3. Edge Function validates session token from cookie
4. Edge Function returns user data if session is valid
5. Client updates UI state with user data

### Sign-Out Process
1. User clicks sign-out
2. Client calls `sessionManager.signOut()`
3. Session manager calls Edge Function
4. Edge Function deletes session from database
5. Edge Function clears HTTP-only cookie
6. Client clears memory state and redirects

## Security Benefits

### Prevents Session Hijacking
- HTTP-only cookies cannot be accessed by malicious JavaScript
- Session tokens are not exposed to client-side code
- XSS attacks cannot steal session tokens

### Eliminates Persistent Sessions
- No client-side storage means no "sticky" sessions
- Browser cannot restore sessions after sign-out
- Fresh page loads always validate with server

### Server-Side Control
- All session validation happens server-side
- Sessions can be revoked immediately
- No client-side token refresh vulnerabilities

## Testing

### Automated Testing
Run the authentication test suite:
```bash
npm run test:e2e:auth:production
```

### Manual Testing Checklist
- [ ] Fresh page load shows signed-out state
- [ ] Sign-in works correctly
- [ ] Page reload maintains signed-in state
- [ ] Sign-out immediately shows signed-out state
- [ ] Fresh page load after sign-out shows signed-out state
- [ ] No auth data in localStorage/sessionStorage after sign-out
- [ ] Multiple tabs handle sign-out correctly

## Code Review Checklist

When reviewing authentication-related changes:

### ❌ Never Allow
- [ ] Setting `persistSession: true` in Supabase client
- [ ] Setting `autoRefreshToken: true` in Supabase client
- [ ] Storing auth tokens in localStorage or sessionStorage
- [ ] Client-side session restoration logic
- [ ] Bypassing the SessionManager service

### ✅ Always Verify
- [ ] All auth operations go through SessionManager
- [ ] No direct Supabase auth calls in components
- [ ] Session validation happens server-side
- [ ] Sign-out clears all client-side state
- [ ] HTTP-only cookies are used for session storage

### 🧪 Always Test
- [ ] Fresh page load behavior
- [ ] Sign-out functionality
- [ ] Multiple tab behavior
- [ ] Client-side storage is clean after sign-out

## Maintenance Guidelines

### Regular Tasks
1. **Monitor Session Table**: Clean up expired sessions regularly
2. **Review Auth Logs**: Check for authentication errors or attacks
3. **Update Dependencies**: Keep Supabase client updated
4. **Run Tests**: Execute auth test suite on every deployment

### Emergency Procedures
If authentication issues occur:
1. Check Edge Function logs in Supabase dashboard
2. Verify database connectivity
3. Check session table for corruption
4. Review recent code changes to auth system
5. Use emergency logout function if needed

### Performance Monitoring
- Monitor Edge Function response times
- Track session validation success rates
- Monitor database query performance on user_sessions table
- Alert on high authentication error rates

## Troubleshooting

### Common Issues

**Users can't sign out**
- Check Edge Function logs
- Verify session-manager function is deployed
- Check database connectivity
- Verify HTTP-only cookie settings

**Users get signed out unexpectedly**
- Check session expiration times
- Verify server clock synchronization
- Check for session cleanup jobs
- Review CORS settings

**Sign-in doesn't work**
- Verify Supabase credentials
- Check Edge Function deployment
- Verify database schema
- Check network connectivity

### Debug Commands
```bash
# Test Edge Function directly
curl -X POST https://kvlaydeyqidlfpfutbmp.supabase.co/functions/v1/session-manager \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate"}'

# Check session table
SELECT * FROM user_sessions WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 10;

# Clean up expired sessions
SELECT cleanup_expired_sessions();
```

## Migration Notes

This architecture replaces the previous client-side session management. Key changes:
- Removed dependency on Supabase's built-in session persistence
- Added server-side session validation
- Implemented HTTP-only cookie authentication
- Added comprehensive testing suite

The migration ensures that users always start signed-out on fresh page loads and that sign-out functionality is 100% reliable.

## Deployment Checklist

### Pre-Deployment
- [ ] Database migration applied (user_sessions table created)
- [ ] Edge Function deployed (`session-manager`)
- [ ] Environment variables configured
- [ ] Tests passing (`npm run test:e2e:auth:production`)

### Post-Deployment
- [ ] Verify fresh page loads show signed-out state
- [ ] Test sign-in/sign-out flow manually
- [ ] Check Edge Function logs for errors
- [ ] Monitor authentication success rates
- [ ] Verify no client-side auth data persists

### Rollback Plan
If issues occur, rollback steps:
1. Revert Supabase client configuration
2. Restore previous AuthContext implementation
3. Disable session-manager Edge Function
4. Clear user_sessions table if needed

## Support

For authentication-related issues:
1. Check this documentation first
2. Review Edge Function logs in Supabase dashboard
3. Run automated test suite
4. Check database session table
5. Contact development team with specific error details
