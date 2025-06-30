import { test, expect } from '@playwright/test';

/**
 * Automated Sign-Out Testing
 * 
 * This test suite verifies that the server-controlled authentication system
 * works correctly and that users always start signed-out on fresh page loads.
 * 
 * Tests:
 * 1. Fresh page load shows signed-out state
 * 2. Sign-in process works correctly
 * 3. Sign-out process clears all session data
 * 4. After sign-out, fresh page load shows signed-out state
 * 5. No client-side session persistence
 */

const TEST_EMAIL = 'raymond.chai@8atoms.com';
const TEST_PASSWORD = 'TestPassword123!'; // You'll need to set this up

test.describe('Server-Controlled Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Fresh page load shows signed-out state', async ({ page }) => {
    console.log('🧪 Testing: Fresh page load shows signed-out state');
    
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Should see sign-in button/link (not signed-in state)
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    
    // Should NOT see signed-in elements
    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    await expect(signOutButton).not.toBeVisible();
    
    // Should NOT see user profile elements
    const profileMenu = page.locator('[data-testid="user-profile"]').or(page.locator('text=Profile'));
    await expect(profileMenu).not.toBeVisible();
    
    console.log('✅ Fresh page load correctly shows signed-out state');
  });

  test('Sign-in process works with server-controlled sessions', async ({ page }) => {
    console.log('🧪 Testing: Sign-in process with server-controlled sessions');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click sign-in button
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await signInButton.click();
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for sign-in to complete
    await page.waitForLoadState('networkidle');
    
    // Should now see signed-in state
    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    await expect(signOutButton).toBeVisible({ timeout: 15000 });
    
    // Should NOT see sign-in button anymore
    const signInButtonAfter = page.locator('text=Sign In').or(page.locator('text=Login'));
    await expect(signInButtonAfter).not.toBeVisible();
    
    // Verify HTTP-only cookie was set (we can't access it from JS, but we can verify session works)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // After reload, should still be signed in (server validates cookie)
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Sign-in process works correctly with server-controlled sessions');
  });

  test('Sign-out process clears all session data', async ({ page }) => {
    console.log('🧪 Testing: Sign-out process clears all session data');
    
    // First, sign in
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await signInButton.click();
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Verify we're signed in
    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    await expect(signOutButton).toBeVisible({ timeout: 15000 });
    
    // Now sign out
    await signOutButton.click();
    
    // Wait for redirect to complete
    await page.waitForLoadState('networkidle');
    
    // Should be back to signed-out state
    const signInButtonAfter = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await expect(signInButtonAfter).toBeVisible({ timeout: 10000 });
    
    // Should NOT see signed-in elements
    await expect(signOutButton).not.toBeVisible();
    
    console.log('✅ Sign-out process correctly clears all session data');
  });

  test('No client-side session persistence after sign-out', async ({ page }) => {
    console.log('🧪 Testing: No client-side session persistence after sign-out');
    
    // Sign in first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await signInButton.click();
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Sign out
    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    await signOutButton.click();
    await page.waitForLoadState('networkidle');
    
    // Check that no auth data persists in client-side storage
    const localStorageAuth = await page.evaluate(() => {
      const authKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase') || key.includes('session'))) {
          authKeys.push(key);
        }
      }
      return authKeys;
    });
    
    const sessionStorageAuth = await page.evaluate(() => {
      const authKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase') || key.includes('session'))) {
          authKeys.push(key);
        }
      }
      return authKeys;
    });
    
    // Should have no auth-related keys in storage
    expect(localStorageAuth.length).toBe(0);
    expect(sessionStorageAuth.length).toBe(0);
    
    // Open new tab to verify no session leakage
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');
    
    // New tab should also show signed-out state
    const newTabSignIn = newPage.locator('text=Sign In').or(newPage.locator('text=Login')).first();
    await expect(newTabSignIn).toBeVisible({ timeout: 10000 });
    
    await newPage.close();
    
    console.log('✅ No client-side session persistence after sign-out');
  });

  test('Server-side session validation works correctly', async ({ page }) => {
    console.log('🧪 Testing: Server-side session validation');
    
    // Sign in
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await signInButton.click();
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Verify signed in
    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    await expect(signOutButton).toBeVisible({ timeout: 15000 });
    
    // Reload page multiple times - should stay signed in (server validates cookie)
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(signOutButton).toBeVisible({ timeout: 10000 });
    }
    
    // Navigate to different pages - should stay signed in
    await page.goto('/law-firms');
    await page.waitForLoadState('networkidle');
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Server-side session validation works correctly');
  });

  test('Multiple browser tabs handle sign-out correctly', async ({ page }) => {
    console.log('🧪 Testing: Multiple browser tabs handle sign-out correctly');
    
    // Sign in on first tab
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const signInButton = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await signInButton.click();
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Open second tab
    const secondTab = await page.context().newPage();
    await secondTab.goto('/');
    await secondTab.waitForLoadState('networkidle');
    
    // Both tabs should show signed-in state
    const signOutButton1 = page.locator('text=Sign Out').or(page.locator('text=Logout'));
    const signOutButton2 = secondTab.locator('text=Sign Out').or(secondTab.locator('text=Logout'));
    
    await expect(signOutButton1).toBeVisible({ timeout: 10000 });
    await expect(signOutButton2).toBeVisible({ timeout: 10000 });
    
    // Sign out from first tab
    await signOutButton1.click();
    await page.waitForLoadState('networkidle');
    
    // First tab should be signed out
    const signInButton1 = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await expect(signInButton1).toBeVisible({ timeout: 10000 });
    
    // Refresh second tab - should also be signed out (server-side session destroyed)
    await secondTab.reload();
    await secondTab.waitForLoadState('networkidle');
    
    const signInButton2 = secondTab.locator('text=Sign In').or(secondTab.locator('text=Login')).first();
    await expect(signInButton2).toBeVisible({ timeout: 10000 });
    
    await secondTab.close();
    
    console.log('✅ Multiple browser tabs handle sign-out correctly');
  });

});
