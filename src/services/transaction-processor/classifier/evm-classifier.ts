import type { Classifier, ClassificationResult, ClassifyOptions, EvmTransactionData, ParsedTransfer, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
import { generateLabel } from '@/src/services/transaction-processor/classifier/label.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      throw new Error('EvmClassifier can only classify EVM transactions');
    }
    const evmTx = tx as EvmTransactionData;

    // Contract deployment
    if (evmTx.to === null) {
      const type = 'contract_deploy';
      const transfers: ParsedTransfer[] = [];
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers };
    }

    const transfers = this.parseTransfers(evmTx);

    // Approval
    if (this.isApproval(evmTx)) {
      const type = 'approve';
      const approveTransfers: ParsedTransfer[] = [];
      const direction = calculateDirection(type, approveTransfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, approveTransfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers: approveTransfers };
    }

    // Mint
    if (this.isMint(transfers)) {
      const type = 'mint';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers };
    }

    // Burn
    if (this.isBurn(transfers)) {
      const type = 'burn';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers };
    }

    // Swap
    if (this.isSwap(transfers, evmTx.from)) {
      const type = 'swap';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'medium', source: 'custom', label, transfers };
    }

    // Native transfer
    if (BigInt(evmTx.value) > 0n && evmTx.input === '0x') {
      const type = 'transfer';
      const nativeTransfers: ParsedTransfer[] = [{ type: 'native', direction: 'out', from: evmTx.from, to: evmTx.to!, amount: evmTx.value }];
      const direction = calculateDirection(type, nativeTransfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, nativeTransfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers: nativeTransfers };
    }

    // Token transfer
    if (transfers.length === 1) {
      const type = 'transfer';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers };
    }

    const unknownType = 'unknown';
    const unknownDirection = calculateDirection(unknownType, transfers, options.perspectiveAddress);
    const unknownLabel = generateLabel(unknownType, unknownDirection, transfers);
    return { type: unknownType, direction: unknownDirection, confidence: 'low', source: 'custom', label: unknownLabel, transfers };
  }

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

  private isApproval(tx: EvmTransactionData): boolean {
    if (tx.input.startsWith('0x095ea7b3')) return true;
    return tx.logs.some((log) => log.topics[0] === APPROVAL_TOPIC);
  }

  private isMint(transfers: ParsedTransfer[]): boolean {
    return transfers.some((t) => WalletAddress.areEqual(t.from, '0x' + ZERO_ADDRESS.slice(26)));
  }

  private isBurn(transfers: ParsedTransfer[]): boolean {
    return transfers.some((t) => WalletAddress.areEqual(t.to, '0x' + ZERO_ADDRESS.slice(26)));
  }

  private isSwap(transfers: ParsedTransfer[], sender: string): boolean {
    if (transfers.length < 2) return false;
    const hasOut = transfers.some((t) => t.direction === 'out' && WalletAddress.areEqual(t.from, sender));
    const hasIn = transfers.some((t) => t.direction === 'in' && WalletAddress.areEqual(t.to, sender));
    return hasOut && hasIn;
  }
}
