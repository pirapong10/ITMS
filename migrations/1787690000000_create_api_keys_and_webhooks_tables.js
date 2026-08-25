exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create tenant_api_keys table
  pgm.createTable('tenant_api_keys', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(100)', notNull: true },
    key_hash: { type: 'text', notNull: true },
    key_prefix: { type: 'varchar(16)', notNull: true },
    scopes: { type: 'text[]', notNull: true, default: '{"*.*"}' },
    rate_limit: { type: 'integer', notNull: true, default: 100 },
    is_active: { type: 'boolean', notNull: true, default: true },
    expires_at: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create webhook_subscriptions table
  pgm.createTable('webhook_subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    url: { type: 'text', notNull: true },
    secret: { type: 'text', notNull: true },
    events: { type: 'text[]', notNull: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create webhook_delivery_logs table
  pgm.createTable('webhook_delivery_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    subscription_id: {
      type: 'uuid',
      notNull: true,
      references: '"webhook_subscriptions"',
      onDelete: 'CASCADE',
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    event_type: { type: 'varchar(100)', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    response_status: { type: 'integer' },
    response_body: { type: 'text' },
    attempt_count: { type: 'integer', notNull: true, default: 1 },
    status: { type: 'varchar(20)', notNull: true, default: 'Delivered' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Enable RLS
  pgm.sql(`ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant_api_keys FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON tenant_api_keys
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  pgm.sql(`ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON webhook_subscriptions
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  pgm.sql(`ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE webhook_delivery_logs FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON webhook_delivery_logs
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  // 5. Grant permissions to app_user
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE tenant_api_keys TO app_user;
        GRANT ALL PRIVILEGES ON TABLE webhook_subscriptions TO app_user;
        GRANT ALL PRIVILEGES ON TABLE webhook_delivery_logs TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON webhook_delivery_logs;`);
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON webhook_subscriptions;`);
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_api_keys;`);
  pgm.sql(`ALTER TABLE webhook_delivery_logs DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE webhook_subscriptions DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant_api_keys DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('webhook_delivery_logs');
  pgm.dropTable('webhook_subscriptions');
  pgm.dropTable('tenant_api_keys');
};
