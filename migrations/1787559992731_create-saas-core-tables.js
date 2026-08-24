exports.shorthands = undefined;

exports.up = (pgm) => {
  // Global table (no RLS)
  pgm.createTable('tenants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_name: { type: 'varchar(150)', notNull: true },
    subdomain: { type: 'varchar(63)', notNull: true, unique: true },
    custom_domain: { type: 'varchar(255)' },
    default_language: { type: 'varchar(10)', default: 'en-US' },
    default_currency: { type: 'varchar(3)', default: 'USD' },
    default_timezone: { type: 'varchar(50)', default: 'UTC' },
    status: { type: 'varchar(20)', notNull: true, default: 'Trial' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  const tenantIdFk = {
    type: 'uuid',
    notNull: true,
    references: '"tenants"',
    onDelete: 'CASCADE',
  };

  pgm.createTable('tenant_sso_configs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    idp_type: { type: 'varchar(30)' },
    entry_point: { type: 'varchar(500)' },
    scim_enabled: { type: 'boolean', default: false },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    name: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('tickets', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    title: { type: 'varchar(255)', notNull: true },
    priority: { type: 'varchar(50)' },
    status: { type: 'varchar(50)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('problems', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    title: { type: 'varchar(255)', notNull: true },
    root_cause: { type: 'text' },
    status: { type: 'varchar(30)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('change_requests', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    title: { type: 'varchar(255)', notNull: true },
    change_type: { type: 'varchar(20)' },
    risk_level: { type: 'varchar(20)' },
    status: { type: 'varchar(30)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('knowledge_articles', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    title: { type: 'varchar(255)', notNull: true },
    is_published: { type: 'boolean', default: false },
    view_count: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('knowledge_articles');
  pgm.dropTable('change_requests');
  pgm.dropTable('problems');
  pgm.dropTable('tickets');
  pgm.dropTable('users');
  pgm.dropTable('tenant_sso_configs');
  pgm.dropTable('tenants');
};
