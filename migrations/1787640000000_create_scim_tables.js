exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add is_active and external_id to users
  pgm.addColumns('users', {
    is_active: { type: 'boolean', notNull: true, default: true },
    external_id: { type: 'varchar(255)' },
  });

  // 2. Create tenant_scim_tokens table
  pgm.createTable('tenant_scim_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    token_hash: { type: 'text', notNull: true },
    name: { type: 'varchar(100)', notNull: true, default: 'Default SCIM Token' },
    is_active: { type: 'boolean', notNull: true, default: true },
    expires_at: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create groups table
  pgm.createTable('groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    display_name: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Create group_memberships table
  pgm.createTable('group_memberships', {
    group_id: {
      type: 'uuid',
      notNull: true,
      references: '"groups"',
      onDelete: 'CASCADE',
    },
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
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('group_memberships', 'pk_group_memberships', {
    primaryKey: ['group_id', 'user_id'],
  });

  // 5. Enable RLS
  pgm.sql(`ALTER TABLE tenant_scim_tokens ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant_scim_tokens FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON tenant_scim_tokens
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  pgm.sql(`ALTER TABLE groups ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE groups FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON groups
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  pgm.sql(`ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE group_memberships FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON group_memberships
    AS PERMISSIVE
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  // 6. Grant permissions to app_user
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE tenant_scim_tokens TO app_user;
        GRANT ALL PRIVILEGES ON TABLE groups TO app_user;
        GRANT ALL PRIVILEGES ON TABLE group_memberships TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON group_memberships;`);
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON groups;`);
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_scim_tokens;`);
  pgm.sql(`ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE groups DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant_scim_tokens DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('group_memberships');
  pgm.dropTable('groups');
  pgm.dropTable('tenant_scim_tokens');
  pgm.dropColumns('users', ['is_active', 'external_id']);
};
