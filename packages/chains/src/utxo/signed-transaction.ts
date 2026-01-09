// packages/chains/src/utxo/signed-transaction.ts

import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import type { UtxoChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import type { UtxoChainConfig } from './config.js';
import { BlockbookClient } from './blockbook-client.js';
import { PsbtError, BlockbookError } from './errors.js';

// ============ Signed UTXO Transaction ============

export class SignedUtxoTransaction implements SignedTransaction {
  readonly chainAlias: UtxoChainAlias;
  readonly serialized: string;
  readonly hash: string;

  private readonly config: UtxoChainConfig;
  private readonly txHex: string;

  constructor(config: UtxoChainConfig, psbt: bitcoin.Psbt) {
    this.config = config;
    this.chainAlias = config.chainAlias;

    try {
      // Finalize all inputs
      psbt.finalizeAllInputs();

      // Extract the transaction
      const tx = psbt.extractTransaction();

      // Get the raw transaction hex and txid
      this.txHex = tx.toHex();
      this.hash = tx.getId(); // Proper double-SHA256 txid
      this.serialized = this.txHex;
    } catch (error) {
      throw new PsbtError(
        `Failed to finalize transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        config.chainAlias,
        'finalization',
        error
      );
    }
  }

  /**
   * Broadcast the signed transaction to the network
   */
  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const client = new BlockbookClient(
      rpcUrl ?? this.config.rpcUrl,
      this.chainAlias
    );

    try {
      const txid = await client.broadcastTransaction(this.txHex);

      return {
        hash: txid,
        success: true,
      };
    } catch (error) {
      if (error instanceof BlockbookError) {
        return {
          hash: '',
          success: false,
          error: error.message,
        };
      }

      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown broadcast error',
      };
    }
  }

  /**
   * Get the raw transaction hex
   */
  toHex(): string {
    return this.txHex;
  }

  /**
   * Get transaction size in bytes
   */
  getSize(): number {
    return Buffer.from(this.txHex, 'hex').length;
  }

  /**
   * Get virtual size in vbytes (for fee calculation)
   */
  getVirtualSize(): number {
    // For SegWit transactions, vsize = (weight + 3) / 4
    // Weight = base_size * 3 + total_size
    // This is a simplified calculation
    const totalSize = this.getSize();

    // Approximate witness discount (SegWit transactions are ~25% smaller in vbytes)
    return Math.ceil(totalSize * 0.75);
  }
}

/**
 * Create a SignedUtxoTransaction from a finalized PSBT hex
 */
export function fromFinalizedPsbtHex(
  psbtHex: string,
  config: UtxoChainConfig
): SignedUtxoTransaction {
  const network = config.network === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

  const psbt = bitcoin.Psbt.fromHex(psbtHex, { network });
  return new SignedUtxoTransaction(config, psbt);
}

/**
 * Create a SignedUtxoTransaction from a finalized PSBT base64
 */
export function fromFinalizedPsbtBase64(
  psbtBase64: string,
  config: UtxoChainConfig
): SignedUtxoTransaction {
  const network = config.network === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
  return new SignedUtxoTransaction(config, psbt);
}
