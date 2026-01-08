// packages/chains/src/evm/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { EvmChainConfig } from './config.js';
import type { EvmTransactionData } from './transaction-builder.js';

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
    this.hash = this.computeTransactionHash();
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
    // In production, this would properly RLP encode the signed transaction
    // For now, return a representation that includes the signature
    const signedData = {
      ...this.txData,
      signature: this.signature,
    };
    return '0x' + Buffer.from(JSON.stringify(signedData)).toString('hex');
  }

  private computeTransactionHash(): string {
    // In production, this would compute keccak256 of the RLP-encoded signed transaction
    // For now, create a deterministic hash from the serialized transaction
    const dataToHash = this.serialized;
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
    return '0x' + hexHash;
  }
}
