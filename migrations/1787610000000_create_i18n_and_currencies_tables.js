exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create exchange_rates table (Global read)
  pgm.createTable('exchange_rates', {
    id: { type: 'varchar(20)', primaryKey: true },
    base_currency: { type: 'varchar(10)', notNull: true, default: 'USD' },
    target_currency: { type: 'varchar(10)', notNull: true },
    rate: { type: 'numeric(14, 6)', notNull: true },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create tenant_i18n_settings table (Tenant isolated)
  pgm.createTable('tenant_i18n_settings', {
    tenant_id: {
      type: 'uuid',
      primaryKey: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    default_language: { type: 'varchar(10)', notNull: true, default: 'en' },
    supported_languages: { type: 'jsonb', notNull: true, default: '["en", "th"]' },
    default_currency: { type: 'varchar(10)', notNull: true, default: 'USD' },
    supported_currencies: { type: 'jsonb', notNull: true, default: '["USD", "THB"]' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Seed initial exchange rates
  pgm.sql(`
    INSERT INTO exchange_rates (id, base_currency, target_currency, rate)
    VALUES
      ('USD_THB', 'USD', 'THB', 35.500000),
      ('USD_EUR', 'USD', 'EUR', 0.920000),
      ('USD_JPY', 'USD', 'JPY', 155.000000),
      ('USD_SGD', 'USD', 'SGD', 1.340000),
      ('USD_GBP', 'USD', 'GBP', 0.780000),
      ('THB_USD', 'THB', 'USD', 0.028169),
      ('EUR_USD', 'EUR', 'USD', 1.086957)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Enable RLS on tenant_i18n_settings
  pgm.sql(`ALTER TABLE tenant_i18n_settings ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant_i18n_settings FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON tenant_i18n_settings
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
        GRANT SELECT ON TABLE exchange_rates TO app_user;
        GRANT ALL PRIVILEGES ON TABLE tenant_i18n_settings TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_i18n_settings;`);
  pgm.sql(`ALTER TABLE tenant_i18n_settings DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('tenant_i18n_settings');
  pgm.dropTable('exchange_rates');
};
