// packages/chains/src/utxo/psbt-builder.ts

import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { createHash } from 'crypto';
import type { UTXO } from './blockbook-client.js';
import { PsbtError, UnsupportedAddressTypeError } from './errors.js';
import type { UtxoChainAlias } from '../core/types.js';

// Initialize ECC library for bitcoinjs-lib
bitcoin.initEccLib(ecc);

// ============ Types ============

export type ScriptType = 'p2wpkh' | 'p2tr';

export interface InputMetadata {
  index: number;
  scriptType: ScriptType;
  publicKey: Buffer;
  value: bigint;
}

export interface SighashData {
  index: number;
  hash: Buffer;
  type: 'ecdsa' | 'schnorr';
}

// ============ PSBT Builder ============

export class PsbtBuilder {
  private psbt: bitcoin.Psbt;
  private readonly network: bitcoin.Network;
  private readonly chainAlias: UtxoChainAlias;
  private inputMetadata: InputMetadata[] = [];

  constructor(networkType: 'mainnet' | 'testnet' | 'signet', chainAlias: UtxoChainAlias) {
    this.network = networkType === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    this.chainAlias = chainAlias;
    this.psbt = new bitcoin.Psbt({ network: this.network });
  }

  /**
   * Add an input from a UTXO
   */
  addInput(utxo: UTXO, publicKey: Buffer, rbf: boolean = true): this {
    const scriptType = this.detectScriptType(utxo.scriptPubKey);
    const sequence = rbf ? 0xfffffffd : 0xffffffff;

    if (scriptType === 'p2wpkh') {
      this.addP2WPKHInput(utxo, publicKey, sequence);
    } else if (scriptType === 'p2tr') {
      this.addP2TRInput(utxo, publicKey, sequence);
    } else {
      throw new UnsupportedAddressTypeError(this.chainAlias, utxo.address, 'legacy');
    }

    this.inputMetadata.push({
      index: this.inputMetadata.length,
      scriptType,
      publicKey,
      value: utxo.value,
    });

    return this;
  }

  /**
   * Add P2WPKH (Native SegWit) input
   */
  private addP2WPKHInput(utxo: UTXO, publicKey: Buffer, sequence: number): void {
    const scriptPubKey = Buffer.from(utxo.scriptPubKey, 'hex');

    this.psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
    });
  }

  /**
   * Add P2TR (Taproot) input
   */
  private addP2TRInput(utxo: UTXO, publicKey: Buffer, sequence: number): void {
    const scriptPubKey = Buffer.from(utxo.scriptPubKey, 'hex');
    // For Taproot, we need the x-only public key (32 bytes)
    // If the public key is 33 bytes (compressed), take the last 32 bytes
    const xOnlyPubKey = publicKey.length === 33 ? publicKey.subarray(1) : publicKey;

    this.psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
      tapInternalKey: xOnlyPubKey,
    });
  }

  /**
   * Add an output
   */
  addOutput(address: string, value: bigint): this {
    this.psbt.addOutput({
      address,
      value,
    });
    return this;
  }

  /**
   * Get sighash data for each input (for MPC signing)
   * Returns the hash that needs to be signed for each input
   */
  getSighashes(): SighashData[] {
    // Extract the unsigned transaction from PSBT
    const tx = (this.psbt as unknown as { __CACHE: { __TX: bitcoin.Transaction } }).__CACHE.__TX;

    return this.inputMetadata.map((meta, index) => {
      const input = this.psbt.data.inputs[index]!;
      const witnessUtxo = input.witnessUtxo;

      if (!witnessUtxo) {
        throw new PsbtError('Missing witnessUtxo for input', this.chainAlias, 'construction');
      }

      // Convert Uint8Array to Buffer if needed
      const witnessData = {
        script: Buffer.from(witnessUtxo.script),
        value: witnessUtxo.value,
      };

      if (meta.scriptType === 'p2tr') {
        // BIP341 Taproot sighash
        const hash = this.computeTaprootSighash(tx, index, witnessData);
        return { index, hash, type: 'schnorr' as const };
      } else {
        // BIP143 SegWit v0 sighash
        const hash = this.computeSegwitSighash(tx, index, witnessData, meta.publicKey);
        return { index, hash, type: 'ecdsa' as const };
      }
    });
  }

  /**
   * Compute BIP143 sighash for SegWit v0 (P2WPKH)
   */
  private computeSegwitSighash(
    tx: bitcoin.Transaction,
    inputIndex: number,
    witnessUtxo: { script: Buffer; value: bigint },
    publicKey: Buffer
  ): Buffer {
    // BIP143 sighash preimage components
    const hashPrevouts = this.hashPrevouts(tx);
    const hashSequence = this.hashSequence(tx);
    const hashOutputs = this.hashOutputs(tx);

    const input = tx.ins[inputIndex]!;

    // For P2WPKH, the scriptCode is OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
    const pubKeyHash = bitcoin.crypto.hash160(publicKey);
    const scriptCode = Buffer.concat([
      Buffer.from([0x19, 0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 PUSH20
      pubKeyHash,
      Buffer.from([0x88, 0xac]), // OP_EQUALVERIFY OP_CHECKSIG
    ]);

    // Build preimage
    const preimage = Buffer.concat([
      this.int32LE(tx.version),
      hashPrevouts,
      hashSequence,
      Buffer.from(input.hash).reverse(),
      this.int32LE(input.index),
      scriptCode,
      this.int64LE(witnessUtxo.value),
      this.int32LE(input.sequence),
      hashOutputs,
      this.int32LE(tx.locktime),
      this.int32LE(0x01), // SIGHASH_ALL
    ]);

    return this.doubleSha256(preimage);
  }

  /**
   * Compute BIP341 sighash for Taproot (P2TR)
   * Simplified key-path spend sighash
   */
  private computeTaprootSighash(
    tx: bitcoin.Transaction,
    inputIndex: number,
    witnessUtxo: { script: Buffer; value: bigint }
  ): Buffer {
    // Collect all input amounts and scriptPubKeys
    const amounts: bigint[] = [];
    const scriptPubKeys: Buffer[] = [];

    for (let i = 0; i < tx.ins.length; i++) {
      const input = this.psbt.data.inputs[i]!;
      if (input.witnessUtxo) {
        amounts.push(input.witnessUtxo.value);
        scriptPubKeys.push(Buffer.from(input.witnessUtxo.script));
      }
    }

    // BIP341 signature hash
    const sigHashType = 0x00; // SIGHASH_DEFAULT

    // Build preimage according to BIP341
    const preimage = this.buildTaprootPreimage(tx, inputIndex, sigHashType, amounts, scriptPubKeys);

    // TapSighash uses tagged hash
    return this.taggedHash('TapSighash', preimage);
  }

  private buildTaprootPreimage(
    tx: bitcoin.Transaction,
    inputIndex: number,
    sigHashType: number,
    amounts: bigint[],
    scriptPubKeys: Buffer[]
  ): Buffer {
    const parts: Buffer[] = [];

    // Epoch (0x00)
    parts.push(Buffer.from([0x00]));

    // Hash type
    parts.push(Buffer.from([sigHashType]));

    // Version
    parts.push(this.int32LE(tx.version));

    // Locktime
    parts.push(this.int32LE(tx.locktime));

    // sha_prevouts
    parts.push(this.hashPrevouts(tx));

    // sha_amounts
    const amountsData = Buffer.concat(amounts.map(a => this.int64LE(a)));
    parts.push(createHash('sha256').update(amountsData).digest());

    // sha_scriptpubkeys
    const spkData = Buffer.concat(scriptPubKeys.map(s => Buffer.concat([Buffer.from([s.length]), s])));
    parts.push(createHash('sha256').update(spkData).digest());

    // sha_sequences
    parts.push(this.hashSequence(tx));

    // sha_outputs
    parts.push(this.hashOutputs(tx));

    // spend_type (0x00 for key path)
    parts.push(Buffer.from([0x00]));

    // input_index
    parts.push(this.int32LE(inputIndex));

    return Buffer.concat(parts);
  }

  private hashPrevouts(tx: bitcoin.Transaction): Buffer {
    const data = Buffer.concat(
      tx.ins.map(input => Buffer.concat([
        Buffer.from(input.hash).reverse(),
        this.int32LE(input.index),
      ]))
    );
    return this.doubleSha256(data);
  }

  private hashSequence(tx: bitcoin.Transaction): Buffer {
    const data = Buffer.concat(tx.ins.map(input => this.int32LE(input.sequence)));
    return this.doubleSha256(data);
  }

  private hashOutputs(tx: bitcoin.Transaction): Buffer {
    const data = Buffer.concat(
      tx.outs.map(output => Buffer.concat([
        this.int64LE(BigInt(output.value)),
        Buffer.from([output.script.length]),
        output.script,
      ]))
    );
    return this.doubleSha256(data);
  }

  private doubleSha256(data: Buffer): Buffer {
    return createHash('sha256').update(
      createHash('sha256').update(data).digest()
    ).digest();
  }

  private taggedHash(tag: string, data: Buffer): Buffer {
    const tagHash = createHash('sha256').update(tag).digest();
    return createHash('sha256')
      .update(tagHash)
      .update(tagHash)
      .update(data)
      .digest();
  }

  private int32LE(n: number): Buffer {
    const buf = Buffer.alloc(4);
    // Use unsigned write for sequence numbers and other values that can exceed signed int32 range
    buf.writeUInt32LE(n >>> 0, 0);
    return buf;
  }

  private int64LE(n: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(n, 0);
    return buf;
  }

  /**
   * Get the underlying PSBT instance
   */
  toPsbt(): bitcoin.Psbt {
    return this.psbt;
  }

  /**
   * Get PSBT as base64 string
   */
  toBase64(): string {
    return this.psbt.toBase64();
  }

  /**
   * Get PSBT as hex string
   */
  toHex(): string {
    return this.psbt.toHex();
  }

  /**
   * Get input metadata
   */
  getInputMetadata(): InputMetadata[] {
    return [...this.inputMetadata];
  }

  /**
   * Get the network
   */
  getNetwork(): bitcoin.Network {
    return this.network;
  }

  /**
   * Detect script type from scriptPubKey
   */
  private detectScriptType(scriptPubKey: string): ScriptType {
    const script = Buffer.from(scriptPubKey, 'hex');

    // P2WPKH: OP_0 <20-byte-hash> (22 bytes total)
    // Format: 0x00 0x14 <20 bytes>
    if (script.length === 22 && script[0] === 0x00 && script[1] === 0x14) {
      return 'p2wpkh';
    }

    // P2TR: OP_1 <32-byte-key> (34 bytes total)
    // Format: 0x51 0x20 <32 bytes>
    if (script.length === 34 && script[0] === 0x51 && script[1] === 0x20) {
      return 'p2tr';
    }

    throw new UnsupportedAddressTypeError(
      this.chainAlias,
      `scriptPubKey: ${scriptPubKey}`,
      'unknown'
    );
  }

  /**
   * Create a PSBT from base64 string
   */
  static fromBase64(
    base64: string,
    networkType: 'mainnet' | 'testnet' | 'signet',
    chainAlias: UtxoChainAlias
  ): PsbtBuilder {
    const network = networkType === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const builder = new PsbtBuilder(networkType, chainAlias);
    builder.psbt = bitcoin.Psbt.fromBase64(base64, { network });
    return builder;
  }
}

/**
 * Utility to derive scriptPubKey from address
 */
export function addressToScriptPubKey(address: string, network: bitcoin.Network): Buffer {
  const script = bitcoin.address.toOutputScript(address, network);
  return Buffer.from(script);
}

/**
 * Utility to get script type from address
 */
export function getScriptTypeFromAddress(address: string): ScriptType | null {
  // Native SegWit P2WPKH (bc1q... or tb1q...)
  if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
    return 'p2wpkh';
  }

  // Taproot (bc1p... or tb1p...)
  if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    return 'p2tr';
  }

  // Legacy addresses not supported
  return null;
}
