import type { Classifier, ClassificationResult, ClassifyOptions, SvmTransactionData, ParsedTransfer, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
import { generateLabel } from '@/src/services/transaction-processor/classifier/label.js';

const SYSTEM_PROGRAM = '11111111111111111111111111111111';

export class SvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'svm') {
      throw new Error('SvmClassifier can only classify SVM transactions');
    }
    const svmTx = tx as SvmTransactionData;

    const transfers = this.parseTransfers(svmTx);

    // Swap
    if (this.isSwap(transfers)) {
      const type = 'swap';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'medium', source: 'custom', label, transfers };
    }

    // Native SOL transfer
    if (this.isNativeTransfer(svmTx)) {
      const type = 'transfer';
      const nativeTransfers = this.parseNativeTransfers(svmTx);
      const direction = calculateDirection(type, nativeTransfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, nativeTransfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers: nativeTransfers };
    }

    // Token transfer
    if (transfers.length > 0) {
      const type = 'transfer';
      const direction = calculateDirection(type, transfers, options.perspectiveAddress);
      const label = generateLabel(type, direction, transfers);
      return { type, direction, confidence: 'high', source: 'custom', label, transfers };
    }

    const type = 'unknown';
    const direction = calculateDirection(type, transfers, options.perspectiveAddress);
    const label = generateLabel(type, direction, transfers);
    return { type, direction, confidence: 'low', source: 'custom', label, transfers: [] };
  }

  private parseTransfers(tx: SvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    const preMap = new Map<string, { amount: string; decimals: number; owner: string }>();

    for (const bal of tx.preTokenBalances) {
      const key = `${bal.mint}:${bal.owner}`;
      preMap.set(key, { amount: bal.uiTokenAmount.amount, decimals: bal.uiTokenAmount.decimals, owner: bal.owner });
    }

    for (const postBal of tx.postTokenBalances) {
      const key = `${postBal.mint}:${postBal.owner}`;
      const preBal = preMap.get(key);
      const preAmount = BigInt(preBal?.amount ?? '0');
      const postAmount = BigInt(postBal.uiTokenAmount.amount);
      const diff = postAmount - preAmount;

      if (diff !== 0n) {
        transfers.push({
          type: 'token',
          direction: diff > 0n ? 'in' : 'out',
          from: diff < 0n ? postBal.owner : '',
          to: diff > 0n ? postBal.owner : '',
          amount: (diff > 0n ? diff : -diff).toString(),
          token: { address: postBal.mint, decimals: postBal.uiTokenAmount.decimals },
        });
      }
    }
    return transfers;
  }

  private parseNativeTransfers(tx: SvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    const fee = BigInt(tx.fee);

    for (let i = 0; i < tx.preBalances.length; i++) {
      const preBal = BigInt(tx.preBalances[i]!);
      const postBal = BigInt(tx.postBalances[i]!);
      const diff = postBal - preBal;

      // Skip zero changes and fee-only changes
      if (diff === 0n) continue;
      const absDiff = diff < 0n ? -diff : diff;
      if (absDiff === fee) continue;

      transfers.push({
        type: 'native',
        direction: diff > 0n ? 'in' : 'out',
        from: '',
        to: '',
        amount: absDiff.toString(),
      });
    }
    return transfers;
  }

  private isNativeTransfer(tx: SvmTransactionData): boolean {
    return tx.instructions.some((ix) => ix.programId === SYSTEM_PROGRAM);
  }

  private isSwap(transfers: ParsedTransfer[]): boolean {
    if (transfers.length < 2) return false;
    const hasIn = transfers.some((t) => t.direction === 'in');
    const hasOut = transfers.some((t) => t.direction === 'out');
    const mints = new Set(transfers.map((t) => t.token?.address).filter(Boolean));
    return hasIn && hasOut && mints.size >= 2;
  }
}
