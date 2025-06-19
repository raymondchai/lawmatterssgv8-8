import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server...');
    await page.goto(config.webServer?.url || 'http://127.0.0.1:8080');
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Dev server is ready');

    // You can add more global setup here, such as:
    // - Creating test users in the database
    // - Setting up test data
    // - Authenticating admin users
    // - Clearing previous test data

    // Example: Create a test user (if you have an API endpoint for this)
    // await page.request.post('/api/test/create-user', {
    //   data: {
    //     email: 'test@example.com',
    //     password: 'testpassword123',
    //     firstName: 'Test',
    //     lastName: 'User'
    //   }
    // });

    console.log('✅ Global setup completed');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
