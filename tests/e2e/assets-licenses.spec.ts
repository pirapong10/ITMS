import { test, expect } from '@playwright/test';

test.describe('IT Assets & Software Licenses E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('itsm_auth_token', 'mock_e2e_jwt_token');
      localStorage.setItem('itsm_tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      localStorage.setItem('itsm_user_info', JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'IT Director Admin',
        email: 'admin@company.com',
        role: 'SuperAdmin',
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      }));
    });
  });

  test('should render IT Assets page with depreciation values and filters', async ({ page }) => {
    await page.goto('/assets');

    await expect(page.getByRole('heading', { name: /IT Assets Inventory & Depreciation/ })).toBeVisible();
    await expect(page.getByPlaceholder(/ค้นหา Asset Tag, ชื่อสินทรัพย์/)).toBeVisible();
    await expect(page.getByRole('button', { name: /ลงทะเบียนสินทรัพย์ใหม่/ })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Table header checks
    await expect(page.getByRole('columnheader', { name: 'Asset Tag' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /มูลค่าปัจจุบัน/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /สถานะประกัน/ })).toBeVisible();
  });

  test('should open and interact with Register Asset Modal', async ({ page }) => {
    await page.goto('/assets');

    await page.getByRole('button', { name: /ลงทะเบียนสินทรัพย์ใหม่/ }).click();

    await expect(page.getByRole('heading', { name: /ลงทะเบียนสินทรัพย์ใหม่/ })).toBeVisible();
    await expect(page.getByLabel('ชื่ออุปกรณ์ / สินทรัพย์ (Asset Name)')).toBeVisible();
    await expect(page.getByLabel('หมวดหมู่ (Category)')).toBeVisible();
    await expect(page.getByLabel('ราคาทุน (Cost บาท)')).toBeVisible();
    await expect(page.getByLabel('อัตราค่าเสื่อม (%/ปี)')).toBeVisible();

    // Cancel modal
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(page.getByRole('heading', { name: /ลงทะเบียนสินทรัพย์ใหม่/ })).not.toBeVisible();
  });

  test('should render Software Licenses page and quota seat meters', async ({ page }) => {
    await page.goto('/licenses');

    await expect(page.getByRole('heading', { name: /Software License & Seat Quotas/ })).toBeVisible();
    await expect(page.getByPlaceholder(/ค้นหาชื่อซอฟต์แวร์/)).toBeVisible();
    await expect(page.getByRole('button', { name: /เพิ่ม License ใหม่/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /การจัดสรรที่นั่ง/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /สถานะโควตา/ })).toBeVisible();
  });
});
