import {
  formatCurrency,
  ConvertCurrencySchema,
} from '../../src/lib/currency';

describe('Multi-Currency Engine (Unit Tests)', () => {
  describe('Currency Formatting', () => {
    it('should format USD with dollar symbol', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00');
      expect(formatCurrency(1250.5, 'USD')).toBe('$1,250.50');
    });

    it('should format THB with Baht symbol', () => {
      expect(formatCurrency(3550, 'THB')).toBe('฿3,550.00');
    });

    it('should format EUR with Euro symbol', () => {
      expect(formatCurrency(92.5, 'EUR')).toBe('€92.50');
    });

    it('should format JPY without decimal places', () => {
      expect(formatCurrency(15500, 'JPY')).toBe('¥15,500');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid conversion payload', () => {
      const payload = {
        amount: 250,
        from_currency: 'USD' as const,
        to_currency: 'THB' as const,
      };
      const parsed = ConvertCurrencySchema.parse(payload);
      expect(parsed.amount).toBe(250);
      expect(parsed.from_currency).toBe('USD');
      expect(parsed.to_currency).toBe('THB');
    });

    it('should reject negative amount or unsupported currency', () => {
      expect(() =>
        ConvertCurrencySchema.parse({
          amount: -10,
          from_currency: 'USD',
          to_currency: 'THB',
        })
      ).toThrow();
    });
  });
});
