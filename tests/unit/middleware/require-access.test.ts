import { describe, it, expect, vi } from 'vitest';
import { requireAccess } from '@/src/middleware/require-access.js';

describe('requireAccess', () => {
  it('should return a preHandler function', () => {
    const handler = requireAccess('treasury', 'view_balances');
    expect(typeof handler).toBe('function');
  });

  it('should call request.requireAccess with module and action', async () => {
    const handler = requireAccess('treasury', 'initiate_transfer');

    const mockRequest = {
      requireAccess: vi.fn().mockResolvedValue(undefined),
      params: {},
    } as any;

    const mockReply = {} as any;

    await handler(mockRequest, mockReply);

    expect(mockRequest.requireAccess).toHaveBeenCalledWith(
      'treasury',
      'initiate_transfer',
      { vaultId: undefined }
    );
  });

  it('should extract vaultId from params', async () => {
    const handler = requireAccess('treasury', 'manage_vaults');

    const mockRequest = {
      requireAccess: vi.fn().mockResolvedValue(undefined),
      params: { vaultId: 'vault-123' },
    } as any;

    const mockReply = {} as any;

    await handler(mockRequest, mockReply);

    expect(mockRequest.requireAccess).toHaveBeenCalledWith(
      'treasury',
      'manage_vaults',
      { vaultId: 'vault-123' }
    );
  });

  it('should propagate errors from request.requireAccess', async () => {
    const handler = requireAccess('treasury', 'manage_vaults');
    const error = new Error('Access denied');

    const mockRequest = {
      requireAccess: vi.fn().mockRejectedValue(error),
      params: {},
    } as any;

    const mockReply = {} as any;

    await expect(handler(mockRequest, mockReply)).rejects.toThrow('Access denied');
  });
});
