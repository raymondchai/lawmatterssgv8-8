#!/usr/bin/env node

/**
 * Simple script to test LawMattersSG production site
 * Usage: node scripts/test-production.js
 */

import { execSync } from 'child_process';

console.log('🎭 Testing LawMattersSG Production Site');
console.log('📍 URL: https://craftchatbot.com/');
console.log('🎯 Focus: Navigation and button visibility\n');

try {
  // Run the production navigation test
  console.log('▶️  Running navigation tests...');
  
  execSync(
    'npx playwright test tests/production-navigation.spec.ts --config=playwright.production.config.ts --reporter=list',
    { 
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'inherit'
    }
  );
  
  console.log('\n✅ Tests completed!');
  console.log('\n📊 To view detailed results:');
  console.log('   npx playwright show-report');
  
} catch (error) {
  console.error('\n❌ Test execution failed:');
  console.error(error.message);
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check if Playwright is installed: npx playwright --version');
  console.log('2. Install browsers: npx playwright install');
  console.log('3. Check site accessibility: curl -I https://craftchatbot.com/');
  
  process.exit(1);
}
