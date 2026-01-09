// packages/chains/tests/unit/routes/addresses/handlers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getAddressDetails,
  createAddress,
  updateAddress,
  monitorAddress,
  unmonitorAddressHandler,
} from '@/src/routes/addresses/handlers.js';

// Mock the address service
const mockAddressService = {
  getAddressDetails: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  monitorAddress: vi.fn(),
  unmonitorAddress: vi.fn(),
};

// Helper to create mock Fastify request
function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as FastifyRequest;
}

// Helper to create mock Fastify reply
function createMockReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply;
}

describe('Address Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAddressDetails', () => {
    it('returns 400 for invalid EVM address', async () => {
      const request = createMockRequest({
        params: { address: 'invalid-address', chainAlias: 'ethereum' },
      });
      const reply = createMockReply();

      await getAddressDetails(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid address'),
        })
      );
      expect(mockAddressService.getAddressDetails).not.toHaveBeenCalled();
    });

    it('returns 400 for EVM address without 0x prefix', async () => {
      const request = createMockRequest({
        params: {
          address: '742d35Cc6634C0532925a3b844Bc454e4438f44e',
          chainAlias: 'ethereum',
        },
      });
      const reply = createMockReply();

      await getAddressDetails(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('0x'),
        })
      );
    });

    it('calls service with valid EVM address', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const request = createMockRequest({
        params: { address: validAddress, chainAlias: 'ethereum' },
      });
      const reply = createMockReply();
      mockAddressService.getAddressDetails.mockResolvedValue({ address: validAddress });

      await getAddressDetails(request, reply, mockAddressService);

      expect(mockAddressService.getAddressDetails).toHaveBeenCalledWith(
        validAddress,
        'ethereum'
      );
      expect(reply.status).not.toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid Solana address with forbidden characters', async () => {
      const request = createMockRequest({
        params: {
          // Contains 'O' which is not valid in base58
          address: 'DezXAZ8z7PnrnRJjz3wXBO12345678901234567890',
          chainAlias: 'solana',
        },
      });
      const reply = createMockReply();

      await getAddressDetails(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('calls service with valid Solana address', async () => {
      const validAddress = 'DezXAZ8z7PnrnRJjz3wXBoqFCnxYDrLVKcnB8tQpHTrg';
      const request = createMockRequest({
        params: { address: validAddress, chainAlias: 'solana' },
      });
      const reply = createMockReply();
      mockAddressService.getAddressDetails.mockResolvedValue({ address: validAddress });

      await getAddressDetails(request, reply, mockAddressService);

      expect(mockAddressService.getAddressDetails).toHaveBeenCalledWith(
        validAddress,
        'solana'
      );
    });
  });

  describe('createAddress', () => {
    it('returns 400 for invalid address in body', async () => {
      const request = createMockRequest({
        body: { address: 'invalid', chainAlias: 'ethereum' },
      });
      const reply = createMockReply();

      await createAddress(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid address'),
        })
      );
      expect(mockAddressService.createAddress).not.toHaveBeenCalled();
    });

    it('calls service with valid address from body', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const request = createMockRequest({
        body: { address: validAddress, chainAlias: 'ethereum', label: 'Test' },
      });
      const reply = createMockReply();
      mockAddressService.createAddress.mockResolvedValue({ address: validAddress });

      await createAddress(request, reply, mockAddressService);

      expect(mockAddressService.createAddress).toHaveBeenCalledWith(
        validAddress,
        'ethereum',
        expect.objectContaining({ label: 'Test' })
      );
    });
  });

  describe('updateAddress', () => {
    it('returns 400 for invalid address in params', async () => {
      const request = createMockRequest({
        params: { address: 'not-valid', chainAlias: 'polygon' },
        body: { label: 'New Label' },
      });
      const reply = createMockReply();

      await updateAddress(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(mockAddressService.updateAddress).not.toHaveBeenCalled();
    });

    it('calls service with valid address from params', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const request = createMockRequest({
        params: { address: validAddress, chainAlias: 'polygon' },
        body: { label: 'Updated Label' },
      });
      const reply = createMockReply();
      mockAddressService.updateAddress.mockResolvedValue({ address: validAddress });

      await updateAddress(request, reply, mockAddressService);

      expect(mockAddressService.updateAddress).toHaveBeenCalledWith(
        validAddress,
        'polygon',
        expect.objectContaining({ label: 'Updated Label' })
      );
    });
  });

  describe('monitorAddress', () => {
    it('returns 400 for invalid address in params', async () => {
      const request = createMockRequest({
        params: { address: 'bad-address', chainAlias: 'bitcoin' },
      });
      const reply = createMockReply();

      await monitorAddress(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(mockAddressService.monitorAddress).not.toHaveBeenCalled();
    });

    it('calls service with valid Bitcoin address', async () => {
      const validAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
      const request = createMockRequest({
        params: { address: validAddress, chainAlias: 'bitcoin' },
      });
      const reply = createMockReply();
      mockAddressService.monitorAddress.mockResolvedValue({ success: true });

      await monitorAddress(request, reply, mockAddressService);

      expect(mockAddressService.monitorAddress).toHaveBeenCalledWith(
        validAddress,
        'bitcoin'
      );
    });
  });

  describe('unmonitorAddressHandler', () => {
    it('returns 400 for invalid address in params', async () => {
      const request = createMockRequest({
        params: { address: '0xinvalid', chainAlias: 'ethereum' },
      });
      const reply = createMockReply();

      await unmonitorAddressHandler(request, reply, mockAddressService);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(mockAddressService.unmonitorAddress).not.toHaveBeenCalled();
    });

    it('calls service with valid address', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const request = createMockRequest({
        params: { address: validAddress, chainAlias: 'ethereum' },
      });
      const reply = createMockReply();
      mockAddressService.unmonitorAddress.mockResolvedValue({ success: true });

      await unmonitorAddressHandler(request, reply, mockAddressService);

      expect(mockAddressService.unmonitorAddress).toHaveBeenCalledWith(
        validAddress,
        'ethereum'
      );
    });
  });
});
