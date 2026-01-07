import type { TransactionScanParams } from '@blockaid/client/resources/evm/transaction';
import type { MessageScanParams } from '@blockaid/client/resources/solana/message';
import type { EvmChainAlias, SvmChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { mapChainToBlockaidChain } from '@/src/config/chain-mappings/index.js';
import { blockaidClient } from '@/src/lib/clients.js';
import type { EVMScanTransactionBody } from '@/src/lib/schemas/blockaid/evm-scan-schema.js';
import type { SolanaScanTransactionBody } from '@/src/lib/schemas/blockaid/solana-scan-schema.js';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';

// Lazy-loaded client to allow server startup without BLOCKAID_API_KEY
const getClient = () => blockaidClient();

export namespace Blockaid {
  export type EvmScanResult = Awaited<ReturnType<ReturnType<typeof blockaidClient>['evm']['transactionRaw']['scan']>>;

  export type SvmScanResult = Awaited<ReturnType<ReturnType<typeof blockaidClient>['solana']['message']['scan']>>;

  export type EvmOption = 'simulation' | 'validation' | 'gas_estimation';

  export type SvmOption = 'simulation' | 'validation';

  /**
   * Scan an EVM transaction using Blockaid
   */
  export async function scanEvmTransaction(
    chain: EvmChainAlias,
    body: EVMScanTransactionBody
  ): Promise<EvmScanResult> {
    const blockaidChain = mapChainToBlockaidChain(chain);

    logger.debug('Starting EVM transaction scan', { body });

    const evmParams: TransactionScanParams = {
      ...body,
      chain: blockaidChain,
    };

    const { data: scanResult, error: scanError } = await tryCatch(
      getClient().evm.transaction.scan(evmParams)
    );

    if (scanError) {
      logger.error('EVM transaction scan failed', { error: scanError });
      throw scanError;
    }

    return scanResult;
  }

  /**
   * Scan a Solana (SVM) transaction using Blockaid
   */
  export async function scanSvmTransaction(
    chain: SvmChainAlias,
    body: SolanaScanTransactionBody
  ): Promise<SvmScanResult> {
    const blockaidChain = mapChainToBlockaidChain(chain);

    logger.debug('Starting SVM transaction scan', { body });

    const svmParams: MessageScanParams = {
      chain: blockaidChain,
      ...body,
    };

    const { data: scanResult, error: scanError } = await tryCatch(
      fetch('https://api.blockaid.io/v0/solana/message/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-Key': config.apis.blockaid.apiKey!,
        },
        body: JSON.stringify(svmParams),
      }).then((res) => res.json() as Promise<SvmScanResult>)
    );

    if (scanError) {
      logger.error('SVM transaction scan failed', { error: scanError });
      throw scanError;
    }

    return scanResult as SvmScanResult;
  }
}
