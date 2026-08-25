import { z } from 'zod';
import { query } from './db';

export function isSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  return normalized === 'SUPER_ADMIN' || normalized === 'PLATFORM ADMIN';
}

// Zod Validation Schemas
export const CreateGlobalPlanSchema = z.object({
  id: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional().default(''),
  price_monthly_usd: z.number().min(0),
  price_yearly_usd: z.number().min(0),
  price_monthly_thb: z.number().min(0),
  price_yearly_thb: z.number().min(0),
  max_users: z.number().int().min(1).default(5),
  max_assets: z.number().int().min(1).default(50),
  features: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export const UpdateGlobalPlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  price_monthly_usd: z.number().min(0).optional(),
  price_yearly_usd: z.number().min(0).optional(),
  price_monthly_thb: z.number().min(0).optional(),
  price_yearly_thb: z.number().min(0).optional(),
  max_users: z.number().int().min(1).optional(),
  max_assets: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const UpdateTenantStatusSchema = z.object({
  status: z.enum(['Active', 'Suspended', 'Terminated']),
});

export type CreateGlobalPlanInput = z.input<typeof CreateGlobalPlanSchema>;
export type UpdateGlobalPlanInput = z.input<typeof UpdateGlobalPlanSchema>;
export type UpdateTenantStatusInput = z.input<typeof UpdateTenantStatusSchema>;

export interface PlatformOverviewMetrics {
  totalTenants: number;
  activeSubscriptions: number;
  mrrUsd: number;
  mrrThb: number;
  arrUsd: number;
  arrThb: number;
  totalTickets: number;
  totalAssets: number;
}

export interface PlatformTenantItem {
  id: string;
  company_name: string;
  subdomain: string;
  created_at: string;
  subscription: {
    plan_name: string | null;
    status: string | null;
    billing_cycle: string | null;
    currency: string | null;
  } | null;
  metrics: {
    userCount: number;
    ticketCount: number;
    assetCount: number;
  };
}

/**
 * Calculates platform overview metrics (MRR, ARR, Tenants, Volume).
 */
export async function getPlatformOverview(): Promise<PlatformOverviewMetrics> {
  const tenantsRes = await query(`SELECT count(*) as count FROM tenants`);
  const totalTenants = parseInt(tenantsRes.rows[0].count, 10);

  const subRes = await query(`
    SELECT s.currency, s.billing_cycle, p.price_monthly_usd, p.price_yearly_usd, p.price_monthly_thb, p.price_yearly_thb
    FROM tenant_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.status = 'Active'
  `);

  let mrrUsd = 0;
  let mrrThb = 0;

  for (const row of subRes.rows) {
    if (row.currency === 'THB') {
      const monthly = row.billing_cycle === 'Yearly' ? Number(row.price_yearly_thb) / 12 : Number(row.price_monthly_thb);
      mrrThb += monthly;
    } else {
      const monthly = row.billing_cycle === 'Yearly' ? Number(row.price_yearly_usd) / 12 : Number(row.price_monthly_usd);
      mrrUsd += monthly;
    }
  }

  const ticketsRes = await query(`SELECT count(*) as count FROM tickets`);
  const totalTickets = parseInt(ticketsRes.rows[0].count, 10);

  const assetsRes = await query(`SELECT count(*) as count FROM assets`);
  const totalAssets = parseInt(assetsRes.rows[0].count, 10);

  return {
    totalTenants,
    activeSubscriptions: subRes.rows.length,
    mrrUsd: Math.round(mrrUsd * 100) / 100,
    mrrThb: Math.round(mrrThb * 100) / 100,
    arrUsd: Math.round(mrrUsd * 12 * 100) / 100,
    arrThb: Math.round(mrrThb * 12 * 100) / 100,
    totalTickets,
    totalAssets,
  };
}

/**
 * Lists all platform tenants with subscription & usage stats across tenant boundaries.
 */
export async function listAllTenants(filters: { search?: string; status?: string } = {}): Promise<PlatformTenantItem[]> {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.search) {
    conditions.push(`(t.company_name ILIKE $${paramIndex} OR t.subdomain ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const queryText = `
    SELECT 
      t.id, t.company_name, t.subdomain, t.created_at,
      s.status as sub_status, s.billing_cycle, s.currency,
      p.name as plan_name,
      (SELECT count(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
      (SELECT count(*) FROM tickets tk WHERE tk.tenant_id = t.id) as ticket_count,
      (SELECT count(*) FROM assets a WHERE a.tenant_id = t.id) as asset_count
    FROM tenants t
    LEFT JOIN tenant_subscriptions s ON t.id = s.tenant_id
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.created_at DESC
  `;

  const res = await query(queryText, params);

  return res.rows.map((row: any) => ({
    id: row.id,
    company_name: row.company_name,
    subdomain: row.subdomain,
    created_at: row.created_at,
    subscription: row.plan_name
      ? {
          plan_name: row.plan_name,
          status: row.sub_status,
          billing_cycle: row.billing_cycle,
          currency: row.currency,
        }
      : null,
    metrics: {
      userCount: parseInt(row.user_count, 10) || 0,
      ticketCount: parseInt(row.ticket_count, 10) || 0,
      assetCount: parseInt(row.asset_count, 10) || 0,
    },
  }));
}

/**
 * Super Admin updates tenant status (e.g. suspend or activate).
 */
export async function setTenantStatus(tenantId: string, status: string): Promise<boolean> {
  const res = await query(
    `UPDATE tenant_subscriptions SET status = $1, updated_at = current_timestamp WHERE tenant_id = $2 RETURNING id`,
    [status, tenantId]
  );
  return res.rows.length > 0;
}

/**
 * Super Admin creates a new Global Subscription Plan.
 */
export async function createGlobalPlan(input: CreateGlobalPlanInput) {
  const validated = CreateGlobalPlanSchema.parse(input);
  const now = new Date();

  const res = await query(
    `INSERT INTO subscription_plans (
      id, name, description, price_monthly_usd, price_yearly_usd,
      price_monthly_thb, price_yearly_thb, max_users, max_assets,
      features, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
    RETURNING *;`,
    [
      validated.id,
      validated.name,
      validated.description,
      validated.price_monthly_usd,
      validated.price_yearly_usd,
      validated.price_monthly_thb,
      validated.price_yearly_thb,
      validated.max_users,
      validated.max_assets,
      JSON.stringify(validated.features),
      validated.is_active,
      now.toISOString(),
    ]
  );

  return {
    ...res.rows[0],
    price_monthly_usd: Number(res.rows[0].price_monthly_usd),
    price_yearly_usd: Number(res.rows[0].price_yearly_usd),
    price_monthly_thb: Number(res.rows[0].price_monthly_thb),
    price_yearly_thb: Number(res.rows[0].price_yearly_thb),
  };
}

/**
 * Super Admin updates an existing plan.
 */
export async function updateGlobalPlan(planId: string, input: UpdateGlobalPlanInput) {
  const validated = UpdateGlobalPlanSchema.parse(input);
  const now = new Date();

  const updates: string[] = ['updated_at = $1'];
  const values: any[] = [now.toISOString()];
  let paramIndex = 2;

  if (validated.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(validated.name);
    paramIndex++;
  }
  if (validated.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(validated.description);
    paramIndex++;
  }
  if (validated.price_monthly_usd !== undefined) {
    updates.push(`price_monthly_usd = $${paramIndex}`);
    values.push(validated.price_monthly_usd);
    paramIndex++;
  }
  if (validated.price_yearly_usd !== undefined) {
    updates.push(`price_yearly_usd = $${paramIndex}`);
    values.push(validated.price_yearly_usd);
    paramIndex++;
  }
  if (validated.price_monthly_thb !== undefined) {
    updates.push(`price_monthly_thb = $${paramIndex}`);
    values.push(validated.price_monthly_thb);
    paramIndex++;
  }
  if (validated.price_yearly_thb !== undefined) {
    updates.push(`price_yearly_thb = $${paramIndex}`);
    values.push(validated.price_yearly_thb);
    paramIndex++;
  }
  if (validated.max_users !== undefined) {
    updates.push(`max_users = $${paramIndex}`);
    values.push(validated.max_users);
    paramIndex++;
  }
  if (validated.max_assets !== undefined) {
    updates.push(`max_assets = $${paramIndex}`);
    values.push(validated.max_assets);
    paramIndex++;
  }
  if (validated.features !== undefined) {
    updates.push(`features = $${paramIndex}`);
    values.push(JSON.stringify(validated.features));
    paramIndex++;
  }
  if (validated.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(validated.is_active);
    paramIndex++;
  }

  values.push(planId);

  const res = await query(
    `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *;`,
    values
  );

  if (res.rows.length === 0) throw new Error('Plan not found');

  return {
    ...res.rows[0],
    price_monthly_usd: Number(res.rows[0].price_monthly_usd),
    price_yearly_usd: Number(res.rows[0].price_yearly_usd),
    price_monthly_thb: Number(res.rows[0].price_monthly_thb),
    price_yearly_thb: Number(res.rows[0].price_yearly_thb),
  };
}

/**
 * Super Admin deletes / archives a plan.
 */
export async function deleteGlobalPlan(planId: string): Promise<boolean> {
  const res = await query(`DELETE FROM subscription_plans WHERE id = $1 RETURNING id`, [planId]);
  return res.rows.length > 0;
}
