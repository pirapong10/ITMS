import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateAssetSchema = z.object({
  name: z.string().min(2, 'Asset name must have at least 2 characters').max(255),
  category: z.string().optional().default('Hardware'),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().min(0).default(0),
  salvage_value: z.number().min(0).default(0),
  depreciation_rate: z.number().min(0).max(100).default(20.0), // 20%/yr
  warranty_expiry: z.string().optional().nullable(),
  status: z
    .enum(['In Use', 'In Stock', 'Under Repair', 'Retired', 'Disposed'])
    .default('In Use'),
  assigned_to: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateAssetSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  category: z.string().optional(),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().min(0).optional(),
  salvage_value: z.number().min(0).optional(),
  depreciation_rate: z.number().min(0).max(100).optional(),
  warranty_expiry: z.string().optional().nullable(),
  status: z
    .enum(['In Use', 'In Stock', 'Under Repair', 'Retired', 'Disposed'])
    .optional(),
  assigned_to: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateAssetInput = z.input<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.input<typeof UpdateAssetSchema>;

export interface AssetFilters {
  search?: string;
  status?: string;
  category?: string;
  department?: string;
  warranty_status?: 'Active' | 'Expiring Soon' | 'Expired' | 'No Warranty';
  page?: number;
  limit?: number;
}

export interface DepreciationResult {
  purchaseCost: number;
  salvageValue: number;
  depreciableAmount: number;
  depreciationRate: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  elapsedMonths: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationPercentage: number;
  yearlySchedule: Array<{
    year: number;
    beginningValue: number;
    depreciation: number;
    endingValue: number;
  }>;
}

export interface AssetRecord {
  id: string;
  tenant_id: string;
  asset_tag: string;
  name: string;
  category: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  depreciation_rate: number;
  warranty_expiry: string | null;
  status: string;
  assigned_to: string | null;
  department: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LifecycleLogRecord {
  id: string;
  tenant_id: string;
  asset_id: string;
  event_type: string;
  reference_id: string | null;
  summary: string;
  details: any;
  created_at: string;
}

/**
 * Straight-Line Depreciation Engine (Standard 20%/yr or custom rate)
 */
export function calculateDepreciation(params: {
  purchaseCost: number;
  salvageValue?: number;
  depreciationRate?: number;
  purchaseDate: Date | string;
  asOfDate?: Date | string;
}): DepreciationResult {
  const purchaseCost = Number(params.purchaseCost) || 0;
  const salvageValue = Number(params.salvageValue) || 0;
  const depreciationRate = params.depreciationRate !== undefined ? Number(params.depreciationRate) : 20.0;
  const purchaseDate = new Date(params.purchaseDate);
  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();

  const depreciableAmount = Math.max(0, purchaseCost - salvageValue);
  const annualDepreciation = Math.round((depreciableAmount * (depreciationRate / 100)) * 100) / 100;
  const monthlyDepreciation = Math.round((annualDepreciation / 12) * 100) / 100;

  // Calculate elapsed months
  let elapsedMonths =
    (asOf.getFullYear() - purchaseDate.getFullYear()) * 12 +
    (asOf.getMonth() - purchaseDate.getMonth());
  if (elapsedMonths < 0) elapsedMonths = 0;

  const accumulatedDepreciation = Math.min(
    depreciableAmount,
    Math.round(monthlyDepreciation * elapsedMonths * 100) / 100
  );

  const currentBookValue = Math.max(
    salvageValue,
    Math.round((purchaseCost - accumulatedDepreciation) * 100) / 100
  );

  const depreciationPercentage =
    depreciableAmount > 0
      ? Math.min(100, Math.round((accumulatedDepreciation / depreciableAmount) * 100))
      : 100;

  // Build 5-year or useful life projection schedule
  const totalYears = depreciationRate > 0 ? Math.ceil(100 / depreciationRate) : 5;
  const yearlySchedule: DepreciationResult['yearlySchedule'] = [];
  let trackingValue = purchaseCost;

  for (let y = 1; y <= totalYears; y++) {
    const begin = trackingValue;
    const dep = Math.min(begin - salvageValue, annualDepreciation);
    const end = Math.max(salvageValue, Math.round((begin - dep) * 100) / 100);
    yearlySchedule.push({
      year: y,
      beginningValue: Math.round(begin * 100) / 100,
      depreciation: Math.round(dep * 100) / 100,
      endingValue: end,
    });
    trackingValue = end;
    if (trackingValue <= salvageValue) break;
  }

  return {
    purchaseCost,
    salvageValue,
    depreciableAmount,
    depreciationRate,
    annualDepreciation,
    monthlyDepreciation,
    elapsedMonths,
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercentage,
    yearlySchedule,
  };
}

/**
 * Checks Warranty Expiration Status:
 * - Active: > 60 days remaining
 * - Expiring Soon: <= 60 days and > 0 days remaining
 * - Expired: <= 0 days remaining
 * - No Warranty: null/undefined
 */
export function checkWarrantyStatus(
  warrantyExpiry?: Date | string | null,
  asOfDate?: Date | string
): {
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'No Warranty';
  daysRemaining: number | null;
} {
  if (!warrantyExpiry) {
    return { status: 'No Warranty', daysRemaining: null };
  }

  const expiry = new Date(warrantyExpiry);
  const asOf = asOfDate ? new Date(asOfDate) : new Date();

  const diffMs = expiry.getTime() - asOf.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 3600 * 24));

  if (daysRemaining <= 0) {
    return { status: 'Expired', daysRemaining };
  }
  if (daysRemaining <= 60) {
    return { status: 'Expiring Soon', daysRemaining };
  }
  return { status: 'Active', daysRemaining };
}

/**
 * Generates an atomic Running Tag for an asset: AST-YYYY-XXXX (e.g. AST-2026-0001)
 */
export async function generateAssetTag(
  client: any,
  tenantId: string,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `AST-${currentYear}-`;

  const countRes = await client.query(
    `SELECT count(*) as count FROM assets WHERE tenant_id = $1 AND asset_tag LIKE $2`,
    [tenantId, `${prefix}%`]
  );

  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  return `${prefix}${seqPadded}`;
}

/**
 * Records an entry in asset_lifecycle_logs
 */
export async function logLifecycleEvent(
  client: any,
  tenantId: string,
  assetId: string,
  eventType: string,
  summary: string,
  referenceId?: string | null,
  details?: any
) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO asset_lifecycle_logs 
      (id, tenant_id, asset_id, event_type, reference_id, summary, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, current_timestamp)`,
    [
      id,
      tenantId,
      assetId,
      eventType,
      referenceId || null,
      summary,
      details ? JSON.stringify(details) : null,
    ]
  );
}

/**
 * Creates a new Hardware Asset.
 */
export async function createAsset(
  tenantId: string,
  input: CreateAssetInput,
  actor?: { id?: string | null; name?: string | null }
): Promise<AssetRecord> {
  const validated = CreateAssetSchema.parse(input);
  const assetId = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const assetTag = await generateAssetTag(client, tenantId, now.getFullYear());

    const queryText = `
      INSERT INTO assets (
        id, tenant_id, asset_tag, name, category, model,
        serial_number, purchase_date, purchase_cost, salvage_value,
        depreciation_rate, warranty_expiry, status, assigned_to,
        department, location, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18, $19
      ) RETURNING *;
    `;

    const values = [
      assetId,
      tenantId,
      assetTag,
      validated.name,
      validated.category,
      validated.model || null,
      validated.serial_number || null,
      validated.purchase_date ? new Date(validated.purchase_date).toISOString() : now.toISOString(),
      validated.purchase_cost,
      validated.salvage_value,
      validated.depreciation_rate,
      validated.warranty_expiry ? new Date(validated.warranty_expiry).toISOString() : null,
      validated.status,
      validated.assigned_to || null,
      validated.department || null,
      validated.location || null,
      validated.notes || null,
      now.toISOString(),
      now.toISOString(),
    ];

    const result = await client.query(queryText, values);
    const created = result.rows[0];

    // Log creation event in lifecycle
    await logLifecycleEvent(
      client,
      tenantId,
      assetId,
      'REGISTERED',
      `Asset registered with tag ${assetTag}`,
      assetTag,
      { assigned_to: validated.assigned_to, department: validated.department }
    );

    return created;
  });
}

/**
 * Lists assets with multi-filtering and pagination.
 */
export async function listAssets(
  tenantId: string,
  filters: AssetFilters = {}
): Promise<{
  assets: (AssetRecord & {
    warranty_info: ReturnType<typeof checkWarrantyStatus>;
    depreciation_info: DepreciationResult;
  })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.department) {
      conditions.push(`department = $${paramIndex}`);
      params.push(filters.department);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR asset_tag ILIKE $${paramIndex} OR serial_number ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await client.query(
      `SELECT count(*) as total FROM assets WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const listParams = [...params, limit, offset];
    const listRes = await client.query(
      `SELECT * FROM assets WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    const now = new Date();
    const assets = listRes.rows.map((row: AssetRecord) => {
      const warranty_info = checkWarrantyStatus(row.warranty_expiry, now);
      const depreciation_info = calculateDepreciation({
        purchaseCost: Number(row.purchase_cost),
        salvageValue: Number(row.salvage_value),
        depreciationRate: Number(row.depreciation_rate),
        purchaseDate: row.purchase_date,
        asOfDate: now,
      });

      return {
        ...row,
        purchase_cost: Number(row.purchase_cost),
        salvage_value: Number(row.salvage_value),
        depreciation_rate: Number(row.depreciation_rate),
        warranty_info,
        depreciation_info,
      };
    });

    let filteredAssets = assets;
    if (filters.warranty_status) {
      filteredAssets = assets.filter(
        (a: (typeof assets)[0]) => a.warranty_info.status === filters.warranty_status
      );
    }

    return {
      assets: filteredAssets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  });
}

/**
 * Gets asset detail by ID.
 */
export async function getAssetById(
  tenantId: string,
  assetId: string
): Promise<{
  asset: AssetRecord;
  warranty_info: ReturnType<typeof checkWarrantyStatus>;
  depreciation_info: DepreciationResult;
} | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
      [assetId, tenantId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const now = new Date();
    const warranty_info = checkWarrantyStatus(row.warranty_expiry, now);
    const depreciation_info = calculateDepreciation({
      purchaseCost: Number(row.purchase_cost),
      salvageValue: Number(row.salvage_value),
      depreciationRate: Number(row.depreciation_rate),
      purchaseDate: row.purchase_date,
      asOfDate: now,
    });

    return {
      asset: {
        ...row,
        purchase_cost: Number(row.purchase_cost),
        salvage_value: Number(row.salvage_value),
        depreciation_rate: Number(row.depreciation_rate),
      },
      warranty_info,
      depreciation_info,
    };
  });
}

/**
 * Updates an existing asset.
 */
export async function updateAsset(
  tenantId: string,
  assetId: string,
  input: UpdateAssetInput,
  actor?: { id?: string | null; name?: string | null }
): Promise<AssetRecord> {
  const validated = UpdateAssetSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
      [assetId, tenantId]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('Asset not found');
    }

    const current: AssetRecord = currentRes.rows[0];
    const now = new Date();

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(validated.name);
      paramIndex++;
    }
    if (validated.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(validated.category);
      paramIndex++;
    }
    if (validated.model !== undefined) {
      updates.push(`model = $${paramIndex}`);
      values.push(validated.model);
      paramIndex++;
    }
    if (validated.serial_number !== undefined) {
      updates.push(`serial_number = $${paramIndex}`);
      values.push(validated.serial_number);
      paramIndex++;
    }
    if (validated.purchase_date !== undefined) {
      updates.push(`purchase_date = $${paramIndex}`);
      values.push(new Date(validated.purchase_date).toISOString());
      paramIndex++;
    }
    if (validated.purchase_cost !== undefined) {
      updates.push(`purchase_cost = $${paramIndex}`);
      values.push(validated.purchase_cost);
      paramIndex++;
    }
    if (validated.salvage_value !== undefined) {
      updates.push(`salvage_value = $${paramIndex}`);
      values.push(validated.salvage_value);
      paramIndex++;
    }
    if (validated.depreciation_rate !== undefined) {
      updates.push(`depreciation_rate = $${paramIndex}`);
      values.push(validated.depreciation_rate);
      paramIndex++;
    }
    if (validated.warranty_expiry !== undefined) {
      updates.push(`warranty_expiry = $${paramIndex}`);
      values.push(validated.warranty_expiry ? new Date(validated.warranty_expiry).toISOString() : null);
      paramIndex++;
    }
    if (validated.department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      values.push(validated.department);
      paramIndex++;
    }
    if (validated.location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      values.push(validated.location);
      paramIndex++;
    }
    if (validated.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(validated.notes);
      paramIndex++;
    }

    if (validated.assigned_to !== undefined && validated.assigned_to !== current.assigned_to) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(validated.assigned_to);
      paramIndex++;
      await logLifecycleEvent(
        client,
        tenantId,
        assetId,
        'REASSIGNED',
        `Asset assigned to ${validated.assigned_to || 'Unassigned'}`,
        null,
        { from: current.assigned_to, to: validated.assigned_to }
      );
    }

    if (validated.status !== undefined && validated.status !== current.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
      await logLifecycleEvent(
        client,
        tenantId,
        assetId,
        'STATUS_CHANGED',
        `Asset status changed to ${validated.status}`,
        null,
        { from: current.status, to: validated.status }
      );
    }

    values.push(assetId);
    values.push(tenantId);

    const updateQuery = `
      UPDATE assets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *;
    `;

    const result = await client.query(updateQuery, values);
    return result.rows[0];
  });
}

/**
 * Deletes an asset.
 */
export async function deleteAsset(
  tenantId: string,
  assetId: string
): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM assets WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [assetId, tenantId]
    );
    return res.rows.length > 0;
  });
}

/**
 * Retrieves the unified lifecycle timeline for an asset.
 */
export async function getAssetLifecycle(
  tenantId: string,
  assetId: string
): Promise<LifecycleLogRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM asset_lifecycle_logs 
       WHERE asset_id = $1 AND tenant_id = $2 
       ORDER BY created_at ASC`,
      [assetId, tenantId]
    );
    return res.rows;
  });
}
