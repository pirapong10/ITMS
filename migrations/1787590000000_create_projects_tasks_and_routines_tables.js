exports.shorthands = undefined;

exports.up = (pgm) => {
  const tenantIdFk = {
    type: 'uuid',
    notNull: true,
    references: '"tenants"',
    onDelete: 'CASCADE',
  };

  // 1. Create projects table
  pgm.createTable('projects', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    project_code: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category: { type: 'varchar(100)', notNull: true, default: 'Infrastructure' },
    status: { type: 'varchar(50)', notNull: true, default: 'Planning' },
    start_date: { type: 'timestamp with time zone' },
    target_end_date: { type: 'timestamp with time zone' },
    actual_end_date: { type: 'timestamp with time zone' },
    budget: { type: 'numeric(12, 2)', notNull: true, default: 0 },
    project_manager: { type: 'varchar(255)' },
    progress_percent: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create project_tasks table
  pgm.createTable('project_tasks', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    project_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"projects"',
      onDelete: 'CASCADE',
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'Todo' },
    assigned_to: { type: 'varchar(255)' },
    start_date: { type: 'timestamp with time zone' },
    due_date: { type: 'timestamp with time zone' },
    order_index: { type: 'integer', notNull: true, default: 0 },
    is_milestone: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Create tasks table (Kanban)
  pgm.createTable('tasks', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    task_code: { type: 'varchar(50)', notNull: true },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'Todo' },
    priority: { type: 'varchar(50)', notNull: true, default: 'Medium' },
    assigned_to: { type: 'varchar(255)' },
    due_date: { type: 'timestamp with time zone' },
    order_index: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 4. Create borrow_records table
  pgm.createTable('borrow_records', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    borrow_code: { type: 'varchar(50)', notNull: true },
    asset_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"assets"',
      onDelete: 'CASCADE',
    },
    borrower_name: { type: 'varchar(255)', notNull: true },
    borrower_email: { type: 'varchar(255)' },
    department: { type: 'varchar(100)' },
    borrow_date: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    expected_return_date: { type: 'timestamp with time zone', notNull: true },
    actual_return_date: { type: 'timestamp with time zone' },
    status: { type: 'varchar(50)', notNull: true, default: 'Borrowed' },
    condition_on_borrow: { type: 'text' },
    condition_on_return: { type: 'text' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 5. Create pm_schedules table
  pgm.createTable('pm_schedules', {
    id: { type: 'varchar(36)', primaryKey: true },
    tenant_id: tenantIdFk,
    pm_code: { type: 'varchar(50)', notNull: true },
    title: { type: 'varchar(255)', notNull: true },
    target_type: { type: 'varchar(50)', notNull: true, default: 'Asset' },
    target_id: { type: 'varchar(255)' },
    recurrence: { type: 'varchar(50)', notNull: true, default: 'Monthly' },
    next_due_date: { type: 'timestamp with time zone', notNull: true },
    last_executed_at: { type: 'timestamp with time zone' },
    assigned_technician: { type: 'varchar(255)' },
    checklist_items: { type: 'jsonb', notNull: true, default: '[]' },
    status: { type: 'varchar(50)', notNull: true, default: 'Active' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 6. Create routine_checklists table
  pgm.createTable('routine_checklists', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: tenantIdFk,
    check_date: { type: 'date', notNull: true, default: pgm.func('current_date') },
    category: { type: 'varchar(50)', notNull: true },
    item_name: { type: 'varchar(255)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'Pending' },
    checked_by: { type: 'varchar(255)' },
    remarks: { type: 'text' },
    linked_ticket_id: { type: 'varchar(36)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 7. Enable Row Level Security (RLS) on all 6 tables
  const newTables = [
    'projects',
    'project_tasks',
    'tasks',
    'borrow_records',
    'pm_schedules',
    'routine_checklists',
  ];

  for (const table of newTables) {
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

  // 8. Grant privileges to app_user role
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        GRANT ALL PRIVILEGES ON TABLE projects TO app_user;
        GRANT ALL PRIVILEGES ON TABLE project_tasks TO app_user;
        GRANT ALL PRIVILEGES ON TABLE tasks TO app_user;
        GRANT ALL PRIVILEGES ON TABLE borrow_records TO app_user;
        GRANT ALL PRIVILEGES ON TABLE pm_schedules TO app_user;
        GRANT ALL PRIVILEGES ON TABLE routine_checklists TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  const tables = [
    'routine_checklists',
    'pm_schedules',
    'borrow_records',
    'tasks',
    'project_tasks',
    'projects',
  ];
  for (const table of tables) {
    pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    pgm.dropTable(table);
  }
};
