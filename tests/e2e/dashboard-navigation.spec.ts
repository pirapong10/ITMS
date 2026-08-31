import { test, expect } from '@playwright/test';

test.describe('Dashboard & Global Navigation E2E Flow', () => {
  test('should render Executive Dashboard with StatCards and Quick Actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /ITSM Executive Dashboard/ })).toBeVisible();
    await expect(page.getByText('Active Helpdesk Tickets')).toBeVisible();
    await expect(page.getByText('SLA Compliance Rate')).toBeVisible();
    await expect(page.getByText('Managed IT Assets')).toBeVisible();
    await expect(page.getByRole('main').getByText('Software Licenses')).toBeVisible();

    // Quick action buttons
    await expect(page.getByRole('button', { name: /เปิด Helpdesk/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ลงทะเบียนสินทรัพย์/ })).toBeVisible();
  });

  test('should navigate across all ITIL modules via Sidebar', async ({ page }) => {
    await page.goto('/');

    // Navigate to Tickets
    await page.getByRole('link', { name: 'Helpdesk Tickets' }).click();
    await expect(page).toHaveURL(/.*tickets/);
    await expect(page.getByRole('heading', { name: /Helpdesk Support Tickets/ })).toBeVisible();

    // Navigate to Assets
    await page.getByRole('link', { name: 'IT Assets Inventory' }).click();
    await expect(page).toHaveURL(/.*assets/);
    await expect(page.getByRole('heading', { name: /IT Assets Inventory & Depreciation/ })).toBeVisible();

    // Navigate to Licenses
    await page.getByRole('link', { name: 'Software Licenses' }).click();
    await expect(page).toHaveURL(/.*licenses/);
    await expect(page.getByRole('heading', { name: /Software License & Seat Quotas/ })).toBeVisible();

    // Navigate to Projects
    await page.getByRole('link', { name: 'Projects & Tasks' }).click();
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.getByRole('heading', { name: /Project Management & Kanban Tasks/ })).toBeVisible();

    // Navigate to Operations
    await page.getByRole('link', { name: 'Operations & PM' }).click();
    await expect(page).toHaveURL(/.*operations/);
    await expect(page.getByRole('heading', { name: /IT Operations, PM & Routine Management/ })).toBeVisible();

    // Navigate to Changes
    await page.getByRole('link', { name: 'Change Enablement (CAB)' }).click();
    await expect(page).toHaveURL(/.*changes/);
    await expect(page.getByRole('heading', { name: /Change Enablement & CAB Approvals/ })).toBeVisible();

    // Navigate to Problems
    await page.getByRole('link', { name: 'Problem Management (RCA)' }).click();
    await expect(page).toHaveURL(/.*problems/);
    await expect(page.getByRole('heading', { name: /Problem Management & Known Error DB/ })).toBeVisible();

    // Navigate to Knowledge Base
    await page.getByRole('link', { name: 'Knowledge Base (KCS)' }).click();
    await expect(page).toHaveURL(/.*knowledge/);
    await expect(page.getByRole('heading', { name: /Self-Service Knowledge Base/ })).toBeVisible();

    // Navigate to Billing
    await page.getByRole('link', { name: 'Billing & Subscriptions' }).click();
    await expect(page).toHaveURL(/.*billing/);
    await expect(page.getByRole('heading', { name: /Billing & SaaS Subscriptions/ })).toBeVisible();

    // Navigate to Super Admin
    await page.getByRole('link', { name: 'Super Admin Portal' }).click();
    await expect(page).toHaveURL(/.*admin/);
    await expect(page.getByRole('heading', { name: /Super Administrator Platform Control/ })).toBeVisible();
  });

  test('should trigger Global Search Modal and perform query search', async ({ page }) => {
    await page.goto('/');

    // Click quick search bar in header
    await page.getByRole('button', { name: /ค้นหาทั่วระบบ/ }).click();

    // Verify modal is open
    const searchInput = page.getByPlaceholder(/ค้นหา Ticket, Asset, License/);
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('Ticket');
    await page.waitForTimeout(400);

    // Escape closes modal
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });
});
