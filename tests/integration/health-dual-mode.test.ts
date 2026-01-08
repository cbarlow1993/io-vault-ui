import { beforeAll, describe, expect, it } from 'vitest';
import {
  type DefaultTestClients,
  getTestMode,
  setupTestClients,
} from '@/tests/utils/dualModeTestClient.js';

/**
 * Example test demonstrating the dual-mode test client.
 * Uses client.get(), client.post() etc. - works identically in local and remote modes.
 */
describe('Dual Mode Infrastructure Test', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    // This automatically uses inject (local) or HTTP (remote) based on STAGE
    clients = await setupTestClients();
  });

  it('should report test mode correctly', () => {
    const mode = getTestMode();
    console.log('Test mode:', mode);
    expect(['local', 'remote']).toContain(mode);
  });

  it('should respond to health check', async () => {
    const response = await clients.CLIENT_1.client.get('/health');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok' });
  });

  it('should respond to chains list (public endpoint)', async () => {
    const response = await clients.CLIENT_1.client.get('/v2/chains');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
});
