#!/usr/bin/env node

/**
 * Deployment script for LawMattersSG on craftchatbot.com
 * Prepares build and creates deployment package for existing domain
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
  log('Checking prerequisites for craftchatbot.com deployment...', 'info');
  
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
      name: 'craftchatbot.com environment file',
      check: () => fs.existsSync('.env.craftchatbot'),
      fix: 'Environment file .env.craftchatbot should exist'
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

function prepareEnvironment() {
  log('Preparing environment for craftchatbot.com...', 'info');
  
  try {
    // Copy craftchatbot environment to production
    fs.copyFileSync('.env.craftchatbot', '.env.production');
    log('Environment configured for craftchatbot.com', 'success');
    return true;
  } catch (error) {
    log(`Failed to prepare environment: ${error.message}`, 'error');
    return false;
  }
}

function createHtaccess() {
  log('Creating .htaccess file for craftchatbot.com...', 'info');
  
  const htaccessContent = `# LawMattersSG on craftchatbot.com
# SPA routing and security configuration

# Enable HTTPS redirect
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
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
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
    AddOutputFilterByType DEFLATE application/json
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
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Prevent access to sensitive files
<Files ".env*">
    Order allow,deny
    Deny from all
</Files>

<Files "*.config.*">
    Order allow,deny
    Deny from all
</Files>`;

  try {
    fs.writeFileSync('.htaccess.craftchatbot', htaccessContent);
    log('.htaccess file created: .htaccess.craftchatbot', 'success');
    return true;
  } catch (error) {
    log(`Failed to create .htaccess: ${error.message}`, 'error');
    return false;
  }
}

function buildProject() {
  log('Building LawMattersSG for craftchatbot.com...', 'info');
  
  try {
    // Set NODE_ENV for production build
    process.env.NODE_ENV = 'production';
    
    execSync('npm run build', { stdio: 'inherit' });
    log('Build completed successfully', 'success');
    
    // Copy .htaccess to dist folder
    if (fs.existsSync('.htaccess.craftchatbot')) {
      fs.copyFileSync('.htaccess.craftchatbot', 'dist/.htaccess');
      log('.htaccess copied to dist folder', 'success');
    }
    
    return true;
  } catch (error) {
    log('Build failed', 'error');
    return false;
  }
}

function createDeploymentPackage() {
  log('Creating deployment package for craftchatbot.com...', 'info');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const packageName = `lawmatters-craftchatbot-${timestamp}.zip`;
  
  try {
    // Check if zip command is available
    try {
      execSync('zip --version', { stdio: 'pipe' });
    } catch {
      log('zip command not found. Please manually compress the dist folder', 'warning');
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
  console.log('\n🚀 Deployment Instructions for craftchatbot.com\n');
  
  console.log('📋 Pre-deployment checklist:');
  console.log('1. Ensure craftchatbot.com is hosted on Hostinger');
  console.log('2. Backup any existing files on craftchatbot.com');
  console.log('3. Have FTP/File Manager access ready\n');
  
  console.log('📁 Deployment steps:');
  console.log('1. Login to Hostinger hPanel');
  console.log('2. Go to File Manager');
  console.log('3. Navigate to craftchatbot.com public_html directory');
  console.log('4. Backup existing files (if any)');
  console.log('5. Delete old files from public_html');
  console.log(`6. Upload ${packageName}`);
  console.log('7. Extract the zip file');
  console.log('8. Move all extracted files to public_html root');
  console.log('9. Delete the zip file\n');
  
  console.log('🔧 Post-deployment configuration:');
  console.log('1. Update Supabase authentication URLs:');
  console.log('   - Site URL: https://craftchatbot.com');
  console.log('   - Redirect URLs: https://craftchatbot.com');
  console.log('2. Test website: https://craftchatbot.com');
  console.log('3. Verify SSL certificate is working');
  console.log('4. Test authentication flow');
  console.log('5. Test file uploads and downloads\n');
  
  console.log('📧 Email configuration:');
  console.log('1. Set up professional email: admin@craftchatbot.com');
  console.log('2. Configure email service (SendGrid/Resend)');
  console.log('3. Test email notifications\n');
  
  console.log('🔍 Testing checklist:');
  console.log('- [ ] Homepage loads correctly');
  console.log('- [ ] User registration works');
  console.log('- [ ] User login works');
  console.log('- [ ] Document upload works');
  console.log('- [ ] AI chat functionality');
  console.log('- [ ] Payment processing (when configured)');
  console.log('- [ ] Email notifications');
  console.log('- [ ] Mobile responsiveness');
  console.log('- [ ] All pages accessible\n');
  
  log('✅ Deployment package ready for craftchatbot.com!', 'success');
}

function updateSupabaseConfig() {
  log('Preparing Supabase configuration update...', 'info');
  
  console.log('\n🔧 Supabase Configuration Update Required:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Select your LawMattersSG project');
  console.log('3. Go to Authentication → URL Configuration');
  console.log('4. Update Site URL to: https://craftchatbot.com');
  console.log('5. Update Redirect URLs to: https://craftchatbot.com');
  console.log('6. Save changes\n');
  
  log('This is required for authentication to work properly', 'warning');
}

function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const prepareOnly = args.includes('--prepare-only');

  console.log('🌐 LawMattersSG Deployment to craftchatbot.com\n');

  // Step 1: Check prerequisites
  if (!checkPrerequisites()) {
    log('Prerequisites check failed', 'error');
    process.exit(1);
  }

  // Step 2: Prepare environment
  if (!prepareEnvironment()) {
    log('Environment preparation failed', 'error');
    process.exit(1);
  }

  // Step 3: Create .htaccess file
  if (!createHtaccess()) {
    log('Failed to create .htaccess file', 'warning');
  }

  if (prepareOnly) {
    log('Preparation complete! Run without --prepare-only to build and package.', 'success');
    return;
  }

  // Step 4: Build project (unless skipped)
  if (!skipBuild && !buildProject()) {
    log('Build failed', 'error');
    process.exit(1);
  }

  // Step 5: Create deployment package
  const packageName = createDeploymentPackage();
  if (packageName) {
    showDeploymentInstructions(packageName);
    updateSupabaseConfig();
  } else {
    log('Failed to create deployment package', 'error');
    log('You can manually compress the dist folder and upload it', 'info');
  }

  log('\n🎉 LawMattersSG ready for deployment to craftchatbot.com!', 'success');
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, buildProject, createDeploymentPackage };
