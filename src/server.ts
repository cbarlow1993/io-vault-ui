import 'dotenv/config';
import { config } from '@/src/lib/config.js';
import { buildApp } from '@/src/app.js';

// Log loaded environment for debugging (non-sensitive keys only)
console.log('Environment:', {
  stage: config.server.stage,
  port: config.server.port,
  host: config.server.host,
});

const app = buildApp({ logger: true });

const start = async () => {
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(`Server listening on http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
