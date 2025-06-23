#!/usr/bin/env node

/**
 * Domain migration script for LawMattersSG
 * Helps migrate from one domain to another with minimal downtime
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

function createMigrationEnvironment(oldDomain, newDomain) {
  log('Creating migration environment files...', 'info');
  
  const migrationEnv = `# Migration Environment Variables
# From: ${oldDomain}
# To: ${newDomain}

# New Domain Configuration
VITE_APP_NAME=LawMattersSG
VITE_APP_URL=https://${newDomain}
VITE_API_URL=https://${newDomain}/api
VITE_ENVIRONMENT=production

# Supabase Configuration (Update these in Supabase Dashboard)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key

# External Services (Update webhook URLs)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Configuration (Update sender domain)
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@${newDomain}
RESEND_API_KEY=re_your-resend-key
RESEND_FROM_EMAIL=noreply@${newDomain}

# Analytics & Monitoring
VITE_POSTHOG_KEY=your-posthog-key
SENTRY_DSN=your-sentry-dsn

# Feature Flags
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_DOCUMENT_ANALYSIS=true
VITE_ENABLE_TEMPLATE_GENERATION=true
VITE_ENABLE_LAW_FIRM_DIRECTORY=true`;

  try {
    fs.writeFileSync('.env.migration', migrationEnv);
    log('Migration environment file created: .env.migration', 'success');
    return true;
  } catch (error) {
    log(`Failed to create migration environment: ${error.message}`, 'error');
    return false;
  }
}

function createRedirectHtaccess(oldDomain, newDomain) {
  log('Creating redirect .htaccess file...', 'info');
  
  const htaccessContent = `# Domain Migration Redirects
# From: ${oldDomain}
# To: ${newDomain}

RewriteEngine On

# Permanent redirect to new domain
RewriteCond %{HTTP_HOST} ^${oldDomain.replace(/\./g, '\\.')}$ [OR]
RewriteCond %{HTTP_HOST} ^www\\.${oldDomain.replace(/\./g, '\\.')}$
RewriteRule ^(.*)$ https://${newDomain}/$1 [R=301,L]

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>`;

  try {
    fs.writeFileSync('.htaccess.redirect', htaccessContent);
    log('Redirect .htaccess file created: .htaccess.redirect', 'success');
    log(`Upload this to your old domain (${oldDomain}) public_html folder`, 'info');
    return true;
  } catch (error) {
    log(`Failed to create redirect file: ${error.message}`, 'error');
    return false;
  }
}

function generateMigrationChecklist(oldDomain, newDomain) {
  log('Generating migration checklist...', 'info');
  
  const checklist = `# Domain Migration Checklist
# From: ${oldDomain} → ${newDomain}

## Pre-Migration Setup
- [ ] New domain (${newDomain}) registered and accessible
- [ ] SSL certificate active on new domain
- [ ] Hosting configured for new domain
- [ ] DNS propagation complete

## Application Deployment
- [ ] Build application with new domain environment variables
- [ ] Deploy to new domain hosting
- [ ] Test basic functionality on new domain
- [ ] Verify SSL certificate working

## External Service Updates

### Supabase Authentication
- [ ] Update Site URL: https://${newDomain}
- [ ] Update Redirect URLs: https://${newDomain}
- [ ] Test authentication flow

### Stripe Configuration
- [ ] Update webhook endpoint: https://${newDomain}/api/stripe-webhook
- [ ] Test payment processing
- [ ] Verify webhook delivery

### Email Services
- [ ] Update sender domain to: noreply@${newDomain}
- [ ] Update email templates with new domain
- [ ] Test email delivery

### Analytics & Monitoring
- [ ] Update PostHog domain settings
- [ ] Update Sentry project settings
- [ ] Verify tracking working

## Domain Redirect Setup
- [ ] Upload .htaccess.redirect to old domain (${oldDomain})
- [ ] Test redirects from old to new domain
- [ ] Verify all pages redirect correctly

## SEO & External References
- [ ] Update Google Search Console
- [ ] Submit new sitemap for ${newDomain}
- [ ] Update social media profiles
- [ ] Update business listings
- [ ] Update email signatures

## User Communication
- [ ] Send email notification to users
- [ ] Post announcement on social media
- [ ] Add banner to old domain (if applicable)

## Post-Migration Monitoring
- [ ] Monitor error logs on new domain
- [ ] Check redirect success rates
- [ ] Verify all functionality working
- [ ] Monitor user feedback
- [ ] Check performance metrics

## Cleanup (After 30 days)
- [ ] Verify all traffic redirected successfully
- [ ] Consider old domain retention/cancellation
- [ ] Update any remaining references
- [ ] Archive old domain configuration

## Emergency Rollback Plan
- [ ] Keep old domain configuration backed up
- [ ] Document rollback procedure
- [ ] Monitor for critical issues first 48 hours`;

  try {
    fs.writeFileSync('MIGRATION_CHECKLIST.md', checklist);
    log('Migration checklist created: MIGRATION_CHECKLIST.md', 'success');
    return true;
  } catch (error) {
    log(`Failed to create checklist: ${error.message}`, 'error');
    return false;
  }
}

function buildForNewDomain() {
  log('Building application for new domain...', 'info');
  
  try {
    // Copy migration environment to production
    if (fs.existsSync('.env.migration')) {
      fs.copyFileSync('.env.migration', '.env.production');
      log('Migration environment copied to .env.production', 'success');
    }
    
    // Build the project
    execSync('npm run build', { stdio: 'inherit' });
    log('Build completed successfully', 'success');
    
    return true;
  } catch (error) {
    log('Build failed', 'error');
    return false;
  }
}

function showMigrationInstructions(oldDomain, newDomain) {
  console.log('\n🚀 Domain Migration Instructions\n');
  
  console.log(`📋 Migrating from: ${oldDomain}`);
  console.log(`📋 Migrating to: ${newDomain}\n`);
  
  console.log('📁 Files created:');
  console.log('  - .env.migration (new domain environment)');
  console.log('  - .htaccess.redirect (redirect configuration)');
  console.log('  - MIGRATION_CHECKLIST.md (step-by-step checklist)\n');
  
  console.log('🔄 Next steps:');
  console.log('1. Review and update .env.migration with your actual values');
  console.log('2. Deploy application to new domain using migration environment');
  console.log('3. Update external services (Supabase, Stripe, email)');
  console.log('4. Upload .htaccess.redirect to old domain');
  console.log('5. Follow MIGRATION_CHECKLIST.md for complete process\n');
  
  console.log('⚠️  Important reminders:');
  console.log('- Test thoroughly on new domain before setting up redirects');
  console.log('- Update Supabase authentication URLs');
  console.log('- Update Stripe webhook endpoints');
  console.log('- Communicate domain change to users');
  console.log('- Monitor for issues during first 48 hours\n');
  
  log('Migration preparation complete!', 'success');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('🔄 LawMattersSG Domain Migration Script\n');
    console.log('Usage: node scripts/migrate-domain.cjs <old-domain> <new-domain>');
    console.log('Example: node scripts/migrate-domain.cjs oldsite.com lawmatterssg.com.sg\n');
    console.log('Options:');
    console.log('  --build-only    Only build for new domain');
    console.log('  --prepare-only  Only create migration files');
    process.exit(1);
  }
  
  const oldDomain = args[0];
  const newDomain = args[1];
  const buildOnly = args.includes('--build-only');
  const prepareOnly = args.includes('--prepare-only');
  
  console.log('🔄 LawMattersSG Domain Migration Script\n');
  log(`Preparing migration from ${oldDomain} to ${newDomain}`, 'info');
  
  if (buildOnly) {
    if (!buildForNewDomain()) {
      process.exit(1);
    }
    log('Build for new domain complete!', 'success');
    return;
  }
  
  // Create migration files
  if (!createMigrationEnvironment(oldDomain, newDomain)) {
    process.exit(1);
  }
  
  if (!createRedirectHtaccess(oldDomain, newDomain)) {
    process.exit(1);
  }
  
  if (!generateMigrationChecklist(oldDomain, newDomain)) {
    process.exit(1);
  }
  
  if (prepareOnly) {
    log('Migration files prepared!', 'success');
    return;
  }
  
  // Build for new domain
  if (!buildForNewDomain()) {
    process.exit(1);
  }
  
  // Show instructions
  showMigrationInstructions(oldDomain, newDomain);
}

if (require.main === module) {
  main();
}

module.exports = { createMigrationEnvironment, createRedirectHtaccess, buildForNewDomain };
