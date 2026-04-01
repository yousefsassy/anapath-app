import 'dotenv/config';
import pg from 'pg';
import {
  applyDbPolicyContext,
  getDbPolicyContext,
} from '../utils/dbPolicyContext.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'anapath',
});

export async function query(text, params = []) {
  const context = getDbPolicyContext();

  if (!context) {
    return pool.query(text, params);
  }

  return withDbTransaction(
    (client) => client.query(text, params),
    { context }
  );
}

export async function withDbTransaction(work, { context = null } = {}) {
  const client = await pool.connect();
  const effectiveContext = context ?? getDbPolicyContext();

  try {
    await client.query('BEGIN');

    if (effectiveContext) {
      await applyDbPolicyContext(client, effectiveContext);
    }

    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original failure when rollback also fails.
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function testDbConnection() {
  try {
    await pool.query('SELECT 1');
    return {
      connected: true,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'anapath',
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export default pool;
