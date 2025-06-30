#!/usr/bin/env node

/**
 * Cache Busting Verification Script
 * Tests if the cache busting solution is working
 */

import https from 'https';

const PRODUCTION_URL = 'https://craftchatbot.com';

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
          data: data
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

async function verifyCacheBusting() {
  console.log('\n🔍 CACHE BUSTING VERIFICATION');
  console.log('=' .repeat(50));
  
  // Test main page
  console.log('\n📄 Testing Updated HTML:');
  const mainPage = await checkUrl(PRODUCTION_URL);
  
  if (mainPage.success) {
    console.log('✅ Main page loads successfully');
    
    // Check for cache busting elements
    const checks = [
      { name: 'Cache-Control meta tag', found: mainPage.data.includes('no-cache, no-store, must-revalidate, max-age=0') },
      { name: 'Cache buster meta tag', found: mainPage.data.includes('name="cache-buster"') },
      { name: 'Timestamp in assets', found: /assets\/.*\.js\?v=\d+/.test(mainPage.data) },
      { name: 'Cache clearing script', found: mainPage.data.includes('Cache busting active') },
      { name: 'Service worker clearing', found: mainPage.data.includes('serviceWorker') },
      { name: 'Storage clearing', found: mainPage.data.includes('localStorage.clear()') }
    ];
    
    console.log('\n✅ Cache Busting Features:');
    checks.forEach(check => {
      console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
    });
    
    // Extract timestamp
    const timestampMatch = mainPage.data.match(/cache-buster" content="(\d+)"/);
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const date = new Date(parseInt(timestamp));
      console.log(`\n🕒 Cache Buster Timestamp: ${timestamp}`);
      console.log(`📅 Generated: ${date.toISOString()}`);
    }
    
  } else {
    console.log(`❌ Main page failed: ${mainPage.status} ${mainPage.error}`);
  }
  
  // Test cache headers
  console.log('\n🔧 Testing Cache Headers:');
  const cacheHeaders = [
    'cache-control',
    'pragma',
    'expires',
    'last-modified',
    'etag'
  ];
  
  cacheHeaders.forEach(header => {
    const value = mainPage.headers[header];
    if (value) {
      console.log(`📋 ${header}: ${value}`);
    } else {
      console.log(`❌ ${header}: not set`);
    }
  });
  
  // Test asset with timestamp
  console.log('\n📦 Testing Timestamped Assets:');
  const assetMatch = mainPage.data.match(/src="(\.\/assets\/index-[^"]+\.js\?v=\d+)"/);
  if (assetMatch) {
    const assetUrl = assetMatch[1].replace('./', '/');
    console.log(`🧪 Testing: ${assetUrl}`);
    
    const assetResult = await checkUrl(`${PRODUCTION_URL}${assetUrl}`);
    if (assetResult.success) {
      console.log('✅ Timestamped asset loads successfully');
      
      // Check if it contains SessionManager
      if (assetResult.data.includes('SessionManager')) {
        console.log('✅ Asset contains SessionManager code');
      } else {
        console.log('❌ Asset missing SessionManager code');
      }
    } else {
      console.log(`❌ Timestamped asset failed: ${assetResult.status}`);
    }
  }
  
  console.log('\n📋 DEPLOYMENT STATUS:');
  if (mainPage.success && mainPage.data.includes('cache-buster')) {
    console.log('✅ Cache busting solution is deployed');
    console.log('✅ Ready for browser cache clearing');
    
    console.log('\n🎯 USER INSTRUCTIONS:');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Select "All time" and check all boxes');
    console.log('3. Open https://craftchatbot.com in incognito mode');
    console.log('4. Check console for "Cache busting active" message');
    console.log('5. Test sign-in/sign-out functionality');
    
  } else {
    console.log('❌ Cache busting solution not yet deployed');
    console.log('📋 Please upload all files from dist/ to public_html/');
  }
  
  return true;
}

// Run verification
verifyCacheBusting().catch(console.error);
