import {
  calculateTax,
  calculateProration,
  SubscribePlanSchema,
  CheckoutSessionSchema,
  WebhookEventSchema,
} from '../../src/lib/billing';

describe('Billing Engine & Payment Gateway (Unit Tests)', () => {
  describe('Tax & VAT Calculation', () => {
    it('should calculate 7% VAT correctly', () => {
      const { subtotal, taxAmount, totalAmount } = calculateTax(100, 0.07);
      expect(subtotal).toBe(100);
      expect(taxAmount).toBe(7);
      expect(totalAmount).toBe(107);
    });

    it('should round tax amounts correctly to 2 decimal places', () => {
      const { subtotal, taxAmount, totalAmount } = calculateTax(29, 0.07);
      expect(subtotal).toBe(29);
      expect(taxAmount).toBe(2.03);
      expect(totalAmount).toBe(31.03);
    });
  });

  describe('Proration Engine', () => {
    it('should calculate net prorated amount when upgrading mid-period', () => {
      // 15 days remaining out of 30 days period
      // Current: $30/mo ($15 unused credit)
      // New: $90/mo ($45 charge)
      // Net: $45 - $15 = $30
      const res = calculateProration(30, 90, 30, 15);
      expect(res.unusedCredit).toBe(15);
      expect(res.newPlanCharge).toBe(45);
      expect(res.netProratedAmount).toBe(30);
    });

    it('should handle zero remaining days without division by zero', () => {
      const res = calculateProration(30, 90, 30, 0);
      expect(res.netProratedAmount).toBe(90);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid subscribe plan input', () => {
      const payload = {
        plan_id: 'plan_pro' as const,
        billing_cycle: 'Yearly' as const,
        currency: 'THB' as const,
      };
      const parsed = SubscribePlanSchema.parse(payload);
      expect(parsed.plan_id).toBe('plan_pro');
      expect(parsed.billing_cycle).toBe('Yearly');
      expect(parsed.currency).toBe('THB');
      expect(parsed.payment_gateway).toBe('Stripe');
    });

    it('should validate valid webhook event', () => {
      const payload = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        gateway: 'Stripe' as const,
        data: { amount: 3103, currency: 'usd' },
      };
      const parsed = WebhookEventSchema.parse(payload);
      expect(parsed.id).toBe('evt_test_123');
      expect(parsed.type).toBe('payment_intent.succeeded');
    });
  });
});
