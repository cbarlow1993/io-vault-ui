// services/core/tests/unit/services/reconciliation/reconciliation-scheduler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AddressRepository } from '@/src/repositories/types.js';
import type { ReconciliationService } from '@/src/services/reconciliation/reconciliation-service.js';
import { logger } from '@/utils/powertools.js';

vi.mock('@/utils/powertools.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const createMockAddressRepository = (): AddressRepository => ({
  findAllMonitored: vi.fn(),
} as unknown as AddressRepository);

const createMockReconciliationService = () => ({
  createJob: vi.fn(),
});

import { ReconciliationScheduler } from '@/src/services/reconciliation/reconciliation-scheduler.js';

describe('ReconciliationScheduler', () => {
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let reconciliationService: ReturnType<typeof createMockReconciliationService>;
  let scheduler: ReconciliationScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    addressRepository = createMockAddressRepository();
    reconciliationService = createMockReconciliationService();
    scheduler = new ReconciliationScheduler({
      addressRepository,
      reconciliationService: reconciliationService as unknown as ReconciliationService,
    });
  });

  describe('schedulePartialReconciliation', () => {
    it('should create partial reconciliation jobs for all monitored addresses', async () => {
      const mockAddresses = [
        { id: '1', address: '0x123', chain_alias: 'eth-mainnet', is_monitored: true },
        { id: '2', address: '0x456', chain_alias: 'polygon-mainnet', is_monitored: true },
      ];
      vi.mocked(addressRepository.findAllMonitored).mockResolvedValue(mockAddresses as any);
      vi.mocked(reconciliationService.createJob).mockResolvedValue({} as any);

      const result = await scheduler.schedulePartialReconciliation();

      expect(result).toEqual({ scheduled: 2, errors: 0 });
      expect(addressRepository.findAllMonitored).toHaveBeenCalled();
      expect(reconciliationService.createJob).toHaveBeenCalledTimes(2);
      expect(reconciliationService.createJob).toHaveBeenCalledWith({
        address: '0x123',
        chainAlias: 'eth-mainnet',
        mode: 'partial',
      });
      expect(reconciliationService.createJob).toHaveBeenCalledWith({
        address: '0x456',
        chainAlias: 'polygon-mainnet',
        mode: 'partial',
      });
    });

    it('should handle empty monitored addresses', async () => {
      vi.mocked(addressRepository.findAllMonitored).mockResolvedValue([]);

      const result = await scheduler.schedulePartialReconciliation();

      expect(result).toEqual({ scheduled: 0, errors: 0 });
      expect(addressRepository.findAllMonitored).toHaveBeenCalled();
      expect(reconciliationService.createJob).not.toHaveBeenCalled();
    });

    it('should count errors when job creation fails', async () => {
      const mockAddresses = [
        { id: '1', address: '0x123', chain_alias: 'eth-mainnet', is_monitored: true },
        { id: '2', address: '0x456', chain_alias: 'polygon-mainnet', is_monitored: true },
      ];
      vi.mocked(addressRepository.findAllMonitored).mockResolvedValue(mockAddresses as any);
      vi.mocked(reconciliationService.createJob)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Job creation failed'));

      const result = await scheduler.schedulePartialReconciliation();

      expect(result).toEqual({ scheduled: 1, errors: 1 });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to schedule reconciliation',
        expect.objectContaining({
          address: '0x456',
          chainAlias: 'polygon-mainnet',
          error: expect.any(Error),
        })
      );
    });
  });
});
