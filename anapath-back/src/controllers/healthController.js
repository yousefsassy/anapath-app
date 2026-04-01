import { testDbConnection } from '../config/database.js';

export async function getHealth(req, res) {
  const dbStatus = await testDbConnection();
  const statusCode = dbStatus.connected ? 200 : 503;

  return res.status(statusCode).json({
    success: dbStatus.connected,
    message: dbStatus.connected
      ? 'Service disponible.'
      : 'Base de données indisponible.',
    data: {
      api: 'ok',
      database: dbStatus.connected ? 'connected' : 'not_connected',
      timestamp: new Date().toISOString(),
    },
  });
}
