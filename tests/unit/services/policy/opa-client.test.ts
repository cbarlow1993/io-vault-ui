import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpaClient, OpaError } from '@/src/services/policy/opa-client.js';

describe('OpaClient', () => {
  let client: OpaClient;

  beforeEach(() => {
    global.fetch = vi.fn();
    client = new OpaClient('http://localhost:8181');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call OPA API with correct input', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { allowed: true, matched_role: 'treasury:admin' },
      }),
    } as Response);

    const result = await client.evaluate({
      user: {
        id: 'user-1',
        globalRole: null,
        moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
      },
      module: 'treasury',
      action: 'view_balances',
      resource: {},
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8181/v1/data/rbac/access/decision',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(result.allowed).toBe(true);
    expect(result.matchedRole).toBe('treasury:admin');
  });

  it('should send correctly transformed request body', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { allowed: true, matched_role: 'treasury:admin' },
      }),
    } as Response);

    await client.evaluate({
      user: {
        id: 'user-123',
        globalRole: 'super_admin',
        moduleRoles: [
          { module: 'treasury', role: 'admin', resourceScope: 'vault-1' },
          { module: 'staking', role: 'viewer', resourceScope: null },
        ],
      },
      module: 'treasury',
      action: 'create_transaction',
      resource: { vaultId: 'vault-1' },
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);

    expect(requestBody).toEqual({
      input: {
        user: {
          id: 'user-123',
          global_role: 'super_admin',
          module_roles: [
            { module: 'treasury', role: 'admin', resource_scope: 'vault-1' },
            { module: 'staking', role: 'viewer', resource_scope: null },
          ],
        },
        module: 'treasury',
        action: 'create_transaction',
        resource: { vaultId: 'vault-1' },
      },
    });
  });

  it('should handle OPA errors gracefully', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(
      client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow(OpaError);

    await expect(
      client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow('OPA request failed: 500 Internal Server Error');
  });

  it('should throw OpaError with status code on HTTP errors', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    try {
      await client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(OpaError);
      expect((error as OpaError).statusCode).toBe(503);
    }
  });

  it('should throw OpaError on invalid response structure', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: null }),
    } as Response);

    await expect(
      client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow('Invalid OPA response: missing or malformed result');
  });

  it('should throw OpaError when allowed is not a boolean', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { allowed: 'yes' } }),
    } as Response);

    await expect(
      client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow('Invalid OPA response: missing or malformed result');
  });

  it('should timeout after configured duration', async () => {
    const slowClient = new OpaClient('http://localhost:8181', { timeoutMs: 100 });

    vi.mocked(global.fetch).mockImplementation(
      (_url, options) =>
        new Promise((resolve, reject) => {
          const signal = options?.signal as AbortSignal;
          const timeoutId = setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ result: { allowed: true } }),
              } as Response),
            500
          );

          // Listen for abort signal
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        })
    );

    await expect(
      slowClient.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow();
  });

  it('should use default timeout of 5000ms', () => {
    const defaultClient = new OpaClient('http://localhost:8181');
    // Access private property for testing
    expect((defaultClient as unknown as { timeoutMs: number }).timeoutMs).toBe(5000);
  });

  it('should pass abort signal to fetch', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { allowed: true },
      }),
    } as Response);

    await client.evaluate({
      user: { id: 'user-1', globalRole: null, moduleRoles: [] },
      module: 'treasury',
      action: 'view_balances',
      resource: {},
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    expect(fetchCall[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
