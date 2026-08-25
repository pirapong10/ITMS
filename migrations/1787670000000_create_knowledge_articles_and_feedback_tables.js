exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Extend knowledge_articles table
  pgm.addColumns('knowledge_articles', {
    summary: { type: 'text', notNull: true, default: '' },
    content: { type: 'text', notNull: true, default: '' },
    category: { type: 'varchar(50)', notNull: true, default: 'General' },
    tags: { type: 'text[]', notNull: true, default: '{}' },
    visibility: { type: 'varchar(20)', notNull: true, default: 'Internal' },
    status: { type: 'varchar(30)', notNull: true, default: 'Draft' },
    author_id: { type: 'varchar(255)' },
    author_name: { type: 'varchar(255)' },
    source_ticket_id: { type: 'varchar(36)' },
    source_problem_id: { type: 'varchar(36)' },
    helpful_count: { type: 'integer', notNull: true, default: 0 },
    not_helpful_count: { type: 'integer', notNull: true, default: 0 },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    published_at: { type: 'timestamp with time zone' },
  });

  // 2. Create knowledge_feedback table
  pgm.createTable('knowledge_feedback', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    article_id: {
      type: 'varchar(36)',
      notNull: true,
      references: '"knowledge_articles"',
      onDelete: 'CASCADE',
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'varchar(255)' },
    is_helpful: { type: 'boolean', notNull: true },
    feedback_text: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 3. Enable RLS on knowledge_feedback
  pgm.sql(`ALTER TABLE knowledge_feedback ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE knowledge_feedback FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation_policy ON knowledge_feedback
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
        GRANT ALL PRIVILEGES ON TABLE knowledge_articles TO app_user;
        GRANT ALL PRIVILEGES ON TABLE knowledge_feedback TO app_user;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenant_isolation_policy ON knowledge_feedback;`);
  pgm.sql(`ALTER TABLE knowledge_feedback DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable('knowledge_feedback');
  pgm.dropColumns('knowledge_articles', [
    'summary',
    'content',
    'category',
    'tags',
    'visibility',
    'status',
    'author_id',
    'author_name',
    'source_ticket_id',
    'source_problem_id',
    'helpful_count',
    'not_helpful_count',
    'updated_at',
    'published_at',
  ]);
};
