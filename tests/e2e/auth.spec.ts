import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding E2E Flow', () => {
  test('should render the login page with all elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/ITSM Enterprise/);
    await expect(page.getByRole('heading', { name: 'ITSM Enterprise' })).toBeVisible();
    await expect(page.getByLabel('Tenant ID / องค์กร')).toBeVisible();
    await expect(page.getByLabel('อีเมลผู้ใช้งาน (Email)')).toBeVisible();
    await expect(page.getByLabel('รหัสผ่าน (Password)')).toBeVisible();
    await expect(page.getByRole('button', { name: /เข้าสู่ระบบ/ })).toBeVisible();

    // SSO buttons
    await expect(page.getByRole('button', { name: 'Okta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'MS Entra' })).toBeVisible();
  });

  test('should autofill credentials using Quick Demo buttons', async ({ page }) => {
    await page.goto('/login');

    // Click Admin demo button
    await page.getByRole('button', { name: /IT Admin/ }).click();

    await expect(page.getByLabel('อีเมลผู้ใช้งาน (Email)')).toHaveValue('admin@company.com');
    await expect(page.getByLabel('รหัสผ่าน (Password)')).toHaveValue('Admin@123456');

    // Click Technician demo button
    await page.getByRole('button', { name: /Technician/ }).click();
    await expect(page.getByLabel('อีเมลผู้ใช้งาน (Email)')).toHaveValue('tech@company.com');

    // Click General User demo button
    await page.getByRole('button', { name: /General User/ }).click();
    await expect(page.getByLabel('อีเมลผู้ใช้งาน (Email)')).toHaveValue('user@company.com');
  });

  test('should navigate to Tenant Registration page and display registration form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /ลงทะเบียนองค์กรใหม่/ }).click();

    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: /สร้างองค์กรใหม่/ })).toBeVisible();
    await expect(page.getByLabel('ชื่อองค์กร / บริษัท (Company Name)')).toBeVisible();
    await expect(page.getByLabel('Subdomain ระบบ')).toBeVisible();
    await expect(page.getByLabel('ชื่อ-นามสกุล (Admin Name)')).toBeVisible();
  });

  test('should redirect unauthenticated users to login page', async ({ page }) => {
    // Clear any existing localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try navigating to a protected page
    await page.goto('/tickets');
    await page.waitForURL(/.*login/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);
  });
});

