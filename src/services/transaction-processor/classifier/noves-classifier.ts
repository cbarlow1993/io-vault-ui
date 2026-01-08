import { Translate } from '@noves/noves-sdk';
import type { Classifier, ClassificationResult, ClassificationType, ClassificationDirection, ClassifyOptions, ParsedTransfer, RawTransaction, EvmTransactionData } from '@/src/services/transaction-processor/types.js';
import { getNovesChain } from '@/src/config/chain-mappings/index.js';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';

interface NovesTypeMapping {
  type: ClassificationType;
  direction: ClassificationDirection;
}

const NOVES_TYPE_MAP: Record<string, NovesTypeMapping> = {
  // Transfers with direction
  receive: { type: 'transfer', direction: 'in' },
  send: { type: 'transfer', direction: 'out' },
  transfer: { type: 'transfer', direction: 'neutral' },

  // Staking with direction
  stake: { type: 'stake', direction: 'out' },
  unstake: { type: 'stake', direction: 'in' },

  // NFTs with direction
  nft_transfer: { type: 'nft_transfer', direction: 'neutral' },
  nft_mint: { type: 'mint', direction: 'in' },
  nft_receive: { type: 'nft_transfer', direction: 'in' },
  nft_send: { type: 'nft_transfer', direction: 'out' },

  // Others
  swap: { type: 'swap', direction: 'neutral' },
  bridge: { type: 'bridge', direction: 'neutral' },
  mint: { type: 'mint', direction: 'in' },
  burn: { type: 'burn', direction: 'out' },
  approve: { type: 'approve', direction: 'neutral' },
  deploy: { type: 'contract_deploy', direction: 'neutral' },
  unknown: { type: 'unknown', direction: 'neutral' },
};

export interface NovesClassifierConfig {
  apiKey: string;
}

export class NovesClassifier implements Classifier {
  private readonly evmClient: ReturnType<typeof Translate.evm>;

  constructor(config: NovesClassifierConfig) {
    this.evmClient = Translate.evm(config.apiKey);
  }

  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      return this.unknownResult();
    }

    const evmTx = tx as EvmTransactionData;

    // Map chainAlias to Noves chain identifier
    if (!options.chainAlias) {
      return this.unknownResult();
    }
    const novesChain = getNovesChain(options.chainAlias);
    if (!novesChain) {
      // Chain not supported by Noves, return unknown
      return this.unknownResult();
    }

    try {
      const novesTx = await this.evmClient.getTransaction(novesChain, evmTx.hash);

      if (!novesTx || !novesTx.classificationData) {
        return this.unknownResult();
      }

      const mapping = NOVES_TYPE_MAP[novesTx.classificationData.type] ?? { type: 'unknown', direction: 'neutral' };
      const transfers = this.parseTransfers((novesTx as { transfers?: unknown[] }).transfers ?? []);

      // Use Noves' direction hint if provided, otherwise calculate from transfers
      const direction = mapping.direction !== 'neutral'
        ? mapping.direction
        : calculateDirection(mapping.type, transfers, options.perspectiveAddress);

      return {
        type: mapping.type,
        direction,
        confidence: mapping.type === 'unknown' ? 'low' : 'high',
        source: 'noves',
        label: novesTx.classificationData.description ?? 'Unknown',
        transfers,
      };
    } catch {
      return this.unknownResult();
    }
  }

  private parseTransfers(novesTransfers: unknown[]): ParsedTransfer[] {
    return (novesTransfers as Array<{
      nft?: boolean;
      action?: string;
      from?: { address?: string };
      to?: { address?: string };
      amount?: string;
      token?: { address?: string; symbol?: string; decimals?: number };
    }>).map((t) => ({
      type: t.nft ? 'nft' : t.token?.address === '0x0' ? 'native' : 'token',
      direction: t.action === 'received' ? 'in' : 'out',
      from: t.from?.address ?? '',
      to: t.to?.address ?? '',
      amount: t.amount ?? '0',
      token: t.token ? { address: t.token.address ?? '', symbol: t.token.symbol, decimals: t.token.decimals } : undefined,
    }));
  }

  private unknownResult(): ClassificationResult {
    return { type: 'unknown', direction: 'neutral', confidence: 'low', source: 'noves', label: 'Unknown Transaction', transfers: [] };
  }
}
