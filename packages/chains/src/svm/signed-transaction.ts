// packages/chains/src/svm/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { SvmChainConfig } from './config.js';
import type { SvmTransactionData } from './transaction-builder.js';
import {
  serializeSolanaMessage,
  serializeSolanaTransaction,
  base58Encode,
} from './utils.js';

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
    // Serialize the message according to Solana's binary format
    const messageBytes = serializeSolanaMessage(
      this.txData.feePayer,
      this.txData.recentBlockhash,
      this.txData.instructions
    );

    // Convert signatures from base64 to Uint8Array
    const signatureBytes = this.signatures.map((sig) => {
      const bytes = Buffer.from(sig, 'base64');
      // Ed25519 signatures are 64 bytes
      if (bytes.length !== 64) {
        throw new Error(`Invalid signature length: ${bytes.length}, expected 64`);
      }
      return new Uint8Array(bytes);
    });

    // Serialize complete transaction (signatures + message)
    const txBytes = serializeSolanaTransaction(signatureBytes, messageBytes);

    // Return base64-encoded transaction for RPC submission
    return Buffer.from(txBytes).toString('base64');
  }

  private computeTransactionHash(): string {
    // For Solana, the transaction "hash" is the first signature, base58-encoded
    // The first signer is always the fee payer
    if (this.signatures.length > 0) {
      const firstSig = this.signatures[0]!;
      // Decode from base64 and re-encode as base58
      const sigBytes = Buffer.from(firstSig, 'base64');
      return base58Encode(new Uint8Array(sigBytes));
    }

    // Fallback if no signatures (shouldn't happen in normal flow)
    // Use a deterministic hash based on transaction data
    throw new Error('Cannot compute transaction hash without signatures');
  }
}
