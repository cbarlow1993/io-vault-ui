import type { Classifier, ClassificationResult, ClassifyOptions, EvmTransactionData, ParsedTransfer, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import { TransactionClassification } from '@/src/domain/entities/index.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      throw new Error('EvmClassifier can only classify EVM transactions');
    }
    const evmTx = tx as EvmTransactionData;

    // Parse EVM-specific data (EVM-specific logic stays here)
    const transfers = this.parseTransfers(evmTx);
    const isContractDeploy = evmTx.to === null;
    const isApproval = this.isApproval(evmTx);
    const hasNativeValue = BigInt(evmTx.value) > 0n && evmTx.input === '0x';

    // Delegate classification decision to domain
    const classification = TransactionClassification.fromDetection({
      transfers: transfers.map((t) => ({
        from: t.from,
        to: t.to,
        amount: t.amount,
        direction: t.direction,
      })),
      sender: evmTx.from,
      perspectiveAddress: options.perspectiveAddress.normalized,
      isContractDeploy,
      isApproval,
      hasNativeValue,
    });

    // Build result transfers: use native transfer for native value, otherwise use parsed transfers
    let resultTransfers: ParsedTransfer[];
    if (hasNativeValue && transfers.length === 0) {
      // Native transfer case - build native transfer from tx data
      const nativeDirection = WalletAddress.areEqual(evmTx.from, options.perspectiveAddress.normalized) ? 'out' : 'in';
      resultTransfers = [{ type: 'native', direction: nativeDirection, from: evmTx.from, to: evmTx.to!, amount: evmTx.value }];
    } else if (isApproval || isContractDeploy) {
      // Approval and contract deploy have no transfers
      resultTransfers = [];
    } else {
      resultTransfers = transfers;
    }

    return {
      type: classification.type,
      direction: classification.direction,
      confidence: classification.confidence,
      source: classification.source,
      label: classification.label,
      transfers: resultTransfers,
    };
  }

  /**
   * Parse ERC20 Transfer events from transaction logs.
   * EVM-specific log parsing - this stays in the classifier.
   */
  private parseTransfers(tx: EvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    for (const log of tx.logs) {
      if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
        const from = '0x' + log.topics[1]!.slice(26);
        const to = '0x' + log.topics[2]!.slice(26);
        const amount = log.data === '0x' || log.data === '' ? '0' : BigInt(log.data).toString();
        const direction = WalletAddress.areEqual(from, tx.from) ? 'out' : 'in';
        transfers.push({ type: 'token', direction, from, to, amount, token: { address: log.address } });
      }
    }
    return transfers;
  }

  /**
   * Detect ERC20 approval via function selector or Approval event topic.
   * EVM-specific detection - this stays in the classifier.
   */
  private isApproval(tx: EvmTransactionData): boolean {
    if (tx.input.startsWith('0x095ea7b3')) return true;
    return tx.logs.some((log) => log.topics[0] === APPROVAL_TOPIC);
  }
}
