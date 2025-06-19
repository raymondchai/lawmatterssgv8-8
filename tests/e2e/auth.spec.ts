import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    await expect(page).toHaveTitle(/LawMattersSG/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/auth/register');
    
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('should show validation errors on empty login form', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test('should show validation errors on empty register form', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.getByRole('button', { name: /create account/i }).click();
    
    await expect(page.getByText(/first name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/last name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth/login');
    
    const passwordInput = page.getByLabel(/password/i);
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should redirect to login when accessing documents page', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  // Note: Actual login/register tests would require a test database setup
  // and mock Supabase authentication. For now, we test the UI behavior.
  
  test('should show loading state during form submission', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Intercept the auth request to simulate loading
    await page.route('**/auth/v1/token**', async route => {
      // Delay the response to see loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.abort();
    });
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show loading state
    await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
    await expect(page.getByLabel(/email/i)).toBeDisabled();
    await expect(page.getByLabel(/password/i)).toBeDisabled();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
  });

  test('should validate password length', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('differentpassword');
    await page.getByRole('button', { name: /create account/i }).click();
    
    await expect(page.getByText(/passwords don't match/i)).toBeVisible();
  });
});
