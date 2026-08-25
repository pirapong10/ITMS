exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create immutable_audit_logs table
  pgm.createTable('immutable_audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    actor_id: { type: 'varchar(255)' },
    actor_name: { type: 'varchar(255)' },
    action: { type: 'varchar(100)', notNull: true },
    resource_type: { type: 'varchar(50)', notNull: true },
    resource_id: { type: 'varchar(255)' },
    details: { type: 'jsonb' },
    ip_address: { type: 'varchar(45)' },
    user_agent: { type: 'text' },
    prev_hash: { type: 'text', notNull: true, default: 'GENESIS' },
    log_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create privacy_dsar_requests table
  pgm.createTable('privacy_dsar_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    request_type: { type: 'varchar(30)', notNull: true },
    subject_email: { type: 'varchar(255)', notNull: true },
    subject_user_id: { type: 'varchar(255)' },
    status: { type: 'varchar(30)', notNull: true, default: 'Pending' },
    requester_notes: { type: 'text' },
    resolution_notes: { type: 'text' },
    exported_data: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    completed_at: { type: 'timestamp with time zone' },
  });

  // 3. Enable RLS
  pgm.sql(`ALTER TABLE immutable_audit_logs ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE immutable_audit_logs FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON immutable_audit_logs
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  pgm.sql(`ALTER TABLE privacy_dsar_requests ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE privacy_dsar_requests FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON privacy_dsar_requests
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
        GRANT ALL PRIVILEGES ON TABLE immutable_audit_logs TO app_user;
        GRANT ALL PRIVILEGES ON TABLE privacy_dsar_requests TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON privacy_dsar_requests;`);
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON immutable_audit_logs;`);
  pgm.sql(`ALTER TABLE privacy_dsar_requests DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE immutable_audit_logs DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('privacy_dsar_requests');
  pgm.dropTable('immutable_audit_logs');
};
