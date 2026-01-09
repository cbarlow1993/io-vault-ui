// packages/chains/tests/unit/substrate/provider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubstrateChainProvider } from '../../../src/substrate/provider.js';
import { ContractError } from '../../../src/core/errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SubstrateChainProvider', () => {
  let provider: SubstrateChainProvider;

  // Valid Bittensor addresses (SS58 prefix 42)
  const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const validAddress2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new SubstrateChainProvider('bittensor');
  });

  describe('basic properties', () => {
    it('returns correct chainAlias', () => {
      expect(provider.chainAlias).toBe('bittensor');
    });

    it('returns correct ecosystem', () => {
      expect(provider.ecosystem).toBe('substrate');
    });
  });

  describe('validateAddress', () => {
    it('validates correct Substrate addresses', () => {
      expect(provider.validateAddress(validAddress)).toBe(true);
      expect(provider.validateAddress(validAddress2)).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(provider.validateAddress('')).toBe(false);
      expect(provider.validateAddress('invalid')).toBe(false);
      expect(provider.validateAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
    });
  });

  describe('getNativeBalance', () => {
    it('returns native balance', async () => {
      const accountInfoHex = buildAccountInfoHex({
        nonce: 1,
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

      const result = await provider.getNativeBalance(validAddress);

      expect(result.balance).toBe('100000000000');
      expect(result.formattedBalance).toBe('100');
      expect(result.symbol).toBe('TAO');
      expect(result.decimals).toBe(9);
      expect(result.isNative).toBe(true);
    });
  });

  describe('getTokenBalance', () => {
    it('throws ContractError (not supported)', async () => {
      await expect(provider.getTokenBalance(validAddress, 'token')).rejects.toThrow(ContractError);
      await expect(provider.getTokenBalance(validAddress, 'token')).rejects.toThrow('not supported');
    });
  });

  describe('buildNativeTransfer', () => {
    const setupMocksForTransfer = () => {
      // Mock account info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: buildAccountInfoHex({
            nonce: 5,
            consumers: 1,
            providers: 1,
            sufficients: 0,
            free: 100000000000n,
            reserved: 0n,
            frozen: 0n,
          }),
        }),
      });

      // Mock runtime version
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

      // Mock genesis hash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03',
        }),
      });

      // Mock block number
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { number: '0x100' },
        }),
      });

      // Mock block hash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
      });
    };

    it('builds native TAO transfer', async () => {
      setupMocksForTransfer();

      const tx = await provider.buildNativeTransfer({ from: validAddress, to: validAddress2, value: '10000000000' });

      const raw = tx.toRaw();
      expect(raw._chain).toBe('substrate');
      expect(raw.method.palletIndex).toBe(5); // Balances pallet
      expect(raw.method.callIndex).toBe(3); // transferKeepAlive
      expect(raw.nonce).toBe(5);
      expect(raw.specVersion).toBe(153);
    });

    it('builds transfer with custom tip', async () => {
      setupMocksForTransfer();

      const tx = await provider.buildNativeTransfer({
        from: validAddress,
        to: validAddress2,
        value: '10000000000',
        overrides: { tip: 1000000n },
      });

      const raw = tx.toRaw();
      expect(raw.tip).toBe('1000000');
    });

    it('throws on invalid from address', async () => {
      await expect(
        provider.buildNativeTransfer({ from: 'invalid', to: validAddress2, value: '10000000000' })
      ).rejects.toThrow('Invalid Substrate address');
    });

    it('throws on invalid to address', async () => {
      await expect(
        provider.buildNativeTransfer({ from: validAddress, to: 'invalid', value: '10000000000' })
      ).rejects.toThrow('Invalid Substrate address');
    });
  });

  describe('buildTokenTransfer', () => {
    it('throws ContractError (not supported)', async () => {
      await expect(
        provider.buildTokenTransfer({ from: validAddress, to: validAddress2, contractAddress: 'token', value: '100' })
      ).rejects.toThrow(ContractError);
    });
  });

  describe('broadcastTransaction', () => {
    it('broadcasts transaction successfully via SignedSubstrateTransaction', async () => {
      // Import the transaction builder to create a proper signed transaction
      const { SignedSubstrateTransaction } = await import('../../../src/substrate/transaction-builder.js');
      const signedTx = new SignedSubstrateTransaction(
        provider.config,
        'signature123',
        '0x1234567890',
        '0xabc123'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0xdef456',
        }),
      });

      const result = await signedTx.broadcast();

      expect(result.hash).toBe('0xdef456');
      expect(result.success).toBe(true);
    });
  });

  describe('getTransaction', () => {
    it('returns pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0xblockhash',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            block: {
              extrinsics: [],
            },
          },
        }),
      });

      const result = await provider.getTransaction('0xhash123');

      expect(result.normalized.hash).toBe('0xhash123');
      expect(result.normalized.status).toBe('pending');
    });
  });

  describe('estimateFee', () => {
    it('returns estimated fee', async () => {
      const fee = await provider.estimateFee();
      expect(fee.slow.fee).toBe('10000000');
      expect(fee.standard.fee).toBe('20000000');
      expect(fee.fast.fee).toBe('50000000');
    });
  });

  describe('Substrate-specific methods', () => {
    describe('getAccountInfo', () => {
      it('returns account info', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: buildAccountInfoHex({
              nonce: 42,
              consumers: 2,
              providers: 1,
              sufficients: 0,
              free: 50000000000n,
              reserved: 0n,
              frozen: 0n,
            }),
          }),
        });

        const result = await provider.getAccountInfo(validAddress);

        expect(result.nonce).toBe(42);
        expect(result.data.free).toBe(50000000000n);
      });
    });

    describe('getBlockNumber', () => {
      it('returns current block number', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: { number: '0x1000' },
          }),
        });

        const result = await provider.getBlockNumber();
        expect(result).toBe(4096);
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

        const result = await provider.getGenesisHash();
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

        const result = await provider.getRuntimeVersion();

        expect(result.specName).toBe('bittensor');
        expect(result.specVersion).toBe(153);
        expect(result.transactionVersion).toBe(1);
      });
    });

    describe('getBlockHash', () => {
      it('returns block hash by number', async () => {
        const blockHash = '0xabcdef123456';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: blockHash,
          }),
        });

        const result = await provider.getBlockHash(100);
        expect(result).toBe(blockHash);
      });
    });

    describe('getFinalizedHead', () => {
      it('returns finalized head hash', async () => {
        const finalizedHash = '0xfinalized123';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: finalizedHash,
          }),
        });

        const result = await provider.getFinalizedHead();
        expect(result).toBe(finalizedHash);
      });
    });
  });

  describe('contract operations', () => {
    it('throws ContractError for contractRead', async () => {
      await expect(provider.contractRead()).rejects.toThrow(ContractError);
      await expect(provider.contractRead()).rejects.toThrow('not supported');
    });

    it('throws ContractError for contractCall', async () => {
      await expect(provider.contractCall()).rejects.toThrow(ContractError);
    });

    it('throws ContractError for contractDeploy', async () => {
      await expect(provider.contractDeploy()).rejects.toThrow(ContractError);
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
  const bytes = new Uint8Array(64); // 4 u32s + 3 u128s

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
