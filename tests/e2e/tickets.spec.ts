import { test, expect } from '@playwright/test';

test.describe('Helpdesk Tickets & SLA Workflows E2E Flow', () => {
  test('should render Tickets table and filter toolbar', async ({ page }) => {
    await page.goto('/tickets');

    await expect(page.getByRole('heading', { name: /Helpdesk Support Tickets/ })).toBeVisible();
    await expect(page.getByPlaceholder(/ค้นหาตามรหัส Ticket/)).toBeVisible();
    await expect(page.getByRole('button', { name: /เปิด Ticket ใหม่/ })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should open Create Ticket modal and validate form inputs', async ({ page }) => {
    await page.goto('/tickets');

    // Open modal
    await page.getByRole('button', { name: /เปิด Ticket ใหม่/ }).click();

    await expect(page.getByRole('heading', { name: /เปิด Ticket แจ้งปัญหาใหม่/ })).toBeVisible();
    await expect(page.getByLabel('หัวข้อปัญหา (Subject / Title)')).toBeVisible();
    await expect(page.getByLabel('หมวดหมู่ (Category)')).toBeVisible();
    await expect(page.getByLabel('ความสำคัญ (Priority)')).toBeVisible();
    await expect(page.getByLabel('ชื่อผู้แจ้ง (Reporter Name)')).toBeVisible();
    await expect(page.getByLabel('รายละเอียดเพิ่มเติม (Description)')).toBeVisible();

    // Fill form
    await page.getByLabel('หัวข้อปัญหา (Subject / Title)').fill('E2E Test: Wi-Fi Disconnection on 4th Floor');
    await page.getByLabel('หมวดหมู่ (Category)').selectOption('Network');
    await page.getByLabel('ความสำคัญ (Priority)').selectOption('High');
    await page.getByLabel('ชื่อผู้แจ้ง (Reporter Name)').fill('Playwright QA Robot');
    await page.getByLabel('รายละเอียดเพิ่มเติม (Description)').fill('Automated E2E test ticket description details.');

    // Cancel modal
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(page.getByRole('heading', { name: /เปิด Ticket แจ้งปัญหาใหม่/ })).not.toBeVisible();
  });
});
