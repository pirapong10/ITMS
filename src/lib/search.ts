import { withTenantTransaction } from './db';

export interface GlobalSearchResultItem {
  id: string;
  type: 'ticket' | 'asset' | 'problem' | 'change' | 'kb' | 'project';
  title: string;
  subtitle: string;
  status?: string;
  url: string;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  results: GlobalSearchResultItem[];
}

/**
 * Searches across all ITSM modules for a tenant.
 */
export async function globalTenantSearch(
  tenantId: string,
  searchQuery: string,
  options: {
    types?: string[];
    limit?: number;
  } = {}
): Promise<GlobalSearchResponse> {
  const trimmed = (searchQuery || '').trim();
  if (!trimmed) {
    return { query: searchQuery, total: 0, results: [] };
  }

  const pattern = `%${trimmed}%`;
  const requestedTypes = options.types || ['ticket', 'asset', 'problem', 'change', 'kb', 'project'];
  const perTypeLimit = Math.min(20, Math.max(1, Math.floor((options.limit || 30) / requestedTypes.length) + 2));

  return withTenantTransaction(tenantId, async (client) => {
    const results: GlobalSearchResultItem[] = [];

    // 1. Search Tickets
    if (requestedTypes.includes('ticket')) {
      const res = await client.query(
        `SELECT id, title, status, category, reporter_name
         FROM tickets
         WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR id ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'ticket',
          title: `[${row.id}] ${row.title}`,
          subtitle: `Category: ${row.category || 'General'} • Reporter: ${row.reporter_name || 'N/A'}`,
          status: row.status,
          url: `/tickets/${row.id}`,
        });
      }
    }

    // 2. Search Assets
    if (requestedTypes.includes('asset')) {
      const res = await client.query(
        `SELECT id, name, asset_tag, category, status
         FROM assets
         WHERE tenant_id = $1 AND (name ILIKE $2 OR asset_tag ILIKE $2 OR serial_number ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'asset',
          title: `[${row.asset_tag}] ${row.name}`,
          subtitle: `Category: ${row.category || 'Hardware'}`,
          status: row.status,
          url: `/assets/${row.id}`,
        });
      }
    }

    // 3. Search Problems
    if (requestedTypes.includes('problem')) {
      const res = await client.query(
        `SELECT id, title, status, category, priority
         FROM problems
         WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR id ILIKE $2 OR root_cause ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'problem',
          title: `[${row.id}] ${row.title}`,
          subtitle: `Priority: ${row.priority} • Category: ${row.category || 'General'}`,
          status: row.status,
          url: `/problems/${row.id}`,
        });
      }
    }

    // 4. Search Changes
    if (requestedTypes.includes('change')) {
      const res = await client.query(
        `SELECT id, title, status, change_type, risk_level
         FROM change_requests
         WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR id ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'change',
          title: `[${row.id}] ${row.title}`,
          subtitle: `Type: ${row.change_type} • Risk: ${row.risk_level}`,
          status: row.status,
          url: `/changes/${row.id}`,
        });
      }
    }

    // 5. Search Knowledge Articles
    if (requestedTypes.includes('kb')) {
      const res = await client.query(
        `SELECT id, title, category, status, visibility
         FROM knowledge_articles
         WHERE tenant_id = $1 AND (title ILIKE $2 OR summary ILIKE $2 OR content ILIKE $2 OR id ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'kb',
          title: `[${row.id}] ${row.title}`,
          subtitle: `Category: ${row.category || 'General'} • Visibility: ${row.visibility}`,
          status: row.status,
          url: `/kb/${row.id}`,
        });
      }
    }

    // 6. Search Projects
    if (requestedTypes.includes('project')) {
      const res = await client.query(
        `SELECT id, project_code, name, category, status
         FROM projects
         WHERE tenant_id = $1 AND (name ILIKE $2 OR description ILIKE $2 OR id ILIKE $2 OR project_code ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, pattern, perTypeLimit]
      );
      for (const row of res.rows) {
        results.push({
          id: row.id,
          type: 'project',
          title: `[${row.project_code}] ${row.name}`,
          subtitle: `Category: ${row.category} • Status: ${row.status}`,
          status: row.status,
          url: `/projects/${row.id}`,
        });
      }
    }

    const totalLimit = options.limit || 30;
    const finalResults = results.slice(0, totalLimit);

    return {
      query: searchQuery,
      total: finalResults.length,
      results: finalResults,
    };
  });
}
