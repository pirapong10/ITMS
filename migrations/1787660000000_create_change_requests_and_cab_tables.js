exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Extend change_requests table
  pgm.addColumns('change_requests', {
    description: { type: 'text', notNull: true, default: '' },
    impact_level: { type: 'varchar(20)', notNull: true, default: 'Medium' },
    requested_by: { type: 'varchar(255)' },
    assigned_to: { type: 'varchar(255)' },
    implementation_plan: { type: 'text' },
    rollback_plan: { type: 'text' },
    test_plan: { type: 'text' },
    scheduled_start: { type: 'timestamp with time zone' },
    scheduled_end: { type: 'timestamp with time zone' },
    actual_start: { type: 'timestamp with time zone' },
    actual_end: { type: 'timestamp with time zone' },
    review_notes: { type: 'text' },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create cab_approvals table
  pgm.createTable('cab_approvals', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    change_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"change_requests"',
      onDelete: 'CASCADE',
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    approver_id: { type: 'varchar(255)', notNull: true },
    approver_name: { type: 'varchar(255)' },
    decision: { type: 'varchar(20)', notNull: true, default: 'Pending' },
    comments: { type: 'text' },
    decided_at: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Enable RLS on cab_approvals
  pgm.sql(`ALTER TABLE cab_approvals ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE cab_approvals FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON cab_approvals
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  // 4. Grant permissions to app_user
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE change_requests TO app_user;
        GRANT ALL PRIVILEGES ON TABLE cab_approvals TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON cab_approvals;`);
  pgm.sql(`ALTER TABLE cab_approvals DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('cab_approvals');
  pgm.dropColumns('change_requests', [
    'description',
    'impact_level',
    'requested_by',
    'assigned_to',
    'implementation_plan',
    'rollback_plan',
    'test_plan',
    'scheduled_start',
    'scheduled_end',
    'actual_start',
    'actual_end',
    'review_notes',
    'updated_at',
  ]);
};
