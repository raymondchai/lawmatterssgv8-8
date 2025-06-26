import { test, expect } from '@playwright/test';

/**
 * Navigation Buttons Test Suite
 * Generated based on MCP exploration approach for LawMattersSG
 * Focus: Testing the missing Login/SignUp buttons issue
 */

test.describe('Navigation Buttons - LawMattersSG', () => {
  const BASE_URL = 'https://craftchatbot.com';

  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto(BASE_URL);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display Login and SignUp buttons in navigation', async ({ page }) => {
    // Test the core issue: Login/SignUp buttons should be visible
    
    // Check if Login button exists and is visible
    const loginButton = page.getByRole('button', { name: /sign in/i });
    await expect(loginButton).toBeVisible();
    
    // Check if SignUp button exists and is visible
    const signupButton = page.getByRole('button', { name: /get started|sign up/i });
    await expect(signupButton).toBeVisible();
    
    // Verify buttons are clickable
    await expect(loginButton).toBeEnabled();
    await expect(signupButton).toBeEnabled();
  });

  test('should have proper navigation layout structure', async ({ page }) => {
    // Test the overall navigation structure
    
    // Check for main navigation container
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check for logo/brand
    const logo = page.getByRole('link', { name: /legalhelpsg|lawmatterssg/i });
    await expect(logo).toBeVisible();
    
    // Check for navigation menu items
    const homeLink = page.getByRole('link', { name: /home/i });
    const lawFirmsLink = page.getByRole('link', { name: /law firms/i });
    const documentsLink = page.getByRole('link', { name: /documents/i });
    
    await expect(homeLink).toBeVisible();
    await expect(lawFirmsLink).toBeVisible();
    await expect(documentsLink).toBeVisible();
  });

  test('should handle responsive navigation on mobile', async ({ page }) => {
    // Test mobile responsive behavior
    await page.setViewportSize({ width: 375, height: 667 });
    
    // On mobile, there might be a hamburger menu
    const mobileMenuButton = page.getByRole('button', { name: /menu|hamburger/i });
    
    if (await mobileMenuButton.isVisible()) {
      // If mobile menu exists, click it
      await mobileMenuButton.click();
      
      // Check if Login/SignUp buttons are visible in mobile menu
      const loginButton = page.getByRole('button', { name: /sign in/i });
      const signupButton = page.getByRole('button', { name: /get started|sign up/i });
      
      await expect(loginButton).toBeVisible();
      await expect(signupButton).toBeVisible();
    } else {
      // If no mobile menu, buttons should still be visible
      const loginButton = page.getByRole('button', { name: /sign in/i });
      const signupButton = page.getByRole('button', { name: /get started|sign up/i });
      
      await expect(loginButton).toBeVisible();
      await expect(signupButton).toBeVisible();
    }
  });

  test('should navigate to login page when Login button is clicked', async ({ page }) => {
    // Test Login button functionality
    const loginButton = page.getByRole('button', { name: /sign in/i });
    await expect(loginButton).toBeVisible();
    
    // Click the login button
    await loginButton.click();
    
    // Should navigate to login page or show login modal
    await expect(page).toHaveURL(/.*\/(auth\/login|login).*/);
    
    // Or check for login form if it's a modal
    const loginForm = page.getByRole('form', { name: /login|sign in/i });
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    
    // At least one of these should be true
    const hasLoginPage = await page.url().includes('login');
    const hasLoginForm = await loginForm.isVisible().catch(() => false);
    const hasEmailInput = await emailInput.isVisible().catch(() => false);
    
    expect(hasLoginPage || hasLoginForm || hasEmailInput).toBeTruthy();
  });

  test('should navigate to signup page when SignUp button is clicked', async ({ page }) => {
    // Test SignUp button functionality
    const signupButton = page.getByRole('button', { name: /get started|sign up/i });
    await expect(signupButton).toBeVisible();
    
    // Click the signup button
    await signupButton.click();
    
    // Should navigate to signup page or show signup modal
    await expect(page).toHaveURL(/.*\/(auth\/register|register|signup).*/);
    
    // Or check for signup form if it's a modal
    const signupForm = page.getByRole('form', { name: /register|sign up/i });
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    
    // At least one of these should be true
    const hasSignupPage = await page.url().includes('register') || await page.url().includes('signup');
    const hasSignupForm = await signupForm.isVisible().catch(() => false);
    const hasEmailInput = await emailInput.isVisible().catch(() => false);
    
    expect(hasSignupPage || hasSignupForm || hasEmailInput).toBeTruthy();
  });

  test('should maintain button visibility during page interactions', async ({ page }) => {
    // Test that buttons remain visible during various page interactions
    
    // Initial check
    const loginButton = page.getByRole('button', { name: /sign in/i });
    const signupButton = page.getByRole('button', { name: /get started|sign up/i });
    
    await expect(loginButton).toBeVisible();
    await expect(signupButton).toBeVisible();
    
    // Scroll down and check visibility
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(loginButton).toBeVisible();
    await expect(signupButton).toBeVisible();
    
    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(loginButton).toBeVisible();
    await expect(signupButton).toBeVisible();
    
    // Try clicking other navigation items
    const homeLink = page.getByRole('link', { name: /home/i });
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      
      // Buttons should still be visible
      await expect(loginButton).toBeVisible();
      await expect(signupButton).toBeVisible();
    }
  });
});
