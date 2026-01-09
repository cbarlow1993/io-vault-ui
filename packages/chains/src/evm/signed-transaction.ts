// packages/chains/src/evm/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { EvmChainConfig } from './config.js';
import type { EvmTransactionData } from './transaction-builder.js';
import { serializeTransaction, computeTransactionHash } from './utils.js';
import type { TransactionSerializable, Hex } from 'viem';

export class SignedEvmTransaction implements SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  constructor(
    private readonly config: EvmChainConfig,
    private readonly txData: EvmTransactionData,
    private readonly signature: string
  ) {
    this.chainAlias = config.chainAlias;
    this.serialized = this.buildSerializedTransaction();
    this.hash = computeTransactionHash(this.serialized as Hex);
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    if (!url) {
      return {
        hash: this.hash,
        success: false,
        error: 'No RPC URL provided and none configured',
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_sendRawTransaction',
          params: [this.serialized],
        }),
      });

      if (!response.ok) {
        throw new RpcError(`RPC request failed: ${response.statusText}`, this.chainAlias);
      }

      const json = await response.json();

      if (json.error) {
        return {
          hash: this.hash,
          success: false,
          error: json.error.message,
        };
      }

      return {
        hash: json.result ?? this.hash,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        hash: this.hash,
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildSerializedTransaction(): string {
    // Convert transaction data to viem's TransactionSerializable format
    const tx = this.toViemTransaction();

    // Parse signature components (r, s, v) from the 65-byte signature
    const sig = this.parseSignature();

    // Serialize with signature using proper RLP encoding
    return serializeTransaction(tx, sig);
  }

  private buildSerializedTransactionHash(): string {
    // Compute keccak256 hash of the serialized signed transaction
    return computeTransactionHash(this.serialized as Hex);
  }

  /**
   * Parse 65-byte signature into r, s, v components
   */
  private parseSignature(): { r: Hex; s: Hex; v: bigint } {
    // Signature format: 0x + r (64 chars) + s (64 chars) + v (2 chars)
    const sig = this.signature.slice(2); // Remove 0x prefix

    const r = ('0x' + sig.slice(0, 64)) as Hex;
    const s = ('0x' + sig.slice(64, 128)) as Hex;
    const vHex = sig.slice(128, 130);

    // Parse v value - handle both legacy (27/28) and EIP-155 formats
    let v = BigInt('0x' + vHex);

    // If v is 0 or 1, convert to 27/28 (legacy format)
    if (v === 0n || v === 1n) {
      v = v + 27n;
    }

    return { r, s, v };
  }

  /**
   * Convert internal transaction data to viem's TransactionSerializable format
   */
  private toViemTransaction(): TransactionSerializable {
    const base = {
      chainId: this.txData.chainId,
      nonce: this.txData.nonce,
      to: this.txData.to as `0x${string}` | null | undefined,
      value: BigInt(this.txData.value),
      data: this.txData.data as Hex,
      gas: BigInt(this.txData.gasLimit),
    };

    if (this.txData.type === 2) {
      return {
        ...base,
        type: 'eip1559' as const,
        maxFeePerGas: this.txData.maxFeePerGas ? BigInt(this.txData.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: this.txData.maxPriorityFeePerGas ? BigInt(this.txData.maxPriorityFeePerGas) : undefined,
        accessList: this.txData.accessList?.map(item => ({
          address: item.address as `0x${string}`,
          storageKeys: item.storageKeys as `0x${string}`[],
        })),
      };
    }

    // Type 0 (legacy) transaction
    return {
      ...base,
      type: 'legacy' as const,
      gasPrice: this.txData.gasPrice ? BigInt(this.txData.gasPrice) : undefined,
    };
  }
}
