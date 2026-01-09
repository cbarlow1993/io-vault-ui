// packages/chains/src/substrate/transaction-builder.ts

import type { SubstrateChainConfig } from './config.js';
import type {
  SigningPayload,
  TransactionOverrides,
  BroadcastResult,
  SubstrateChainAlias,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction as ISignedTransaction,
  NormalisedTransaction,
  RawSubstrateTransaction,
} from '../core/interfaces.js';
import {
  encodeCompact,
  hexToBytes,
  bytesToHex,
  decodeAddress,
  encodeAddress,
  BITTENSOR_METHOD_IDS,
} from './utils.js';
import { blake2b } from '@noble/hashes/blake2b';

/**
 * Substrate transaction for signing
 */
export interface SubstrateTransaction {
  _chain: string;
  method: {
    palletIndex: number;
    callIndex: number;
    args: Uint8Array;
  };
  era: {
    immortal: boolean;
    period?: number;
    phase?: number;
  };
  nonce: number;
  tip: bigint;
  specVersion: number;
  transactionVersion: number;
  genesisHash: string;
  blockHash: string;
  address: string;
}

/**
 * Signed Substrate Transaction
 */
export class SignedSubstrateTransaction implements ISignedTransaction {
  readonly chainAlias: SubstrateChainAlias;
  readonly serialized: string;

  constructor(
    private readonly config: SubstrateChainConfig,
    private readonly tx: SubstrateTransaction,
    private readonly signature: string,
    serializedTx: string,
    private readonly txHash: string
  ) {
    this.chainAlias = config.chainAlias as SubstrateChainAlias;
    this.serialized = serializedTx;
  }

  get hash(): string {
    return this.txHash;
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'author_submitExtrinsic',
          params: [this.serialized],
        }),
      });

      if (!response.ok) {
        return {
          hash: '',
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const json = (await response.json()) as {
        result?: string;
        error?: { message: string; code: number };
      };

      if (json.error) {
        return {
          hash: '',
          success: false,
          error: json.error.message,
        };
      }

      return {
        hash: json.result ?? this.txHash,
        success: true,
      };
    } catch (error) {
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  toRaw(): RawSubstrateTransaction {
    return {
      _chain: 'substrate',
      method: {
        palletIndex: this.tx.method.palletIndex,
        callIndex: this.tx.method.callIndex,
        args: bytesToHex(this.tx.method.args),
      },
      era: this.tx.era.immortal ? '00' : 'mortal',
      nonce: this.tx.nonce,
      tip: this.tx.tip.toString(),
      specVersion: this.tx.specVersion,
      transactionVersion: this.tx.transactionVersion,
      genesisHash: this.tx.genesisHash,
      blockHash: this.tx.blockHash,
      address: this.tx.address,
      signingPayload: this.serialized,
    };
  }
}

/**
 * Substrate Transaction Builder (Unsigned Transaction)
 */
export class SubstrateTransactionBuilder implements UnsignedTransaction {
  readonly chainAlias: SubstrateChainAlias;

  constructor(
    private readonly config: SubstrateChainConfig,
    private readonly tx: SubstrateTransaction
  ) {
    this.chainAlias = config.chainAlias as SubstrateChainAlias;
  }

  get raw(): RawSubstrateTransaction {
    return this.toRaw();
  }

  get serialized(): string {
    return JSON.stringify(this.toRaw());
  }

  /**
   * Get signing payload
   */
  getSigningPayload(): SigningPayload {
    const payload = this.buildSigningPayloadBytes();
    // If payload > 256 bytes, hash it
    let payloadHex: string;
    if (payload.length > 256) {
      payloadHex = bytesToHex(blake2b(payload, { dkLen: 32 }));
    } else {
      payloadHex = bytesToHex(payload);
    }

    return {
      chainAlias: this.config.chainAlias,
      algorithm: this.config.signatureScheme === 'sr25519' ? 'ed25519' : 'ed25519',
      data: [payloadHex],
    };
  }

  /**
   * Build the signing payload bytes
   */
  private buildSigningPayloadBytes(): Uint8Array {
    const parts: Uint8Array[] = [];

    // Call data
    const callData = this.encodeCall();
    parts.push(callData);

    // Era
    parts.push(this.encodeEra());

    // Nonce (compact)
    parts.push(encodeCompact(BigInt(this.tx.nonce)));

    // Tip (compact)
    parts.push(encodeCompact(this.tx.tip));

    // Spec version (u32 LE)
    parts.push(this.encodeU32(this.tx.specVersion));

    // Transaction version (u32 LE)
    parts.push(this.encodeU32(this.tx.transactionVersion));

    // Genesis hash
    parts.push(hexToBytes(this.tx.genesisHash));

    // Block hash (for mortality check)
    parts.push(hexToBytes(this.tx.blockHash));

    return this.concatBytes(parts);
  }

  /**
   * Encode the call data
   */
  private encodeCall(): Uint8Array {
    const { palletIndex, callIndex, args } = this.tx.method;
    const result = new Uint8Array(2 + args.length);
    result[0] = palletIndex;
    result[1] = callIndex;
    result.set(args, 2);
    return result;
  }

  /**
   * Encode era
   */
  private encodeEra(): Uint8Array {
    if (this.tx.era.immortal) {
      return new Uint8Array([0x00]);
    }
    // Mortal era encoding
    const period = this.tx.era.period || 64;
    const phase = this.tx.era.phase || 0;

    // Find the period as power of 2
    let calPeriod = Math.ceil(Math.log2(period));
    calPeriod = Math.min(Math.max(calPeriod, 4), 16);
    const quantizedPhase = (phase / (1 << (calPeriod - 1))) & 0xf;

    const encoded = Math.min(15, Math.max(1, calPeriod - 1)) | (quantizedPhase << 4);
    return new Uint8Array([encoded & 0xff, (encoded >> 8) & 0xff]);
  }

  /**
   * Encode u32 (little-endian)
   */
  private encodeU32(value: number): Uint8Array {
    const result = new Uint8Array(4);
    result[0] = value & 0xff;
    result[1] = (value >> 8) & 0xff;
    result[2] = (value >> 16) & 0xff;
    result[3] = (value >> 24) & 0xff;
    return result;
  }

  /**
   * Concatenate multiple Uint8Arrays
   */
  private concatBytes(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  /**
   * Convert to raw transaction format
   */
  toRaw(): RawSubstrateTransaction {
    const payload = this.getSigningPayload();
    return {
      _chain: 'substrate',
      method: {
        palletIndex: this.tx.method.palletIndex,
        callIndex: this.tx.method.callIndex,
        args: bytesToHex(this.tx.method.args),
      },
      era: this.tx.era.immortal ? '00' : this.encodeEraHex(),
      nonce: this.tx.nonce,
      tip: this.tx.tip.toString(),
      specVersion: this.tx.specVersion,
      transactionVersion: this.tx.transactionVersion,
      genesisHash: this.tx.genesisHash,
      blockHash: this.tx.blockHash,
      address: this.tx.address,
      signingPayload: payload.data[0] ?? '',
    };
  }

  /**
   * Encode era as hex string
   */
  private encodeEraHex(): string {
    const encoded = this.encodeEra();
    return bytesToHex(encoded, false);
  }

  /**
   * Rebuild transaction with new overrides
   */
  rebuild(overrides: TransactionOverrides): SubstrateTransactionBuilder {
    const updated = { ...this.tx };

    // Cast to Substrate-specific overrides
    const substrateOverrides = overrides as { tip?: bigint; nonce?: number };

    if (substrateOverrides.tip !== undefined) {
      updated.tip = substrateOverrides.tip;
    }

    if (substrateOverrides.nonce !== undefined) {
      updated.nonce = substrateOverrides.nonce;
    }

    return new SubstrateTransactionBuilder(this.config, updated);
  }

  /**
   * Convert to normalised transaction format
   */
  toNormalised(): NormalisedTransaction {
    const symbol = this.config.nativeCurrency.symbol;
    const decimals = this.config.nativeCurrency.decimals;

    // Extract value from args if it's a transfer
    // This is a simplification - actual value extraction depends on the call type
    const value = '0';

    return {
      chainAlias: this.config.chainAlias,
      type: 'native-transfer',
      from: this.tx.address,
      to: null,
      value,
      formattedValue: '0',
      symbol,
      fee: {
        value: this.tx.tip.toString(),
        formattedValue: (Number(this.tx.tip) / Math.pow(10, decimals)).toString(),
        symbol,
      },
      metadata: {
        nonce: this.tx.nonce,
        isContractDeployment: false,
      },
    };
  }

  /**
   * Apply signature to transaction
   */
  applySignature(signatures: string[]): SignedSubstrateTransaction {
    if (signatures.length !== 1) {
      throw new Error('Substrate transactions require exactly one signature');
    }

    const sig = signatures[0];
    if (!sig) {
      throw new Error('Signature is required');
    }

    const serializedTx = this.buildSignedTransaction(sig);
    const txHash = this.computeTxHash(sig);

    return new SignedSubstrateTransaction(
      this.config,
      this.tx,
      sig,
      serializedTx,
      txHash
    );
  }

  /**
   * Build the signed transaction bytes
   */
  private buildSignedTransaction(signature: string): string {
    const parts: Uint8Array[] = [];

    // Signature type (0x01 for sr25519, 0x00 for ed25519)
    const sigType = this.config.signatureScheme === 'sr25519' ? 0x01 : 0x00;

    // Address (public key)
    const { publicKey } = decodeAddress(this.tx.address);

    // Build extrinsic
    // Version byte (0x84 = signed, version 4)
    parts.push(new Uint8Array([0x84]));

    // Address type (0x00 for Id)
    parts.push(new Uint8Array([0x00]));

    // Public key
    parts.push(publicKey);

    // Signature type
    parts.push(new Uint8Array([sigType]));

    // Signature (64 bytes)
    parts.push(hexToBytes(signature));

    // Era
    parts.push(this.encodeEra());

    // Nonce (compact)
    parts.push(encodeCompact(BigInt(this.tx.nonce)));

    // Tip (compact)
    parts.push(encodeCompact(this.tx.tip));

    // Call data
    parts.push(this.encodeCall());

    // Prepend length
    const extrinsic = this.concatBytes(parts);
    const lengthPrefix = encodeCompact(BigInt(extrinsic.length));
    const full = this.concatBytes([lengthPrefix, extrinsic]);

    return bytesToHex(full);
  }

  /**
   * Compute transaction hash
   */
  private computeTxHash(signature: string): string {
    const signedTx = hexToBytes(this.buildSignedTransaction(signature));
    return bytesToHex(blake2b(signedTx, { dkLen: 32 }));
  }
}

/**
 * Build a native transfer transaction
 */
export function buildSubstrateTransfer(
  config: SubstrateChainConfig,
  from: string,
  to: string,
  amount: bigint,
  nonce: number,
  tip: bigint,
  specVersion: number,
  transactionVersion: number,
  genesisHash: string,
  blockHash: string,
  immortal: boolean = false
): SubstrateTransactionBuilder {
  const { publicKey: destPublicKey } = decodeAddress(to);

  // Encode destination and amount for transferKeepAlive
  const args = encodeTransferArgs(destPublicKey, amount);

  const methodId = BITTENSOR_METHOD_IDS['Balances.transferKeepAlive'];

  const tx: SubstrateTransaction = {
    _chain: config.chainAlias,
    method: {
      palletIndex: methodId.palletIndex,
      callIndex: methodId.callIndex,
      args,
    },
    era: { immortal },
    nonce,
    tip,
    specVersion,
    transactionVersion,
    genesisHash,
    blockHash,
    address: from,
  };

  return new SubstrateTransactionBuilder(config, tx);
}

/**
 * Encode transfer arguments (destination + amount)
 */
function encodeTransferArgs(destPublicKey: Uint8Array, amount: bigint): Uint8Array {
  // Destination: MultiAddress::Id (0x00 prefix + 32 byte account id)
  const destEncoded = new Uint8Array(33);
  destEncoded[0] = 0x00; // Id variant
  destEncoded.set(destPublicKey, 1);

  // Amount: Compact<Balance>
  const amountEncoded = encodeCompact(amount);

  const result = new Uint8Array(destEncoded.length + amountEncoded.length);
  result.set(destEncoded);
  result.set(amountEncoded, destEncoded.length);

  return result;
}

/**
 * Build a transfer that allows the sender's account to be reaped
 */
export function buildSubstrateTransferAllowDeath(
  config: SubstrateChainConfig,
  from: string,
  to: string,
  amount: bigint,
  nonce: number,
  tip: bigint,
  specVersion: number,
  transactionVersion: number,
  genesisHash: string,
  blockHash: string,
  immortal: boolean = false
): SubstrateTransactionBuilder {
  const { publicKey: destPublicKey } = decodeAddress(to);
  const args = encodeTransferArgs(destPublicKey, amount);

  const methodId = BITTENSOR_METHOD_IDS['Balances.transferAllowDeath'];

  const tx: SubstrateTransaction = {
    _chain: config.chainAlias,
    method: {
      palletIndex: methodId.palletIndex,
      callIndex: methodId.callIndex,
      args,
    },
    era: { immortal },
    nonce,
    tip,
    specVersion,
    transactionVersion,
    genesisHash,
    blockHash,
    address: from,
  };

  return new SubstrateTransactionBuilder(config, tx);
}
