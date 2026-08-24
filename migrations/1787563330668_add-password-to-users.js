exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_hash: { type: 'varchar(255)', notNull: true, default: '' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['password_hash']);
};
