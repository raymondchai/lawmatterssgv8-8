# Domain Migration Guide for LawMattersSG

This guide covers how to deploy on your existing domain first, then migrate to a new domain (like .com.sg) later without losing functionality.

## 🎯 Migration Strategy Overview

### Phase 1: Initial Deployment (Existing Domain)
- Deploy LawMattersSG on your current domain
- Test all features and functionality
- Work out any production issues
- Build user base and content

### Phase 2: New Domain Setup
- Register new domain (e.g., lawmatterssg.com.sg)
- Set up hosting and DNS
- Prepare migration plan

### Phase 3: Migration
- Deploy to new domain
- Set up redirects
- Update all references
- Monitor and verify

## 📊 What Can Be Migrated Seamlessly

### ✅ No Data Loss:
- **User accounts** (stored in Supabase)
- **Documents** (stored in Supabase Storage)
- **Database content** (all in Supabase)
- **Payment history** (Stripe data)
- **Analytics data** (PostHog/Sentry)

### ✅ Easy to Update:
- **Authentication URLs** (update in Supabase)
- **Payment webhooks** (update in Stripe)
- **Email templates** (update sender domain)
- **API endpoints** (environment variables)

### ✅ Automatic Migration:
- **SSL certificates** (auto-generated for new domain)
- **CDN caching** (clears automatically)
- **Search indexing** (with proper redirects)

## ⚠️ Potential Challenges & Solutions

### 1. Authentication Redirects
**Issue**: Supabase auth URLs hardcoded to old domain
**Solution**: 
```bash
# Update Supabase authentication settings
# Old: https://oldomain.com
# New: https://lawmatterssg.com.sg
```

### 2. Email Links
**Issue**: Password reset/verification emails point to old domain
**Solution**:
```bash
# Update email templates
# Set up email redirects
# Gradual transition period
```

### 3. External Service Webhooks
**Issue**: Stripe webhooks, API callbacks point to old domain
**Solution**:
```bash
# Update Stripe webhook URLs
# Update any third-party integrations
# Test all payment flows
```

### 4. SEO & Search Rankings
**Issue**: Search engines indexed old domain
**Solution**:
```bash
# 301 redirects from old to new domain
# Update Google Search Console
# Submit new sitemap
# Update social media links
```

### 5. Bookmarks & Shared Links
**Issue**: Users have bookmarked old domain
**Solution**:
```bash
# Permanent redirects (301)
# Notification banner during transition
# Email users about domain change
```

## 🔧 Step-by-Step Migration Process

### Phase 1: Deploy on Existing Domain

**1. Prepare Environment Variables**
```env
# .env.production (existing domain)
VITE_APP_URL=https://yourcurrentdomain.com
VITE_API_URL=https://yourcurrentdomain.com/api
VITE_ENVIRONMENT=production
```

**2. Update Supabase Settings**
```bash
# Supabase Dashboard → Authentication → URL Configuration
Site URL: https://yourcurrentdomain.com
Redirect URLs: https://yourcurrentdomain.com
```

**3. Deploy Application**
```bash
npm run deploy:hostinger
```

**4. Test All Features**
- [ ] User registration/login
- [ ] Document upload/download
- [ ] Payment processing
- [ ] Email notifications
- [ ] Real-time features

### Phase 2: Prepare New Domain

**1. Register New Domain**
```bash
# Register lawmatterssg.com.sg
# Set up DNS pointing to Hostinger
```

**2. Set Up Hosting**
```bash
# Add new domain to Hostinger account
# Configure SSL certificate
# Test domain accessibility
```

**3. Prepare Migration Environment**
```env
# .env.migration (new domain)
VITE_APP_URL=https://lawmatterssg.com.sg
VITE_API_URL=https://lawmatterssg.com.sg/api
VITE_ENVIRONMENT=production
```

### Phase 3: Execute Migration

**1. Deploy to New Domain**
```bash
# Build with new environment variables
npm run build
# Deploy to new domain
# Test functionality
```

**2. Update External Services**

**Supabase:**
```bash
# Update authentication URLs
Site URL: https://lawmatterssg.com.sg
Redirect URLs: https://lawmatterssg.com.sg
```

**Stripe:**
```bash
# Update webhook endpoints
# Old: https://oldomain.com/api/stripe-webhook
# New: https://lawmatterssg.com.sg/api/stripe-webhook
```

**Email Services:**
```bash
# Update sender domain
# From: noreply@oldomain.com
# To: noreply@lawmatterssg.com.sg
```

**3. Set Up Redirects on Old Domain**

Create `.htaccess` on old domain:
```apache
# Permanent redirect to new domain
RewriteEngine On
RewriteCond %{HTTP_HOST} ^oldomain\.com$ [OR]
RewriteCond %{HTTP_HOST} ^www\.oldomain\.com$
RewriteRule ^(.*)$ https://lawmatterssg.com.sg/$1 [R=301,L]
```

**4. Update DNS & External References**
```bash
# Update Google Search Console
# Update social media profiles
# Update business listings
# Update email signatures
# Notify users via email
```

## 📅 Migration Timeline

### Week 1: Preparation
- [ ] Register new domain
- [ ] Set up hosting for new domain
- [ ] Test new domain accessibility
- [ ] Prepare migration checklist

### Week 2: Deployment
- [ ] Deploy application to new domain
- [ ] Update external service configurations
- [ ] Set up redirects on old domain
- [ ] Test all functionality on new domain

### Week 3: Transition
- [ ] Monitor traffic and redirects
- [ ] Update external references
- [ ] Notify users of domain change
- [ ] Monitor for any issues

### Week 4: Cleanup
- [ ] Verify all redirects working
- [ ] Update remaining references
- [ ] Monitor SEO impact
- [ ] Plan old domain retention/cancellation

## 🚨 Migration Checklist

### Pre-Migration:
- [ ] New domain registered and accessible
- [ ] SSL certificate active on new domain
- [ ] Application deployed and tested on new domain
- [ ] All external services updated
- [ ] Backup of current configuration

### During Migration:
- [ ] Deploy to new domain
- [ ] Update Supabase authentication URLs
- [ ] Update Stripe webhook URLs
- [ ] Set up 301 redirects from old domain
- [ ] Test all critical functionality

### Post-Migration:
- [ ] Monitor error logs
- [ ] Check redirect functionality
- [ ] Verify email delivery
- [ ] Test payment processing
- [ ] Monitor user feedback
- [ ] Update Google Search Console
- [ ] Submit new sitemap

## 💡 Best Practices

### 1. Gradual Migration
```bash
# Option: Run both domains simultaneously
# Gradually redirect traffic
# Monitor for issues
```

### 2. User Communication
```bash
# Email notification to users
# Banner on old domain
# Social media announcements
```

### 3. Monitoring
```bash
# Set up monitoring for new domain
# Track redirect success rates
# Monitor error rates
# Check performance metrics
```

### 4. Rollback Plan
```bash
# Keep old domain active during transition
# Ability to quickly revert if issues
# Backup of old configuration
```

## 🔍 Testing Checklist

### Functionality Tests:
- [ ] User authentication (login/register)
- [ ] Password reset flow
- [ ] Document upload/download
- [ ] Payment processing
- [ ] Email notifications
- [ ] Real-time features
- [ ] Mobile responsiveness

### Integration Tests:
- [ ] Supabase connection
- [ ] Stripe payments
- [ ] Email delivery
- [ ] File storage
- [ ] Analytics tracking

### Performance Tests:
- [ ] Page load speeds
- [ ] API response times
- [ ] File upload/download speeds
- [ ] Mobile performance

## 📈 Expected Outcomes

### Immediate Benefits:
- ✅ Professional .com.sg domain
- ✅ Better local SEO
- ✅ Increased trust with Singapore users
- ✅ Professional email addresses

### Potential Temporary Issues:
- ⚠️ Brief SEO ranking fluctuation
- ⚠️ Some users may need to update bookmarks
- ⚠️ Possible email delivery delays during transition

### Long-term Benefits:
- ✅ Better brand recognition
- ✅ Improved local search rankings
- ✅ Professional business image
- ✅ Protected brand in Singapore market

## 🆘 Troubleshooting

### Common Issues:

**Redirects Not Working:**
- Check .htaccess syntax
- Verify DNS propagation
- Clear browser cache

**Authentication Issues:**
- Verify Supabase URL updates
- Check redirect URLs
- Test with incognito browser

**Email Problems:**
- Update sender domain
- Check SPF/DKIM records
- Test email delivery

**Payment Issues:**
- Verify Stripe webhook URLs
- Test payment flow
- Check webhook logs

## 📞 Support Resources

- Hostinger support for hosting issues
- Supabase documentation for auth updates
- Stripe documentation for webhook updates
- Domain registrar support for DNS issues
