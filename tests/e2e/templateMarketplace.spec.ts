import { test, expect } from '@playwright/test';

test.describe('Template Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the template marketplace
    await page.goto('/templates');
  });

  test('should browse and search templates', async ({ page }) => {
    // Wait for templates to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Test search functionality
    await page.fill('[data-testid="template-search"]', 'business agreement');
    await page.press('[data-testid="template-search"]', 'Enter');

    // Wait for search results
    await page.waitForLoadState('networkidle');

    // Verify search results contain relevant templates
    const templateTitles = await page.locator('[data-testid="template-title"]').allTextContents();
    expect(templateTitles.some(title => 
      title.toLowerCase().includes('business') || title.toLowerCase().includes('agreement')
    )).toBeTruthy();
  });

  test('should filter templates by category', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Click on Business category
    await page.click('[data-testid="category-business"]');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify all visible templates are business-related
    const categoryBadges = await page.locator('[data-testid="template-category"]').allTextContents();
    expect(categoryBadges.every(category => category === 'Business')).toBeTruthy();
  });

  test('should filter templates by access level', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Open access level filter
    await page.click('[data-testid="access-level-filter"]');
    
    // Select premium templates only
    await page.click('[data-testid="access-level-premium"]');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify all visible templates are premium
    const priceTags = await page.locator('[data-testid="template-price"]').allTextContents();
    expect(priceTags.every(price => price !== 'Free')).toBeTruthy();
  });

  test('should sort templates correctly', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Open sort dropdown
    await page.click('[data-testid="sort-dropdown"]');
    
    // Select sort by rating
    await page.click('[data-testid="sort-rating"]');

    // Wait for sorted results
    await page.waitForLoadState('networkidle');

    // Get all ratings and verify they are in descending order
    const ratings = await page.locator('[data-testid="template-rating"]').allTextContents();
    const numericRatings = ratings.map(rating => parseFloat(rating));
    
    for (let i = 0; i < numericRatings.length - 1; i++) {
      expect(numericRatings[i]).toBeGreaterThanOrEqual(numericRatings[i + 1]);
    }
  });

  test('should navigate to template preview', async ({ page }) => {
    // Wait for templates to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Click on the first template
    await page.click('[data-testid="template-card"]', { position: { x: 100, y: 100 } });

    // Wait for navigation to preview page
    await page.waitForURL(/\/templates\/.*\/preview/);

    // Verify preview page elements
    await expect(page.locator('[data-testid="template-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-fields"]')).toBeVisible();
    await expect(page.locator('[data-testid="customize-button"]')).toBeVisible();
  });

  test('should display template details correctly', async ({ page }) => {
    // Navigate to a specific template preview
    await page.goto('/templates/business-agreement-template/preview');

    // Wait for template to load
    await expect(page.locator('[data-testid="template-title"]')).toBeVisible();

    // Verify template information is displayed
    await expect(page.locator('[data-testid="template-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-rating"]')).toBeVisible();

    // Verify legal compliance information
    await expect(page.locator('[data-testid="legal-areas"]')).toBeVisible();
    await expect(page.locator('[data-testid="compliance-tags"]')).toBeVisible();
    await expect(page.locator('[data-testid="jurisdiction"]')).toBeVisible();

    // Verify template fields are shown
    await expect(page.locator('[data-testid="template-fields"]')).toBeVisible();
    
    // Check if field details are displayed
    const fieldLabels = await page.locator('[data-testid="field-label"]').allTextContents();
    expect(fieldLabels.length).toBeGreaterThan(0);
  });

  test('should customize template with form validation', async ({ page }) => {
    // Navigate to template customization
    await page.goto('/templates/business-agreement-template/customize');

    // Wait for customization form to load
    await expect(page.locator('[data-testid="customization-form"]')).toBeVisible();

    // Try to save without filling required fields
    await page.click('[data-testid="save-button"]');

    // Verify validation errors are shown
    await expect(page.locator('[data-testid="validation-error"]').first()).toBeVisible();

    // Fill in required fields
    await page.fill('[data-testid="field-party1_name"]', 'ABC Company Pte Ltd');
    await page.fill('[data-testid="field-party2_name"]', 'XYZ Corporation');
    await page.fill('[data-testid="field-business_purpose"]', 'Software development and maintenance services agreement for enterprise applications');

    // Save the customization
    await page.click('[data-testid="save-button"]');

    // Wait for save confirmation
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Verify preview is updated
    await page.click('[data-testid="preview-button"]');
    await expect(page.locator('[data-testid="live-preview"]')).toContainText('ABC Company Pte Ltd');
    await expect(page.locator('[data-testid="live-preview"]')).toContainText('XYZ Corporation');
  });

  test('should generate and download documents', async ({ page }) => {
    // Navigate to template customization
    await page.goto('/templates/business-agreement-template/customize');

    // Wait for form to load
    await expect(page.locator('[data-testid="customization-form"]')).toBeVisible();

    // Fill in all required fields
    await page.fill('[data-testid="field-party1_name"]', 'Test Company Ltd');
    await page.fill('[data-testid="field-party2_name"]', 'Partner Corp');
    await page.fill('[data-testid="field-business_purpose"]', 'Joint venture for technology development and commercialization');

    // Save the customization
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Test PDF download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    // Test DOCX download
    const downloadPromise2 = page.waitForEvent('download');
    await page.click('[data-testid="download-docx"]');
    const download2 = await downloadPromise2;

    // Verify download
    expect(download2.suggestedFilename()).toMatch(/\.docx$/);
  });

  test('should handle template rating and reviews', async ({ page }) => {
    // Navigate to template preview
    await page.goto('/templates/business-agreement-template/preview');

    // Wait for page to load
    await expect(page.locator('[data-testid="template-title"]')).toBeVisible();

    // Navigate to reviews tab
    await page.click('[data-testid="reviews-tab"]');

    // Verify existing reviews are displayed
    await expect(page.locator('[data-testid="review-list"]')).toBeVisible();

    // Test rating submission (if user is logged in)
    if (await page.locator('[data-testid="rating-form"]').isVisible()) {
      // Select 5-star rating
      await page.click('[data-testid="star-5"]');

      // Add review text
      await page.fill('[data-testid="review-text"]', 'Excellent template with comprehensive coverage of business agreement terms. Very helpful for Singapore businesses.');

      // Submit rating
      await page.click('[data-testid="submit-rating"]');

      // Verify success message
      await expect(page.locator('[data-testid="rating-success"]')).toBeVisible();
    }
  });

  test('should handle template version management', async ({ page }) => {
    // Navigate to template versions (admin/creator only)
    await page.goto('/templates/business-agreement-template/versions');

    // Check if user has access
    if (await page.locator('[data-testid="version-history"]').isVisible()) {
      // Verify version history is displayed
      await expect(page.locator('[data-testid="version-list"]')).toBeVisible();

      // Test version comparison
      await page.click('[data-testid="compare-tab"]');
      await expect(page.locator('[data-testid="version-comparison"]')).toBeVisible();

      // Test creating new version
      await page.click('[data-testid="create-version-tab"]');
      await expect(page.locator('[data-testid="version-creator"]')).toBeVisible();
    }
  });

  test('should handle load more functionality', async ({ page }) => {
    // Navigate to template browser
    await page.goto('/templates');

    // Wait for initial templates to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Count initial templates
    const initialCount = await page.locator('[data-testid="template-card"]').count();

    // Click load more if available
    if (await page.locator('[data-testid="load-more-button"]').isVisible()) {
      await page.click('[data-testid="load-more-button"]');

      // Wait for new templates to load
      await page.waitForLoadState('networkidle');

      // Verify more templates are loaded
      const newCount = await page.locator('[data-testid="template-card"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/templates');

    // Wait for templates to load
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Verify mobile navigation works
    if (await page.locator('[data-testid="mobile-menu-button"]').isVisible()) {
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Verify layout adapts to tablet
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    // Verify desktop layout
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 for non-existent template
    await page.goto('/templates/non-existent-template/preview');
    
    // Verify error page is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-templates"]')).toBeVisible();

    // Test network error handling
    await page.route('**/api/templates/**', route => route.abort());
    await page.goto('/templates');

    // Verify error state is handled
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
  });

  test('should track analytics events', async ({ page }) => {
    // Set up network monitoring for analytics
    const analyticsRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('analytics') || request.url().includes('track')) {
        analyticsRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Navigate and interact with templates
    await page.goto('/templates');
    await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();

    // Click on a template
    await page.click('[data-testid="template-card"]');
    await page.waitForURL(/\/templates\/.*\/preview/);

    // Click customize
    await page.click('[data-testid="customize-button"]');
    await page.waitForURL(/\/templates\/.*\/customize/);

    // Verify analytics events were tracked
    expect(analyticsRequests.length).toBeGreaterThan(0);
    
    // Verify event types
    const eventTypes = analyticsRequests.map(req => {
      try {
        const data = JSON.parse(req.postData || '{}');
        return data.event_type;
      } catch {
        return null;
      }
    }).filter(Boolean);

    expect(eventTypes).toContain('template_view');
    expect(eventTypes).toContain('customization_started');
  });
});
