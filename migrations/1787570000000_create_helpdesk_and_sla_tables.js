exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add extra columns to tickets table
  pgm.addColumns('tickets', {
    ticket_number: { type: 'varchar(50)' },
    description: { type: 'text' },
    category: { type: 'varchar(100)', default: 'General' },
    assigned_to: { type: 'varchar(255)' },
    reporter_name: { type: 'varchar(255)' },
    reporter_email: { type: 'varchar(255)' },
    sla_target_hours: { type: 'integer', default: 24 },
    sla_deadline: { type: 'timestamp with time zone' },
    sla_paused_at: { type: 'timestamp with time zone' },
    sla_total_paused_seconds: { type: 'integer', default: 0, notNull: true },
    sla_breached: { type: 'boolean', default: false, notNull: true },
    resolved_at: { type: 'timestamp with time zone' },
    closed_at: { type: 'timestamp with time zone' },
    resolution_notes: { type: 'text' },
    csat_rating: { type: 'integer' },
    csat_feedback: { type: 'text' },
    attachments: { type: 'jsonb', default: '[]' },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  const tenantIdFk = {
    type: 'uuid',
    notNull: true,
    references: '"tenants"',
    onDelete: 'CASCADE',
  };

  // 2. Create ticket_audit_logs table
  pgm.createTable('ticket_audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    ticket_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"tickets"',
      onDelete: 'CASCADE',
    },
    actor_id: { type: 'varchar(255)' },
    actor_name: { type: 'varchar(255)' },
    action: { type: 'varchar(100)', notNull: true },
    old_value: { type: 'text' },
    new_value: { type: 'text' },
    details: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create canned_responses table
  pgm.createTable('canned_responses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    category: { type: 'varchar(100)', default: 'General' },
    title: { type: 'varchar(255)', notNull: true },
    content: { type: 'text', notNull: true },
    shortcut_code: { type: 'varchar(50)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Enable Row Level Security (RLS)
  const newTenantTables = ['ticket_audit_logs', 'canned_responses'];
  for (const table of newTenantTables) {
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

  // 5. Grant permissions to app_user role
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE ticket_audit_logs TO app_user;
        GRANT ALL PRIVILEGES ON TABLE canned_responses TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON canned_responses;`);
  pgm.sql(`ALTER TABLE canned_responses DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('canned_responses');

  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON ticket_audit_logs;`);
  pgm.sql(`ALTER TABLE ticket_audit_logs DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('ticket_audit_logs');

  pgm.dropColumns('tickets', [
    'ticket_number',
    'description',
    'category',
    'assigned_to',
    'reporter_name',
    'reporter_email',
    'sla_target_hours',
    'sla_deadline',
    'sla_paused_at',
    'sla_total_paused_seconds',
    'sla_breached',
    'resolved_at',
    'closed_at',
    'resolution_notes',
    'csat_rating',
    'csat_feedback',
    'attachments',
    'updated_at',
  ]);
};
