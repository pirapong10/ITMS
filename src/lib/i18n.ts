import { z } from 'zod';
import { withTenantTransaction } from './db';

// Dictionaries
export const enDictionary = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    status: 'Status',
    search: 'Search...',
    loading: 'Loading...',
    success: 'Operation completed successfully',
    error: 'An error occurred',
  },
  nav: {
    dashboard: 'Dashboard',
    helpdesk: 'Helpdesk & SLA',
    assets: 'IT Assets',
    licenses: 'Software Licenses',
    projects: 'Projects & Tasks',
    routines: 'Daily Routines',
    billing: 'Billing & Plans',
    admin: 'Super Admin',
  },
  tickets: {
    title: 'Ticket Title',
    priority: {
      critical: 'Critical (2h SLA)',
      high: 'High (8h SLA)',
      medium: 'Medium (24h SLA)',
      low: 'Low (48h SLA)',
    },
    status: {
      open: 'Open',
      in_progress: 'In Progress',
      waiting_user: 'Waiting for User',
      waiting_vendor: 'Waiting for Vendor',
      resolved: 'Resolved',
      closed: 'Closed',
    },
    created_success: 'Ticket {ticket_number} created successfully for {name}',
    sla_breached: 'SLA Breached',
    sla_met: 'SLA Met',
    resolution_notes: 'Resolution Notes',
    csat_rating: 'Customer Satisfaction Score',
  },
  assets: {
    asset_tag: 'Asset Tag',
    depreciation: 'Straight-line Depreciation (20%/yr)',
    book_value: 'Current Book Value',
    warranty_active: 'Warranty Active',
    warranty_expiring: 'Warranty Expiring Soon',
    warranty_expired: 'Warranty Expired',
  },
  licenses: {
    seats_allocated: '{allocated} of {total} seats allocated',
    quota_exceeded: 'Quota exceeded for {software}',
  },
  billing: {
    subscription_active: 'Active Subscription',
    mrr: 'Monthly Recurring Revenue',
    vat_included: 'Includes 7% VAT',
  },
};

export const thDictionary = {
  common: {
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    delete: 'ลบ',
    edit: 'แก้ไข',
    create: 'สร้างใหม่',
    status: 'สถานะ',
    search: 'ค้นหา...',
    loading: 'กำลังโหลด...',
    success: 'ดำเนินการสำเร็จ',
    error: 'เกิดข้อผิดพลาด',
  },
  nav: {
    dashboard: 'แดชบอร์ดภาพรวม',
    helpdesk: 'ระบบแจ้งซ่อมและ SLA',
    assets: 'ทะเบียนทรัพย์สินไอที',
    licenses: 'จัดการไลเซนส์ซอฟต์แวร์',
    projects: 'โครงการและงานไอที',
    routines: 'งานประจำวันและบำรุงรักษา',
    billing: 'แพ็กเกจและการชำระเงิน',
    admin: 'ผู้ดูแลระบบส่วนกลาง',
  },
  tickets: {
    title: 'หัวข้อการแจ้งปัญหา',
    priority: {
      critical: 'วิกฤต (SLA 2 ชม.)',
      high: 'สูง (SLA 8 ชม.)',
      medium: 'ปานกลาง (SLA 24 ชม.)',
      low: 'ต่ำ (SLA 48 ชม.)',
    },
    status: {
      open: 'รอดำเนินการ',
      in_progress: 'กำลังดำเนินการ',
      waiting_user: 'รอข้อมูลจากผู้ใช้ (หยุด SLA)',
      waiting_vendor: 'รออะไหล่/เวนเดอร์ (หยุด SLA)',
      resolved: 'แก้ไขเสร็จสิ้น',
      closed: 'ปิดงาน',
    },
    created_success: 'สร้าง Ticket {ticket_number} เรียบร้อยแล้วสำหรับคุณ {name}',
    sla_breached: 'เกินเวลา SLA',
    sla_met: 'ตรงตาม SLA',
    resolution_notes: 'บันทึกสรุปการแก้ไข',
    csat_rating: 'คะแนนความพึงพอใจการบริการ',
  },
  assets: {
    asset_tag: 'รหัสทรัพย์สิน',
    depreciation: 'ค่าเสื่อมราคาแบบเส้นตรง (20% ต่อปี)',
    book_value: 'มูลค่าทางบัญชีคงเหลือ',
    warranty_active: 'อยู่ในประกัน',
    warranty_expiring: 'ใกล้หมดประกัน (<= 60 วัน)',
    warranty_expired: 'หมดประกันแล้ว',
  },
  licenses: {
    seats_allocated: 'จัดสรรแล้ว {allocated} จาก {total} ที่นั่ง',
    quota_exceeded: 'โควต้าที่นั่งเต็มสำหรับ {software}',
  },
  billing: {
    subscription_active: 'สมาชิกแพ็กเกจที่ใช้งานอยู่',
    mrr: 'รายได้ประจำรายเดือน (MRR)',
    vat_included: 'รวมภาษีมูลค่าเพิ่ม 7% แล้ว',
  },
};

export const dictionaries: Record<string, any> = {
  en: enDictionary,
  th: thDictionary,
};

// Zod Validation Schemas
export const UpdateI18nSettingsSchema = z.object({
  default_language: z.enum(['en', 'th']).optional(),
  supported_languages: z.array(z.string()).optional(),
  default_currency: z.enum(['USD', 'THB', 'EUR', 'SGD', 'JPY', 'GBP']).optional(),
  supported_currencies: z.array(z.string()).optional(),
});

export type UpdateI18nSettingsInput = z.input<typeof UpdateI18nSettingsSchema>;

export interface I18nSettingsRecord {
  tenant_id: string;
  default_language: string;
  supported_languages: string[];
  default_currency: string;
  supported_currencies: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Resolves nested property in object by dot notation path (e.g. "tickets.priority.critical")
 */
function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Core Translation Function with fallback and variable interpolation.
 */
export function translate(
  key: string,
  options: {
    locale?: string;
    params?: Record<string, any>;
    fallbackLocale?: string;
  } = {}
): string {
  const locale = options.locale || 'en';
  const fallbackLocale = options.fallbackLocale || 'en';

  const dict = dictionaries[locale] || dictionaries[fallbackLocale] || enDictionary;
  let text = getNestedValue(dict, key);

  // Fallback if not found in primary dictionary
  if (!text && locale !== fallbackLocale) {
    const fallbackDict = dictionaries[fallbackLocale] || enDictionary;
    text = getNestedValue(fallbackDict, key);
  }

  // If still missing, return the key itself
  if (!text) return key;

  // Interpolate parameters {var}
  if (options.params) {
    for (const [paramKey, paramVal] of Object.entries(options.params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return text;
}

/**
 * Negotiates locale from request query param or Accept-Language header.
 */
export function resolveLocale(req: Request, tenantDefault: string = 'en'): string {
  const url = new URL(req.url);
  const queryLang = url.searchParams.get('lang') || url.searchParams.get('locale');
  if (queryLang && dictionaries[queryLang.toLowerCase()]) {
    return queryLang.toLowerCase();
  }

  const acceptLang = req.headers.get('accept-language');
  if (acceptLang) {
    if (acceptLang.includes('th')) return 'th';
    if (acceptLang.includes('en')) return 'en';
  }

  return tenantDefault;
}

/**
 * Retrieves tenant i18n settings.
 */
export async function getTenantI18nSettings(tenantId: string): Promise<I18nSettingsRecord> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM tenant_i18n_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (res.rows.length === 0) {
      // Create default settings row
      const insertRes = await client.query(
        `INSERT INTO tenant_i18n_settings (
          tenant_id, default_language, supported_languages,
          default_currency, supported_currencies, created_at, updated_at
        ) VALUES ($1, 'en', '["en", "th"]'::jsonb, 'USD', '["USD", "THB"]'::jsonb, current_timestamp, current_timestamp)
        RETURNING *;`,
        [tenantId]
      );
      return insertRes.rows[0];
    }

    return res.rows[0];
  });
}

/**
 * Updates tenant i18n settings.
 */
export async function updateTenantI18nSettings(
  tenantId: string,
  input: UpdateI18nSettingsInput
): Promise<I18nSettingsRecord> {
  const validated = UpdateI18nSettingsSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    // Ensure settings exist first
    await getTenantI18nSettings(tenantId);

    const updates: string[] = ['updated_at = current_timestamp'];
    const values: any[] = [];
    let paramIndex = 1;

    if (validated.default_language !== undefined) {
      updates.push(`default_language = $${paramIndex}`);
      values.push(validated.default_language);
      paramIndex++;
    }
    if (validated.supported_languages !== undefined) {
      updates.push(`supported_languages = $${paramIndex}`);
      values.push(JSON.stringify(validated.supported_languages));
      paramIndex++;
    }
    if (validated.default_currency !== undefined) {
      updates.push(`default_currency = $${paramIndex}`);
      values.push(validated.default_currency);
      paramIndex++;
    }
    if (validated.supported_currencies !== undefined) {
      updates.push(`supported_currencies = $${paramIndex}`);
      values.push(JSON.stringify(validated.supported_currencies));
      paramIndex++;
    }

    values.push(tenantId);

    const res = await client.query(
      `UPDATE tenant_i18n_settings SET ${updates.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING *;`,
      values
    );

    return res.rows[0];
  });
}
