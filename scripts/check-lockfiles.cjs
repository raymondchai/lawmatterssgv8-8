#!/usr/bin/env node

/**
 * Script to check for multiple package manager lockfiles
 * and warn developers about potential conflicts
 */

const fs = require('fs');
const path = require('path');

const lockfiles = [
  { name: 'package-lock.json', manager: 'npm' },
  { name: 'yarn.lock', manager: 'yarn' },
  { name: 'pnpm-lock.yaml', manager: 'pnpm' },
  { name: 'bun.lockb', manager: 'bun' }
];

function checkLockfiles() {
  const rootDir = process.cwd();
  const foundLockfiles = [];

  lockfiles.forEach(lockfile => {
    const lockfilePath = path.join(rootDir, lockfile.name);
    if (fs.existsSync(lockfilePath)) {
      foundLockfiles.push(lockfile);
    }
  });

  if (foundLockfiles.length === 0) {
    console.log('⚠️  No lockfiles found. Run npm install to generate package-lock.json');
    return;
  }

  if (foundLockfiles.length === 1) {
    const lockfile = foundLockfiles[0];
    console.log(`✅ Using ${lockfile.manager} (${lockfile.name})`);
    return;
  }

  // Multiple lockfiles found
  console.log('🚨 Multiple package manager lockfiles detected:');
  foundLockfiles.forEach(lockfile => {
    console.log(`   - ${lockfile.name} (${lockfile.manager})`);
  });

  console.log('\n⚠️  This can cause dependency conflicts and inconsistent installs.');
  console.log('\n📋 Recommended actions:');
  console.log('1. Choose one package manager for your project');
  console.log('2. Delete the other lockfiles');
  console.log('3. Add the unused lockfiles to .gitignore');
  console.log('4. Run your chosen package manager\'s install command');

  console.log('\n🔧 For this project (using npm):');
  console.log('   npm run clean-lockfiles  # Remove non-npm lockfiles');
  console.log('   npm install              # Regenerate package-lock.json');

  process.exit(1);
}

if (require.main === module) {
  checkLockfiles();
}

module.exports = { checkLockfiles };
