import { test, expect } from '@playwright/test';

test.describe('Advanced ITIL & Operations Workflows E2E Flow', () => {
  test('should render Projects page and Kanban task board', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: /Project Management & Kanban Tasks/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /สร้าง Project/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /สร้าง Task ใหม่/ })).toBeVisible();

    // Verify Kanban columns
    await expect(page.getByText(/To Do \(รอดำเนินการ\)/)).toBeVisible();
    await expect(page.getByText(/In Progress \(กำลังทำ\)/)).toBeVisible();
    await expect(page.getByText(/In Review \(ตรวจสอบ\)/)).toBeVisible();
    await expect(page.getByText(/Completed \(เสร็จสิ้น\)/)).toBeVisible();
  });

  test('should switch tabs in Operations & PM module', async ({ page }) => {
    await page.goto('/operations');

    await expect(page.getByRole('heading', { name: /IT Operations, PM & Routine Management/ })).toBeVisible();

    // Tab 1: PM Schedules
    await expect(page.getByRole('button', { name: /Preventive Maintenance \(PM\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /เพิ่มกำหนดการ PM/ })).toBeVisible();

    // Tab 2: Daily Routine Checklists
    await page.getByRole('button', { name: /Daily Routine Checklists/ }).click();
    await expect(page.getByRole('button', { name: /บันทึกการตรวจเช็กใหม่/ })).toBeVisible();

    // Tab 3: Asset Borrow & Return
    await page.getByRole('button', { name: /Asset Borrow & Return/ }).click();
    await expect(page.getByRole('button', { name: /บันทึกการยืมอุปกรณ์/ })).toBeVisible();
  });

  test('should render Change Enablement CAB Approvals page', async ({ page }) => {
    await page.goto('/changes');

    await expect(page.getByRole('heading', { name: /Change Enablement & CAB Approvals/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ยื่นคำขอ Change/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Change ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /ความเสี่ยง/ })).toBeVisible();
  });

  test('should render Problem Management page and toggle KEDB mode', async ({ page }) => {
    await page.goto('/problems');

    await expect(page.getByRole('heading', { name: /Problem Management & Known Error DB/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /เปิด Problem Case/ })).toBeVisible();

    // Toggle KEDB filter
    const kedbButton = page.getByRole('button', { name: /เฉพาะ Known Error Database/ });
    await expect(kedbButton).toBeVisible();
    await kedbButton.click();
  });

  test('should render Self-Service Knowledge Base with categories and feedback', async ({ page }) => {
    await page.goto('/knowledge');

    await expect(page.getByRole('heading', { name: /Self-Service Knowledge Base/ })).toBeVisible();
    await expect(page.getByPlaceholder(/ค้นหาคู่มือการใช้งาน/)).toBeVisible();
    await expect(page.getByRole('button', { name: /สร้างบทความใหม่/ })).toBeVisible();

    // Category filter pills
    await expect(page.getByRole('button', { name: 'Hardware' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Software' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Network' })).toBeVisible();
  });

  test('should render Billing Subscriptions with Monthly/Yearly and Currency toggles', async ({ page }) => {
    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: /Billing & SaaS Subscriptions/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /รายเดือน \(Monthly\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /รายปี \(Yearly/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'THB ฿' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'USD $' })).toBeVisible();

    // Plan cards
    await expect(page.getByRole('heading', { name: 'Starter Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise SaaS' })).toBeVisible();
  });

  test('should render Super Admin platform control with SCIM token generator modal', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: /Super Administrator Platform Control/ })).toBeVisible();
    await expect(page.getByText('Total Active Tenants')).toBeVisible();
    await expect(page.getByText('Monthly Recurring Revenue')).toBeVisible();

    // Open SCIM Modal
    await page.getByRole('button', { name: /สร้าง SCIM Token/ }).click();
    await expect(page.getByRole('heading', { name: /สร้าง SCIM 2.0 Bearer Token/ })).toBeVisible();
    await expect(page.getByLabel(/Tenant ID/)).toBeVisible();
  });
});
