// packages/chains/src/svm/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { SvmChainConfig } from './config.js';
import type { SvmTransactionData } from './transaction-builder.js';

// ============ Signed SVM Transaction ============

export class SignedSvmTransaction implements SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  constructor(
    private readonly config: SvmChainConfig,
    private readonly txData: SvmTransactionData,
    private readonly signatures: string[]
  ) {
    this.chainAlias = config.chainAlias;

    // Create signed transaction data structure
    const signedData = {
      ...txData,
      signatures: this.signatures,
    };
    this.serialized = JSON.stringify(signedData);

    // For Solana, the first signature is used as the transaction hash
    // In production, this would be the base58-encoded signature
    this.hash = this.computeTransactionHash();
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    // Solana uses sendTransaction RPC method
    // The transaction should be serialized and base64 encoded
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'sendTransaction',
        params: [
          this.toBase64EncodedTransaction(),
          {
            encoding: 'base64',
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new RpcError(`Broadcast failed: ${response.statusText}`, this.chainAlias);
    }

    const json = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.chainAlias, json.error.code);
    }

    // Solana returns the transaction signature (which is the hash)
    return {
      hash: json.result,
      success: true,
    };
  }

  private toBase64EncodedTransaction(): string {
    // In production, this would properly serialize the transaction
    // according to Solana's binary format
    // For now, return the JSON-serialized version as base64
    return Buffer.from(this.serialized).toString('base64');
  }

  private computeTransactionHash(): string {
    // For Solana, the transaction hash is typically the first signature
    // In production, this would be base58-encoded
    // For now, create a deterministic hash from the first signature
    if (this.signatures.length > 0) {
      return this.signatures[0]!;
    }

    // Fallback: create a hash from the transaction data
    const dataToHash = this.serialized;
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).padStart(44, '0');
  }
}
