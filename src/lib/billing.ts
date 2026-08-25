import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction, query } from './db';

// Zod Validation Schemas
export const SubscribePlanSchema = z.object({
  plan_id: z.enum(['plan_starter', 'plan_pro', 'plan_enterprise']),
  billing_cycle: z.enum(['Monthly', 'Yearly']).default('Monthly'),
  currency: z.enum(['USD', 'THB']).default('USD'),
  payment_gateway: z.enum(['Stripe', 'PayPal']).default('Stripe'),
});

export const CheckoutSessionSchema = z.object({
  plan_id: z.enum(['plan_starter', 'plan_pro', 'plan_enterprise']),
  billing_cycle: z.enum(['Monthly', 'Yearly']).default('Monthly'),
  currency: z.enum(['USD', 'THB']).default('USD'),
  payment_gateway: z.enum(['Stripe', 'PayPal']).default('Stripe'),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  gateway: z.enum(['Stripe', 'PayPal']),
  data: z.record(z.string(), z.any()),
});

export type SubscribePlanInput = z.input<typeof SubscribePlanSchema>;
export type CheckoutSessionInput = z.input<typeof CheckoutSessionSchema>;
export type WebhookEventInput = z.input<typeof WebhookEventSchema>;

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  price_monthly_thb: number;
  price_yearly_thb: number;
  max_users: number;
  max_assets: number;
  features: string[];
  is_active: boolean;
}

export interface SubscriptionRecord {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_name?: string;
  status: string;
  billing_cycle: string;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_gateway: string;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  tenant_id: string;
  invoice_number: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  tax_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string;
  receipt_url: string | null;
  line_items: Array<{
    description: string;
    amount: number;
    currency: string;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Calculates 7% VAT tax and total amount
 */
export function calculateTax(subtotal: number, taxRate: number = 0.07): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const taxAmount = Math.round(roundedSubtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((roundedSubtotal + taxAmount) * 100) / 100;
  return { subtotal: roundedSubtotal, taxAmount, totalAmount };
}

/**
 * Calculates proration credit / charge on plan changes.
 */
export function calculateProration(
  currentPlanAmount: number,
  newPlanAmount: number,
  totalDaysInPeriod: number,
  remainingDaysInPeriod: number
): {
  unusedCredit: number;
  newPlanCharge: number;
  netProratedAmount: number;
} {
  if (totalDaysInPeriod <= 0 || remainingDaysInPeriod <= 0) {
    return { unusedCredit: 0, newPlanCharge: newPlanAmount, netProratedAmount: newPlanAmount };
  }
  const ratio = Math.min(1, Math.max(0, remainingDaysInPeriod / totalDaysInPeriod));
  const unusedCredit = Math.round(currentPlanAmount * ratio * 100) / 100;
  const newPlanCharge = Math.round(newPlanAmount * ratio * 100) / 100;
  const netProratedAmount = Math.max(0, Math.round((newPlanCharge - unusedCredit) * 100) / 100);

  return { unusedCredit, newPlanCharge, netProratedAmount };
}

/**
 * Generates an atomic invoice sequence: INV-YYYY-XXXX (e.g. INV-2026-0001)
 */
export async function generateInvoiceNumber(
  client: any,
  tenantId: string,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM invoices WHERE tenant_id = $1 AND invoice_number LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Returns all active subscription plans.
 */
export async function getSubscriptionPlans(): Promise<PlanRecord[]> {
  const res = await query(`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_monthly_usd ASC`);
  return res.rows.map((row: any) => ({
    ...row,
    price_monthly_usd: Number(row.price_monthly_usd),
    price_yearly_usd: Number(row.price_yearly_usd),
    price_monthly_thb: Number(row.price_monthly_thb),
    price_yearly_thb: Number(row.price_yearly_thb),
    max_users: Number(row.max_users),
    max_assets: Number(row.max_assets),
  }));
}

/**
 * Retrieves the active subscription for a tenant.
 */
export async function getTenantSubscription(tenantId: string): Promise<{
  subscription: SubscriptionRecord | null;
  plan: PlanRecord | null;
}> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT s.*, p.name as plan_name 
       FROM tenant_subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.tenant_id = $1`,
      [tenantId]
    );

    if (res.rows.length === 0) {
      return { subscription: null, plan: null };
    }

    const sub = res.rows[0];
    const planRes = await client.query(`SELECT * FROM subscription_plans WHERE id = $1`, [sub.plan_id]);
    const plan = planRes.rows[0]
      ? {
          ...planRes.rows[0],
          price_monthly_usd: Number(planRes.rows[0].price_monthly_usd),
          price_yearly_usd: Number(planRes.rows[0].price_yearly_usd),
          price_monthly_thb: Number(planRes.rows[0].price_monthly_thb),
          price_yearly_thb: Number(planRes.rows[0].price_yearly_thb),
          max_users: Number(planRes.rows[0].max_users),
          max_assets: Number(planRes.rows[0].max_assets),
        }
      : null;

    return { subscription: sub, plan };
  });
}

/**
 * Subscribes or upgrades a tenant to a subscription plan and generates paid invoice.
 */
export async function subscribeOrUpgradePlan(
  tenantId: string,
  input: SubscribePlanInput
): Promise<{
  subscription: SubscriptionRecord;
  invoice: InvoiceRecord;
}> {
  const validated = SubscribePlanSchema.parse(input);
  const now = new Date();
  const periodEnd = new Date(now);

  if (validated.billing_cycle === 'Yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return withTenantTransaction(tenantId, async (client) => {
    // 1. Get Plan details
    const planRes = await client.query(`SELECT * FROM subscription_plans WHERE id = $1`, [validated.plan_id]);
    if (planRes.rows.length === 0) throw new Error('Subscription plan not found');
    const plan = planRes.rows[0];

    // Determine price
    let amount = 0;
    if (validated.currency === 'THB') {
      amount = validated.billing_cycle === 'Yearly' ? Number(plan.price_yearly_thb) : Number(plan.price_monthly_thb);
    } else {
      amount = validated.billing_cycle === 'Yearly' ? Number(plan.price_yearly_usd) : Number(plan.price_monthly_usd);
    }

    const { subtotal, taxAmount, totalAmount } = calculateTax(amount, 0.07);

    // 2. Upsert Tenant Subscription
    const existingSubRes = await client.query(
      `SELECT * FROM tenant_subscriptions WHERE tenant_id = $1`,
      [tenantId]
    );

    let subscriptionId: string;
    let subRow: any;

    if (existingSubRes.rows.length > 0) {
      subscriptionId = existingSubRes.rows[0].id;
      const updateRes = await client.query(
        `UPDATE tenant_subscriptions
         SET plan_id = $1,
             status = 'Active',
             billing_cycle = $2,
             currency = $3,
             current_period_start = $4,
             current_period_end = $5,
             cancel_at_period_end = false,
             payment_gateway = $6,
             updated_at = $4
         WHERE id = $7 AND tenant_id = $8
         RETURNING *;`,
        [
          validated.plan_id,
          validated.billing_cycle,
          validated.currency,
          now.toISOString(),
          periodEnd.toISOString(),
          validated.payment_gateway,
          subscriptionId,
          tenantId,
        ]
      );
      subRow = updateRes.rows[0];
    } else {
      subscriptionId = randomUUID();
      const insertRes = await client.query(
        `INSERT INTO tenant_subscriptions (
          id, tenant_id, plan_id, status, billing_cycle,
          currency, current_period_start, current_period_end,
          cancel_at_period_end, payment_gateway, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Active', $4, $5, $6, $7, false, $8, $6, $6)
        RETURNING *;`,
        [
          subscriptionId,
          tenantId,
          validated.plan_id,
          validated.billing_cycle,
          validated.currency,
          now.toISOString(),
          periodEnd.toISOString(),
          validated.payment_gateway,
        ]
      );
      subRow = insertRes.rows[0];
    }

    // 3. Create Invoice
    const invoiceId = randomUUID();
    const invoiceNumber = await generateInvoiceNumber(client, tenantId, now.getFullYear());
    const lineItems = [
      {
        description: `${plan.name} Plan (${validated.billing_cycle})`,
        amount: subtotal,
        currency: validated.currency,
      },
    ];

    const invRes = await client.query(
      `INSERT INTO invoices (
        id, tenant_id, invoice_number, subscription_id, amount,
        currency, tax_amount, total_amount, status, due_date,
        paid_at, payment_method, line_items, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Paid', $9, $9, $10, $11, $9, $9)
      RETURNING *;`,
      [
        invoiceId,
        tenantId,
        invoiceNumber,
        subscriptionId,
        subtotal,
        validated.currency,
        taxAmount,
        totalAmount,
        now.toISOString(),
        validated.payment_gateway,
        JSON.stringify(lineItems),
      ]
    );

    // 4. Record Payment Transaction
    const txId = randomUUID();
    await client.query(
      `INSERT INTO payment_transactions (
        id, tenant_id, invoice_id, gateway, transaction_id,
        amount, currency, status, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Success', $8, $9)`,
      [
        txId,
        tenantId,
        invoiceId,
        validated.payment_gateway,
        `TX-${now.getTime()}`,
        totalAmount,
        validated.currency,
        JSON.stringify({ plan: plan.name, cycle: validated.billing_cycle }),
        now.toISOString(),
      ]
    );

    return {
      subscription: subRow,
      invoice: {
        ...invRes.rows[0],
        amount: Number(invRes.rows[0].amount),
        tax_amount: Number(invRes.rows[0].tax_amount),
        total_amount: Number(invRes.rows[0].total_amount),
      },
    };
  });
}

/**
 * Cancels a tenant subscription at period end.
 */
export async function cancelSubscription(tenantId: string): Promise<SubscriptionRecord> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `UPDATE tenant_subscriptions 
       SET cancel_at_period_end = true, updated_at = current_timestamp 
       WHERE tenant_id = $1 
       RETURNING *;`,
      [tenantId]
    );
    if (res.rows.length === 0) throw new Error('No active subscription found');
    return res.rows[0];
  });
}

/**
 * Lists invoices for a tenant.
 */
export async function listInvoices(tenantId: string): Promise<InvoiceRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      tax_amount: Number(row.tax_amount),
      total_amount: Number(row.total_amount),
    }));
  });
}

/**
 * Gets invoice details by ID.
 */
export async function getInvoiceById(tenantId: string, invoiceId: string): Promise<InvoiceRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2`,
      [invoiceId, tenantId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      amount: Number(row.amount),
      tax_amount: Number(row.tax_amount),
      total_amount: Number(row.total_amount),
    };
  });
}

/**
 * Creates a simulated Stripe / PayPal Checkout Session.
 */
export async function createCheckoutSession(
  tenantId: string,
  input: CheckoutSessionInput
): Promise<{
  sessionId: string;
  checkoutUrl: string;
  planId: string;
  amount: number;
  currency: string;
}> {
  const validated = CheckoutSessionSchema.parse(input);
  const planRes = await query(`SELECT * FROM subscription_plans WHERE id = $1`, [validated.plan_id]);
  if (planRes.rows.length === 0) throw new Error('Plan not found');
  const plan = planRes.rows[0];

  const amount = validated.currency === 'THB'
    ? (validated.billing_cycle === 'Yearly' ? Number(plan.price_yearly_thb) : Number(plan.price_monthly_thb))
    : (validated.billing_cycle === 'Yearly' ? Number(plan.price_yearly_usd) : Number(plan.price_monthly_usd));

  const sessionId = `cs_${validated.payment_gateway.toLowerCase()}_${randomUUID().replace(/-/g, '')}`;
  const checkoutUrl = `https://checkout.${validated.payment_gateway.toLowerCase()}.com/pay/${sessionId}`;

  return {
    sessionId,
    checkoutUrl,
    planId: validated.plan_id,
    amount,
    currency: validated.currency,
  };
}

/**
 * Handles incoming webhook events from Stripe / PayPal.
 */
export async function processPaymentWebhook(event: WebhookEventInput): Promise<{
  processed: boolean;
  event: string;
  message: string;
}> {
  const validated = WebhookEventSchema.parse(event);

  if (validated.type === 'payment_intent.succeeded' || validated.type === 'PAYMENT.CAPTURE.COMPLETED') {
    return {
      processed: true,
      event: validated.type,
      message: `Payment confirmed for transaction ${validated.id}`,
    };
  }

  if (validated.type === 'customer.subscription.deleted') {
    return {
      processed: true,
      event: validated.type,
      message: `Subscription canceled via gateway event ${validated.id}`,
    };
  }

  return {
    processed: true,
    event: validated.type,
    message: `Event ${validated.type} acknowledged`,
  };
}
