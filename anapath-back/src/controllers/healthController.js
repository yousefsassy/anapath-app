import { testDbConnection } from '../config/database.js';

export async function getHealth(req, res) {
  const dbStatus = await testDbConnection();

  return res.status(200).json({
    success: true,
    message: 'Anapath backend is running',
    data: {
      api: 'ok',
      database: dbStatus.connected ? 'connected' : 'not_connected',
      database_error: dbStatus.connected ? null : dbStatus.error,
      database_name: dbStatus.connected ? dbStatus.database : null,
      database_host: dbStatus.connected ? dbStatus.host : null,
      database_port: dbStatus.connected ? dbStatus.port : null,
      timestamp: new Date().toISOString(),
    },
  });
}
