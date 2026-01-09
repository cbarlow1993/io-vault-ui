// packages/chains/src/utxo/transaction-fetcher.ts

import type { UtxoChainAlias } from '../core/types.js';
import type {
  TransactionResult,
  TransactionStatus,
  NormalizedTransactionResult,
  RawUtxoTransactionResult,
  TokenTransferEvent,
  InternalTransaction,
} from '../core/types.js';
import {
  TransactionNotFoundError,
  InvalidTransactionHashError,
} from '../core/errors.js';
import type { UtxoChainConfig } from './config.js';
import type { BlockbookClient } from './blockbook-client.js';

// Blockbook transaction response
interface BlockbookTransaction {
  txid: string;
  version: number;
  vin: Array<{
    txid: string;
    vout: number;
    sequence: number;
    addresses?: string[];
    value?: string;
    isAddress?: boolean;
    n?: number;
  }>;
  vout: Array<{
    value: string;
    n: number;
    addresses?: string[];
    isAddress?: boolean;
    spent?: boolean;
    spentTxId?: string;
    spentIndex?: number;
    spentHeight?: number;
  }>;
  blockHash?: string;
  blockHeight?: number;
  confirmations: number;
  blockTime?: number;
  fees: string;
  size: number;
  vsize: number;
  value?: string;
  valueIn?: string;
  hex?: string;
}

export class UtxoTransactionFetcher {
  constructor(
    private readonly config: UtxoChainConfig,
    private readonly chainAlias: UtxoChainAlias,
    private readonly blockbook: BlockbookClient
  ) {}

  async getTransaction(hash: string): Promise<TransactionResult> {
    // Validate hash format
    this.validateTransactionHash(hash);

    // Fetch transaction from Blockbook
    const transaction = await this.blockbook.getTransaction(hash) as BlockbookTransaction | null;

    if (!transaction) {
      throw new TransactionNotFoundError(this.chainAlias, hash);
    }

    // Build raw result
    const raw: RawUtxoTransactionResult = {
      _chain: 'utxo',
      txid: transaction.txid,
      version: transaction.version,
      vin: transaction.vin.map((input) => ({
        txid: input.txid,
        vout: input.vout,
        sequence: input.sequence,
        addresses: input.addresses ?? [],
        value: input.value ?? '0',
      })),
      vout: transaction.vout.map((output) => ({
        value: output.value,
        n: output.n,
        addresses: output.addresses ?? [],
        isAddress: output.isAddress ?? false,
      })),
      blockHash: transaction.blockHash,
      blockHeight: transaction.blockHeight,
      confirmations: transaction.confirmations,
      blockTime: transaction.blockTime,
      fees: transaction.fees,
      size: transaction.size,
      vsize: transaction.vsize,
    };

    // Parse inputs/outputs as internal transactions
    const internalTransactions = this.parseInputsOutputs(transaction);

    // Build normalized result
    const normalized = this.buildNormalizedResult(
      transaction,
      internalTransactions
    );

    return {
      chainAlias: this.chainAlias,
      raw,
      normalized,
    };
  }

  private validateTransactionHash(hash: string): void {
    // UTXO txids are 64 hex characters (no 0x prefix)
    if (hash.length !== 64) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be 64 characters'
      );
    }

    // Must be valid hex (no 0x prefix for Bitcoin)
    if (!/^[0-9a-fA-F]+$/.test(hash)) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be valid hexadecimal'
      );
    }
  }

  private parseInputsOutputs(tx: BlockbookTransaction): InternalTransaction[] {
    const internalTxs: InternalTransaction[] = [];
    let traceIndex = 0;

    // Add inputs as utxo-input type
    for (const input of tx.vin) {
      const address = input.addresses?.[0] || 'unknown';
      internalTxs.push({
        from: address,
        to: null, // Inputs don't have a "to"
        value: input.value ?? '0',
        type: 'utxo-input',
        input: input.txid ? `${input.txid}:${input.vout}` : undefined,
        traceIndex: traceIndex++,
      });
    }

    // Add outputs as utxo-output type
    for (const output of tx.vout) {
      const address = output.addresses?.[0] || null;
      internalTxs.push({
        from: 'coinbase', // Outputs come from the transaction itself
        to: address,
        value: output.value,
        type: 'utxo-output',
        traceIndex: traceIndex++,
      });
    }

    return internalTxs;
  }

  private buildNormalizedResult(
    tx: BlockbookTransaction,
    internalTransactions: InternalTransaction[]
  ): NormalizedTransactionResult {
    // Determine status based on confirmations
    let status: TransactionStatus;
    if (tx.confirmations === 0) {
      status = 'pending';
    } else {
      status = 'confirmed';
    }

    // Determine primary from address (largest input or first input)
    let from = 'unknown';
    let maxInputValue = 0n;
    for (const input of tx.vin) {
      const value = BigInt(input.value ?? '0');
      if (value > maxInputValue && input.addresses?.[0]) {
        maxInputValue = value;
        from = input.addresses[0];
      }
    }
    if (from === 'unknown' && tx.vin[0]?.addresses?.[0]) {
      from = tx.vin[0].addresses[0];
    }

    // Determine primary to address (first non-change output)
    // Heuristic: change is typically sent back to an input address
    const inputAddresses = new Set(
      tx.vin.flatMap((input) => input.addresses ?? [])
    );

    let to: string | null = null;
    let value = '0';

    for (const output of tx.vout) {
      const outputAddress = output.addresses?.[0];
      if (outputAddress && !inputAddresses.has(outputAddress)) {
        // This is likely a recipient (not change)
        to = outputAddress;
        value = output.value;
        break;
      }
    }

    // If all outputs go to input addresses, take the first output as "to"
    if (!to && tx.vout[0]?.addresses?.[0]) {
      to = tx.vout[0].addresses[0];
      value = tx.vout[0].value;
    }

    // Fee
    const fee = tx.fees;

    // Timestamp
    const timestamp = tx.blockTime ?? null;

    // UTXO chains don't have token transfers in the same way
    const tokenTransfers: TokenTransferEvent[] = [];

    return {
      hash: tx.txid,
      status,
      blockNumber: tx.blockHeight ?? null,
      blockHash: tx.blockHash ?? null,
      timestamp,
      from,
      to,
      value,
      fee,
      confirmations: tx.confirmations,
      finalized: tx.confirmations >= 6, // 6 confirmations is generally considered final
      tokenTransfers,
      internalTransactions,
      hasFullTokenData: true, // UTXO doesn't have tokens in the same way
      hasFullInternalData: true, // We have all inputs/outputs
    };
  }
}
