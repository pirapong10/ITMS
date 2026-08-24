exports.shorthands = undefined;

exports.up = (pgm) => {
  const tenantTables = [
    'tenant_sso_configs',
    'users',
    'tickets',
    'problems',
    'change_requests',
    'knowledge_articles'
  ];

  for (const table of tenantTables) {
    // Enable Row Level Security
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);

    // Create policy to restrict access by tenant_id
    pgm.sql(`
      CREATE POLICY tenant_isolation_policy ON ${table}
      AS PERMISSIVE
      FOR ALL
      TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    `);
  }
};

exports.down = (pgm) => {
  const tenantTables = [
    'knowledge_articles',
    'change_requests',
    'problems',
    'tickets',
    'users',
    'tenant_sso_configs'
  ];

  for (const table of tenantTables) {
    pgm.sql(`DROP POLICY tenant_isolation_policy ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
};
