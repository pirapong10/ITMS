exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Extend existing tenant_sso_configs table
  pgm.addColumns('tenant_sso_configs', {
    provider_type: { type: 'varchar(30)', notNull: true, default: 'OIDC' },
    is_enabled: { type: 'boolean', notNull: true, default: false },
    enforce_sso: { type: 'boolean', notNull: true, default: false },
    issuer_url: { type: 'text', notNull: true, default: '' },
    sso_url: { type: 'text', notNull: true, default: '' },
    client_id: { type: 'text' },
    client_secret_encrypted: { type: 'text' },
    x509_cert: { type: 'text' },
    allow_jit_provisioning: { type: 'boolean', notNull: true, default: true },
    default_role: { type: 'varchar(50)', notNull: true, default: 'User' },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create user_mfa_credentials table
  pgm.createTable('user_mfa_credentials', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    mfa_type: { type: 'varchar(30)', notNull: true, default: 'TOTP' },
    secret_encrypted: { type: 'text', notNull: true },
    is_verified: { type: 'boolean', notNull: true, default: false },
    backup_codes: { type: 'jsonb', notNull: true, default: '[]' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Enable RLS on user_mfa_credentials
  pgm.sql(`ALTER TABLE user_mfa_credentials ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE user_mfa_credentials FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON user_mfa_credentials
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
        GRANT ALL PRIVILEGES ON TABLE user_mfa_credentials TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON user_mfa_credentials;`);
  pgm.sql(`ALTER TABLE user_mfa_credentials DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('user_mfa_credentials');
  pgm.dropColumns('tenant_sso_configs', [
    'provider_type',
    'is_enabled',
    'enforce_sso',
    'issuer_url',
    'sso_url',
    'client_id',
    'client_secret_encrypted',
    'x509_cert',
    'allow_jit_provisioning',
    'default_role',
    'updated_at',
  ]);
};
