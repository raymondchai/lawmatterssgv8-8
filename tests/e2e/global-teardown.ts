import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  // Launch browser for teardown
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');

    // You can add cleanup logic here, such as:
    // - Deleting test users from the database
    // - Removing test files from storage
    // - Clearing test data
    // - Resetting database state

    // Example: Clean up test user and data
    // await page.request.delete('/api/test/cleanup', {
    //   data: {
    //     email: 'test@example.com'
    //   }
    // });

    console.log('✅ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
    console.error('Continuing despite teardown failure...');
  } finally {
    await browser.close();
  }
}

export default globalTeardown;
