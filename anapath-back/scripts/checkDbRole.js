import pool, { query } from '../src/config/database.js';

async function main() {
  const result = await query(
    `SELECT
       current_user AS current_user,
       session_user AS session_user,
       r.rolsuper,
       r.rolbypassrls,
       r.rolcreaterole
     FROM pg_roles r
     WHERE r.rolname = current_user`
  );

  const role = result.rows[0];

  if (!role) {
    throw new Error('Impossible de lire le profil du role PostgreSQL courant.');
  }

  const summary = {
    current_user: role.current_user,
    session_user: role.session_user,
    rolsuper: role.rolsuper,
    rolbypassrls: role.rolbypassrls,
    rolcreaterole: role.rolcreaterole,
  };

  if (role.rolsuper || role.rolbypassrls) {
    console.error(JSON.stringify({
      ok: false,
      message:
        'Le backend doit utiliser un role PostgreSQL applicatif sans SUPERUSER ni BYPASSRLS avant le rollout RLS.',
      role: summary,
    }));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    ok: true,
    message: 'Le role PostgreSQL courant est compatible avec le futur rollout RLS.',
    role: summary,
  }));
}

try {
  await main();
} finally {
  await pool.end();
}
