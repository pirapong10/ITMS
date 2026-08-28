import {
  calculateTax,
  calculateProration,
  SubscribePlanSchema,
  CheckoutSessionSchema,
  WebhookEventSchema,
  getSubscriptionPlans,
  getTenantSubscription,
  subscribeOrUpgradePlan,
  cancelSubscription,
  listInvoices,
  getInvoiceById,
  createCheckoutSession,
  generateInvoiceNumber,
  processPaymentWebhook,
} from '../../src/lib/billing';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Billing Engine & Payment Gateway (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;
  const mockQuery = db.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('generateInvoiceNumber', () => {
    it('should generate formatted running invoice number', async () => {
      const client = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ count: '10' }] }),
      };
      const num = await generateInvoiceNumber(client, 'tenant-123', 2026);
      expect(num).toBe('INV-2026-0011');
    });
  });

  describe('Subscription & Invoicing operations', () => {
    const tenantId = 'tenant-123';

    it('should get subscription plans from DB', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'plan-pro',
            name: 'Pro',
            price_monthly_usd: '29',
            price_yearly_usd: '290',
            price_monthly_thb: '990',
            price_yearly_thb: '9900',
            max_users: '10',
            max_assets: '100',
          },
        ],
      });

      const plans = await getSubscriptionPlans();
      expect(plans.length).toBe(1);
      expect(plans[0].price_monthly_usd).toBe(29);
    });

    it('should get tenant subscription or return null if none', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getTenantSubscription(tenantId);
      expect(res.subscription).toBeNull();
    });

    it('should subscribe or upgrade tenant plan and generate invoice', async () => {
      const plan = {
        id: 'plan-pro',
        price_monthly_usd: '29',
        price_yearly_usd: '290',
        price_monthly_thb: '990',
        price_yearly_thb: '9900',
      };
      const sub = { id: 'sub-1', status: 'Active' };
      const inv = { id: 'inv-1', invoice_number: 'INV-2026-0001', total_amount: '31.03' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [plan] }) // select plan
            .mockResolvedValueOnce({ rows: [] }) // select existing sub
            .mockResolvedValueOnce({ rows: [sub] }) // insert sub
            .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate invoice number
            .mockResolvedValueOnce({ rows: [inv] }), // insert invoice
        };
        return cb(client);
      });

      const res = await subscribeOrUpgradePlan(tenantId, {
        plan_id: 'plan_pro',
        billing_cycle: 'Monthly',
        currency: 'USD',
      });

      expect(res.subscription.status).toBe('Active');
      expect(res.invoice.invoice_number).toBe('INV-2026-0001');
    });

    it('should cancel subscription at period end', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'sub-1', cancel_at_period_end: true }] }),
        };
        return cb(client);
      });

      const res = await cancelSubscription(tenantId);
      expect(res.cancel_at_period_end).toBe(true);
    });

    it('should list invoices and get invoice by ID', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'inv-1', total_amount: '100' }] }),
        };
        return cb(client);
      });

      const list = await listInvoices(tenantId);
      expect(list.length).toBe(1);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'inv-1', total_amount: '100' }] }),
        };
        return cb(client);
      });

      const inv = await getInvoiceById(tenantId, 'inv-1');
      expect(inv?.id).toBe('inv-1');
    });

    it('should create checkout session', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'plan-pro', price_monthly_usd: '29' }],
      });

      const session = await createCheckoutSession(tenantId, {
        plan_id: 'plan_pro',
        billing_cycle: 'Monthly',
        currency: 'USD',
      });

      expect(session.sessionId).toMatch(/^cs_stripe_/);
    });

    it('should process payment webhook events', async () => {
      const paymentRes = await processPaymentWebhook({
        id: 'evt_1',
        type: 'payment_intent.succeeded',
        gateway: 'Stripe',
        data: {},
      });
      expect(paymentRes.processed).toBe(true);

      const cancelRes = await processPaymentWebhook({
        id: 'evt_2',
        type: 'customer.subscription.deleted',
        gateway: 'Stripe',
        data: {},
      });
      expect(cancelRes.processed).toBe(true);
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
