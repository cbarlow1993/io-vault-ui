// packages/chains/src/substrate/balance.ts

import type { SubstrateChainConfig } from './config.js';
import { RpcError } from '../core/errors.js';
import { mergeHeaders } from '../core/utils.js';
import { isValidSubstrateAddress, formatPlanck, decodeAddress, bytesToHex, hexToBytes } from './utils.js';

/**
 * Substrate account info
 */
export interface SubstrateAccountInfo {
  nonce: number;
  consumers: number;
  providers: number;
  sufficients: number;
  data: {
    free: bigint;
    reserved: bigint;
    frozen: bigint;
  };
}

/**
 * Native balance result
 */
export interface SubstrateBalance {
  balance: string;
  formattedBalance: string;
  symbol: string;
  decimals: number;
  isNative: true;
  address: string;
  free: string;
  reserved: string;
  frozen: string;
  transferable: string;
}

/**
 * Substrate Balance Fetcher
 */
export class SubstrateBalanceFetcher {
  private readonly headers: Record<string, string>;

  constructor(private readonly config: SubstrateChainConfig) {
    this.headers = mergeHeaders({ 'Content-Type': 'application/json' }, config.auth);
  }

  /**
   * Make JSON-RPC call to Substrate node
   */
  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    // Convert WebSocket URL to HTTP if needed for simple RPC calls
    let httpUrl = this.config.rpcUrl;
    if (httpUrl.startsWith('wss://')) {
      httpUrl = httpUrl.replace('wss://', 'https://');
    } else if (httpUrl.startsWith('ws://')) {
      httpUrl = httpUrl.replace('ws://', 'http://');
    }

    const response = await fetch(httpUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`HTTP ${response.status}: ${response.statusText}`, this.config.chainAlias);
    }

    const json = (await response.json()) as { result?: T; error?: { code: number; message: string } };

    if (json.error) {
      throw new RpcError(json.error.message, this.config.chainAlias, json.error.code);
    }

    return json.result as T;
  }

  /**
   * Get native balance for an address
   */
  async getNativeBalance(address: string): Promise<SubstrateBalance> {
    if (!isValidSubstrateAddress(address, this.config.ss58Prefix)) {
      throw new RpcError(`Invalid Substrate address: ${address}`, this.config.chainAlias);
    }

    try {
      const accountInfo = await this.getAccountInfo(address);

      const free = accountInfo.data.free;
      const reserved = accountInfo.data.reserved;
      const frozen = accountInfo.data.frozen;
      const transferable = free > frozen ? free - frozen : 0n;

      return {
        balance: free.toString(),
        formattedBalance: formatPlanck(free, this.config.nativeCurrency.decimals),
        symbol: this.config.nativeCurrency.symbol,
        decimals: this.config.nativeCurrency.decimals,
        isNative: true,
        address,
        free: free.toString(),
        reserved: reserved.toString(),
        frozen: frozen.toString(),
        transferable: transferable.toString(),
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch native balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get account info from chain state
   */
  async getAccountInfo(address: string): Promise<SubstrateAccountInfo> {
    if (!isValidSubstrateAddress(address, this.config.ss58Prefix)) {
      throw new RpcError(`Invalid Substrate address: ${address}`, this.config.chainAlias);
    }

    try {
      const { publicKey } = decodeAddress(address);
      const storageKey = this.buildSystemAccountStorageKey(publicKey);

      const result = await this.rpcCall<string | null>('state_getStorage', [storageKey]);

      if (!result) {
        // Account doesn't exist yet
        return {
          nonce: 0,
          consumers: 0,
          providers: 0,
          sufficients: 0,
          data: {
            free: 0n,
            reserved: 0n,
            frozen: 0n,
          },
        };
      }

      return this.decodeAccountInfo(result);
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch account info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Build storage key for System.Account
   */
  private buildSystemAccountStorageKey(publicKey: Uint8Array): string {
    // System module storage prefix
    const moduleHash = this.xxhash128('System');
    const storageHash = this.xxhash128('Account');
    const keyHash = this.blake2b128Concat(publicKey);

    const key = new Uint8Array(moduleHash.length + storageHash.length + keyHash.length);
    key.set(moduleHash, 0);
    key.set(storageHash, moduleHash.length);
    key.set(keyHash, moduleHash.length + storageHash.length);

    return bytesToHex(key);
  }

  /**
   * XXHash128 (Substrate's TwoX128 hasher)
   */
  private xxhash128(input: string | Uint8Array): Uint8Array {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    // Simplified XXHash64 implementation for storage key generation
    // In production, use a proper xxhash library
    const seed1 = 0n;
    const seed2 = 1n;
    const hash1 = this.xxhash64(data, seed1);
    const hash2 = this.xxhash64(data, seed2);

    const result = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      result[i] = Number((hash1 >> BigInt(i * 8)) & 0xffn);
      result[i + 8] = Number((hash2 >> BigInt(i * 8)) & 0xffn);
    }
    return result;
  }

  /**
   * Simplified XXHash64 for storage keys
   */
  private xxhash64(data: Uint8Array, seed: bigint): bigint {
    const PRIME64_1 = 0x9e3779b185ebca87n;
    const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
    const PRIME64_3 = 0x165667b19e3779f9n;
    const PRIME64_4 = 0x85ebca77c2b2ae63n;
    const PRIME64_5 = 0x27d4eb2f165667c5n;

    let h64: bigint;
    const len = data.length;

    if (len >= 32) {
      let v1 = seed + PRIME64_1 + PRIME64_2;
      let v2 = seed + PRIME64_2;
      let v3 = seed;
      let v4 = seed - PRIME64_1;

      let offset = 0;
      while (offset + 32 <= len) {
        v1 = this.xxhash64Round(v1, this.readU64(data, offset));
        v2 = this.xxhash64Round(v2, this.readU64(data, offset + 8));
        v3 = this.xxhash64Round(v3, this.readU64(data, offset + 16));
        v4 = this.xxhash64Round(v4, this.readU64(data, offset + 24));
        offset += 32;
      }

      h64 = this.rotl64(v1, 1n) + this.rotl64(v2, 7n) + this.rotl64(v3, 12n) + this.rotl64(v4, 18n);
      h64 = this.xxhash64MergeRound(h64, v1);
      h64 = this.xxhash64MergeRound(h64, v2);
      h64 = this.xxhash64MergeRound(h64, v3);
      h64 = this.xxhash64MergeRound(h64, v4);
    } else {
      h64 = seed + PRIME64_5;
    }

    h64 = (h64 + BigInt(len)) & 0xffffffffffffffffn;

    let offset = len >= 32 ? len - (len % 32) : 0;
    while (offset + 8 <= len) {
      const k1 = this.readU64(data, offset) * PRIME64_2;
      h64 ^= this.rotl64(k1, 31n) * PRIME64_1;
      h64 = this.rotl64(h64, 27n) * PRIME64_1 + PRIME64_4;
      h64 &= 0xffffffffffffffffn;
      offset += 8;
    }

    while (offset < len) {
      const byte = data[offset];
      if (byte !== undefined) {
        h64 ^= BigInt(byte) * PRIME64_5;
        h64 = this.rotl64(h64, 11n) * PRIME64_1;
        h64 &= 0xffffffffffffffffn;
      }
      offset++;
    }

    h64 ^= h64 >> 33n;
    h64 = (h64 * PRIME64_2) & 0xffffffffffffffffn;
    h64 ^= h64 >> 29n;
    h64 = (h64 * PRIME64_3) & 0xffffffffffffffffn;
    h64 ^= h64 >> 32n;

    return h64;
  }

  private xxhash64Round(acc: bigint, input: bigint): bigint {
    const PRIME64_1 = 0x9e3779b185ebca87n;
    const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
    acc = (acc + input * PRIME64_2) & 0xffffffffffffffffn;
    acc = this.rotl64(acc, 31n);
    acc = (acc * PRIME64_1) & 0xffffffffffffffffn;
    return acc;
  }

  private xxhash64MergeRound(acc: bigint, val: bigint): bigint {
    const PRIME64_1 = 0x9e3779b185ebca87n;
    const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
    const PRIME64_4 = 0x85ebca77c2b2ae63n;
    val = this.xxhash64Round(0n, val);
    acc ^= val;
    acc = (acc * PRIME64_1 + PRIME64_4) & 0xffffffffffffffffn;
    return acc;
  }

  private rotl64(x: bigint, r: bigint): bigint {
    return ((x << r) | (x >> (64n - r))) & 0xffffffffffffffffn;
  }

  private readU64(data: Uint8Array, offset: number): bigint {
    let result = 0n;
    for (let i = 0; i < 8; i++) {
      const byte = data[offset + i];
      if (byte !== undefined) {
        result |= BigInt(byte) << BigInt(i * 8);
      }
    }
    return result;
  }

  /**
   * Blake2b128Concat hasher (for account ID hashing)
   */
  private blake2b128Concat(data: Uint8Array): Uint8Array {
    const { blake2b } = require('@noble/hashes/blake2b');
    const hash = blake2b(data, { dkLen: 16 }); // 128 bits = 16 bytes
    const result = new Uint8Array(hash.length + data.length);
    result.set(hash, 0);
    result.set(data, hash.length);
    return result;
  }

  /**
   * Decode AccountInfo from SCALE-encoded bytes
   */
  private decodeAccountInfo(hex: string): SubstrateAccountInfo {
    const bytes = hexToBytes(hex);
    let offset = 0;

    // nonce: u32
    const nonce = this.readU32(bytes, offset);
    offset += 4;

    // consumers: u32
    const consumers = this.readU32(bytes, offset);
    offset += 4;

    // providers: u32
    const providers = this.readU32(bytes, offset);
    offset += 4;

    // sufficients: u32
    const sufficients = this.readU32(bytes, offset);
    offset += 4;

    // data: AccountData
    const free = this.readU128(bytes, offset);
    offset += 16;

    const reserved = this.readU128(bytes, offset);
    offset += 16;

    const frozen = this.readU128(bytes, offset);
    // offset += 16;

    return {
      nonce,
      consumers,
      providers,
      sufficients,
      data: {
        free,
        reserved,
        frozen,
      },
    };
  }

  /**
   * Read u32 from bytes (little-endian)
   */
  private readU32(bytes: Uint8Array, offset: number): number {
    const b0 = bytes[offset] ?? 0;
    const b1 = bytes[offset + 1] ?? 0;
    const b2 = bytes[offset + 2] ?? 0;
    const b3 = bytes[offset + 3] ?? 0;
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  /**
   * Read u128 from bytes (little-endian)
   */
  private readU128(bytes: Uint8Array, offset: number): bigint {
    let result = 0n;
    for (let i = 0; i < 16; i++) {
      const byte = bytes[offset + i];
      if (byte !== undefined) {
        result |= BigInt(byte) << BigInt(i * 8);
      }
    }
    return result;
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      const header = await this.rpcCall<{ number: string }>('chain_getHeader', []);
      return parseInt(header.number, 16);
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch block number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get genesis hash
   */
  async getGenesisHash(): Promise<string> {
    try {
      return await this.rpcCall<string>('chain_getBlockHash', [0]);
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch genesis hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get runtime version
   */
  async getRuntimeVersion(): Promise<{
    specName: string;
    specVersion: number;
    transactionVersion: number;
  }> {
    try {
      const result = await this.rpcCall<{
        specName: string;
        specVersion: number;
        transactionVersion: number;
      }>('state_getRuntimeVersion', []);
      return result;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch runtime version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }
}
