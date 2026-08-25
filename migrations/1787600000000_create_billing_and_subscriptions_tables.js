exports.shorthands = undefined;

exports.up = (pgm) => {
  const tenantIdFk = {
    type: 'uuid',
    notNull: true,
    references: '"tenants"',
    onDelete: 'CASCADE',
  };

  // 1. Create subscription_plans table
  pgm.createTable('subscription_plans', {
    id: { type: 'varchar(36)', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    price_monthly_usd: { type: 'numeric(10, 2)', notNull: true },
    price_yearly_usd: { type: 'numeric(10, 2)', notNull: true },
    price_monthly_thb: { type: 'numeric(10, 2)', notNull: true },
    price_yearly_thb: { type: 'numeric(10, 2)', notNull: true },
    max_users: { type: 'integer', notNull: true, default: 5 },
    max_assets: { type: 'integer', notNull: true, default: 50 },
    features: { type: 'jsonb', notNull: true, default: '[]' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create tenant_subscriptions table
  pgm.createTable('tenant_subscriptions', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    plan_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"subscription_plans"',
      onDelete: 'RESTRICT',
    },
    status: { type: 'varchar(50)', notNull: true, default: 'Active' },
    billing_cycle: { type: 'varchar(20)', notNull: true, default: 'Monthly' },
    currency: { type: 'varchar(10)', notNull: true, default: 'USD' },
    current_period_start: { type: 'timestamp with time zone', notNull: true },
    current_period_end: { type: 'timestamp with time zone', notNull: true },
    cancel_at_period_end: { type: 'boolean', notNull: true, default: false },
    payment_gateway: { type: 'varchar(50)', default: 'Stripe' },
    gateway_customer_id: { type: 'varchar(255)' },
    gateway_subscription_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create invoices table
  pgm.createTable('invoices', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    invoice_number: { type: 'varchar(50)', notNull: true },
    subscription_id: {
      type: 'varchar(36)',
      references: '"tenant_subscriptions"',
      onDelete: 'SET NULL',
    },
    amount: { type: 'numeric(12, 2)', notNull: true },
    currency: { type: 'varchar(10)', notNull: true, default: 'USD' },
    tax_amount: { type: 'numeric(12, 2)', notNull: true, default: 0 },
    total_amount: { type: 'numeric(12, 2)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'Paid' },
    due_date: { type: 'timestamp with time zone', notNull: true },
    paid_at: { type: 'timestamp with time zone' },
    payment_method: { type: 'varchar(50)', default: 'Credit Card' },
    receipt_url: { type: 'text' },
    line_items: { type: 'jsonb', notNull: true, default: '[]' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Create payment_transactions table
  pgm.createTable('payment_transactions', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    invoice_id: {
      type: 'varchar(36)',
      references: '"invoices"',
      onDelete: 'CASCADE',
    },
    gateway: { type: 'varchar(50)', notNull: true },
    transaction_id: { type: 'varchar(255)', notNull: true },
    amount: { type: 'numeric(12, 2)', notNull: true },
    currency: { type: 'varchar(10)', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    payload: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 5. Seed default plans
  pgm.sql(`
    INSERT INTO subscription_plans (id, name, description, price_monthly_usd, price_yearly_usd, price_monthly_thb, price_yearly_thb, max_users, max_assets, features)
    VALUES
      ('plan_starter', 'Starter', 'Ideal for small IT teams and startups', 29.00, 290.00, 990.00, 9900.00, 5, 50, '["Core Helpdesk", "Basic SLA", "Asset Tracking"]'::jsonb),
      ('plan_pro', 'Professional', 'For growing enterprises with multi-department support', 79.00, 790.00, 2690.00, 26900.00, 20, 250, '["Core Helpdesk", "Custom SLA Engine", "Asset & License Mgmt", "Project Kanban", "PM Schedules"]'::jsonb),
      ('plan_enterprise', 'Enterprise', 'Complete IT Operations Suite for large organizations', 199.00, 1990.00, 6900.00, 69000.00, 9999, 9999, '["All Features", "SSO & SCIM", "Dedicated Database", "Unlimited Assets & Users", "24/7 SLA"]'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 6. Enable RLS
  const tenantTables = ['tenant_subscriptions', 'invoices', 'payment_transactions'];
  for (const table of tenantTables) {
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

  // 7. Grant privileges to app_user role
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT SELECT ON TABLE subscription_plans TO app_user;
        GRANT ALL PRIVILEGES ON TABLE tenant_subscriptions TO app_user;
        GRANT ALL PRIVILEGES ON TABLE invoices TO app_user;
        GRANT ALL PRIVILEGES ON TABLE payment_transactions TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  const tables = ['payment_transactions', 'invoices', 'tenant_subscriptions', 'subscription_plans'];
  for (const table of ['payment_transactions', 'invoices', 'tenant_subscriptions']) {
    pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
  for (const table of tables) {
    pgm.dropTable(table);
  }
};
