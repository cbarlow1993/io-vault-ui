// packages/chains/src/utxo/signature-applier.ts

import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import { SignatureError } from './errors.js';
import type { UtxoChainAlias } from '../core/types.js';
import type { InputMetadata } from './psbt-builder.js';

// ============ Signature Applier ============

export class SignatureApplier {
  private readonly chainAlias: UtxoChainAlias;

  constructor(chainAlias: UtxoChainAlias) {
    this.chainAlias = chainAlias;
  }

  /**
   * Apply signatures to a PSBT
   * @param psbt - The PSBT to apply signatures to
   * @param signatures - Array of 64-byte r||s signatures (hex strings)
   * @param inputMetadata - Metadata about each input (script type, public key)
   */
  applySignatures(
    psbt: bitcoin.Psbt,
    signatures: string[],
    inputMetadata: InputMetadata[]
  ): void {
    if (signatures.length !== inputMetadata.length) {
      throw new SignatureError(
        `Signature count mismatch: expected ${inputMetadata.length}, got ${signatures.length}`,
        this.chainAlias,
        inputMetadata.length,
        signatures.length
      );
    }

    for (let i = 0; i < signatures.length; i++) {
      const sigHex = signatures[i]!;
      const meta = inputMetadata[i]!;
      const sigBuffer = Buffer.from(sigHex, 'hex');

      if (sigBuffer.length !== 64) {
        throw new SignatureError(
          `Invalid signature length at index ${i}: expected 64 bytes, got ${sigBuffer.length}`,
          this.chainAlias
        );
      }

      if (meta.scriptType === 'p2tr') {
        this.applySchnorrSignature(psbt, meta.index, sigBuffer);
      } else {
        this.applyEcdsaSignature(psbt, meta.index, sigBuffer, meta.publicKey);
      }
    }
  }

  /**
   * Apply ECDSA signature for P2WPKH
   * Converts 64-byte r||s to DER format with sighash type
   */
  private applyEcdsaSignature(
    psbt: bitcoin.Psbt,
    index: number,
    signature: Buffer,
    publicKey: Buffer
  ): void {
    // Convert r||s to DER format and append SIGHASH_ALL (0x01)
    const derSignature = this.toDER(signature);
    const signatureWithHashType = Buffer.concat([derSignature, Buffer.from([0x01])]);

    psbt.updateInput(index, {
      partialSig: [
        {
          pubkey: publicKey,
          signature: signatureWithHashType,
        },
      ],
    });
  }

  /**
   * Apply Schnorr signature for P2TR (Taproot)
   * Schnorr signatures are 64 bytes raw, no DER encoding needed
   */
  private applySchnorrSignature(
    psbt: bitcoin.Psbt,
    index: number,
    signature: Buffer
  ): void {
    // For SIGHASH_DEFAULT (0x00), we use the 64-byte signature as-is
    // If using a different sighash type, append it as a 65th byte
    psbt.updateInput(index, {
      tapKeySig: signature,
    });
  }

  /**
   * Convert 64-byte r||s signature to DER format
   * DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
   */
  private toDER(signature: Buffer): Buffer {
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);

    const rEncoded = this.encodeInteger(r);
    const sEncoded = this.encodeInteger(s);

    const totalLength = rEncoded.length + sEncoded.length;

    return Buffer.concat([
      Buffer.from([0x30, totalLength]),
      rEncoded,
      sEncoded,
    ]);
  }

  /**
   * Encode an integer in DER format
   * Format: 0x02 [length] [value]
   * - Prepend 0x00 if high bit is set (to keep it positive)
   * - Remove leading zeros (except one if needed for sign)
   */
  private encodeInteger(value: Buffer): Buffer {
    // Remove leading zeros
    let start = 0;
    while (start < value.length - 1 && value[start] === 0) {
      start++;
    }
    let trimmed = value.subarray(start);

    // If high bit is set, prepend 0x00 to indicate positive number
    if (trimmed[0]! & 0x80) {
      trimmed = Buffer.concat([Buffer.from([0x00]), trimmed]);
    }

    return Buffer.concat([
      Buffer.from([0x02, trimmed.length]),
      trimmed,
    ]);
  }

  /**
   * Finalize all inputs and extract the raw transaction
   */
  finalizeAndExtract(psbt: bitcoin.Psbt): { txHex: string; txId: string } {
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();

    return {
      txHex: tx.toHex(),
      txId: tx.getId(),
    };
  }
}

/**
 * Validate a 64-byte signature
 */
export function validateSignature(signature: string): boolean {
  try {
    const buf = Buffer.from(signature, 'hex');
    return buf.length === 64;
  } catch {
    return false;
  }
}

/**
 * Convert DER signature back to 64-byte r||s format
 * Useful for testing/debugging
 */
export function fromDER(derSignature: Buffer): Buffer {
  // Skip 0x30 and total length
  let offset = 2;

  // Parse r
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: expected 0x02 for r');
  }
  offset++;
  const rLen = derSignature[offset]!;
  offset++;
  let r = derSignature.subarray(offset, offset + rLen);
  offset += rLen;

  // Parse s
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: expected 0x02 for s');
  }
  offset++;
  const sLen = derSignature[offset]!;
  offset++;
  let s = derSignature.subarray(offset, offset + sLen);

  // Remove leading zero if present (was added for sign bit)
  if (r.length === 33 && r[0] === 0) {
    r = r.subarray(1);
  }
  if (s.length === 33 && s[0] === 0) {
    s = s.subarray(1);
  }

  // Pad to 32 bytes if needed
  const rPadded = Buffer.alloc(32);
  const sPadded = Buffer.alloc(32);
  r.copy(rPadded, 32 - r.length);
  s.copy(sPadded, 32 - s.length);

  return Buffer.concat([rPadded, sPadded]);
}
