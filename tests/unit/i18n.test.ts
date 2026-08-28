import {
  translate,
  resolveLocale,
  UpdateI18nSettingsSchema,
  getTenantI18nSettings,
  updateTenantI18nSettings,
} from '../../src/lib/i18n';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Internationalization (i18n) Engine (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Translation Engine & Fallback', () => {
    it('should translate keys accurately in English', () => {
      expect(translate('common.save', { locale: 'en' })).toBe('Save');
      expect(translate('tickets.priority.critical', { locale: 'en' })).toBe('Critical (2h SLA)');
    });

    it('should translate keys accurately in Thai', () => {
      expect(translate('common.save', { locale: 'th' })).toBe('บันทึก');
      expect(translate('tickets.priority.critical', { locale: 'th' })).toBe('วิกฤต (SLA 2 ชม.)');
    });

    it('should interpolate variable parameters into translation template', () => {
      const res = translate('tickets.created_success', {
        locale: 'th',
        params: { ticket_number: 'TK-2026-0001', name: 'สมชาย' },
      });
      expect(res).toBe('สร้าง Ticket TK-2026-0001 เรียบร้อยแล้วสำหรับคุณ สมชาย');
    });

    it('should fallback to English if key is missing in target locale', () => {
      const res = translate('common.save', { locale: 'fr', fallbackLocale: 'en' });
      expect(res).toBe('Save');
    });

    it('should return key name itself if translation is missing everywhere', () => {
      const res = translate('unknown.nonexistent.key', { locale: 'th' });
      expect(res).toBe('unknown.nonexistent.key');
    });
  });

  describe('Locale Resolution', () => {
    it('should resolve locale from query param ?lang=th', () => {
      const req = new Request('http://localhost/api/v1/tickets?lang=th');
      expect(resolveLocale(req)).toBe('th');
    });

    it('should resolve locale from query param ?locale=en', () => {
      const req = new Request('http://localhost/api/v1/tickets?locale=en');
      expect(resolveLocale(req)).toBe('en');
    });

    it('should resolve locale from Accept-Language header', () => {
      const req = new Request('http://localhost/api/v1/tickets', {
        headers: { 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' },
      });
      expect(resolveLocale(req)).toBe('th');
    });

    it('should resolve english from Accept-Language header', () => {
      const req = new Request('http://localhost/api/v1/tickets', {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      });
      expect(resolveLocale(req)).toBe('en');
    });

    it('should fallback to default locale when no header or param is given', () => {
      const req = new Request('http://localhost/api/v1/tickets');
      expect(resolveLocale(req, 'en')).toBe('en');
    });
  });

  describe('Tenant Settings Management', () => {
    const tenantId = 'tenant-123';

    it('should return existing settings if found in DB', async () => {
      const mockSettings = {
        tenant_id: tenantId,
        default_language: 'th',
        supported_languages: ['th', 'en'],
        default_currency: 'THB',
        supported_currencies: ['THB', 'USD'],
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockSettings] }),
        };
        return cb(client);
      });

      const res = await getTenantI18nSettings(tenantId);
      expect(res.default_language).toBe('th');
    });

    it('should insert and return default settings if row does not exist', async () => {
      const newSettings = {
        tenant_id: tenantId,
        default_language: 'en',
        supported_languages: ['en', 'th'],
        default_currency: 'USD',
        supported_currencies: ['USD', 'THB'],
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // first SELECT
            .mockResolvedValueOnce({ rows: [newSettings] }), // INSERT RETURNING
        };
        return cb(client);
      });

      const res = await getTenantI18nSettings(tenantId);
      expect(res.default_currency).toBe('USD');
    });

    it('should update tenant i18n settings with all parameters', async () => {
      const updatedSettings = {
        tenant_id: tenantId,
        default_language: 'th',
        supported_languages: ['th'],
        default_currency: 'THB',
        supported_currencies: ['THB'],
      };

      const client = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT * FROM tenant_i18n_settings')) {
            return { rows: [{ tenant_id: tenantId, default_language: 'en' }] };
          }
          if (sql.includes('UPDATE tenant_i18n_settings')) {
            return { rows: [updatedSettings] };
          }
          return { rows: [] };
        }),
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => cb(client));

      const res = await updateTenantI18nSettings(tenantId, {
        default_language: 'th',
        supported_languages: ['th'],
        default_currency: 'THB',
        supported_currencies: ['THB'],
      });

      expect(res.default_language).toBe('th');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid i18n settings update', () => {
      const payload = {
        default_language: 'th' as const,
        default_currency: 'THB' as const,
      };
      const parsed = UpdateI18nSettingsSchema.parse(payload);
      expect(parsed.default_language).toBe('th');
      expect(parsed.default_currency).toBe('THB');
    });
  });
});
