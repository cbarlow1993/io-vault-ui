// packages/chains/tests/unit/svm/provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SvmChainProvider } from '../../../src/svm/provider.js';

describe('SvmChainProvider', () => {
  let provider: SvmChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new SvmChainProvider('solana');
  });

  it('initializes with valid chain alias', () => {
    expect(provider.chainAlias).toBe('solana');
    expect(provider.config.cluster).toBe('mainnet-beta');
    expect(provider.config.nativeCurrency.decimals).toBe(9);
  });

  it('initializes devnet with custom RPC', () => {
    const devnetProvider = new SvmChainProvider('solana-devnet', 'https://custom-rpc.com');
    expect(devnetProvider.chainAlias).toBe('solana-devnet');
    expect(devnetProvider.config.rpcUrl).toBe('https://custom-rpc.com');
  });

  describe('buildNativeTransfer', () => {
    it('creates correct transaction for SOL transfer', async () => {
      // Mock getRecentBlockhash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: {
              blockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
              lastValidBlockHeight: 123500,
            },
          },
        }),
      });

      const tx = await provider.buildNativeTransfer({
        from: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        to: 'Bq4n9F3QJzK4HLmP9LQyCnZtPSd8GjvT7ZLGAyRMwXwV',
        value: '1000000000', // 1 SOL
      });

      expect(tx.chainAlias).toBe('solana');
      expect(tx.raw).toBeDefined();
      expect(tx.raw.feePayer).toBe('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');
      expect(tx.raw.value).toBe('1000000000');
      expect(tx.raw.instructions).toHaveLength(1);
      expect(tx.raw.instructions[0].programId).toBe('11111111111111111111111111111111');
    });
  });

  describe('buildTokenTransfer', () => {
    it('creates correct transaction for SPL token transfer', async () => {
      // Mock getRecentBlockhash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: {
              blockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
              lastValidBlockHeight: 123500,
            },
          },
        }),
      });

      // Mock token account lookup for source
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 2,
          result: {
            context: { slot: 123456 },
            value: [
              {
                pubkey: 'SourceTokenAccountPubkey',
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        owner: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
                        tokenAmount: { amount: '100000000', decimals: 6 },
                      },
                    },
                  },
                  owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
              },
            ],
          },
        }),
      });

      // Mock token account lookup for destination
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 3,
          result: {
            context: { slot: 123456 },
            value: [
              {
                pubkey: 'DestTokenAccountPubkey',
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        owner: 'Bq4n9F3QJzK4HLmP9LQyCnZtPSd8GjvT7ZLGAyRMwXwV',
                        tokenAmount: { amount: '0', decimals: 6 },
                      },
                    },
                  },
                  owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
              },
            ],
          },
        }),
      });

      const tx = await provider.buildTokenTransfer({
        from: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        to: 'Bq4n9F3QJzK4HLmP9LQyCnZtPSd8GjvT7ZLGAyRMwXwV',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
        value: '1000000', // 1 USDC
      });

      expect(tx.chainAlias).toBe('solana');
      expect(tx.raw).toBeDefined();
      expect(tx.raw.instructions).toHaveLength(1);
      expect(tx.raw.instructions[0].programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    });
  });

  describe('decode', () => {
    it('decodes serialized transaction to normalised format', () => {
      const serialized = JSON.stringify({
        version: 'legacy',
        recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
        feePayer: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        instructions: [
          {
            programId: '11111111111111111111111111111111',
            accounts: [
              { pubkey: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', isSigner: true, isWritable: true },
              { pubkey: 'Bq4n9F3QJzK4HLmP9LQyCnZtPSd8GjvT7ZLGAyRMwXwV', isSigner: false, isWritable: true },
            ],
            data: 'AgAAAADh9QUAAAAAAA==',
          },
        ],
        value: '1000000000',
      });

      const normalised = provider.decode(serialized, 'normalised');

      expect(normalised.chainAlias).toBe('solana');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('SOL');
    });

    it('decodes to raw format', () => {
      const serialized = JSON.stringify({
        version: 'legacy',
        recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
        feePayer: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        instructions: [],
        value: '0',
      });

      const raw = provider.decode(serialized, 'raw');

      expect(raw._chain).toBe('svm');
      expect(raw.feePayer).toBe('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');
    });
  });

  describe('estimateFee', () => {
    it('returns fee estimate', async () => {
      // Mock getFeeForMessage
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: 5000, // 5000 lamports base fee
          },
        }),
      });

      const estimate = await provider.estimateFee();

      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();
      expect(typeof estimate.standard.fee).toBe('string');
      expect(estimate.standard.formattedFee).toContain('SOL');
    });
  });

  describe('getRecentBlockhash', () => {
    it('fetches and returns recent blockhash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: {
              blockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
              lastValidBlockHeight: 123500,
            },
          },
        }),
      });

      const result = await provider.getRecentBlockhash();

      expect(result.blockhash).toBe('GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi');
      expect(result.lastValidBlockHeight).toBe(123500);
    });
  });
});
