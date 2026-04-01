import pool, { query } from '../src/config/database.js';

const EXPECTED_TABLES = [
  'patients',
  'exams',
  'reports',
  'exam_sequences',
  'report_templates',
  'audit_events',
  'report_revisions',
];

async function main() {
  const tableResult = await query(
    `SELECT
       c.relname AS table_name,
       c.relrowsecurity,
       c.relforcerowsecurity
     FROM pg_class c
     INNER JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname ASC`,
    [EXPECTED_TABLES]
  );

  const policyResult = await query(
    `SELECT
       tablename,
       policyname
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = ANY($1::text[])
     ORDER BY tablename ASC, policyname ASC`,
    [EXPECTED_TABLES]
  );

  const tablesByName = new Map(
    tableResult.rows.map((row) => [row.table_name, row])
  );
  const policiesByTable = new Map();

  for (const row of policyResult.rows) {
    const names = policiesByTable.get(row.tablename) || [];
    names.push(row.policyname);
    policiesByTable.set(row.tablename, names);
  }

  const problems = [];

  for (const tableName of EXPECTED_TABLES) {
    const table = tablesByName.get(tableName);

    if (!table) {
      problems.push(`table_missing:${tableName}`);
      continue;
    }

    if (!table.relrowsecurity) {
      problems.push(`rls_disabled:${tableName}`);
    }

    if (!table.relforcerowsecurity) {
      problems.push(`rls_not_forced:${tableName}`);
    }

    if (!(policiesByTable.get(tableName) || []).length) {
      problems.push(`policy_missing:${tableName}`);
    }
  }

  const payload = {
    ok: problems.length === 0,
    tables: tableResult.rows,
    policies: policyResult.rows,
    problems,
  };

  if (problems.length > 0) {
    console.error(JSON.stringify(payload));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(payload));
}

try {
  await main();
} finally {
  await pool.end();
}
