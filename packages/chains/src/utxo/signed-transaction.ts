// packages/chains/src/utxo/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { UtxoChainConfig } from './config.js';
import type { UtxoTransactionData } from './transaction-builder.js';

// ============ Signed UTXO Transaction ============

export class SignedUtxoTransaction implements SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  constructor(
    private readonly config: UtxoChainConfig,
    private readonly txData: UtxoTransactionData,
    private readonly signatures: string[]
  ) {
    this.chainAlias = config.chainAlias;

    // Create signed transaction structure
    const signedData = {
      ...txData,
      signatures: this.signatures,
    };
    this.serialized = JSON.stringify(signedData, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    // Compute transaction hash (txid)
    this.hash = this.computeTxId();
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    // Esplora API: POST /tx
    // Body should be raw hex transaction
    const rawTx = this.toRawHex();

    const response = await fetch(`${url}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: rawTx,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RpcError(`Broadcast failed: ${errorText}`, this.chainAlias);
    }

    // Esplora returns the txid on success
    const txid = await response.text();

    return {
      hash: txid,
      success: true,
    };
  }

  /**
   * Get the raw transaction hex for broadcasting
   */
  toRawHex(): string {
    // In production, this would properly serialize the transaction
    // to Bitcoin's wire format. For now, return a placeholder.
    return this.serializeTransaction();
  }

  /**
   * Get witness data (for SegWit transactions)
   */
  getWitness(): string[][] {
    // Return signatures as witness data
    return this.signatures.map((sig) => [sig]);
  }

  private computeTxId(): string {
    // Bitcoin txid is double SHA256 of serialized transaction
    // For now, create a deterministic hash from the data
    const dataToHash = JSON.stringify(
      {
        version: this.txData.version,
        inputs: this.txData.inputs,
        outputs: this.txData.outputs,
        locktime: this.txData.locktime,
      },
      (_, value) => (typeof value === 'bigint' ? value.toString() : value)
    );

    // Simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    // Return as 64-char hex string (simulating txid format)
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  private serializeTransaction(): string {
    // Simplified transaction serialization
    // In production, this would follow Bitcoin's wire protocol
    const parts: string[] = [];

    // Version (4 bytes LE)
    parts.push(this.uint32ToHex(this.txData.version));

    // Marker and flag for SegWit
    parts.push('0001');

    // Input count (varint)
    parts.push(this.varintToHex(this.txData.inputs.length));

    // Inputs
    for (let i = 0; i < this.txData.inputs.length; i++) {
      const input = this.txData.inputs[i]!;
      // Previous txid (32 bytes, reversed)
      parts.push(this.reverseHex(input.txid));
      // Previous vout (4 bytes LE)
      parts.push(this.uint32ToHex(input.vout));
      // Script length (for SegWit, this is 0)
      parts.push('00');
      // Sequence (4 bytes LE)
      parts.push(this.uint32ToHex(input.sequence));
    }

    // Output count (varint)
    parts.push(this.varintToHex(this.txData.outputs.length));

    // Outputs
    for (const output of this.txData.outputs) {
      // Value (8 bytes LE)
      parts.push(this.uint64ToHex(output.value));
      // ScriptPubKey (simplified)
      const script = output.scriptPubKey || '00';
      parts.push(this.varintToHex(script.length / 2));
      parts.push(script);
    }

    // Witness data
    for (let i = 0; i < this.signatures.length; i++) {
      const sig = this.signatures[i]!;
      // Number of witness items
      parts.push('02');
      // Signature
      parts.push(this.varintToHex(sig.length / 2));
      parts.push(sig);
      // Pubkey placeholder
      parts.push('21');
      parts.push('00'.repeat(33)); // 33-byte pubkey placeholder
    }

    // Locktime (4 bytes LE)
    parts.push(this.uint32ToHex(this.txData.locktime));

    return parts.join('');
  }

  private uint32ToHex(n: number): string {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(n, 0);
    return buf.toString('hex');
  }

  private uint64ToHex(n: bigint): string {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(n, 0);
    return buf.toString('hex');
  }

  private varintToHex(n: number): string {
    if (n < 0xfd) {
      return n.toString(16).padStart(2, '0');
    } else if (n <= 0xffff) {
      const buf = Buffer.alloc(3);
      buf.writeUInt8(0xfd, 0);
      buf.writeUInt16LE(n, 1);
      return buf.toString('hex');
    } else {
      const buf = Buffer.alloc(5);
      buf.writeUInt8(0xfe, 0);
      buf.writeUInt32LE(n, 1);
      return buf.toString('hex');
    }
  }

  private reverseHex(hex: string): string {
    const bytes = hex.match(/.{2}/g) || [];
    return bytes.reverse().join('');
  }
}
