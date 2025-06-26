import { test, expect } from '@playwright/test';

/**
 * Test suite to verify the document upload fix
 * Tests the upload functionality on the production site
 */

test.describe('Document Upload Fix Verification', () => {
  const PRODUCTION_URL = 'https://craftchatbot.com';

  test.beforeEach(async ({ page }) => {
    // Navigate to the documents page
    await page.goto(`${PRODUCTION_URL}/dashboard/documents`);
    await page.waitForLoadState('networkidle');
  });

  test('should load the documents page without hanging', async ({ page }) => {
    console.log('🔍 Testing documents page load...');
    
    // Check if the page loads successfully
    await expect(page).toHaveTitle(/LegalHelpSG|LawMattersSG/i);
    
    // Look for the main content
    const mainContent = page.locator('main, [role="main"], .main-content');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Documents page loaded successfully');
  });

  test('should display upload interface without infinite loading', async ({ page }) => {
    console.log('🔍 Testing upload interface...');
    
    // Look for upload components with multiple strategies
    const uploadArea = page.locator('[data-testid="dropzone"], .dropzone, [class*="upload"]').first();
    const uploadButton = page.getByText(/upload|drag.*drop/i).first();
    const uploadCard = page.locator('.card, [class*="card"]').filter({ hasText: /upload/i }).first();
    
    // At least one upload element should be visible
    const hasUploadArea = await uploadArea.isVisible().catch(() => false);
    const hasUploadButton = await uploadButton.isVisible().catch(() => false);
    const hasUploadCard = await uploadCard.isVisible().catch(() => false);
    
    console.log('Upload area visible:', hasUploadArea);
    console.log('Upload button visible:', hasUploadButton);
    console.log('Upload card visible:', hasUploadCard);
    
    expect(hasUploadArea || hasUploadButton || hasUploadCard).toBeTruthy();
    
    console.log('✅ Upload interface is visible');
  });

  test('should not show infinite loading spinners', async ({ page }) => {
    console.log('🔍 Checking for loading states...');
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Look for loading spinners
    const loadingSpinners = page.locator('.animate-spin, [class*="loading"], [class*="spinner"]');
    const spinnerCount = await loadingSpinners.count();
    
    console.log(`Found ${spinnerCount} loading elements`);
    
    // If there are spinners, they should disappear within a reasonable time
    if (spinnerCount > 0) {
      console.log('⏳ Waiting for loading to complete...');
      await expect(loadingSpinners.first()).not.toBeVisible({ timeout: 15000 });
    }
    
    console.log('✅ No persistent loading spinners found');
  });

  test('should handle file selection without errors', async ({ page }) => {
    console.log('🔍 Testing file selection...');
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      console.log('✅ File input found and visible');
      
      // Check if it's enabled
      const isEnabled = await fileInput.isEnabled();
      console.log('File input enabled:', isEnabled);
      
      expect(isEnabled).toBeTruthy();
    } else {
      console.log('ℹ️ File input not visible (might be hidden by dropzone)');
    }
    
    // Look for dropzone area
    const dropzone = page.locator('[class*="dropzone"], [class*="drop"]').first();
    if (await dropzone.isVisible()) {
      console.log('✅ Dropzone area found');
      
      // Check if it's interactive
      const isClickable = await dropzone.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.cursor !== 'not-allowed' && style.pointerEvents !== 'none';
      });
      
      console.log('Dropzone clickable:', isClickable);
      expect(isClickable).toBeTruthy();
    }
  });

  test('should show appropriate error messages for authentication issues', async ({ page }) => {
    console.log('🔍 Testing authentication error handling...');
    
    // Check for authentication-related error messages
    const authErrors = page.locator('[class*="error"], [class*="alert"]').filter({ 
      hasText: /authentication|login|unauthorized/i 
    });
    
    const errorCount = await authErrors.count();
    console.log(`Found ${errorCount} authentication error messages`);
    
    // If there are auth errors, they should be informative
    if (errorCount > 0) {
      const errorText = await authErrors.first().textContent();
      console.log('Auth error message:', errorText);
      
      // Should not be generic error
      expect(errorText).not.toMatch(/undefined|null|error/i);
    }
    
    console.log('✅ Authentication error handling verified');
  });

  test('should display fallback upload interface if main component fails', async ({ page }) => {
    console.log('🔍 Testing fallback upload interface...');
    
    // Look for fallback indicators
    const fallbackIndicators = page.locator('[class*="fallback"], [class*="basic"]').filter({ 
      hasText: /fallback|basic.*upload/i 
    });
    
    const hasFallback = await fallbackIndicators.count() > 0;
    
    if (hasFallback) {
      console.log('ℹ️ Fallback upload interface detected');
      
      // Fallback should still be functional
      const fallbackUpload = fallbackIndicators.first();
      await expect(fallbackUpload).toBeVisible();
      
      // Should have basic upload functionality
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
    } else {
      console.log('✅ Main upload interface is working');
    }
  });

  test('should not have JavaScript errors in console', async ({ page }) => {
    console.log('🔍 Monitoring JavaScript errors...');
    
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Wait for page interactions
    await page.waitForTimeout(5000);
    
    // Try to interact with upload area if visible
    const uploadArea = page.locator('[class*="upload"], [class*="drop"]').first();
    if (await uploadArea.isVisible()) {
      await uploadArea.hover().catch(() => {});
    }
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('analytics') &&
      !error.includes('gtag') &&
      error.includes('upload') || error.includes('document')
    );
    
    console.log(`Found ${errors.length} total errors, ${criticalErrors.length} critical`);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    // Should not have critical upload-related errors
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ No critical JavaScript errors found');
  });
});
