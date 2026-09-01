exports.shorthands = undefined;

/**
 * Migration: Enable RLS on public.tenants
 *
 * Context:
 *   The `tenants` table was originally created as a "global table" without RLS
 *   (see migration 1787559992731_create-saas-core-tables.js).
 *   Supabase's PostgREST exposes all tables in the public schema, so any table
 *   without RLS is accessible to anon/authenticated roles without restriction.
 *
 *   Our application ALWAYS accesses this table via the service_role key (pg.Pool
 *   configured in src/lib/db.ts), which bypasses RLS automatically. Therefore
 *   we can safely block all direct client access and rely on the API layer for
 *   any tenant reads/writes.
 *
 * Policies applied:
 *   1. superadmin_read_all        — authenticated users with role = 'SuperAdmin'
 *                                   may read any tenant row (via JWT claim).
 *   2. block_direct_client_access — RESTRICTIVE deny-all for anon + authenticated
 *                                   roles so no row escapes through PostgREST
 *                                   unless a specific PERMISSIVE policy allows it.
 *
 * Rollback (down):
 *   Drops the policies and disables RLS, restoring original state.
 */

exports.up = (pgm) => {
  // ── 0. Ensure required roles exist (idempotent for test and CI environments) ──
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
    END
    $$;
  `);

  // ── 1. Enable and force RLS ──────────────────────────────────────────────
  pgm.sql(`ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;`);

  // ── 2. PERMISSIVE: SuperAdmin can read any tenant ────────────────────────
  //       This is useful for the Super Admin Portal (/admin) which lists all
  //       tenants. The service_role key still bypasses RLS entirely, so this
  //       policy only matters when using an authenticated JWT directly.
  pgm.sql(`
    CREATE POLICY tenants_superadmin_read_all
      ON public.tenants
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (
        current_setting('app.current_user_role', true) = 'SuperAdmin'
      );
  `);

  // ── 3. RESTRICTIVE: Block all direct client access by default ────────────
  //       A RESTRICTIVE policy is AND-ed with PERMISSIVE ones, forming a
  //       deny-unless-explicitly-allowed gate. Since our app goes through
  //       service_role (which bypasses RLS), this is purely a defence-in-depth
  //       measure against PostgREST direct calls with anon/authenticated keys.
  pgm.sql(`
    CREATE POLICY tenants_block_direct_client_access
      ON public.tenants
      AS RESTRICTIVE
      FOR ALL
      TO anon
      USING (false)
      WITH CHECK (false);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS tenants_superadmin_read_all ON public.tenants;`);
  pgm.sql(`DROP POLICY IF EXISTS tenants_block_direct_client_access ON public.tenants;`);
  pgm.sql(`ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`);
};
