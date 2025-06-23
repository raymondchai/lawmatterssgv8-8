# Production Deployment Guide

This guide will help you deploy LawMattersSG to a production environment to resolve localhost hiccups and enable full functionality.

## 🎯 Why Deploy to Production?

### Current Localhost Limitations:
- **WebSocket/Realtime**: Mock services instead of real Supabase Realtime
- **HTTPS Required**: Many APIs require secure contexts
- **CORS Issues**: Browser security restrictions
- **Performance**: Development builds are unoptimized
- **Service Workers**: Don't work properly on localhost
- **External Integrations**: Stripe, OAuth, email services expect real domains

### Production Benefits:
- **Real-time Features**: Full Supabase Realtime functionality
- **Optimized Performance**: Minified builds, CDN delivery
- **Secure Context**: HTTPS enables all modern web APIs
- **External Services**: Seamless integration with third-party services

## 🚀 Recommended Hosting Platforms

### 1. Vercel (Recommended)
**Best for**: React/Vite apps with automatic deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# ... add all other env vars
```

### 2. Netlify
**Best for**: Static sites with form handling

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### 3. Railway
**Best for**: Full-stack apps with databases

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway link
railway up
```

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
Create production environment variables:

```env
# Production Environment Variables
VITE_APP_NAME=LawMattersSG
VITE_APP_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
VITE_ENVIRONMENT=production

# Supabase (Production Project)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key

# External Services
STRIPE_PUBLISHABLE_KEY=pk_live_your-live-key
STRIPE_SECRET_KEY=sk_live_your-live-key
OPENAI_API_KEY=your-openai-key

# Email Service
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Analytics
VITE_POSTHOG_KEY=your-posthog-key
SENTRY_DSN=your-sentry-dsn
```

### 2. Supabase Configuration
Update Supabase settings for production:

1. **Authentication URLs**:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com`

2. **CORS Settings**:
   - Add your domain to allowed origins

3. **RLS Policies**:
   - Ensure all tables have proper Row Level Security

### 3. Build Optimization
```bash
# Create optimized production build
npm run build

# Test the build locally
npm run preview
```

## 🔧 Platform-Specific Setup

### Vercel Setup

1. **Create `vercel.json`**:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

2. **Deploy Commands**:
```bash
# Connect to Vercel
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... add all environment variables

# Deploy
vercel --prod
```

### Netlify Setup

1. **Create `netlify.toml`**:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

2. **Deploy**:
```bash
npm run build
netlify deploy --prod --dir=dist
```

## 🔒 Security Configuration

### 1. Content Security Policy
Add to your hosting platform:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com;
```

### 2. Environment Variables Security
- Never commit production keys to git
- Use platform-specific environment variable management
- Rotate keys regularly

## 📊 Performance Optimization

### 1. Build Configuration
The app is already optimized with:
- Code splitting for heavy dependencies
- Lazy loading for components
- Optimized chunk sizes
- Tree shaking

### 2. CDN Configuration
Most hosting platforms provide automatic CDN:
- Static assets cached globally
- Automatic compression
- HTTP/2 support

## 🧪 Testing Production Build

Before deploying:

```bash
# Build for production
npm run build

# Test locally
npm run preview

# Run tests
npm run test:all

# Check for build issues
npm run lint
```

## 🚨 Common Issues & Solutions

### 1. Environment Variables Not Loading
- Ensure all `VITE_` prefixed variables are set
- Check platform-specific environment variable syntax
- Restart deployment after adding variables

### 2. Supabase Connection Issues
- Verify production Supabase project settings
- Check CORS configuration
- Ensure RLS policies are correct

### 3. Routing Issues
- Configure SPA redirects properly
- Ensure all routes redirect to `index.html`

## 📈 Post-Deployment

### 1. Monitor Performance
- Set up Sentry for error tracking
- Configure PostHog for analytics
- Monitor Core Web Vitals

### 2. Test All Features
- Authentication flow
- File uploads
- Payment processing
- Real-time features
- Email notifications

### 3. Set Up CI/CD
- Automatic deployments on git push
- Environment-specific deployments
- Automated testing pipeline

## 🎯 Expected Improvements

After production deployment, you should see:

- **50-80% faster load times** (optimized builds)
- **Real-time features working** (WebSocket connections)
- **Smoother authentication** (proper HTTPS redirects)
- **Better file handling** (secure upload/download)
- **Improved payment flow** (Stripe works better with HTTPS)
- **Enhanced security** (HTTPS, CSP headers)
- **Better SEO** (proper meta tags, sitemap)

## 🆘 Support

If you encounter issues during deployment:
1. Check the platform-specific documentation
2. Verify all environment variables are set
3. Test the production build locally first
4. Check browser console for errors
5. Review hosting platform logs
