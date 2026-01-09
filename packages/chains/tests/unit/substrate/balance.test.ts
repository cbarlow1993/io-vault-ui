// packages/chains/tests/unit/substrate/balance.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubstrateBalanceFetcher } from '../../../src/substrate/balance.js';
import { getSubstrateChainConfig } from '../../../src/substrate/config.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SubstrateBalanceFetcher', () => {
  const config = getSubstrateChainConfig('bittensor');
  let fetcher: SubstrateBalanceFetcher;

  // Valid Bittensor address (SS58 prefix 42)
  const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new SubstrateBalanceFetcher(config);
  });

  describe('getNativeBalance', () => {
    it('returns balance for existing account', async () => {
      // Mock account info response with SCALE-encoded data
      // AccountInfo: nonce(u32) + consumers(u32) + providers(u32) + sufficients(u32) + data(free, reserved, frozen as u128s)
      const accountInfoHex = buildAccountInfoHex({
        nonce: 5,
        consumers: 1,
        providers: 1,
        sufficients: 0,
        free: 100000000000n, // 100 TAO
        reserved: 0n,
        frozen: 0n,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: accountInfoHex,
        }),
      });

      const result = await fetcher.getNativeBalance(validAddress);

      expect(result.balance).toBe('100000000000');
      expect(result.formattedBalance).toBe('100');
      expect(result.symbol).toBe('TAO');
      expect(result.decimals).toBe(9);
      expect(result.isNative).toBe(true);
    });

    it('returns zero for non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: null,
        }),
      });

      const result = await fetcher.getNativeBalance(validAddress);

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
    });

    it('throws on invalid address', async () => {
      await expect(fetcher.getNativeBalance('invalid')).rejects.toThrow('Invalid Substrate address');
    });

    it('calculates transferable balance correctly', async () => {
      const accountInfoHex = buildAccountInfoHex({
        nonce: 1,
        consumers: 1,
        providers: 1,
        sufficients: 0,
        free: 100000000000n, // 100 TAO
        reserved: 10000000000n, // 10 TAO reserved
        frozen: 20000000000n, // 20 TAO frozen
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: accountInfoHex,
        }),
      });

      const result = await fetcher.getNativeBalance(validAddress);

      expect(result.free).toBe('100000000000');
      expect(result.reserved).toBe('10000000000');
      expect(result.frozen).toBe('20000000000');
      expect(result.transferable).toBe('80000000000'); // free - frozen = 80 TAO
    });
  });

  describe('getAccountInfo', () => {
    it('returns full account info', async () => {
      const accountInfoHex = buildAccountInfoHex({
        nonce: 42,
        consumers: 2,
        providers: 1,
        sufficients: 0,
        free: 50000000000n,
        reserved: 5000000000n,
        frozen: 0n,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: accountInfoHex,
        }),
      });

      const result = await fetcher.getAccountInfo(validAddress);

      expect(result.nonce).toBe(42);
      expect(result.consumers).toBe(2);
      expect(result.providers).toBe(1);
      expect(result.sufficients).toBe(0);
      expect(result.data.free).toBe(50000000000n);
      expect(result.data.reserved).toBe(5000000000n);
      expect(result.data.frozen).toBe(0n);
    });

    it('returns default values for non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: null,
        }),
      });

      const result = await fetcher.getAccountInfo(validAddress);

      expect(result.nonce).toBe(0);
      expect(result.consumers).toBe(0);
      expect(result.providers).toBe(0);
      expect(result.sufficients).toBe(0);
      expect(result.data.free).toBe(0n);
      expect(result.data.reserved).toBe(0n);
      expect(result.data.frozen).toBe(0n);
    });
  });

  describe('getBlockNumber', () => {
    it('returns current block number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            number: '0x123456',
          },
        }),
      });

      const result = await fetcher.getBlockNumber();

      expect(result).toBe(0x123456);
    });
  });

  describe('getGenesisHash', () => {
    it('returns genesis hash', async () => {
      const genesisHash = '0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: genesisHash,
        }),
      });

      const result = await fetcher.getGenesisHash();

      expect(result).toBe(genesisHash);
    });
  });

  describe('getRuntimeVersion', () => {
    it('returns runtime version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            specName: 'bittensor',
            specVersion: 153,
            transactionVersion: 1,
          },
        }),
      });

      const result = await fetcher.getRuntimeVersion();

      expect(result.specName).toBe('bittensor');
      expect(result.specVersion).toBe(153);
      expect(result.transactionVersion).toBe(1);
    });
  });

  describe('error handling', () => {
    it('throws RpcError on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetcher.getBlockNumber()).rejects.toThrow();
    });

    it('throws RpcError on JSON-RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }),
      });

      await expect(fetcher.getBlockNumber()).rejects.toThrow('Method not found');
    });
  });
});

/**
 * Helper to build SCALE-encoded AccountInfo hex
 */
function buildAccountInfoHex(info: {
  nonce: number;
  consumers: number;
  providers: number;
  sufficients: number;
  free: bigint;
  reserved: bigint;
  frozen: bigint;
}): string {
  const bytes = new Uint8Array(16 + 16 + 16 + 16); // 4 u32s + 3 u128s = 64 bytes

  let offset = 0;

  // nonce (u32 LE)
  writeU32(bytes, offset, info.nonce);
  offset += 4;

  // consumers (u32 LE)
  writeU32(bytes, offset, info.consumers);
  offset += 4;

  // providers (u32 LE)
  writeU32(bytes, offset, info.providers);
  offset += 4;

  // sufficients (u32 LE)
  writeU32(bytes, offset, info.sufficients);
  offset += 4;

  // free (u128 LE)
  writeU128(bytes, offset, info.free);
  offset += 16;

  // reserved (u128 LE)
  writeU128(bytes, offset, info.reserved);
  offset += 16;

  // frozen (u128 LE)
  writeU128(bytes, offset, info.frozen);

  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function writeU128(bytes: Uint8Array, offset: number, value: bigint): void {
  for (let i = 0; i < 16; i++) {
    bytes[offset + i] = Number((value >> BigInt(i * 8)) & 0xffn);
  }
}
