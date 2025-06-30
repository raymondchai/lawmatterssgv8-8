#!/usr/bin/env node

/**
 * Cache Busting Solution
 * Creates a comprehensive solution to force browser cache refresh
 */

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createCacheBustingHtaccess() {
  const htaccessContent = `# LawMattersSG Cache Busting and Routing Configuration
# Generated: ${new Date().toISOString()}

# Disable server-side caching for HTML files
<FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</FilesMatch>

# Force cache refresh for JavaScript and CSS files
<FilesMatch "\\.(js|css)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
    Header set Last-Modified "Thu, 01 Jan 1970 00:00:00 GMT"
    Header set ETag ""
</FilesMatch>

# Ensure proper MIME types
AddType application/javascript .js
AddType text/css .css
AddType text/html .html

# Enable compression
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

# React Router - Handle client-side routing
RewriteEngine On

# Skip rewrite for existing files and directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Skip rewrite for API calls
RewriteCond %{REQUEST_URI} !^/api/

# Skip rewrite for assets
RewriteCond %{REQUEST_URI} !^/assets/

# Skip rewrite for common file extensions
RewriteCond %{REQUEST_URI} !\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$

# Redirect all other requests to index.html
RewriteRule ^.*$ /index.html [L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Force HTTPS (uncomment if needed)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;

  return htaccessContent;
}

function createCacheBustingHTML() {
  const timestamp = Date.now();
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- AGGRESSIVE CACHE BUSTING -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta http-equiv="Last-Modified" content="Thu, 01 Jan 1970 00:00:00 GMT" />
    <meta name="cache-buster" content="${timestamp}" />
    
    <title>LawMatters Singapore - Expert Legal Solutions</title>
    <meta name="description" content="Singapore's premier law firm with 25+ years of experience. Expert legal solutions in corporate law, employment law, real estate, family law, and more." />
    <meta name="author" content="LawMatters Singapore" />

    <meta property="og:title" content="LawMatters Singapore - Expert Legal Solutions" />
    <meta property="og:description" content="Singapore's premier law firm with 25+ years of experience. Expert legal solutions in corporate law, employment law, real estate, family law, and more." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lawmatterssg" />
    <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
    
    <!-- Cache-busted assets -->
    <script type="module" crossorigin src="./assets/index-CIUloMom-1751290207128.js?v=${timestamp}"></script>
    <link rel="modulepreload" crossorigin href="./assets/react-vendor-C9QDz5CC-1751290207128.js?v=${timestamp}">
    <link rel="modulepreload" crossorigin href="./assets/supabase-krEVv_JN-1751290207128.js?v=${timestamp}">
    <link rel="modulepreload" crossorigin href="./assets/ui-components-NADxK8eM-1751290207128.js?v=${timestamp}">
    <link rel="modulepreload" crossorigin href="./assets/data-fetching-Ch-Btsro-1751290207128.js?v=${timestamp}">
    <link rel="modulepreload" crossorigin href="./assets/utilities-kqqoeiVg-1751290207128.js?v=${timestamp}">
    <link rel="modulepreload" crossorigin href="./assets/forms-DcZe9WbG-1751290207128.js?v=${timestamp}">
    <link rel="stylesheet" crossorigin href="./assets/index-Dsh4Xwa--1751290207128.css?v=${timestamp}">
  </head>

  <body>
    <div id="root"></div>
    
    <!-- Cache busting script -->
    <script>
      // Force cache refresh
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      // Clear all storage
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      } catch (e) {
        console.log('Cache clearing failed:', e);
      }
      
      console.log('🔄 Cache busting active - timestamp: ${timestamp}');
    </script>
  </body>
</html>
`;

  return htmlContent;
}

async function createCacheBustingSolution() {
  log('\n🚀 CREATING CACHE BUSTING SOLUTION', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  try {
    // Create cache-busting .htaccess
    const htaccessContent = createCacheBustingHtaccess();
    fs.writeFileSync('dist/.htaccess', htaccessContent);
    log('✅ Created cache-busting .htaccess file', 'green');
    
    // Create cache-busting index.html
    const htmlContent = createCacheBustingHTML();
    fs.writeFileSync('dist/index.html', htmlContent);
    log('✅ Created cache-busting index.html file', 'green');
    
    // Create deployment instructions
    const instructions = `
🚀 DEPLOYMENT INSTRUCTIONS
==========================

1. COMPLETE FILE REPLACEMENT:
   - Delete ALL files in public_html/ directory
   - Upload ALL files from dist/ directory
   - Ensure .htaccess file is uploaded

2. BROWSER CACHE CLEARING:
   - Press Ctrl+Shift+Delete (Chrome/Edge)
   - Select "All time" for time range
   - Check all boxes (cookies, cache, etc.)
   - Click "Clear data"

3. ALTERNATIVE CACHE CLEARING:
   - Open Developer Tools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

4. VERIFICATION:
   - Open https://craftchatbot.com in incognito mode
   - Check console for "Cache busting active" message
   - Verify no authentication errors

5. IF STILL HAVING ISSUES:
   - Try different browser
   - Check Hostinger cache settings
   - Contact Hostinger support to clear server cache

The new files include:
- Aggressive cache-busting headers
- Timestamp-based asset URLs
- Service worker clearing
- Storage clearing scripts
`;
    
    fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS.txt', instructions);
    log('✅ Created deployment instructions', 'green');
    
    log('\n📋 SUMMARY:', 'magenta');
    log('• .htaccess file updated with aggressive cache busting', 'yellow');
    log('• index.html updated with timestamp-based asset URLs', 'yellow');
    log('• Service worker and storage clearing scripts added', 'yellow');
    log('• Deployment instructions created', 'yellow');
    
    log('\n🎯 NEXT STEPS:', 'blue');
    log('1. Upload ALL files from dist/ to public_html/', 'yellow');
    log('2. Clear browser cache completely', 'yellow');
    log('3. Test in incognito mode', 'yellow');
    
    return true;
    
  } catch (error) {
    log(`❌ Error creating cache busting solution: ${error.message}`, 'red');
    return false;
  }
}

// Run the solution
createCacheBustingSolution().catch(console.error);
