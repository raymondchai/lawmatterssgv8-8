#!/usr/bin/env node

/**
 * Payment Integration Test Script
 * 
 * This script performs basic validation of the payment integration setup.
 * Run with: node scripts/test-payment-integration.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 LawMattersSG Payment Integration Test\n');

// Test 1: Check if required files exist
console.log('📁 Checking required files...');

const requiredFiles = [
  'src/pages/Pricing.tsx',
  'src/pages/Subscribe.tsx',
  'src/pages/payment/PaymentSuccess.tsx',
  'src/pages/payment/PaymentFailure.tsx',
  'src/pages/dashboard/Subscription.tsx',
  'src/lib/services/stripe.ts',
  'src/lib/services/usageTracking.ts',
  'src/hooks/useUsageTracking.ts',
  'src/components/subscription/SubscriptionManager.tsx',
  'supabase/functions/create-subscription/index.ts',
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/get-subscription/index.ts',
  'supabase/functions/cancel-subscription/index.ts',
  'supabase/functions/reactivate-subscription/index.ts',
  'supabase/functions/create-billing-portal/index.ts',
  'supabase/functions/get-usage-info/index.ts',
  'supabase/migrations/20240101000007_subscription_schema.sql',
  'supabase/migrations/20240101000008_subscription_rls.sql'
];

let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n⚠️  Missing ${missingFiles.length} required files. Please create them before testing.`);
} else {
  console.log('\n✅ All required files are present!');
}

// Test 2: Check environment variables
console.log('\n🔧 Checking environment configuration...');

const envFile = '.env.local';
let envContent = '';

if (fs.existsSync(envFile)) {
  envContent = fs.readFileSync(envFile, 'utf8');
  console.log(`✅ ${envFile} exists`);
} else {
  console.log(`❌ ${envFile} not found`);
}

const requiredEnvVars = [
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let missingEnvVars = [];

requiredEnvVars.forEach(envVar => {
  if (envContent.includes(envVar)) {
    console.log(`✅ ${envVar}`);
  } else {
    console.log(`❌ ${envVar}`);
    missingEnvVars.push(envVar);
  }
});

if (missingEnvVars.length > 0) {
  console.log(`\n⚠️  Missing ${missingEnvVars.length} environment variables. Add them to ${envFile}:`);
  missingEnvVars.forEach(envVar => {
    console.log(`   ${envVar}=your_value_here`);
  });
} else {
  console.log('\n✅ All required environment variables are configured!');
}

// Test 3: Check constants configuration
console.log('\n⚙️  Checking constants configuration...');

const constantsFile = 'src/lib/config/constants.ts';
if (fs.existsSync(constantsFile)) {
  const constantsContent = fs.readFileSync(constantsFile, 'utf8');
  
  // Check subscription tiers
  if (constantsContent.includes('SUBSCRIPTION_TIERS')) {
    console.log('✅ SUBSCRIPTION_TIERS defined');
    
    // Check for new tiers
    if (constantsContent.includes("'premium'") && constantsContent.includes("'pro'")) {
      console.log('✅ Premium and Pro tiers configured');
    } else {
      console.log('❌ Premium and Pro tiers not found');
    }
  } else {
    console.log('❌ SUBSCRIPTION_TIERS not found');
  }
  
  // Check Stripe price IDs
  if (constantsContent.includes('STRIPE_PRICE_IDS')) {
    console.log('✅ STRIPE_PRICE_IDS defined');
  } else {
    console.log('❌ STRIPE_PRICE_IDS not found');
  }
  
  // Check routes
  if (constantsContent.includes('pricing:') && constantsContent.includes('subscription:')) {
    console.log('✅ Payment-related routes configured');
  } else {
    console.log('❌ Payment routes not fully configured');
  }
} else {
  console.log(`❌ ${constantsFile} not found`);
}

// Test 4: Check package.json dependencies
console.log('\n📦 Checking dependencies...');

const packageFile = 'package.json';
if (fs.existsSync(packageFile)) {
  const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
  
  const requiredDeps = [
    '@stripe/stripe-js',
    '@supabase/supabase-js',
    'react-router-dom',
    '@tanstack/react-query'
  ];
  
  let missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep}`);
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n⚠️  Missing ${missingDeps.length} dependencies. Install them with:`);
    console.log(`   npm install ${missingDeps.join(' ')}`);
  } else {
    console.log('\n✅ All required dependencies are installed!');
  }
} else {
  console.log(`❌ ${packageFile} not found`);
}

// Test 5: Check App.tsx routes
console.log('\n🛣️  Checking route configuration...');

const appFile = 'src/App.tsx';
if (fs.existsSync(appFile)) {
  const appContent = fs.readFileSync(appFile, 'utf8');
  
  const requiredRoutes = [
    '/pricing',
    '/subscribe/:tier',
    '/payment/success',
    '/payment/failure',
    '/dashboard/subscription'
  ];
  
  let missingRoutes = [];
  
  requiredRoutes.forEach(route => {
    const routePattern = route.replace('/:tier', '/');
    if (appContent.includes(routePattern)) {
      console.log(`✅ ${route}`);
    } else {
      console.log(`❌ ${route}`);
      missingRoutes.push(route);
    }
  });
  
  if (missingRoutes.length > 0) {
    console.log(`\n⚠️  Missing ${missingRoutes.length} routes in App.tsx`);
  } else {
    console.log('\n✅ All payment routes are configured!');
  }
} else {
  console.log(`❌ ${appFile} not found`);
}

// Summary
console.log('\n📊 Test Summary');
console.log('================');

const totalIssues = missingFiles.length + missingEnvVars.length;

if (totalIssues === 0) {
  console.log('🎉 All tests passed! Your payment integration setup looks good.');
  console.log('\n📋 Next steps:');
  console.log('1. Update STRIPE_PRICE_IDS with actual Stripe price IDs');
  console.log('2. Deploy Supabase Edge Functions');
  console.log('3. Run database migrations');
  console.log('4. Test the payment flow manually');
  console.log('5. Set up Stripe webhooks');
} else {
  console.log(`⚠️  Found ${totalIssues} issues that need to be resolved.`);
  console.log('\n📋 Action items:');
  if (missingFiles.length > 0) {
    console.log(`- Create ${missingFiles.length} missing files`);
  }
  if (missingEnvVars.length > 0) {
    console.log(`- Configure ${missingEnvVars.length} environment variables`);
  }
}

console.log('\n📖 For detailed testing instructions, see:');
console.log('   docs/payment-integration-testing.md');

console.log('\n🔗 Useful links:');
console.log('   - Stripe Test Cards: https://stripe.com/docs/testing#cards');
console.log('   - Supabase Dashboard: https://app.supabase.com');
console.log('   - Stripe Dashboard: https://dashboard.stripe.com');

process.exit(totalIssues > 0 ? 1 : 0);
