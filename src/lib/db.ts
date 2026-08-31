import { Pool, QueryResult } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const isRemoteDb =
  process.env.DATABASE_URL?.includes('supabase') ||
  process.env.DATABASE_URL?.includes('neon') ||
  process.env.DATABASE_URL?.includes('aws') ||
  process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
});

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export const queryWithTenant = async (
  tenantId: string,
  text: string,
  params?: any[]
): Promise<QueryResult> => {
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    return await client.query(text, params);
  } finally {
    await client.query('RESET app.current_tenant_id'); // Optional if using SET LOCAL inside a transaction, but good for connection pooling safety
    client.release();
  }
};

// Safer version with a transaction for SET LOCAL
export const withTenantTransaction = async <T>(
  tenantId: string,
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE app_user');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const closePool = async () => {
  await pool.end();
};
