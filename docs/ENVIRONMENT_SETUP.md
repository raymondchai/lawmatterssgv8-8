# Environment Setup Guide

This guide explains how to set up environment variables for different deployment environments.

## Quick Start

1. Copy the appropriate environment file for your setup:
   ```bash
   # For development
   cp .env.development .env.local
   
   # For staging
   cp .env.staging .env.local
   
   # For production
   cp .env.production .env.local
   ```

2. Update the values in `.env.local` with your actual API keys and configuration.

## Environment Files

- `.env.example` - Template with all available variables
- `.env.development` - Development environment defaults
- `.env.staging` - Staging environment configuration
- `.env.production` - Production environment configuration
- `.env.local` - Your local overrides (not committed to git)

## Required Variables

### Supabase (Required)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### OpenAI (Required for AI features)
```env
OPENAI_API_KEY=sk-your-openai-api-key
```

## Optional Variables

### Stripe (For payments)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
```

### Email Service
```env
# SendGrid
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# OR Resend
RESEND_API_KEY=re_your-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Analytics & Monitoring
```env
VITE_POSTHOG_KEY=phc_your-posthog-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Feature Flags

Control which features are enabled:

```env
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_DOCUMENT_ANALYSIS=true
VITE_ENABLE_TEMPLATE_GENERATION=false
VITE_ENABLE_LAW_FIRM_DIRECTORY=false
```

## File Upload Configuration

```env
VITE_MAX_FILE_SIZE_MB=10
VITE_MAX_FILE_SIZE_PREMIUM_MB=50
VITE_ALLOWED_FILE_TYPES=pdf,doc,docx,txt
```

## Rate Limiting

```env
VITE_RATE_LIMIT_REQUESTS_PER_MINUTE=60
VITE_RATE_LIMIT_REQUESTS_PER_HOUR=1000
```

## Debug Configuration

```env
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

## Environment-Specific Notes

### Development
- Uses relaxed rate limits
- All features enabled for testing
- Debug mode enabled
- Uses test API keys

### Staging
- Production-like configuration
- Used for testing before production deployment
- Some features may be disabled for testing

### Production
- Strict rate limits
- Conservative feature rollout
- Error-level logging only
- Live API keys

## Security Best Practices

1. Never commit `.env.local` or any file containing real API keys
2. Use different API keys for each environment
3. Rotate API keys regularly
4. Use the principle of least privilege for service accounts
5. Monitor API key usage for unusual activity

## Troubleshooting

### Missing Environment Variables
If you see errors about missing environment variables:
1. Check that your `.env.local` file exists
2. Verify all required variables are set
3. Restart your development server after changes

### Invalid Configuration
The app validates configuration on startup. Check the console for specific error messages about invalid or missing configuration.

### API Key Issues
- Ensure API keys are valid and not expired
- Check that keys have the necessary permissions
- Verify you're using the correct environment keys (test vs live)
