import { test, expect } from '@playwright/test';

/**
 * Production Navigation Test for LawMattersSG
 * Tests the live site at https://craftchatbot.com
 * Focus: Finding the missing Login/SignUp buttons
 */

test.describe('LawMattersSG Production Navigation', () => {
  const PRODUCTION_URL = 'https://craftchatbot.com';

  test('should load the homepage successfully', async ({ page }) => {
    console.log('🌐 Navigating to:', PRODUCTION_URL);
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/homepage-screenshot.png', fullPage: true });
    
    // Basic page load verification
    await expect(page).toHaveTitle(/LegalHelpSG|LawMattersSG/i);
    console.log('✅ Page loaded successfully');
  });

  test('should find navigation elements', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Looking for navigation elements...');
    
    // Look for navigation container
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    console.log('✅ Navigation container found');
    
    // Look for logo/brand
    const logo = page.getByText(/LegalHelpSG|LawMattersSG/i).first();
    await expect(logo).toBeVisible();
    console.log('✅ Logo/brand found');
    
    // Take screenshot of navigation area
    await nav.screenshot({ path: 'test-results/navigation-area.png' });
  });

  test('should search for Login/SignUp buttons with multiple strategies', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Searching for Login/SignUp buttons...');
    
    // Strategy 1: Look for buttons by role
    const loginByRole = page.getByRole('button', { name: /sign in|login/i });
    const signupByRole = page.getByRole('button', { name: /sign up|get started|register/i });
    
    console.log('Strategy 1 - By Role:');
    console.log('Login button visible:', await loginByRole.isVisible().catch(() => false));
    console.log('SignUp button visible:', await signupByRole.isVisible().catch(() => false));
    
    // Strategy 2: Look for links (in case they're links, not buttons)
    const loginByLink = page.getByRole('link', { name: /sign in|login/i });
    const signupByLink = page.getByRole('link', { name: /sign up|get started|register/i });
    
    console.log('Strategy 2 - By Link:');
    console.log('Login link visible:', await loginByLink.isVisible().catch(() => false));
    console.log('SignUp link visible:', await signupByLink.isVisible().catch(() => false));
    
    // Strategy 3: Look by text content
    const loginByText = page.getByText(/sign in|login/i).first();
    const signupByText = page.getByText(/sign up|get started|register/i).first();
    
    console.log('Strategy 3 - By Text:');
    console.log('Login text visible:', await loginByText.isVisible().catch(() => false));
    console.log('SignUp text visible:', await signupByText.isVisible().catch(() => false));
    
    // Strategy 4: Look in specific navigation area
    const navButtons = page.locator('nav button, nav a');
    const navButtonCount = await navButtons.count();
    console.log(`Strategy 4 - Found ${navButtonCount} buttons/links in navigation`);
    
    // List all buttons/links in navigation
    for (let i = 0; i < navButtonCount; i++) {
      const element = navButtons.nth(i);
      const text = await element.textContent();
      const isVisible = await element.isVisible();
      console.log(`  - Element ${i}: "${text}" (visible: ${isVisible})`);
    }
    
    // Strategy 5: Check for any authentication-related elements
    const authElements = page.locator('[class*="auth"], [class*="login"], [class*="signup"], [id*="auth"], [id*="login"], [id*="signup"]');
    const authCount = await authElements.count();
    console.log(`Strategy 5 - Found ${authCount} auth-related elements`);
    
    // Take a full page screenshot for manual inspection
    await page.screenshot({ path: 'test-results/full-page-debug.png', fullPage: true });
    
    // This test is for debugging - it will always pass but log findings
    expect(true).toBe(true);
  });

  test('should check page HTML structure for debugging', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Analyzing page structure...');
    
    // Get the navigation HTML
    const navHTML = await page.locator('nav').innerHTML().catch(() => 'No nav element found');
    console.log('Navigation HTML:', navHTML.substring(0, 500) + '...');
    
    // Check for any JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any JS errors to surface
    await page.waitForTimeout(3000);
    
    if (errors.length > 0) {
      console.log('❌ JavaScript errors found:');
      errors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Check if there are any elements with display: none or visibility: hidden
    const hiddenElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const hidden = [];
      for (let el of elements) {
        const style = window.getComputedStyle(el);
        if ((style.display === 'none' || style.visibility === 'hidden') && 
            (el.textContent?.includes('Sign') || el.textContent?.includes('Login') || el.textContent?.includes('Get Started'))) {
          hidden.push({
            tag: el.tagName,
            text: el.textContent?.substring(0, 50),
            display: style.display,
            visibility: style.visibility
          });
        }
      }
      return hidden;
    });
    
    if (hiddenElements.length > 0) {
      console.log('🔍 Found potentially hidden auth elements:');
      hiddenElements.forEach(el => console.log('  -', el));
    }
    
    expect(true).toBe(true);
  });
});
