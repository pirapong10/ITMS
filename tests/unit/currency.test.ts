import {
  formatCurrency,
  ConvertCurrencySchema,
  getExchangeRates,
  convertCurrency,
} from '../../src/lib/currency';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Multi-Currency Engine (Unit Tests)', () => {
  const mockQuery = db.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    it('should format GBP and SGD with symbols', () => {
      expect(formatCurrency(50, 'GBP')).toBe('£50.00');
      expect(formatCurrency(75, 'SGD')).toBe('S$75.00');
    });

    it('should fallback to currency code prefix when symbol unknown', () => {
      expect(formatCurrency(100, 'AUD')).toContain('AUD');
    });
  });

  describe('getExchangeRates', () => {
    it('should query and return mapped exchange rates', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'rate-1',
            base_currency: 'USD',
            target_currency: 'THB',
            rate: '35.5',
            updated_at: '2026-08-25T00:00:00.000Z',
          },
        ],
      });

      const rates = await getExchangeRates();
      expect(rates.length).toBe(1);
      expect(rates[0].rate).toBe(35.5);
      expect(rates[0].base_currency).toBe('USD');
      expect(rates[0].target_currency).toBe('THB');
    });
  });

  describe('convertCurrency', () => {
    it('should return immediate result if from and to currency are identical', async () => {
      const res = await convertCurrency(100, 'USD', 'USD');
      expect(res.fromAmount).toBe(100);
      expect(res.toAmount).toBe(100);
      expect(res.rate).toBe(1.0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should convert using direct rate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', base_currency: 'USD', target_currency: 'THB', rate: 35.5, updated_at: '2026-08-25' },
        ],
      });

      const res = await convertCurrency(100, 'USD', 'THB');
      expect(res.toAmount).toBe(3550);
      expect(res.rate).toBe(35.5);
    });

    it('should convert using inverted direct rate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', base_currency: 'USD', target_currency: 'EUR', rate: 0.9, updated_at: '2026-08-25' },
        ],
      });

      const res = await convertCurrency(90, 'EUR', 'USD');
      expect(res.toAmount).toBe(100);
    });

    it('should convert using cross-rate via USD', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', base_currency: 'USD', target_currency: 'THB', rate: 35.0, updated_at: '2026-08-25' },
          { id: '2', base_currency: 'USD', target_currency: 'EUR', rate: 0.9, updated_at: '2026-08-25' },
        ],
      });

      // EUR -> THB: EUR -> USD (1/0.9) * USD -> THB (35) = 38.8888
      const res = await convertCurrency(10, 'EUR', 'THB');
      expect(res.toAmount).toBeGreaterThan(380);
    });

    it('should throw error when exchange rate is unavailable', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(convertCurrency(100, 'USD', 'JPY')).rejects.toThrow('Exchange rate not available');
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
