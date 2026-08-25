exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Extend problems table
  pgm.addColumns('problems', {
    description: { type: 'text', notNull: true, default: '' },
    category: { type: 'varchar(50)', notNull: true, default: 'General' },
    priority: { type: 'varchar(20)', notNull: true, default: 'Medium' },
    impact: { type: 'varchar(20)', notNull: true, default: 'Medium' },
    assigned_to: { type: 'varchar(255)' },
    workaround: { type: 'text' },
    solution: { type: 'text' },
    is_known_error: { type: 'boolean', notNull: true, default: false },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamp with time zone' },
  });

  // 2. Create problem_ticket_links table
  pgm.createTable('problem_ticket_links', {
    problem_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"problems"',
      onDelete: 'CASCADE',
    },
    ticket_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"tickets"',
      onDelete: 'CASCADE',
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    linked_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('problem_ticket_links', 'pk_problem_ticket_links', {
    primaryKey: ['problem_id', 'ticket_id'],
  });

  // 3. Enable RLS on problem_ticket_links
  pgm.sql(`ALTER TABLE problem_ticket_links ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE problem_ticket_links FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON problem_ticket_links
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
        GRANT ALL PRIVILEGES ON TABLE problems TO app_user;
        GRANT ALL PRIVILEGES ON TABLE problem_ticket_links TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON problem_ticket_links;`);
  pgm.sql(`ALTER TABLE problem_ticket_links DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('problem_ticket_links');
  pgm.dropColumns('problems', [
    'description',
    'category',
    'priority',
    'impact',
    'assigned_to',
    'workaround',
    'solution',
    'is_known_error',
    'updated_at',
    'resolved_at',
  ]);
};
