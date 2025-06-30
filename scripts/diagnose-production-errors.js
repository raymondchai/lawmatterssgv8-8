#!/usr/bin/env node

/**
 * Production Error Diagnosis Script
 * Analyzes the specific errors shown in the screenshots
 */

import https from 'https';

const PRODUCTION_URL = 'https://craftchatbot.com';

// Colors for console output
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

function checkUrl(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          url,
          status: response.statusCode,
          success: response.statusCode === 200,
          headers: response.headers,
          data: data.substring(0, 500) // First 500 chars
        });
      });
    });
    
    request.on('error', (error) => {
      resolve({
        url,
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        url,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function diagnoseErrors() {
  log('\n🔍 PRODUCTION ERROR DIAGNOSIS', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  // Test main page
  log('\n📄 Testing Main Page:', 'yellow');
  const mainPage = await checkUrl(PRODUCTION_URL);
  if (mainPage.success) {
    log('✅ Main page loads successfully', 'green');
    
    // Check if it contains React root
    if (mainPage.data.includes('id="root"')) {
      log('✅ React root element found', 'green');
    } else {
      log('❌ React root element missing', 'red');
    }
    
    // Check for script tags
    const scriptMatches = mainPage.data.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
    if (scriptMatches) {
      log(`✅ Found ${scriptMatches.length} script tags`, 'green');
      for (const script of scriptMatches) {
        const srcMatch = script.match(/src="([^"]*)"/);
        if (srcMatch) {
          log(`   📜 ${srcMatch[1]}`, 'blue');
        }
      }
    } else {
      log('❌ No script tags found', 'red');
    }
  } else {
    log(`❌ Main page failed: ${mainPage.status} ${mainPage.error}`, 'red');
  }
  
  // Test critical JavaScript files from the screenshots
  const criticalFiles = [
    '/assets/index-CIUloMom-1751290207128.js',
    '/assets/react-vendor-C9QDz5CC-1751290207128.js',
    '/assets/supabase-krEVv_JN-1751290207128.js'
  ];
  
  log('\n🧪 Testing Critical JavaScript Files:', 'yellow');
  for (const file of criticalFiles) {
    const result = await checkUrl(`${PRODUCTION_URL}${file}`);
    if (result.success) {
      log(`✅ ${file}`, 'green');
      
      // Check content type
      const contentType = result.headers['content-type'];
      if (contentType && contentType.includes('javascript')) {
        log(`   📋 Content-Type: ${contentType}`, 'blue');
      } else {
        log(`   ⚠️  Content-Type: ${contentType || 'missing'}`, 'yellow');
      }
      
      // Check for specific content
      if (file.includes('supabase') && result.data.includes('supabase')) {
        log('   ✅ Contains Supabase code', 'green');
      }
      if (file.includes('index') && result.data.includes('SessionManager')) {
        log('   ✅ Contains SessionManager code', 'green');
      }
    } else {
      log(`❌ ${file} - ${result.status} ${result.error}`, 'red');
    }
  }
  
  // Test Edge Function
  log('\n🔧 Testing Edge Function:', 'yellow');
  const edgeFunction = await checkUrl(`${PRODUCTION_URL}/api/session-manager`);
  if (edgeFunction.success || edgeFunction.status === 401) {
    log('✅ Edge Function is accessible', 'green');
    log(`   📋 Status: ${edgeFunction.status}`, 'blue');
  } else {
    log(`❌ Edge Function failed: ${edgeFunction.status} ${edgeFunction.error}`, 'red');
  }
  
  // Test specific error patterns from screenshots
  log('\n🚨 Analyzing Screenshot Errors:', 'yellow');
  
  // The errors shown in screenshots suggest:
  // 1. SessionManager import failures
  // 2. React.createContext undefined
  // 3. Failed to load resource errors
  
  log('📋 Error Analysis:', 'blue');
  log('   • SessionManager import errors suggest the new auth system files are not properly loaded', 'yellow');
  log('   • React.createContext undefined suggests JSX runtime issues', 'yellow');
  log('   • Failed to load resource errors suggest asset loading problems', 'yellow');
  
  log('\n💡 Recommended Actions:', 'magenta');
  log('1. Clear browser cache completely (Ctrl+Shift+Delete)', 'yellow');
  log('2. Clear server/CDN cache if available', 'yellow');
  log('3. Verify all dist files are uploaded to public_html/', 'yellow');
  log('4. Check .htaccess file for proper rewrite rules', 'yellow');
  log('5. Test in incognito/private browsing mode', 'yellow');
  
  return true;
}

// Run diagnosis
diagnoseErrors().catch(console.error);
