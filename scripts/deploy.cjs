#!/usr/bin/env node

/**
 * Deployment script for LawMattersSG
 * Helps with pre-deployment checks and deployment to various platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLATFORMS = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  railway: 'Railway'
};

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
  log('Checking deployment prerequisites...', 'info');
  
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
      name: 'Build script exists',
      check: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        return pkg.scripts && pkg.scripts.build;
      },
      fix: 'Add build script to package.json'
    },
    {
      name: 'Environment example exists',
      check: () => fs.existsSync('.env.example'),
      fix: 'Create .env.example with required environment variables'
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

function runTests() {
  log('Running tests...', 'info');
  
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    log('Linting passed', 'success');
  } catch (error) {
    log('Linting failed', 'error');
    return false;
  }

  try {
    execSync('npm run test:run', { stdio: 'inherit' });
    log('Tests passed', 'success');
  } catch (error) {
    log('Tests failed', 'warning');
    // Don't fail deployment for test failures, just warn
  }

  return true;
}

function buildProject() {
  log('Building project...', 'info');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('Build successful', 'success');
    return true;
  } catch (error) {
    log('Build failed', 'error');
    return false;
  }
}

function checkBuildOutput() {
  log('Checking build output...', 'info');
  
  if (!fs.existsSync('dist')) {
    log('dist directory not found', 'error');
    return false;
  }

  if (!fs.existsSync('dist/index.html')) {
    log('index.html not found in dist', 'error');
    return false;
  }

  const stats = fs.statSync('dist');
  log(`Build output size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'info');
  
  return true;
}

function deployToVercel() {
  log('Deploying to Vercel...', 'info');
  
  try {
    // Check if vercel CLI is installed
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    log('Vercel CLI not found. Install with: npm i -g vercel', 'error');
    return false;
  }

  try {
    execSync('vercel --prod', { stdio: 'inherit' });
    log('Deployed to Vercel successfully', 'success');
    return true;
  } catch (error) {
    log('Vercel deployment failed', 'error');
    return false;
  }
}

function deployToNetlify() {
  log('Deploying to Netlify...', 'info');
  
  try {
    // Check if netlify CLI is installed
    execSync('netlify --version', { stdio: 'pipe' });
  } catch (error) {
    log('Netlify CLI not found. Install with: npm i -g netlify-cli', 'error');
    return false;
  }

  try {
    execSync('netlify deploy --prod --dir=dist', { stdio: 'inherit' });
    log('Deployed to Netlify successfully', 'success');
    return true;
  } catch (error) {
    log('Netlify deployment failed', 'error');
    return false;
  }
}

function deployToRailway() {
  log('Deploying to Railway...', 'info');
  
  try {
    // Check if railway CLI is installed
    execSync('railway --version', { stdio: 'pipe' });
  } catch (error) {
    log('Railway CLI not found. Install with: npm i -g @railway/cli', 'error');
    return false;
  }

  try {
    execSync('railway up', { stdio: 'inherit' });
    log('Deployed to Railway successfully', 'success');
    return true;
  } catch (error) {
    log('Railway deployment failed', 'error');
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const platform = args[0];
  const skipTests = args.includes('--skip-tests');
  const skipBuild = args.includes('--skip-build');

  console.log('🚀 LawMattersSG Deployment Script\n');

  if (!platform || !PLATFORMS[platform]) {
    log('Usage: node scripts/deploy.cjs <platform> [options]', 'info');
    log('Platforms: vercel, netlify, railway', 'info');
    log('Options: --skip-tests, --skip-build', 'info');
    process.exit(1);
  }

  log(`Deploying to ${PLATFORMS[platform]}...`, 'info');

  // Step 1: Check prerequisites
  if (!checkPrerequisites()) {
    log('Prerequisites check failed', 'error');
    process.exit(1);
  }

  // Step 2: Run tests (optional)
  if (!skipTests && !runTests()) {
    log('Tests failed', 'error');
    process.exit(1);
  }

  // Step 3: Build project (optional)
  if (!skipBuild && !buildProject()) {
    log('Build failed', 'error');
    process.exit(1);
  }

  // Step 4: Check build output
  if (!checkBuildOutput()) {
    log('Build output check failed', 'error');
    process.exit(1);
  }

  // Step 5: Deploy to platform
  let deploymentSuccess = false;
  
  switch (platform) {
    case 'vercel':
      deploymentSuccess = deployToVercel();
      break;
    case 'netlify':
      deploymentSuccess = deployToNetlify();
      break;
    case 'railway':
      deploymentSuccess = deployToRailway();
      break;
  }

  if (deploymentSuccess) {
    log(`🎉 Successfully deployed to ${PLATFORMS[platform]}!`, 'success');
    log('Next steps:', 'info');
    log('1. Update Supabase authentication URLs', 'info');
    log('2. Configure environment variables on the platform', 'info');
    log('3. Test all features on the live site', 'info');
  } else {
    log(`Deployment to ${PLATFORMS[platform]} failed`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, runTests, buildProject };
