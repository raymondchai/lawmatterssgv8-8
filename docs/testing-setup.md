# Testing Setup Guide

This guide provides instructions for setting up a clean testing environment for LawMattersSG.

## Clean Browser Environment Setup

### Option 1: Chrome Incognito/Private Mode
1. Open Chrome in Incognito mode (Ctrl+Shift+N)
2. Navigate to https://craftchatbot.com
3. This ensures no cached data or stored sessions

### Option 2: New Chrome Profile
1. Open Chrome
2. Click on your profile icon in the top right
3. Click "Add" to create a new profile
4. Name it "LawMattersSG Testing"
5. Use this profile exclusively for testing

### Option 3: Clear All Data
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" in the left sidebar
4. Check all boxes and click "Clear site data"
5. Alternatively, go to chrome://settings/clearBrowserData

## Test User Accounts

### Primary Test Account
- **Email**: test@lawmatterssg.com
- **Password**: TestPassword123!
- **Role**: Regular User
- **Subscription**: Free Tier

### Admin Test Account
- **Email**: admin@lawmatterssg.com  
- **Password**: AdminPassword123!
- **Role**: Super Admin
- **Subscription**: Enterprise

### Premium Test Account
- **Email**: premium@lawmatterssg.com
- **Password**: PremiumPassword123!
- **Role**: Premium User
- **Subscription**: Premium Tier

## Testing Checklist

### Authentication Flow Testing
- [ ] Registration with new email
- [ ] Email confirmation (if enabled)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Password reset flow
- [ ] Session persistence across page refreshes
- [ ] Logout functionality

### Document Upload Testing
- [ ] Upload small PDF (< 1MB)
- [ ] Upload large PDF (> 5MB)
- [ ] Upload unsupported file type
- [ ] Check processing status updates
- [ ] Verify OCR text extraction
- [ ] Test document deletion

### Chat Functionality Testing
- [ ] Start new chat session
- [ ] Send basic message
- [ ] Upload document and ask questions
- [ ] Check chat history persistence
- [ ] Test chat session management

### Template System Testing
- [ ] Browse public templates
- [ ] Preview template
- [ ] Customize template fields
- [ ] Generate document
- [ ] Download generated document
- [ ] Test premium template access

### Law Firm Directory Testing
- [ ] Browse law firms
- [ ] Filter by practice area
- [ ] Filter by location
- [ ] View firm profile
- [ ] Check ratings and reviews

## Debug Tools Access

### Debug Console
- Navigate to `/debug` on the application
- Only available in development mode
- Provides comprehensive system diagnostics

### Browser Console Debugging
1. Open DevTools (F12)
2. Go to Console tab
3. Run: `await window.debugAuth()` (if available)
4. Check for authentication errors

### Network Tab Monitoring
1. Open DevTools (F12)
2. Go to Network tab
3. Monitor API calls during testing
4. Look for failed requests (red entries)
5. Check response codes and error messages

## Common Issues and Solutions

### Authentication Issues
- **Problem**: Login fails silently
- **Solution**: Check browser console for errors, clear localStorage
- **Debug**: Use `/debug` page to diagnose

### Document Upload Issues
- **Problem**: Upload gets stuck at "Processing"
- **Solution**: Check file size and format, verify Supabase storage permissions
- **Debug**: Monitor network requests for upload failures

### Chat Not Working
- **Problem**: Messages don't send or receive responses
- **Solution**: Verify OpenAI API key configuration, check chat tables exist
- **Debug**: Check browser console for WebSocket or API errors

### Template Issues
- **Problem**: Templates don't load or generate
- **Solution**: Verify template data exists, check RLS policies
- **Debug**: Check database queries in network tab

## Environment Variables Verification

Ensure these environment variables are properly set:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://kvlaydeyqidlfpfutbmp.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]

# Application Configuration  
VITE_APP_URL=https://craftchatbot.com
VITE_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_DOCUMENT_ANALYSIS=true
VITE_ENABLE_TEMPLATE_GENERATION=true
VITE_ENABLE_LAW_FIRM_DIRECTORY=true
```

## Database Verification

### Check Required Tables
Run these queries in Supabase SQL Editor:

```sql
-- Verify all required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check template data
SELECT COUNT(*) as template_count FROM templates;
SELECT COUNT(*) as category_count FROM template_categories;

-- Check chat tables
SELECT COUNT(*) as chat_sessions FROM chat_sessions;
SELECT COUNT(*) as chat_messages FROM chat_messages;

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

## Performance Testing

### Load Testing Checklist
- [ ] Test with multiple concurrent users
- [ ] Upload multiple documents simultaneously
- [ ] Generate multiple templates at once
- [ ] Monitor response times
- [ ] Check for memory leaks in browser

### Mobile Testing
- [ ] Test on mobile browsers
- [ ] Check responsive design
- [ ] Verify touch interactions
- [ ] Test file upload on mobile

## Security Testing

### Authentication Security
- [ ] Test session timeout
- [ ] Verify JWT token expiration
- [ ] Check for XSS vulnerabilities
- [ ] Test CSRF protection

### Data Access Security
- [ ] Verify users can only access their own data
- [ ] Test RLS policies
- [ ] Check for data leakage between users
- [ ] Verify admin-only functions are protected

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser and version
4. Console error messages
5. Network request details
6. Screenshots if applicable

## Automated Testing

For automated testing, consider:
- Playwright for E2E testing
- Jest for unit testing
- Cypress for integration testing
- Postman for API testing
