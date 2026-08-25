exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add timezone and business_hours to tenant_i18n_settings
  pgm.addColumn('tenant_i18n_settings', {
    timezone: { type: 'varchar(50)', notNull: true, default: 'Asia/Bangkok' },
    business_hours: {
      type: 'jsonb',
      notNull: true,
      default: '{"start": "08:30", "end": "17:30", "work_days": [1, 2, 3, 4, 5], "holidays": []}',
    },
  });

  // 2. Add timezone to users table
  pgm.addColumn('users', {
    timezone: { type: 'varchar(50)', notNull: true, default: 'Asia/Bangkok' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'timezone');
  pgm.dropColumn('tenant_i18n_settings', ['timezone', 'business_hours']);
};
