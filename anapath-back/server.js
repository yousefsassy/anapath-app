import dotenv from 'dotenv';
import net from 'node:net';
import app from './src/app.js';
import { logger } from './src/utils/logger.js';

dotenv.config();

const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_ATTEMPTS = 10;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      resolve(false);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function startServer() {
  let selectedPort = DEFAULT_PORT;

  for (let i = 0; i <= MAX_PORT_ATTEMPTS; i += 1) {
    const available = await isPortAvailable(selectedPort);
    if (available) {
      break;
    }

    if (i === MAX_PORT_ATTEMPTS) {
      logger.error('server_start_failed', {
        default_port: DEFAULT_PORT,
        last_checked_port: selectedPort,
        reason: 'no_available_port',
      });
      process.exit(1);
    }

    selectedPort += 1;
  }

  if (selectedPort !== DEFAULT_PORT) {
    logger.warn('server_port_fallback', {
      requested_port: DEFAULT_PORT,
      selected_port: selectedPort,
    });
  }

  app.listen(selectedPort, () => {
    logger.info('server_started', {
      port: selectedPort,
      health_url: `http://localhost:${selectedPort}/api/health`,
    });
  });
}

startServer();
