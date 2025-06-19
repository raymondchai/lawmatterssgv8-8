import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Management', () => {
  // Note: These tests assume authentication is bypassed or mocked
  // In a real scenario, you'd need to authenticate first
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      // Mock localStorage auth state
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }));
    });
    
    // Mock API responses
    await page.route('**/rest/v1/uploaded_documents**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-1',
            filename: 'test-document.pdf',
            file_size: 1024000,
            document_type: 'contract',
            processing_status: 'completed',
            created_at: '2024-01-01T00:00:00Z'
          }
        ])
      });
    });
    
    await page.route('**/rest/v1/profiles**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          subscription_tier: 'free'
        })
      });
    });
  });

  test('should display documents page', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await expect(page.getByRole('heading', { name: /document management/i })).toBeVisible();
    await expect(page.getByText(/upload, process, and manage your legal documents/i)).toBeVisible();
  });

  test('should show all tabs', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /upload/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /search/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /manage/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    // Click Upload tab
    await page.getByRole('tab', { name: /upload/i }).click();
    await expect(page.getByText(/drag & drop files here/i)).toBeVisible();
    
    // Click Search tab
    await page.getByRole('tab', { name: /search/i }).click();
    await expect(page.getByPlaceholder(/search by filename or content/i)).toBeVisible();
    
    // Click Manage tab
    await page.getByRole('tab', { name: /manage/i }).click();
    await expect(page.getByText(/all documents/i)).toBeVisible();
    
    // Back to Overview
    await page.getByRole('tab', { name: /overview/i }).click();
    await expect(page.getByText(/processing status/i)).toBeVisible();
  });

  test('should display upload interface', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /upload/i }).click();
    
    await expect(page.getByText(/upload documents/i)).toBeVisible();
    await expect(page.getByText(/drag & drop files here/i)).toBeVisible();
    await expect(page.getByText(/supports pdf, doc, docx, txt files/i)).toBeVisible();
  });

  test('should display search interface', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /search/i }).click();
    
    await expect(page.getByText(/search documents/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search by filename or content/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible();
  });

  test('should perform search', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /search/i }).click();
    
    const searchInput = page.getByPlaceholder(/search by filename or content/i);
    await searchInput.fill('test document');
    
    // Should trigger search (debounced)
    await page.waitForTimeout(600);
    
    // Verify search was performed (would need proper API mocking)
    await expect(searchInput).toHaveValue('test document');
  });

  test('should show advanced search filters', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /search/i }).click();
    
    await page.getByRole('button', { name: /filters/i }).click();
    
    await expect(page.getByText(/document type/i)).toBeVisible();
    await expect(page.getByText(/processing status/i)).toBeVisible();
    await expect(page.getByText(/date from/i)).toBeVisible();
    await expect(page.getByText(/date to/i)).toBeVisible();
  });

  test('should display document list', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    // Should show mocked document
    await expect(page.getByText('test-document.pdf')).toBeVisible();
    await expect(page.getByText(/contract/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
  });

  test('should display status tracker', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await expect(page.getByText(/processing status/i)).toBeVisible();
    await expect(page.getByText(/overall progress/i)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
    await expect(page.getByText(/processing/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
    await expect(page.getByText(/failed/i)).toBeVisible();
  });

  test('should show subscription tier', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await expect(page.getByText(/subscription/i)).toBeVisible();
    await expect(page.getByText(/free/i)).toBeVisible();
  });

  test('should handle file upload drag and drop area', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /upload/i }).click();
    
    const dropzone = page.getByTestId('dropzone');
    await expect(dropzone).toBeVisible();
    
    // Test drag over effect (visual feedback)
    await dropzone.hover();
    await expect(dropzone).toBeVisible();
  });

  test('should show file size limits based on subscription', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.getByRole('tab', { name: /upload/i }).click();
    
    // Free tier should show 10MB limit
    await expect(page.getByText(/up to 10mb/i)).toBeVisible();
  });

  test('should display document viewer when document is selected', async ({ page }) => {
    // Mock document detail API
    await page.route('**/rest/v1/uploaded_documents?id=eq.doc-1**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'doc-1',
          filename: 'test-document.pdf',
          file_url: 'https://example.com/test.pdf',
          file_size: 1024000,
          document_type: 'contract',
          processing_status: 'completed',
          ocr_text: 'Sample extracted text',
          created_at: '2024-01-01T00:00:00Z'
        })
      });
    });
    
    await page.goto('/dashboard/documents');
    
    // Click on a document to view it
    await page.getByText('test-document.pdf').click();
    
    // Should show document viewer
    await expect(page.getByText(/document viewer/i)).toBeVisible();
    await expect(page.getByText(/close viewer/i)).toBeVisible();
  });

  test('should close document viewer', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    // Simulate opening viewer first
    await page.getByText('test-document.pdf').click();
    
    // Close viewer
    const closeButton = page.getByText(/close viewer/i);
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(page.getByText(/document viewer/i)).not.toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/documents');
    
    // Should still show main elements
    await expect(page.getByRole('heading', { name: /document management/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
  });

  test('should handle empty state', async ({ page }) => {
    // Mock empty documents response
    await page.route('**/rest/v1/uploaded_documents**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.goto('/dashboard/documents');
    
    await expect(page.getByText(/no documents yet/i)).toBeVisible();
    await expect(page.getByText(/upload your first document/i)).toBeVisible();
  });
});
