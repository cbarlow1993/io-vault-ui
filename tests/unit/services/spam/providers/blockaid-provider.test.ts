import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockaidProvider } from '@/src/services/spam/providers/blockaid-provider.js';
import type { TokenToClassify } from '@/src/services/spam/types.js';
import type { TokenScanResponse } from '@blockaid/client/resources/token';

// Mock the blockaid client
const mockTokenScan = vi.fn();
vi.mock('@/src/lib/clients.js', () => ({
  blockaidClient: () => ({
    token: {
      scan: mockTokenScan,
    },
  }),
}));

// Mock the logger
vi.mock('@/utils/powertools.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function createMockTokenScanResponse(overrides: Partial<TokenScanResponse> = {}): TokenScanResponse {
  return {
    address: '0x1234567890123456789012345678901234567890',
    chain: 'ethereum',
    result_type: 'Benign',
    malicious_score: '0.1',
    attack_types: {},
    fees: {},
    financial_stats: {},
    trading_limits: {},
    metadata: {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
    },
    ...overrides,
  } as TokenScanResponse;
}

describe('BlockaidProvider', () => {
  let provider: BlockaidProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BlockaidProvider();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('blockaid');
  });

  describe('classify', () => {
    describe('chain support', () => {
      it('should return null for unsupported chains', async () => {
        const token: TokenToClassify = {
          chain: 'unsupported-chain',
          network: 'mainnet',
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Token',
          symbol: 'TEST',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid).toBeNull();
        expect(mockTokenScan).not.toHaveBeenCalled();
      });

      it('should call API for supported EVM chains', async () => {
        const supportedChains = ['eth', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche-c', 'zksync-era', 'linea', 'scroll', 'blast'];
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

        for (const chain of supportedChains) {
          vi.clearAllMocks();
          const token: TokenToClassify = {
            chain,
            network: 'mainnet',
            address: '0x1234567890123456789012345678901234567890',
            name: 'Test Token',
            symbol: 'TEST',
            coingeckoId: null,
          };

          await provider.classify(token);

          expect(mockTokenScan).toHaveBeenCalled();
        }
      });

      it('should call API for supported non-EVM chains', async () => {
        const supportedChains = ['solana', 'sui', 'stellar', 'bitcoin', 'hedera'];
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

        for (const chain of supportedChains) {
          vi.clearAllMocks();
          const token: TokenToClassify = {
            chain,
            network: 'mainnet',
            address: 'some-address',
            name: 'Test Token',
            symbol: 'TEST',
            coingeckoId: null,
          };

          await provider.classify(token);

          expect(mockTokenScan).toHaveBeenCalled();
        }
      });

      it('should map chain aliases correctly', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

        const token: TokenToClassify = {
          chain: 'avalanche-c',
          network: 'mainnet',
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Token',
          symbol: 'TEST',
          coingeckoId: null,
        };

        await provider.classify(token);

        expect(mockTokenScan).toHaveBeenCalledWith({
          chain: 'avalanche',
          address: '0x1234567890123456789012345678901234567890',
        });
      });
    });

    describe('native tokens', () => {
      it('should return null for native tokens', async () => {
        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: 'native',
          name: 'Ethereum',
          symbol: 'ETH',
          coingeckoId: 'ethereum',
        };

        const result = await provider.classify(token);

        expect(result.blockaid).toBeNull();
        expect(mockTokenScan).not.toHaveBeenCalled();
      });
    });

    describe('successful API responses', () => {
      it('should classify benign tokens correctly', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Benign',
          malicious_score: '0.05',
          attack_types: {},
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x1234567890123456789012345678901234567890',
          name: 'USD Coin',
          symbol: 'USDC',
          coingeckoId: 'usd-coin',
        };

        const result = await provider.classify(token);

        expect(result.blockaid).not.toBeNull();
        expect(result.blockaid!.isMalicious).toBe(false);
        expect(result.blockaid!.isPhishing).toBe(false);
        expect(result.blockaid!.resultType).toBe('Benign');
        expect(result.blockaid!.riskScore).toBe(0.05);
        expect(result.blockaid!.attackTypes).toEqual([]);
      });

      it('should classify malicious tokens correctly', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Malicious',
          malicious_score: '0.95',
          attack_types: {
            honeypot: { score: '0.9' },
            rugpull: { score: '0.8' },
          },
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0xscam',
          name: 'Scam Token',
          symbol: 'SCAM',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid).not.toBeNull();
        expect(result.blockaid!.isMalicious).toBe(true);
        expect(result.blockaid!.resultType).toBe('Malicious');
        expect(result.blockaid!.riskScore).toBe(0.95);
        expect(result.blockaid!.attackTypes).toContain('honeypot');
        expect(result.blockaid!.attackTypes).toContain('rugpull');
      });

      it('should detect phishing from impersonator attack type', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Malicious',
          malicious_score: '0.9',
          attack_types: {
            impersonator: { score: '0.95' },
          },
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0xfake',
          name: 'Tether USD',
          symbol: 'USDT',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid!.isPhishing).toBe(true);
        expect(result.blockaid!.attackTypes).toContain('impersonator');
      });

      it('should detect phishing from phishing attack type', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Malicious',
          malicious_score: '0.85',
          attack_types: {
            phishing: { score: '0.9' },
          },
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0xphish',
          name: 'Claim Rewards',
          symbol: 'CLAIM',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid!.isPhishing).toBe(true);
      });

      it('should classify warning tokens correctly', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Warning',
          malicious_score: '0.5',
          attack_types: {
            high_sell_fee: { score: '0.7' },
          },
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0xwarning',
          name: 'Warning Token',
          symbol: 'WARN',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid!.isMalicious).toBe(false);
        expect(result.blockaid!.resultType).toBe('Warning');
        expect(result.blockaid!.attackTypes).toContain('high_sell_fee');
      });

      it('should classify spam tokens correctly', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
          result_type: 'Spam',
          malicious_score: '0.3',
          attack_types: {},
        }));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0xspam',
          name: 'Airdrop Token',
          symbol: 'AIR',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid!.isMalicious).toBe(false);
        expect(result.blockaid!.resultType).toBe('Spam');
      });

      it('should preserve raw response', async () => {
        const mockResponse = createMockTokenScanResponse({
          result_type: 'Benign',
          fees: { buy: 0, sell: 0.01 },
          financial_stats: { holders_count: 1000 },
        });
        mockTokenScan.mockResolvedValue(mockResponse);

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x123',
          name: 'Test',
          symbol: 'TEST',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid!.rawResponse).toEqual(mockResponse);
      });

      it('should set checkedAt timestamp', async () => {
        mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x123',
          name: 'Test',
          symbol: 'TEST',
          coingeckoId: null,
        };

        const before = new Date().toISOString();
        const result = await provider.classify(token);
        const after = new Date().toISOString();

        expect(result.blockaid!.checkedAt).toBeDefined();
        expect(result.blockaid!.checkedAt >= before).toBe(true);
        expect(result.blockaid!.checkedAt <= after).toBe(true);
      });

      describe('riskScore NaN handling', () => {
        it('should default riskScore to 0 when malicious_score is undefined', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: undefined as unknown as string,
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0);
          expect(Number.isNaN(result.blockaid!.riskScore)).toBe(false);
        });

        it('should default riskScore to 0 when malicious_score is null', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: null as unknown as string,
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0);
          expect(Number.isNaN(result.blockaid!.riskScore)).toBe(false);
        });

        it('should default riskScore to 0 when malicious_score is empty string', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: '',
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0);
          expect(Number.isNaN(result.blockaid!.riskScore)).toBe(false);
        });

        it('should default riskScore to 0 when malicious_score is non-numeric string', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: 'not-a-number',
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0);
          expect(Number.isNaN(result.blockaid!.riskScore)).toBe(false);
        });

        it('should correctly parse valid numeric malicious_score', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: '0.75',
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0.75);
        });

        it('should correctly parse zero malicious_score', async () => {
          mockTokenScan.mockResolvedValue(createMockTokenScanResponse({
            malicious_score: '0',
          }));

          const token: TokenToClassify = {
            chain: 'eth',
            network: 'mainnet',
            address: '0x123',
            name: 'Test',
            symbol: 'TEST',
            coingeckoId: null,
          };

          const result = await provider.classify(token);

          expect(result.blockaid!.riskScore).toBe(0);
        });
      });
    });

    describe('API error handling', () => {
      it('should return null on API error', async () => {
        mockTokenScan.mockRejectedValue(new Error('API rate limited'));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x123',
          name: 'Test',
          symbol: 'TEST',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid).toBeNull();
      });

      it('should log warning on API error', async () => {
        const { logger } = await import('@/utils/powertools.js');
        mockTokenScan.mockRejectedValue(new Error('Network timeout'));

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x123',
          name: 'Test',
          symbol: 'TEST',
          coingeckoId: null,
        };

        await provider.classify(token);

        expect(logger.warn).toHaveBeenCalledWith(
          'Blockaid token scan failed',
          expect.objectContaining({
            error: 'Network timeout',
            chain: 'eth',
            address: '0x123',
          })
        );
      });

      it('should handle non-Error exceptions', async () => {
        mockTokenScan.mockRejectedValue('string error');

        const token: TokenToClassify = {
          chain: 'eth',
          network: 'mainnet',
          address: '0x123',
          name: 'Test',
          symbol: 'TEST',
          coingeckoId: null,
        };

        const result = await provider.classify(token);

        expect(result.blockaid).toBeNull();
      });
    });
  });

  describe('classifyBatch', () => {
    it('should classify multiple tokens in parallel', async () => {
      mockTokenScan
        .mockResolvedValueOnce(createMockTokenScanResponse({ result_type: 'Benign', malicious_score: '0.1' }))
        .mockResolvedValueOnce(createMockTokenScanResponse({ result_type: 'Malicious', malicious_score: '0.9' }));

      const tokens: TokenToClassify[] = [
        { chain: 'eth', network: 'mainnet', address: '0xAAA', name: 'Token1', symbol: 'T1', coingeckoId: null },
        { chain: 'eth', network: 'mainnet', address: '0xBBB', name: 'Token2', symbol: 'T2', coingeckoId: null },
      ];

      const results = await provider.classifyBatch(tokens);

      expect(results.size).toBe(2);
      expect(results.get('0xaaa')?.blockaid?.resultType).toBe('Benign');
      expect(results.get('0xbbb')?.blockaid?.resultType).toBe('Malicious');
    });

    it('should handle mixed supported and unsupported chains', async () => {
      mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

      const tokens: TokenToClassify[] = [
        { chain: 'eth', network: 'mainnet', address: '0xAAA', name: 'Token1', symbol: 'T1', coingeckoId: null },
        { chain: 'unsupported', network: 'mainnet', address: '0xBBB', name: 'Token2', symbol: 'T2', coingeckoId: null },
      ];

      const results = await provider.classifyBatch(tokens);

      expect(results.size).toBe(2);
      expect(results.get('0xaaa')?.blockaid).not.toBeNull();
      expect(results.get('0xbbb')?.blockaid).toBeNull();
      expect(mockTokenScan).toHaveBeenCalledTimes(1);
    });

    it('should handle empty array', async () => {
      const results = await provider.classifyBatch([]);
      expect(results.size).toBe(0);
    });

    it('should lowercase addresses in result keys', async () => {
      mockTokenScan.mockResolvedValue(createMockTokenScanResponse());

      const tokens: TokenToClassify[] = [
        { chain: 'eth', network: 'mainnet', address: '0xAbCdEf', name: 'Token', symbol: 'T', coingeckoId: null },
      ];

      const results = await provider.classifyBatch(tokens);

      expect(results.has('0xabcdef')).toBe(true);
      expect(results.has('0xAbCdEf')).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      mockTokenScan
        .mockResolvedValueOnce(createMockTokenScanResponse())
        .mockRejectedValueOnce(new Error('API error'));

      const tokens: TokenToClassify[] = [
        { chain: 'eth', network: 'mainnet', address: '0xAAA', name: 'Token1', symbol: 'T1', coingeckoId: null },
        { chain: 'eth', network: 'mainnet', address: '0xBBB', name: 'Token2', symbol: 'T2', coingeckoId: null },
      ];

      const results = await provider.classifyBatch(tokens);

      expect(results.size).toBe(2);
      expect(results.get('0xaaa')?.blockaid).not.toBeNull();
      expect(results.get('0xbbb')?.blockaid).toBeNull();
    });
  });
});
