import {
  translate,
  resolveLocale,
  UpdateI18nSettingsSchema,
} from '../../src/lib/i18n';

describe('Internationalization (i18n) Engine (Unit Tests)', () => {
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

    it('should resolve locale from Accept-Language header', () => {
      const req = new Request('http://localhost/api/v1/tickets', {
        headers: { 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' },
      });
      expect(resolveLocale(req)).toBe('th');
    });

    it('should fallback to default locale when no header or param is given', () => {
      const req = new Request('http://localhost/api/v1/tickets');
      expect(resolveLocale(req, 'en')).toBe('en');
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
