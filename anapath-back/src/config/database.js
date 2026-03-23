import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'anapath',
});

export async function query(text, params = []) {
  return pool.query(text, params);
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
