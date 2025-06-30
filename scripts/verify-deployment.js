#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if all required files are accessible on the production server
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://craftchatbot.com';
const DIST_FOLDER = './dist';

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
      resolve({
        url,
        status: response.statusCode,
        success: response.statusCode === 200,
        headers: response.headers
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

function getDistFiles() {
  const files = [];
  
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativeFilePath = path.join(relativePath, item).replace(/\\/g, '/');
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath, relativeFilePath);
      } else {
        files.push(relativeFilePath);
      }
    }
  }
  
  if (fs.existsSync(DIST_FOLDER)) {
    scanDirectory(DIST_FOLDER);
  }
  
  return files;
}

async function verifyDeployment() {
  log('\n🔍 DEPLOYMENT VERIFICATION', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  // Get all files from dist folder
  const distFiles = getDistFiles();
  log(`\n📁 Found ${distFiles.length} files in dist folder`, 'blue');
  
  // Check critical files first
  const criticalFiles = [
    'index.html',
    'assets/index-CIUloMom-1751290207128.js',
    'assets/react-vendor-C9QDz5CC-1751290207128.js',
    'assets/supabase-krEVv_JN-1751290207128.js'
  ];
  
  log('\n🎯 Checking Critical Files:', 'yellow');
  log('-'.repeat(30), 'yellow');
  
  let criticalSuccess = 0;
  for (const file of criticalFiles) {
    const url = `${PRODUCTION_URL}/${file}`;
    const result = await checkUrl(url);
    
    if (result.success) {
      log(`✅ ${file}`, 'green');
      criticalSuccess++;
    } else {
      log(`❌ ${file} (${result.status || result.error})`, 'red');
    }
  }
  
  // Check all asset files
  const assetFiles = distFiles.filter(f => f.startsWith('assets/'));
  log(`\n📦 Checking ${assetFiles.length} Asset Files:`, 'yellow');
  log('-'.repeat(30), 'yellow');
  
  let assetSuccess = 0;
  for (const file of assetFiles) {
    const url = `${PRODUCTION_URL}/${file}`;
    const result = await checkUrl(url);
    
    if (result.success) {
      log(`✅ ${file}`, 'green');
      assetSuccess++;
    } else {
      log(`❌ ${file} (${result.status || result.error})`, 'red');
    }
  }
  
  // Summary
  log('\n📊 VERIFICATION RESULTS', 'magenta');
  log('=' .repeat(50), 'magenta');
  log(`Critical Files: ${criticalSuccess}/${criticalFiles.length} ✅`, criticalSuccess === criticalFiles.length ? 'green' : 'red');
  log(`Asset Files: ${assetSuccess}/${assetFiles.length} ✅`, assetSuccess === assetFiles.length ? 'green' : 'red');
  log(`Total Files: ${criticalSuccess + assetSuccess}/${criticalFiles.length + assetFiles.length} ✅`, 'blue');
  
  if (criticalSuccess === criticalFiles.length && assetSuccess === assetFiles.length) {
    log('\n🎉 All files are properly deployed!', 'green');
    return true;
  } else {
    log('\n⚠️  Some files are missing or inaccessible', 'red');
    log('\n📋 Next Steps:', 'yellow');
    log('1. Copy all files from dist/ to public_html/', 'yellow');
    log('2. Clear server cache', 'yellow');
    log('3. Run this script again', 'yellow');
    return false;
  }
}

// Run verification
verifyDeployment().catch(console.error);
