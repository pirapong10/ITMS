import { GET as getPlansHandler } from '../../app/api/v1/billing/plans/route';
import { GET as getSubscriptionHandler, POST as subscribeHandler } from '../../app/api/v1/billing/subscription/route';
import { POST as cancelSubscriptionHandler } from '../../app/api/v1/billing/subscription/cancel/route';
import { GET as listInvoicesHandler } from '../../app/api/v1/billing/invoices/route';
import { GET as getInvoiceHandler } from '../../app/api/v1/billing/invoices/[id]/route';
import { POST as checkoutHandler } from '../../app/api/v1/billing/checkout/route';
import { POST as webhookHandler } from '../../app/api/v1/billing/webhooks/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Billing Engine & Subscription API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-bil-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Billing Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-bil-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Billing Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    tokenA = signJwt({
      userId: 'user-admin-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenB = signJwt({
      userId: 'user-admin-b',
      tenantId: tenantBId,
      role: 'IT Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let generatedInvoiceId: string;

  it('should list available subscription plans', async () => {
    const res = await getPlansHandler();
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.plans.length).toBeGreaterThanOrEqual(3);
    const starter = data.plans.find((p: any) => p.id === 'plan_starter');
    expect(starter).toBeDefined();
    expect(Number(starter.price_monthly_usd)).toBe(29);
  });

  it('should subscribe tenant to Starter plan and generate invoice', async () => {
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        plan_id: 'plan_starter',
        billing_cycle: 'Monthly',
        currency: 'USD',
        payment_gateway: 'Stripe',
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.subscription).toBeDefined();
    expect(data.subscription.plan_id).toBe('plan_starter');
    expect(data.subscription.status).toBe('Active');

    expect(data.invoice).toBeDefined();
    expect(data.invoice.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(data.invoice.amount).toBe(29);
    expect(data.invoice.tax_amount).toBe(2.03); // 7% VAT
    expect(data.invoice.total_amount).toBe(31.03);

    generatedInvoiceId = data.invoice.id;
  });

  it('should retrieve current active subscription', async () => {
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const res = await getSubscriptionHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.subscription.plan_id).toBe('plan_starter');
    expect(data.plan.name).toBe('Starter');
  });

  it('should list invoices and retrieve invoice detail', async () => {
    // 1. List invoices
    const listReq = new Request('http://localhost/api/v1/billing/invoices', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listRes = await listInvoicesHandler(listReq);
    expect(listRes.status).toBe(200);
    const listData: any = await listRes.json();
    expect(listData.invoices.length).toBeGreaterThanOrEqual(1);

    // 2. Get invoice detail
    const getReq = new Request(`http://localhost/api/v1/billing/invoices/${generatedInvoiceId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getRes = await getInvoiceHandler(getReq, { params: Promise.resolve({ id: generatedInvoiceId }) });
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.invoice.id).toBe(generatedInvoiceId);
    expect(getData.invoice.total_amount).toBe(31.03);
  });

  it('should upgrade subscription to Professional plan with THB currency', async () => {
    const req = new Request('http://localhost/api/v1/billing/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        plan_id: 'plan_pro',
        billing_cycle: 'Monthly',
        currency: 'THB',
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.subscription.plan_id).toBe('plan_pro');
    expect(data.subscription.currency).toBe('THB');
    expect(data.invoice.amount).toBe(2690);
  });

  it('should cancel subscription scheduled at period end', async () => {
    const req = new Request('http://localhost/api/v1/billing/subscription/cancel', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const res = await cancelSubscriptionHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.subscription.cancel_at_period_end).toBe(true);
  });

  it('should create a checkout session', async () => {
    const req = new Request('http://localhost/api/v1/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        plan_id: 'plan_enterprise',
        billing_cycle: 'Yearly',
        currency: 'USD',
        payment_gateway: 'Stripe',
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.sessionId).toBeDefined();
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(data.amount).toBe(1990);
  });

  it('should handle webhook event for payment confirmation', async () => {
    const req = new Request('http://localhost/api/v1/billing/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'evt_stripe_999',
        type: 'payment_intent.succeeded',
        gateway: 'Stripe',
        data: {
          amount: 3103,
          currency: 'usd',
        },
      }),
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.processed).toBe(true);
  });

  it('should enforce Tenant Isolation: Tenant B cannot view Tenant A invoices', async () => {
    const req = new Request('http://localhost/api/v1/billing/invoices', {
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    const res = await listInvoicesHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.invoices.length).toBe(0);
  });
});
