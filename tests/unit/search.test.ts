import { globalTenantSearch } from '../../src/lib/search';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Global Search Utility (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty results for empty or whitespace query without executing DB queries', async () => {
    const res1 = await globalTenantSearch('tenant-dummy', '');
    expect(res1.total).toBe(0);
    expect(res1.results).toEqual([]);

    const res2 = await globalTenantSearch('tenant-dummy', '   ');
    expect(res2.total).toBe(0);
  });

  it('should search across all entities when no types filter is provided', async () => {
    const tenantId = 'tenant-123';

    mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{ id: 'TK-1', title: 'Network Outage', status: 'Open', category: 'Network', reporter_name: 'Bob' }],
          }) // tickets
          .mockResolvedValueOnce({
            rows: [{ id: 'AS-1', name: 'MacBook Pro', asset_tag: 'TAG-1', category: 'Laptop', status: 'Active' }],
          }) // assets
          .mockResolvedValueOnce({
            rows: [{ id: 'PR-1', title: 'Switch crash', status: 'Investigating', category: 'Hardware', priority: 'High' }],
          }) // problems
          .mockResolvedValueOnce({
            rows: [{ id: 'CH-1', title: 'Upgrade firmware', status: 'CAB_Review', change_type: 'Normal', risk_level: 'Medium' }],
          }) // changes
          .mockResolvedValueOnce({
            rows: [{ id: 'KB-1', title: 'VPN Guide', category: 'General', status: 'Published', visibility: 'Public' }],
          }) // kb
          .mockResolvedValueOnce({
            rows: [{ id: 'PJ-1', project_code: 'PRJ-01', name: 'Cloud Migration', category: 'Infra', status: 'In_Progress' }],
          }), // projects
      };
      return cb(client);
    });

    const res = await globalTenantSearch(tenantId, 'network');
    expect(res.total).toBe(6);
    expect(res.results.map((r) => r.type)).toEqual(['ticket', 'asset', 'problem', 'change', 'kb', 'project']);
  });

  it('should search only requested entity types', async () => {
    const tenantId = 'tenant-123';

    mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
      const client = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ id: 'TK-1', title: 'Network Outage', status: 'Open', category: 'Network', reporter_name: 'Bob' }],
        }),
      };
      return cb(client);
    });

    const res = await globalTenantSearch(tenantId, 'network', {
      types: ['ticket'],
      limit: 10,
    });
    expect(res.total).toBe(1);
    expect(res.results[0].type).toBe('ticket');
  });
});
