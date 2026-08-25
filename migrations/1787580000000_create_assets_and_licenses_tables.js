exports.shorthands = undefined;

exports.up = (pgm) => {
  const tenantIdFk = {
    type: 'uuid',
    notNull: true,
    references: '"tenants"',
    onDelete: 'CASCADE',
  };

  // 1. Create assets table
  pgm.createTable('assets', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    asset_tag: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    category: { type: 'varchar(100)', notNull: true, default: 'Hardware' },
    model: { type: 'varchar(255)' },
    serial_number: { type: 'varchar(255)' },
    purchase_date: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    purchase_cost: { type: 'numeric(12, 2)', notNull: true, default: 0 },
    salvage_value: { type: 'numeric(12, 2)', notNull: true, default: 0 },
    depreciation_rate: { type: 'numeric(5, 2)', notNull: true, default: 20.00 },
    warranty_expiry: { type: 'timestamp with time zone' },
    status: { type: 'varchar(50)', notNull: true, default: 'In Use' },
    assigned_to: { type: 'varchar(255)' },
    department: { type: 'varchar(100)' },
    location: { type: 'varchar(150)' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create asset_lifecycle_logs table
  pgm.createTable('asset_lifecycle_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    asset_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"assets"',
      onDelete: 'CASCADE',
    },
    event_type: { type: 'varchar(50)', notNull: true },
    reference_id: { type: 'varchar(255)' },
    summary: { type: 'varchar(255)', notNull: true },
    details: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create licenses table
  pgm.createTable('licenses', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    license_tag: { type: 'varchar(50)' },
    software_name: { type: 'varchar(255)', notNull: true },
    license_key: { type: 'varchar(255)' },
    license_type: { type: 'varchar(50)', notNull: true, default: 'Subscription' },
    total_seats: { type: 'integer', notNull: true, default: 1 },
    allocated_seats: { type: 'integer', notNull: true, default: 0 },
    cost_per_seat: { type: 'numeric(12, 2)', notNull: true, default: 0 },
    purchase_date: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    expiry_date: { type: 'timestamp with time zone' },
    status: { type: 'varchar(50)', notNull: true, default: 'Active' },
    vendor: { type: 'varchar(255)' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Create license_allocations table
  pgm.createTable('license_allocations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    license_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"licenses"',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'varchar(255)' },
    user_name: { type: 'varchar(255)' },
    user_email: { type: 'varchar(255)' },
    asset_id: { type: 'varchar(36)' },
    notes: { type: 'text' },
    allocated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 5. Enable Row Level Security (RLS) on all 4 tables
  const newTables = ['assets', 'asset_lifecycle_logs', 'licenses', 'license_allocations'];
  for (const table of newTables) {
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
    pgm.sql(`
      CREATE POLICY tenant_isolation_policy ON ${table}
      AS PERMISSIVE
      FOR ALL
      TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    `);
  }

  // 6. Grant privileges to app_user role
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE assets TO app_user;
        GRANT ALL PRIVILEGES ON TABLE asset_lifecycle_logs TO app_user;
        GRANT ALL PRIVILEGES ON TABLE licenses TO app_user;
        GRANT ALL PRIVILEGES ON TABLE license_allocations TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  const tables = ['license_allocations', 'licenses', 'asset_lifecycle_logs', 'assets'];
  for (const table of tables) {
    pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    pgm.dropTable(table);
  }
};
