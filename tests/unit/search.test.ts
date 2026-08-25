import { globalTenantSearch } from '../../src/lib/search';

describe('Global Search Utility (Unit Tests)', () => {
  it('should return empty results for empty or whitespace query without executing DB queries', async () => {
    const res1 = await globalTenantSearch('tenant-dummy', '');
    expect(res1.total).toBe(0);
    expect(res1.results).toEqual([]);

    const res2 = await globalTenantSearch('tenant-dummy', '   ');
    expect(res2.total).toBe(0);
  });
});
