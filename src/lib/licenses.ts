import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateLicenseSchema = z.object({
  software_name: z.string().min(2, 'Software name must have at least 2 characters').max(255),
  license_key: z.string().optional().nullable(),
  license_type: z
    .enum(['Subscription', 'Perpetual', 'Seat-based', 'OEM'])
    .default('Subscription'),
  total_seats: z.number().int().min(1).default(1),
  cost_per_seat: z.number().min(0).default(0),
  purchase_date: z.string().optional(),
  expiry_date: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateLicenseSchema = z.object({
  software_name: z.string().min(2).max(255).optional(),
  license_key: z.string().optional().nullable(),
  license_type: z
    .enum(['Subscription', 'Perpetual', 'Seat-based', 'OEM'])
    .optional(),
  total_seats: z.number().int().min(1).optional(),
  cost_per_seat: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
  expiry_date: z.string().optional().nullable(),
  status: z.enum(['Active', 'Expiring Soon', 'Expired', 'Depleted']).optional(),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const AllocateSeatSchema = z.object({
  user_id: z.string().optional().nullable(),
  user_name: z.string().min(2, 'User name must have at least 2 characters'),
  user_email: z.string().email().optional().nullable(),
  asset_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateLicenseInput = z.input<typeof CreateLicenseSchema>;
export type UpdateLicenseInput = z.input<typeof UpdateLicenseSchema>;
export type AllocateSeatInput = z.input<typeof AllocateSeatSchema>;

export interface LicenseRecord {
  id: string;
  tenant_id: string;
  license_tag: string;
  software_name: string;
  license_key: string | null;
  license_type: string;
  total_seats: number;
  allocated_seats: number;
  cost_per_seat: number;
  purchase_date: string;
  expiry_date: string | null;
  status: string;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseAllocationRecord {
  id: string;
  tenant_id: string;
  license_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  asset_id: string | null;
  notes: string | null;
  allocated_at: string;
}

export interface LicenseFilters {
  search?: string;
  status?: string;
  license_type?: string;
  vendor?: string;
  page?: number;
  limit?: number;
}

/**
 * Checks and computes current status for a license.
 */
export function checkLicenseStatus(params: {
  expiryDate?: Date | string | null;
  totalSeats: number;
  allocatedSeats: number;
  asOfDate?: Date | string;
}): {
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Depleted';
  daysRemaining: number | null;
  availableSeats: number;
} {
  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();
  const availableSeats = Math.max(0, params.totalSeats - params.allocatedSeats);

  let daysRemaining: number | null = null;
  if (params.expiryDate) {
    const expiry = new Date(params.expiryDate);
    const diffMs = expiry.getTime() - asOf.getTime();
    daysRemaining = Math.ceil(diffMs / (1000 * 3600 * 24));
  }

  if (daysRemaining !== null && daysRemaining <= 0) {
    return { status: 'Expired', daysRemaining, availableSeats };
  }
  if (daysRemaining !== null && daysRemaining <= 30) {
    return { status: 'Expiring Soon', daysRemaining, availableSeats };
  }
  if (availableSeats === 0 && params.totalSeats > 0) {
    return { status: 'Depleted', daysRemaining, availableSeats };
  }

  return { status: 'Active', daysRemaining, availableSeats };
}

/**
 * Generates an atomic Running Tag for a license: LIC-YYYY-XXXX (e.g. LIC-2026-0001)
 */
export async function generateLicenseTag(
  client: any,
  tenantId: string,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `LIC-${currentYear}-`;

  const countRes = await client.query(
    `SELECT count(*) as count FROM licenses WHERE tenant_id = $1 AND license_tag LIKE $2`,
    [tenantId, `${prefix}%`]
  );

  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  return `${prefix}${seqPadded}`;
}

/**
 * Creates a new License.
 */
export async function createLicense(
  tenantId: string,
  input: CreateLicenseInput
): Promise<LicenseRecord> {
  const validated = CreateLicenseSchema.parse(input);
  const licenseId = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const licenseTag = await generateLicenseTag(client, tenantId, now.getFullYear());

    const statusCheck = checkLicenseStatus({
      expiryDate: validated.expiry_date,
      totalSeats: validated.total_seats,
      allocatedSeats: 0,
      asOfDate: now,
    });

    const queryText = `
      INSERT INTO licenses (
        id, tenant_id, license_tag, software_name, license_key,
        license_type, total_seats, allocated_seats, cost_per_seat,
        purchase_date, expiry_date, status, vendor, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16
      ) RETURNING *;
    `;

    const values = [
      licenseId,
      tenantId,
      licenseTag,
      validated.software_name,
      validated.license_key || null,
      validated.license_type,
      validated.total_seats,
      0,
      validated.cost_per_seat,
      validated.purchase_date ? new Date(validated.purchase_date).toISOString() : now.toISOString(),
      validated.expiry_date ? new Date(validated.expiry_date).toISOString() : null,
      statusCheck.status,
      validated.vendor || null,
      validated.notes || null,
      now.toISOString(),
      now.toISOString(),
    ];

    const result = await client.query(queryText, values);
    return {
      ...result.rows[0],
      total_seats: Number(result.rows[0].total_seats),
      allocated_seats: Number(result.rows[0].allocated_seats),
      cost_per_seat: Number(result.rows[0].cost_per_seat),
    };
  });
}

/**
 * Lists licenses with multi-filtering and pagination.
 */
export async function listLicenses(
  tenantId: string,
  filters: LicenseFilters = {}
): Promise<{
  licenses: (LicenseRecord & {
    status_info: ReturnType<typeof checkLicenseStatus>;
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

    if (filters.license_type) {
      conditions.push(`license_type = $${paramIndex}`);
      params.push(filters.license_type);
      paramIndex++;
    }

    if (filters.vendor) {
      conditions.push(`vendor ILIKE $${paramIndex}`);
      params.push(`%${filters.vendor}%`);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(
        `(software_name ILIKE $${paramIndex} OR license_tag ILIKE $${paramIndex} OR vendor ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await client.query(
      `SELECT count(*) as total FROM licenses WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const listParams = [...params, limit, offset];
    const listRes = await client.query(
      `SELECT * FROM licenses WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    const now = new Date();
    const licenses = listRes.rows.map((row: LicenseRecord) => {
      const total_seats = Number(row.total_seats);
      const allocated_seats = Number(row.allocated_seats);
      const cost_per_seat = Number(row.cost_per_seat);

      const status_info = checkLicenseStatus({
        expiryDate: row.expiry_date,
        totalSeats: total_seats,
        allocatedSeats: allocated_seats,
        asOfDate: now,
      });

      return {
        ...row,
        total_seats,
        allocated_seats,
        cost_per_seat,
        status_info,
      };
    });

    return {
      licenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  });
}

/**
 * Gets license details with its allocated seats.
 */
export async function getLicenseById(
  tenantId: string,
  licenseId: string
): Promise<{
  license: LicenseRecord;
  allocations: LicenseAllocationRecord[];
  status_info: ReturnType<typeof checkLicenseStatus>;
} | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2`,
      [licenseId, tenantId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const total_seats = Number(row.total_seats);
    const allocated_seats = Number(row.allocated_seats);
    const cost_per_seat = Number(row.cost_per_seat);

    const allocRes = await client.query(
      `SELECT * FROM license_allocations WHERE license_id = $1 AND tenant_id = $2 ORDER BY allocated_at DESC`,
      [licenseId, tenantId]
    );

    const status_info = checkLicenseStatus({
      expiryDate: row.expiry_date,
      totalSeats: total_seats,
      allocatedSeats: allocated_seats,
    });

    return {
      license: {
        ...row,
        total_seats,
        allocated_seats,
        cost_per_seat,
      },
      allocations: allocRes.rows,
      status_info,
    };
  });
}

/**
 * Updates a license.
 */
export async function updateLicense(
  tenantId: string,
  licenseId: string,
  input: UpdateLicenseInput
): Promise<LicenseRecord> {
  const validated = UpdateLicenseSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2`,
      [licenseId, tenantId]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('License not found');
    }

    const current = currentRes.rows[0];
    const now = new Date();

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.software_name !== undefined) {
      updates.push(`software_name = $${paramIndex}`);
      values.push(validated.software_name);
      paramIndex++;
    }
    if (validated.license_key !== undefined) {
      updates.push(`license_key = $${paramIndex}`);
      values.push(validated.license_key);
      paramIndex++;
    }
    if (validated.license_type !== undefined) {
      updates.push(`license_type = $${paramIndex}`);
      values.push(validated.license_type);
      paramIndex++;
    }
    if (validated.total_seats !== undefined) {
      if (validated.total_seats < Number(current.allocated_seats)) {
        throw new Error(`Total seats cannot be less than currently allocated seats (${current.allocated_seats})`);
      }
      updates.push(`total_seats = $${paramIndex}`);
      values.push(validated.total_seats);
      paramIndex++;
    }
    if (validated.cost_per_seat !== undefined) {
      updates.push(`cost_per_seat = $${paramIndex}`);
      values.push(validated.cost_per_seat);
      paramIndex++;
    }
    if (validated.purchase_date !== undefined) {
      updates.push(`purchase_date = $${paramIndex}`);
      values.push(new Date(validated.purchase_date).toISOString());
      paramIndex++;
    }
    if (validated.expiry_date !== undefined) {
      updates.push(`expiry_date = $${paramIndex}`);
      values.push(validated.expiry_date ? new Date(validated.expiry_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }
    if (validated.vendor !== undefined) {
      updates.push(`vendor = $${paramIndex}`);
      values.push(validated.vendor);
      paramIndex++;
    }
    if (validated.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(validated.notes);
      paramIndex++;
    }

    values.push(licenseId);
    values.push(tenantId);

    const updateQuery = `
      UPDATE licenses
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *;
    `;

    const result = await client.query(updateQuery, values);
    const updated = result.rows[0];
    return {
      ...updated,
      total_seats: Number(updated.total_seats),
      allocated_seats: Number(updated.allocated_seats),
      cost_per_seat: Number(updated.cost_per_seat),
    };
  });
}

/**
 * Deletes a license.
 */
export async function deleteLicense(
  tenantId: string,
  licenseId: string
): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM licenses WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [licenseId, tenantId]
    );
    return res.rows.length > 0;
  });
}

/**
 * Allocates a seat to a user or asset with atomic quota protection.
 */
export async function allocateSeat(
  tenantId: string,
  licenseId: string,
  input: AllocateSeatInput
): Promise<LicenseAllocationRecord> {
  const validated = AllocateSeatSchema.parse(input);
  const allocId = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    // Lock row for update to ensure atomic quota enforcement
    const licRes = await client.query(
      `SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [licenseId, tenantId]
    );

    if (licRes.rows.length === 0) {
      throw new Error('License not found');
    }

    const license = licRes.rows[0];
    const totalSeats = Number(license.total_seats);
    const allocatedSeats = Number(license.allocated_seats);

    if (allocatedSeats >= totalSeats) {
      throw new Error('Quota Exceeded: All license seats are allocated');
    }

    // Insert allocation record
    const insertQuery = `
      INSERT INTO license_allocations (
        id, tenant_id, license_id, user_id, user_name,
        user_email, asset_id, notes, allocated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      ) RETURNING *;
    `;

    const values = [
      allocId,
      tenantId,
      licenseId,
      validated.user_id || null,
      validated.user_name,
      validated.user_email || null,
      validated.asset_id || null,
      validated.notes || null,
      now.toISOString(),
    ];

    const allocResult = await client.query(insertQuery, values);
    const allocation = allocResult.rows[0];

    // Update license seat count & status
    const newAllocated = allocatedSeats + 1;
    const newStatus = newAllocated >= totalSeats ? 'Depleted' : license.status;

    await client.query(
      `UPDATE licenses SET allocated_seats = $1, status = $2, updated_at = $3 WHERE id = $4 AND tenant_id = $5`,
      [newAllocated, newStatus, now.toISOString(), licenseId, tenantId]
    );

    return allocation;
  });
}

/**
 * Unallocates / revokes a license seat.
 */
export async function unallocateSeat(
  tenantId: string,
  licenseId: string,
  allocationId: string
): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    // Check allocation existence
    const allocRes = await client.query(
      `SELECT * FROM license_allocations WHERE id = $1 AND license_id = $2 AND tenant_id = $3`,
      [allocationId, licenseId, tenantId]
    );

    if (allocRes.rows.length === 0) {
      throw new Error('Allocation record not found');
    }

    // Delete allocation
    await client.query(
      `DELETE FROM license_allocations WHERE id = $1 AND tenant_id = $2`,
      [allocationId, tenantId]
    );

    // Decrement license seat count
    const licRes = await client.query(
      `SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [licenseId, tenantId]
    );

    if (licRes.rows.length > 0) {
      const license = licRes.rows[0];
      const newAllocated = Math.max(0, Number(license.allocated_seats) - 1);
      const newStatus = license.status === 'Depleted' ? 'Active' : license.status;

      await client.query(
        `UPDATE licenses SET allocated_seats = $1, status = $2, updated_at = current_timestamp WHERE id = $3 AND tenant_id = $4`,
        [newAllocated, newStatus, licenseId, tenantId]
      );
    }

    return true;
  });
}
