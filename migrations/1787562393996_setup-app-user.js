exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create an application role that is NOT a superuser.
  // It won't be able to bypass RLS.
  pgm.sql(`
    DO
    $do$
    BEGIN
      IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles
        WHERE  rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
      END IF;
    END
    $do$;
  `);
  
  // Grant usage and all privileges on all current and future tables/sequences in public schema
  pgm.sql(`GRANT USAGE ON SCHEMA public TO app_user;`);
  pgm.sql(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;`);
  pgm.sql(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO app_user;`);
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO app_user;`);
  
  // Grant app_user to CURRENT_USER and itsm_admin if exists
  pgm.sql(`
    DO
    $do$
    BEGIN
      EXECUTE format('GRANT app_user TO %I', CURRENT_USER);
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'itsm_admin') THEN
        GRANT app_user TO itsm_admin;
      END IF;
    END
    $do$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO
    $do$
    BEGIN
      EXECUTE format('REVOKE app_user FROM %I', CURRENT_USER);
      IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'itsm_admin') THEN
        REVOKE app_user FROM itsm_admin;
      END IF;
    END
    $do$;
  `);
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM app_user;`);
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM app_user;`);
  pgm.sql(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_user;`);
  pgm.sql(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_user;`);
  pgm.sql(`REVOKE USAGE ON SCHEMA public FROM app_user;`);
  pgm.sql(`DROP ROLE app_user;`);
};
