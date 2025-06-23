#!/usr/bin/env node

/**
 * Hostinger deployment script for LawMattersSG
 * Prepares build and creates deployment package
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

function checkPrerequisites() {
  log('Checking prerequisites for Hostinger deployment...', 'info');
  
  const checks = [
    {
      name: 'package.json exists',
      check: () => fs.existsSync('package.json'),
      fix: 'Ensure you are in the project root directory'
    },
    {
      name: 'node_modules exists',
      check: () => fs.existsSync('node_modules'),
      fix: 'Run: npm install'
    },
    {
      name: 'Production environment file',
      check: () => fs.existsSync('.env.production') || fs.existsSync('.env'),
      fix: 'Create .env.production with your production environment variables'
    }
  ];

  let allPassed = true;
  
  checks.forEach(check => {
    if (check.check()) {
      log(`${check.name}`, 'success');
    } else {
      log(`${check.name} - ${check.fix}`, 'error');
      allPassed = false;
    }
  });

  return allPassed;
}

function createHtaccess() {
  log('Creating .htaccess file...', 'info');
  
  const htaccessContent = `# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle React Router (SPA)
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>`;

  try {
    // Create .htaccess in public directory if it exists, otherwise in root
    const publicDir = fs.existsSync('public') ? 'public' : '.';
    fs.writeFileSync(path.join(publicDir, '.htaccess'), htaccessContent);
    log('.htaccess file created successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to create .htaccess: ${error.message}`, 'error');
    return false;
  }
}

function buildProject() {
  log('Building project for production...', 'info');
  
  try {
    // Set NODE_ENV for production build
    process.env.NODE_ENV = 'production';
    
    execSync('npm run build', { stdio: 'inherit' });
    log('Build completed successfully', 'success');
    
    // Add .htaccess to dist folder
    const htaccessSource = fs.existsSync('public/.htaccess') ? 'public/.htaccess' : '.htaccess';
    if (fs.existsSync(htaccessSource)) {
      fs.copyFileSync(htaccessSource, 'dist/.htaccess');
      log('.htaccess copied to dist folder', 'success');
    }
    
    return true;
  } catch (error) {
    log('Build failed', 'error');
    return false;
  }
}

function createDeploymentPackage() {
  log('Creating deployment package...', 'info');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const packageName = `lawmatters-${timestamp}.zip`;
  
  try {
    // Check if zip command is available
    try {
      execSync('zip --version', { stdio: 'pipe' });
    } catch {
      log('zip command not found. Please install zip utility or manually compress the dist folder', 'warning');
      return false;
    }
    
    // Create zip package
    execSync(`cd dist && zip -r ../${packageName} .`, { stdio: 'inherit' });
    
    log(`Deployment package created: ${packageName}`, 'success');
    
    // Show file size
    const stats = fs.statSync(packageName);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    log(`Package size: ${fileSizeMB} MB`, 'info');
    
    return packageName;
  } catch (error) {
    log(`Failed to create deployment package: ${error.message}`, 'error');
    return false;
  }
}

function showDeploymentInstructions(packageName) {
  log('\n🚀 Deployment Instructions for Hostinger:', 'info');
  console.log('\n1. Login to your Hostinger hPanel');
  console.log('2. Go to File Manager');
  console.log('3. Navigate to public_html directory');
  console.log('4. Delete existing files (if any)');
  console.log(`5. Upload ${packageName}`);
  console.log('6. Extract the zip file');
  console.log('7. Move all extracted files to public_html root');
  console.log('8. Delete the zip file');
  console.log('\n📋 Post-deployment checklist:');
  console.log('- Test your website: https://yourdomain.com');
  console.log('- Verify SSL certificate is working');
  console.log('- Test all authentication flows');
  console.log('- Check file uploads and downloads');
  console.log('- Verify payment processing');
  console.log('- Test from different devices/browsers');
  
  log('\n✅ Deployment package ready!', 'success');
}

function generateEnvTemplate() {
  log('Generating production environment template...', 'info');

  const envTemplate = `# Production Environment Variables for Hostinger
# Copy these values to your build environment

VITE_APP_NAME=LawMattersSG
VITE_APP_URL=https://lawmatterssg.com.sg
VITE_API_URL=https://lawmatterssg.com.sg/api
VITE_ENVIRONMENT=production

# Supabase Production
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# External Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
VITE_POSTHOG_KEY=your-posthog-key

# Email Configuration (use .com.sg domain)
SENDGRID_FROM_EMAIL=noreply@lawmatterssg.com.sg
RESEND_FROM_EMAIL=noreply@lawmatterssg.com.sg

# Feature Flags
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_DOCUMENT_ANALYSIS=true
VITE_ENABLE_TEMPLATE_GENERATION=true
VITE_ENABLE_LAW_FIRM_DIRECTORY=true`;

  try {
    fs.writeFileSync('.env.hostinger.example', envTemplate);
    log('Environment template created: .env.hostinger.example', 'success');
  } catch (error) {
    log(`Failed to create environment template: ${error.message}`, 'warning');
  }
}

function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const packageOnly = args.includes('--package-only');

  console.log('🏢 LawMattersSG Hostinger Deployment Script\n');

  // Step 1: Check prerequisites
  if (!checkPrerequisites()) {
    log('Prerequisites check failed', 'error');
    process.exit(1);
  }

  // Step 2: Generate environment template
  generateEnvTemplate();

  // Step 3: Create .htaccess file
  if (!createHtaccess()) {
    log('Failed to create .htaccess file', 'warning');
  }

  // Step 4: Build project (unless skipped)
  if (!skipBuild && !buildProject()) {
    log('Build failed', 'error');
    process.exit(1);
  }

  // Step 5: Create deployment package
  if (!packageOnly) {
    const packageName = createDeploymentPackage();
    if (packageName) {
      showDeploymentInstructions(packageName);
    } else {
      log('Failed to create deployment package', 'error');
      log('You can manually compress the dist folder and upload it to Hostinger', 'info');
    }
  }

  log('\n🎉 Hostinger deployment preparation complete!', 'success');
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, buildProject, createDeploymentPackage };
