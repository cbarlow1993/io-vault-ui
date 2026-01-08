// services/core/src/services/reconciliation/reconciliation-scheduler.ts
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import type { AddressRepository } from '@/src/repositories/types.js';
import type { ReconciliationService } from '@/src/services/reconciliation/reconciliation-service.js';

export interface ReconciliationSchedulerDeps {
  addressRepository: AddressRepository;
  reconciliationService: ReconciliationService;
}

/**
 * Scheduler for automatic partial reconciliation of all monitored addresses.
 */
export class ReconciliationScheduler {
  private readonly addressRepository: AddressRepository;
  private readonly reconciliationService: ReconciliationService;

  constructor(deps: ReconciliationSchedulerDeps) {
    this.addressRepository = deps.addressRepository;
    this.reconciliationService = deps.reconciliationService;
  }

  /**
   * Creates partial reconciliation jobs for all monitored addresses.
   * This should be called by a cron job on a regular schedule.
   */
  async schedulePartialReconciliation(): Promise<{ scheduled: number; errors: number }> {
    const addresses = await this.addressRepository.findAllMonitored();

    let scheduled = 0;
    let errors = 0;

    for (const address of addresses) {
      try {
        await this.reconciliationService.createJob({
          address: address.address,
          chainAlias: address.chain_alias as ChainAlias,
          mode: 'partial',
        });
        scheduled++;
      } catch (error) {
        logger.error('Failed to schedule reconciliation', {
          address: address.address,
          chainAlias: address.chain_alias,
          error,
        });
        errors++;
      }
    }

    return { scheduled, errors };
  }
}
