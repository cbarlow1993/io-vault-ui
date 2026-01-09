import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalanceService, type TokenBalanceOptions } from '@/src/services/balances/balance-service.js';
import type { AddressRepository, TokenHoldingRepository, TokenRepository } from '@/src/repositories/types.js';
import type { PricingService } from '@/src/services/balances/pricing-service.js';
import type { BalanceFetcher } from '@/src/services/balances/fetchers/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { ClassificationResult, SpamClassification } from '@/src/services/spam/types.js';
import { NotFoundError, InternalServerError } from '@iofinnet/errors-sdk';

// Mock repositories
function createMockAddressRepository() {
  return {
    findById: vi.fn(),
    findByAddressAndChain: vi.fn(),
    findByAddressAndChainAlias: vi.fn(),
    findByVaultId: vi.fn(),
    findByOrganisationId: vi.fn(),
    findBySubscriptionId: vi.fn(),
    findMonitoredByVaultId: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    setMonitored: vi.fn(),
    setUnmonitored: vi.fn(),
    addToken: vi.fn(),
    removeToken: vi.fn(),
    findTokensByAddressId: vi.fn(),
    deleteByVaultId: vi.fn(),
  } as unknown as AddressRepository;
}

function createMockTokenRepository() {
  return {
    findById: vi.fn(),
    findByChainAliasAndAddress: vi.fn(),
    findVerifiedByChainAlias: vi.fn(),
    findByCoingeckoIds: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
  } as unknown as TokenRepository;
}

function createMockTokenHoldingRepository() {
  return {
    findByAddressId: vi.fn(),
    findVisibleByAddressId: vi.fn(),
    upsert: vi.fn(),
    updateVisibility: vi.fn(),
    updateSpamOverride: vi.fn(),
  } as unknown as TokenHoldingRepository;
}

function createMockSpamClassificationService() {
  return {
    classifyToken: vi.fn(),
    classifyTokensBatch: vi.fn(),
    computeRiskSummary: vi.fn(),
  } as unknown as SpamClassificationService;
}

function createMockPricingService() {
  return {
    getPrices: vi.fn(),
  } as unknown as PricingService;
}

function createMockBalanceFetcher() {
  return {
    getChain: vi.fn().mockReturnValue('ethereum'),
    getNetwork: vi.fn().mockReturnValue('mainnet'),
    getNativeBalance: vi.fn(),
    getTokenBalances: vi.fn(),
  } as unknown as BalanceFetcher;
}

function createMockAddress(overrides: {
  id?: string;
  address?: string;
  chain_alias?: string;
  vault_id?: string;
  organisation_id?: string;
  is_monitored?: boolean;
} = {}) {
  return {
    id: overrides.id ?? 'addr-1',
    address: overrides.address ?? '0x123',
    chain_alias: overrides.chain_alias ?? 'ethereum',
    ecosystem: 'evm',
    vault_id: overrides.vault_id ?? 'vault-1',
    workspace_id: 'workspace-1',
    organisation_id: overrides.organisation_id ?? 'org-1',
    derivation_path: null,
    alias: null,
    is_monitored: overrides.is_monitored ?? false,
    subscription_id: null,
    monitored_at: null,
    unmonitored_at: null,
    last_reconciled_block: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe('BalanceService', () => {
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let tokenRepository: ReturnType<typeof createMockTokenRepository>;
  let tokenHoldingRepository: ReturnType<typeof createMockTokenHoldingRepository>;
  let pricingService: ReturnType<typeof createMockPricingService>;
  let balanceFetcher: ReturnType<typeof createMockBalanceFetcher>;
  let fetcherFactory: ReturnType<typeof vi.fn<(chain: string, network: string) => BalanceFetcher | null>>;
  let service: BalanceService;

  beforeEach(() => {
    addressRepository = createMockAddressRepository();
    tokenRepository = createMockTokenRepository();
    tokenHoldingRepository = createMockTokenHoldingRepository();
    pricingService = createMockPricingService();
    balanceFetcher = createMockBalanceFetcher();
    fetcherFactory = vi.fn().mockReturnValue(balanceFetcher);

    service = new BalanceService(
      addressRepository,
      tokenRepository,
      tokenHoldingRepository,
      pricingService,
      fetcherFactory
    );
  });

  describe('getBalances', () => {
    it('should throw NotFoundError when address not found', async () => {
      vi.mocked(addressRepository.findById).mockResolvedValue(null);

      await expect(service.getBalances('non-existent-id')).rejects.toThrow(NotFoundError);
      await expect(service.getBalances('non-existent-id')).rejects.toThrow('Address not found: non-existent-id');
    });

    it('should throw InternalServerError when no fetcher for chain', async () => {
      vi.mocked(addressRepository.findById).mockResolvedValue(createMockAddress({ chain_alias: 'unknown-chain' }));
      fetcherFactory.mockReturnValue(null);

      await expect(service.getBalances('addr-1')).rejects.toThrow(InternalServerError);
      await expect(service.getBalances('addr-1')).rejects.toThrow('No balance fetcher for chain: unknown-chain');
    });

    it('should return enriched balances with prices', async () => {
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([
        {
          id: 'token-1',
          chainAlias: 'eth' as ChainAlias,
          address: '0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoUri: 'https://example.com/usdc.png',
          coingeckoId: 'usd-coin',
          isVerified: true,
          isSpam: false,
          spamClassification: null,
          classificationUpdatedAt: null,
          classificationTtlHours: 720,
          needsClassification: false,
          classificationAttempts: 0,
          classificationError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000', // 1 ETH
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([
        {
          address: '0x123abc',
          tokenAddress: '0xusdc',
          isNative: false,
          balance: '1000000', // 1 USDC
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
      ]);

      vi.mocked(pricingService.getPrices).mockResolvedValue(
        new Map([
          ['ethereum', { coingeckoId: 'ethereum', price: 2000, priceChange24h: 5.2, marketCap: null, isStale: false }],
          ['usd-coin', { coingeckoId: 'usd-coin', price: 1, priceChange24h: 0.01, marketCap: null, isStale: false }],
        ])
      );

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(2);

      // Check native ETH balance
      const ethBalance = result.find((b) => b.isNative);
      expect(ethBalance).toBeDefined();
      expect(ethBalance!.symbol).toBe('ETH');
      expect(ethBalance!.balance).toBe('1000000000000000000');
      expect(ethBalance!.formattedBalance).toBe('1');
      expect(ethBalance!.usdPrice).toBe(2000);
      expect(ethBalance!.usdValue).toBe(2000);
      expect(ethBalance!.priceChange24h).toBe(5.2);
      expect(ethBalance!.isPriceStale).toBe(false);

      // Check USDC balance
      const usdcBalance = result.find((b) => b.symbol === 'USDC');
      expect(usdcBalance).toBeDefined();
      expect(usdcBalance!.tokenAddress).toBe('0xusdc');
      expect(usdcBalance!.balance).toBe('1000000');
      expect(usdcBalance!.formattedBalance).toBe('1');
      expect(usdcBalance!.usdPrice).toBe(1);
      expect(usdcBalance!.usdValue).toBe(1);
      expect(usdcBalance!.logoUri).toBe('https://example.com/usdc.png');
    });

    it('should filter out zero balances', async () => {
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '0',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(0);
    });

    it('should combine holdings with verified tokens', async () => {
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);

      // User has a custom token holding
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([
        {
          id: 'holding-1',
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xcustomtoken',
          isNative: false,
          balance: '100',
          decimals: 18,
          name: 'Custom Token',
          symbol: 'CUST',
          visibility: 'visible',
          userSpamOverride: null,
          overrideUpdatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // System also knows about verified tokens
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([
        {
          id: 'token-1',
          chainAlias: 'eth' as ChainAlias,
          address: '0xcustomtoken', // Same token, with coingecko info
          name: 'Custom Token',
          symbol: 'CUST',
          decimals: 18,
          logoUri: 'https://example.com/cust.png',
          coingeckoId: 'custom-token',
          isVerified: true,
          isSpam: false,
          spamClassification: null,
          classificationUpdatedAt: null,
          classificationTtlHours: 720,
          needsClassification: false,
          classificationAttempts: 0,
          classificationError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '0',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([
        {
          address: '0x123abc',
          tokenAddress: '0xcustomtoken',
          isNative: false,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'CUST',
          name: 'Custom Token',
        },
      ]);

      vi.mocked(pricingService.getPrices).mockResolvedValue(
        new Map([
          ['custom-token', { coingeckoId: 'custom-token', price: 10, priceChange24h: null, marketCap: null, isStale: false }],
        ])
      );

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(1);
      const tokenBalance = result[0]!;
      expect(tokenBalance.symbol).toBe('CUST');
      expect(tokenBalance.logoUri).toBe('https://example.com/cust.png');
      expect(tokenBalance.coingeckoId).toBe('custom-token');
      expect(tokenBalance.usdPrice).toBe(10);
    });

    it('should handle missing prices gracefully', async () => {
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map()); // No prices

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.usdPrice).toBeNull();
      expect(result[0]!.usdValue).toBeNull();
      expect(result[0]!.isPriceStale).toBe(true);
    });
  });

  describe('formatBalance', () => {
    it('should format balance with correct decimals', async () => {
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      // Test different balance formats
      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1234567890123456789', // 1.234567890123456789 ETH
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.formattedBalance).toBe('1.23456789'); // Truncated to 8 decimals
    });
  });

  describe('getNativeCoingeckoId', () => {
    it.each([
      ['ethereum', 'ethereum'],
      ['polygon', 'polygon-ecosystem-token'],
      ['arbitrum', 'ethereum'],
      ['optimism', 'ethereum'],
      ['base', 'ethereum'],
      ['avalanche', 'avalanche-2'],
      ['bsc', 'binancecoin'],
      ['solana', 'solana'],
      ['bitcoin', 'bitcoin'],
      ['tron', 'tron'],
      ['xrp', 'ripple'],
    ])('should map %s to coingecko id %s', async (chain_alias, expectedId) => {
      const address = createMockAddress({ address: '0x123abc', chain_alias });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'NATIVE',
        name: 'Native',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      await service.getBalances('addr-1');

      expect(pricingService.getPrices).toHaveBeenCalledWith([expectedId], 'usd');
    });
  });

  describe('custom currency', () => {
    it('should use configured currency for price requests', async () => {
      const customService = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'eur' }
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      await customService.getBalances('addr-1');

      expect(pricingService.getPrices).toHaveBeenCalledWith(['ethereum'], 'eur');
    });
  });

  describe('spam analysis integration', () => {
    let spamClassificationService: ReturnType<typeof createMockSpamClassificationService>;

    beforeEach(() => {
      spamClassificationService = createMockSpamClassificationService();
    });

    function createDefaultClassification(): SpamClassification {
      return {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: 100 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 365,
          isNewContract: false,
          holderDistribution: 'normal',
        },
      };
    }

    it('should return spamAnalysis as null when spam classification service is not provided', async () => {
      // Service created without spam classification service (default in beforeEach)
      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const result = await service.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.spamAnalysis).toBeNull();
    });

    it('should include spamAnalysis when spam classification service is provided', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const classification = createDefaultClassification();
      const classificationResult: ClassificationResult = {
        tokenAddress: 'native',
        classification,
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
        new Map([['native', classificationResult]])
      );

      vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
        riskLevel: 'safe',
        reasons: [],
      });

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.spamAnalysis).not.toBeNull();
      expect(result[0]!.spamAnalysis!.summary.riskLevel).toBe('safe');
      expect(result[0]!.spamAnalysis!.coingecko.isListed).toBe(true);
    });

    it('should classify both native and token balances', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([
        {
          id: 'token-1',
          chainAlias: 'eth' as ChainAlias,
          address: '0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoUri: null,
          coingeckoId: 'usd-coin',
          isVerified: true,
          isSpam: false,
          spamClassification: null,
          classificationUpdatedAt: null,
          classificationTtlHours: 720,
          needsClassification: false,
          classificationAttempts: 0,
          classificationError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([
        {
          address: '0x123abc',
          tokenAddress: '0xusdc',
          isNative: false,
          balance: '1000000',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
      ]);

      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const nativeClassification = createDefaultClassification();
      const tokenClassification = createDefaultClassification();
      tokenClassification.coingecko.marketCapRank = 5;

      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
        new Map([
          ['native', { tokenAddress: 'native', classification: nativeClassification, updatedAt: new Date() }],
          ['0xusdc', { tokenAddress: '0xusdc', classification: tokenClassification, updatedAt: new Date() }],
        ])
      );

      vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
        riskLevel: 'safe',
        reasons: [],
      });

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(2);

      // Verify classifyTokensBatch was called with both native and token
      expect(spamClassificationService.classifyTokensBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ address: 'native', name: 'Ethereum', symbol: 'ETH' }),
          expect.objectContaining({ address: '0xusdc', name: 'USD Coin', symbol: 'USDC' }),
        ])
      );

      // Both should have spam analysis
      expect(result[0]!.spamAnalysis).not.toBeNull();
      expect(result[1]!.spamAnalysis).not.toBeNull();
    });

    it('should respect user spam override from holdings', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);

      // User has marked this token as trusted
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([
        {
          id: 'holding-1',
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xsuspicious',
          isNative: false,
          balance: '100',
          decimals: 18,
          name: 'Suspicious Token',
          symbol: 'SUS',
          visibility: 'visible',
          userSpamOverride: 'trusted',
          overrideUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '0',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([
        {
          address: '0x123abc',
          tokenAddress: '0xsuspicious',
          isNative: false,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'SUS',
          name: 'Suspicious Token',
        },
      ]);

      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      // The token would normally be flagged as warning
      const suspiciousClassification: SpamClassification = {
        blockaid: null,
        coingecko: { isListed: false, marketCapRank: null },
        heuristics: {
          suspiciousName: true,
          namePatterns: ['suspicious'],
          isUnsolicited: true,
          contractAgeDays: 5,
          isNewContract: true,
          holderDistribution: 'suspicious',
        },
      };

      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
        new Map([
          ['0xsuspicious', { tokenAddress: '0xsuspicious', classification: suspiciousClassification, updatedAt: new Date() }],
        ])
      );

      // But user override makes it trusted
      vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
        riskLevel: 'safe',
        reasons: ['User marked as trusted'],
      });

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.spamAnalysis).not.toBeNull();
      expect(result[0]!.spamAnalysis!.userOverride).toBe('trusted');
      expect(result[0]!.spamAnalysis!.summary.riskLevel).toBe('safe');
      expect(result[0]!.spamAnalysis!.summary.reasons).toContain('User marked as trusted');

      // Verify computeRiskSummary was called with the user override
      expect(spamClassificationService.computeRiskSummary).toHaveBeenCalledWith(
        suspiciousClassification,
        'trusted'
      );
    });

    it('should handle missing classification result for a token', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      // Classification service returns empty map (no results)
      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(new Map());

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(1);
      // When classification is not available, spamAnalysis should be null
      expect(result[0]!.spamAnalysis).toBeNull();
    });

    it('should include classification metadata in spamAnalysis', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const classificationDate = new Date('2024-06-15T10:30:00Z');
      const classification: SpamClassification = {
        blockaid: {
          isMalicious: false,
          isPhishing: false,
          riskScore: 0.1,
          attackTypes: [],
          checkedAt: '2024-06-15T10:00:00Z',
          resultType: 'Benign',
          rawResponse: null,
        },
        coingecko: { isListed: true, marketCapRank: 2 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 1000,
          isNewContract: false,
          holderDistribution: 'normal',
        },
      };

      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
        new Map([
          ['native', { tokenAddress: 'native', classification, updatedAt: classificationDate }],
        ])
      );

      vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
        riskLevel: 'safe',
        reasons: [],
      });

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(1);
      const spamAnalysis = result[0]!.spamAnalysis;
      expect(spamAnalysis).not.toBeNull();

      // Verify all classification data is included
      expect(spamAnalysis!.blockaid).toEqual(classification.blockaid);
      expect(spamAnalysis!.coingecko).toEqual(classification.coingecko);
      expect(spamAnalysis!.heuristics).toEqual(classification.heuristics);
      expect(spamAnalysis!.classificationUpdatedAt).toBe(classificationDate.toISOString());
      expect(spamAnalysis!.userOverride).toBeNull();
    });

    it('should handle user override as spam', async () => {
      const serviceWithSpam = new BalanceService(
        addressRepository,
        tokenRepository,
        tokenHoldingRepository,
        pricingService,
        fetcherFactory,
        { currency: 'usd' },
        spamClassificationService
      );

      const address = createMockAddress({ address: '0x123abc' });

      vi.mocked(addressRepository.findById).mockResolvedValue(address);

      // User has marked this token as spam
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([
        {
          id: 'holding-1',
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xtoken',
          isNative: false,
          balance: '100',
          decimals: 18,
          name: 'Some Token',
          symbol: 'TOK',
          visibility: 'visible',
          userSpamOverride: 'spam',
          overrideUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '0',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([
        {
          address: '0x123abc',
          tokenAddress: '0xtoken',
          isNative: false,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'TOK',
          name: 'Some Token',
        },
      ]);

      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const classification = createDefaultClassification();

      vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
        new Map([
          ['0xtoken', { tokenAddress: '0xtoken', classification, updatedAt: new Date() }],
        ])
      );

      vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
        riskLevel: 'danger',
        reasons: ['User marked as spam'],
      });

      const result = await serviceWithSpam.getBalances('addr-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.spamAnalysis!.userOverride).toBe('spam');
      expect(result[0]!.spamAnalysis!.summary.riskLevel).toBe('danger');

      expect(spamClassificationService.computeRiskSummary).toHaveBeenCalledWith(
        classification,
        'spam'
      );
    });

    describe('native token spam analysis', () => {
      it('applies user override for native token correctly when tokenAddress is null', async () => {
        const serviceWithSpam = new BalanceService(
          addressRepository,
          tokenRepository,
          tokenHoldingRepository,
          pricingService,
          fetcherFactory,
          { currency: 'usd' },
          spamClassificationService
        );

        const address = createMockAddress({ address: '0x123abc' });

        vi.mocked(addressRepository.findById).mockResolvedValue(address);

        // Setup: native token holding has userSpamOverride = 'trusted'
        // Native tokens are stored with tokenAddress = null
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([
          {
            id: 'holding-1',
            addressId: 'addr-1',
            chainAlias: 'eth' as ChainAlias,
            tokenAddress: null, // Native token stored as null
            isNative: true,
            balance: '1000000000000000000',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
            visibility: 'visible',
            userSpamOverride: 'trusted', // User marked as trusted
            overrideUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        // Mock balance fetcher to return native balance with tokenAddress = null
        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // Mock spam classification service
        const classification = createDefaultClassification();
        vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
          new Map([
            ['native', { tokenAddress: 'native', classification, updatedAt: new Date() }],
          ])
        );

        vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
          riskLevel: 'safe',
          reasons: ['User marked as trusted'],
        });

        const balances = await serviceWithSpam.getBalances('addr-1');

        const nativeBalance = balances.find(b => b.isNative);
        expect(nativeBalance).toBeDefined();
        expect(nativeBalance?.spamAnalysis).not.toBeNull();
        expect(nativeBalance?.spamAnalysis?.userOverride).toBe('trusted');

        // Verify computeRiskSummary was called with the correct user override
        expect(spamClassificationService.computeRiskSummary).toHaveBeenCalledWith(
          classification,
          'trusted'
        );
      });

      it('applies user override for native token when balance has isNative=true but tokenAddress varies', async () => {
        // This test verifies that the lookup uses isNative flag, not just tokenAddress
        // The holdingsMap stores native token with null key, but the balance object's
        // tokenAddress might vary (null, undefined, or something else from fetcher).
        // We should use the isNative flag to determine the lookup key.
        const serviceWithSpam = new BalanceService(
          addressRepository,
          tokenRepository,
          tokenHoldingRepository,
          pricingService,
          fetcherFactory,
          { currency: 'usd' },
          spamClassificationService
        );

        const address = createMockAddress({ address: '0x123abc' });

        vi.mocked(addressRepository.findById).mockResolvedValue(address);

        // Setup: native token holding stored with tokenAddress = null
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([
          {
            id: 'holding-1',
            addressId: 'addr-1',
            chainAlias: 'eth' as ChainAlias,
            tokenAddress: null, // Native token stored as null in DB
            isNative: true,
            balance: '1000000000000000000',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
            visibility: 'visible',
            userSpamOverride: 'trusted',
            overrideUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        // Mock balance fetcher - native balance with isNative=true
        // The key insight: balance.isNative should be used for lookup, not tokenAddress
        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        const classification = createDefaultClassification();
        vi.mocked(spamClassificationService.classifyTokensBatch).mockResolvedValue(
          new Map([
            ['native', { tokenAddress: 'native', classification, updatedAt: new Date() }],
          ])
        );

        vi.mocked(spamClassificationService.computeRiskSummary).mockReturnValue({
          riskLevel: 'safe',
          reasons: ['User marked as trusted'],
        });

        const balances = await serviceWithSpam.getBalances('addr-1');

        const nativeBalance = balances.find(b => b.isNative);
        expect(nativeBalance).toBeDefined();
        expect(nativeBalance?.spamAnalysis).not.toBeNull();
        // This is the critical assertion - user override must be found
        expect(nativeBalance?.spamAnalysis?.userOverride).toBe('trusted');
      });
    });
  });

  describe('getBalancesByChainAndAddress', () => {
    it('should throw NotFoundError when address not found', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(service.getBalancesByChainAndAddress('ethereum', '0x123')).rejects.toThrow(NotFoundError);
      await expect(service.getBalancesByChainAndAddress('ethereum', '0x123')).rejects.toThrow(
        'Address not found: 0x123 on chain ethereum'
      );
    });

    it('should return enriched balances for valid chain and address', async () => {
      const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
      vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
      vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

      vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
        address: '0x123abc',
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
      vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

      const result = await service.getBalancesByChainAndAddress('ethereum', '0x123abc');

      expect(result).toHaveLength(1);
      expect(result[0]!.symbol).toBe('ETH');
      expect(result[0]!.isNative).toBe(true);
    });

    describe('TokenBalanceOptions', () => {
      it('should accept options parameter with all properties', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        // When includeHidden: true, findByAddressId is called
        vi.mocked(tokenHoldingRepository.findByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        const options: TokenBalanceOptions = {
          includeHidden: true,
          showSpam: false,
          sortBy: 'balance',
          sortOrder: 'desc',
        };

        // Should not throw with valid options
        const result = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', options);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept partial options', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        // Mock both methods since different options use different ones
        vi.mocked(tokenHoldingRepository.findByAddressId).mockResolvedValue([]);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // Test with only includeHidden
        const result1 = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { includeHidden: true });
        expect(result1).toBeDefined();

        // Test with only showSpam
        const result2 = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { showSpam: true });
        expect(result2).toBeDefined();

        // Test with only sortBy
        const result3 = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { sortBy: 'usdValue' });
        expect(result3).toBeDefined();

        // Test with only sortOrder
        const result4 = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { sortOrder: 'asc' });
        expect(result4).toBeDefined();
      });

      it('should use findByAddressId when includeHidden is true', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        vi.mocked(tokenHoldingRepository.findByAddressId).mockResolvedValue([]);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '0',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { includeHidden: true });

        expect(tokenHoldingRepository.findByAddressId).toHaveBeenCalledWith('addr-1');
        expect(tokenHoldingRepository.findVisibleByAddressId).not.toHaveBeenCalled();
      });

      it('should use findVisibleByAddressId when includeHidden is false or undefined', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        vi.mocked(tokenHoldingRepository.findByAddressId).mockResolvedValue([]);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '0',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // Test with includeHidden: false
        await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { includeHidden: false });
        expect(tokenHoldingRepository.findVisibleByAddressId).toHaveBeenCalledWith('addr-1');

        vi.clearAllMocks();
        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);
        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '0',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });
        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // Test with no options (undefined)
        await service.getBalancesByChainAndAddress('ethereum', '0x123abc');
        expect(tokenHoldingRepository.findVisibleByAddressId).toHaveBeenCalledWith('addr-1');
      });

      it('should accept sortBy values: balance, usdValue, symbol', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // All sortBy values should be accepted without error
        const sortByValues: TokenBalanceOptions['sortBy'][] = ['balance', 'usdValue', 'symbol'];

        for (const sortBy of sortByValues) {
          const result = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { sortBy });
          expect(result).toBeDefined();
        }
      });

      it('should accept sortOrder values: asc, desc', async () => {
        const address = createMockAddress({ address: '0x123abc', chain_alias: 'ethereum' });

        vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(address);
        vi.mocked(tokenHoldingRepository.findVisibleByAddressId).mockResolvedValue([]);
        vi.mocked(tokenRepository.findVerifiedByChainAlias).mockResolvedValue([]);

        vi.mocked(balanceFetcher.getNativeBalance).mockResolvedValue({
          address: '0x123abc',
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ethereum',
        });

        vi.mocked(balanceFetcher.getTokenBalances).mockResolvedValue([]);
        vi.mocked(pricingService.getPrices).mockResolvedValue(new Map());

        // All sortOrder values should be accepted without error
        const sortOrderValues: TokenBalanceOptions['sortOrder'][] = ['asc', 'desc'];

        for (const sortOrder of sortOrderValues) {
          const result = await service.getBalancesByChainAndAddress('ethereum', '0x123abc', { sortOrder });
          expect(result).toBeDefined();
        }
      });
    });
  });

  describe('spam filtering helpers', () => {
    function createEnrichedBalance(overrides: Partial<import('@/src/services/balances/balance-service.js').EnrichedBalance> = {}): import('@/src/services/balances/balance-service.js').EnrichedBalance {
      return {
        tokenAddress: '0xtoken',
        isNative: false,
        symbol: 'TOKEN',
        name: 'Test Token',
        decimals: 18,
        balance: '1000000000000000000',
        formattedBalance: '1',
        usdPrice: 100,
        usdValue: 100,
        priceChange24h: null,
        isPriceStale: false,
        logoUri: null,
        coingeckoId: null,
        spamAnalysis: null,
        ...overrides,
      };
    }

    function createSpamAnalysis(overrides: Partial<import('@/src/services/spam/types.js').SpamAnalysis> = {}): import('@/src/services/spam/types.js').SpamAnalysis {
      return {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: 100 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 365,
          isNewContract: false,
          holderDistribution: 'normal',
        },
        userOverride: null,
        classificationUpdatedAt: new Date().toISOString(),
        summary: { riskLevel: 'safe', reasons: [] },
        ...overrides,
      };
    }

    describe('filterSpamBalances', () => {
      it('should return all balances when showSpam is true', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'SAFE' }),
          createEnrichedBalance({
            symbol: 'SPAM',
            spamAnalysis: createSpamAnalysis({
              summary: { riskLevel: 'danger', reasons: ['Detected as spam'] },
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, true);

        expect(result).toHaveLength(2);
        expect(result.map(b => b.symbol)).toEqual(['SAFE', 'SPAM']);
      });

      it('should filter out spam tokens when showSpam is false', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'SAFE' }),
          createEnrichedBalance({
            symbol: 'SPAM',
            spamAnalysis: createSpamAnalysis({
              summary: { riskLevel: 'danger', reasons: ['Detected as spam'] },
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe('SAFE');
      });

      it('should include tokens without spam classification', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'NO_CLASSIFICATION', spamAnalysis: null }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe('NO_CLASSIFICATION');
      });

      it('should include user-trusted tokens even if marked as spam', () => {
        const balances = [
          createEnrichedBalance({
            symbol: 'USER_TRUSTED',
            spamAnalysis: createSpamAnalysis({
              userOverride: 'trusted',
              summary: { riskLevel: 'danger', reasons: ['Would be spam but user trusts it'] },
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe('USER_TRUSTED');
      });

      it('should filter out user-marked spam tokens', () => {
        const balances = [
          createEnrichedBalance({
            symbol: 'USER_SPAM',
            spamAnalysis: createSpamAnalysis({
              userOverride: 'spam',
              summary: { riskLevel: 'safe', reasons: [] }, // System says safe but user marked as spam
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(0);
      });

      it('should prioritize user override over summary classification', () => {
        const balances = [
          // User trusted but system says danger
          createEnrichedBalance({
            symbol: 'TRUSTED_BY_USER',
            spamAnalysis: createSpamAnalysis({
              userOverride: 'trusted',
              summary: { riskLevel: 'danger', reasons: ['System detected spam'] },
            }),
          }),
          // User marked spam but system says safe
          createEnrichedBalance({
            symbol: 'SPAM_BY_USER',
            spamAnalysis: createSpamAnalysis({
              userOverride: 'spam',
              summary: { riskLevel: 'safe', reasons: [] },
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe('TRUSTED_BY_USER');
      });

      it('should include tokens with safe or warning risk levels', () => {
        const balances = [
          createEnrichedBalance({
            symbol: 'SAFE_TOKEN',
            spamAnalysis: createSpamAnalysis({
              summary: { riskLevel: 'safe', reasons: [] },
            }),
          }),
          createEnrichedBalance({
            symbol: 'WARNING_TOKEN',
            spamAnalysis: createSpamAnalysis({
              summary: { riskLevel: 'warning', reasons: ['Minor concerns'] },
            }),
          }),
          createEnrichedBalance({
            symbol: 'DANGER_TOKEN',
            spamAnalysis: createSpamAnalysis({
              summary: { riskLevel: 'danger', reasons: ['Major concerns'] },
            }),
          }),
        ];

        const result = service.filterSpamBalances(balances, false);

        expect(result).toHaveLength(2);
        expect(result.map(b => b.symbol)).toEqual(['SAFE_TOKEN', 'WARNING_TOKEN']);
      });
    });

    describe('computeEffectiveSpamStatus', () => {
      it('should return unknown when spamAnalysis is null', () => {
        const balance = createEnrichedBalance({ spamAnalysis: null });

        const result = service.computeEffectiveSpamStatus(balance);

        expect(result).toBe('unknown');
      });

      it('should return trusted when userOverride is trusted', () => {
        const balance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: 'trusted',
            summary: { riskLevel: 'danger', reasons: ['System says spam'] },
          }),
        });

        const result = service.computeEffectiveSpamStatus(balance);

        expect(result).toBe('trusted');
      });

      it('should return spam when userOverride is spam', () => {
        const balance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: 'spam',
            summary: { riskLevel: 'safe', reasons: [] },
          }),
        });

        const result = service.computeEffectiveSpamStatus(balance);

        expect(result).toBe('spam');
      });

      it('should return spam when summary riskLevel is danger and no user override', () => {
        const balance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: null,
            summary: { riskLevel: 'danger', reasons: ['Detected as spam'] },
          }),
        });

        const result = service.computeEffectiveSpamStatus(balance);

        expect(result).toBe('spam');
      });

      it('should return unknown when riskLevel is safe or warning and no user override', () => {
        const safeBalance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: null,
            summary: { riskLevel: 'safe', reasons: [] },
          }),
        });

        const warningBalance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: null,
            summary: { riskLevel: 'warning', reasons: ['Minor warning'] },
          }),
        });

        expect(service.computeEffectiveSpamStatus(safeBalance)).toBe('unknown');
        expect(service.computeEffectiveSpamStatus(warningBalance)).toBe('unknown');
      });

      it('should prioritize user override over summary classification', () => {
        // User says trusted, system says danger
        const trustedBalance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: 'trusted',
            summary: { riskLevel: 'danger', reasons: ['System detected spam'] },
          }),
        });

        // User says spam, system says safe
        const spamBalance = createEnrichedBalance({
          spamAnalysis: createSpamAnalysis({
            userOverride: 'spam',
            summary: { riskLevel: 'safe', reasons: [] },
          }),
        });

        expect(service.computeEffectiveSpamStatus(trustedBalance)).toBe('trusted');
        expect(service.computeEffectiveSpamStatus(spamBalance)).toBe('spam');
      });
    });
  });

  describe('sortBalances', () => {
    function createEnrichedBalance(overrides: Partial<import('@/src/services/balances/balance-service.js').EnrichedBalance> = {}): import('@/src/services/balances/balance-service.js').EnrichedBalance {
      return {
        tokenAddress: '0xtoken',
        isNative: false,
        symbol: 'TOKEN',
        name: 'Test Token',
        decimals: 18,
        balance: '1000000000000000000',
        formattedBalance: '1',
        usdPrice: 100,
        usdValue: 100,
        priceChange24h: null,
        isPriceStale: false,
        logoUri: null,
        coingeckoId: null,
        spamAnalysis: null,
        ...overrides,
      };
    }

    describe('sorting by balance', () => {
      it('should sort balances in ascending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'HIGH', balance: '3000000000000000000' }),
          createEnrichedBalance({ symbol: 'LOW', balance: '1000000000000000000' }),
          createEnrichedBalance({ symbol: 'MID', balance: '2000000000000000000' }),
        ];

        const result = service.sortBalances(balances, 'balance', 'asc');

        expect(result.map(b => b.symbol)).toEqual(['LOW', 'MID', 'HIGH']);
      });

      it('should sort balances in descending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'LOW', balance: '1000000000000000000' }),
          createEnrichedBalance({ symbol: 'HIGH', balance: '3000000000000000000' }),
          createEnrichedBalance({ symbol: 'MID', balance: '2000000000000000000' }),
        ];

        const result = service.sortBalances(balances, 'balance', 'desc');

        expect(result.map(b => b.symbol)).toEqual(['HIGH', 'MID', 'LOW']);
      });

      it('should handle very large BigInt balances correctly', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'HUGE', balance: '999999999999999999999999999999' }),
          createEnrichedBalance({ symbol: 'SMALL', balance: '1' }),
          createEnrichedBalance({ symbol: 'MEDIUM', balance: '1000000000000000000000' }),
        ];

        const result = service.sortBalances(balances, 'balance', 'desc');

        expect(result.map(b => b.symbol)).toEqual(['HUGE', 'MEDIUM', 'SMALL']);
      });

      it('should handle equal balances', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'A', balance: '1000000000000000000' }),
          createEnrichedBalance({ symbol: 'B', balance: '1000000000000000000' }),
        ];

        const result = service.sortBalances(balances, 'balance', 'asc');

        // Both have same balance, order should be stable
        expect(result).toHaveLength(2);
        expect(result.map(b => b.balance)).toEqual(['1000000000000000000', '1000000000000000000']);
      });
    });

    describe('sorting by usdValue', () => {
      it('should sort by usdValue in ascending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'HIGH', usdValue: 1000 }),
          createEnrichedBalance({ symbol: 'LOW', usdValue: 100 }),
          createEnrichedBalance({ symbol: 'MID', usdValue: 500 }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'asc');

        expect(result.map(b => b.symbol)).toEqual(['LOW', 'MID', 'HIGH']);
      });

      it('should sort by usdValue in descending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'LOW', usdValue: 100 }),
          createEnrichedBalance({ symbol: 'HIGH', usdValue: 1000 }),
          createEnrichedBalance({ symbol: 'MID', usdValue: 500 }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'desc');

        expect(result.map(b => b.symbol)).toEqual(['HIGH', 'MID', 'LOW']);
      });

      it('should sort null usdValues last in ascending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'NULL', usdValue: null }),
          createEnrichedBalance({ symbol: 'LOW', usdValue: 100 }),
          createEnrichedBalance({ symbol: 'HIGH', usdValue: 1000 }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'asc');

        expect(result.map(b => b.symbol)).toEqual(['LOW', 'HIGH', 'NULL']);
      });

      it('should sort null usdValues last in descending order', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'NULL', usdValue: null }),
          createEnrichedBalance({ symbol: 'LOW', usdValue: 100 }),
          createEnrichedBalance({ symbol: 'HIGH', usdValue: 1000 }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'desc');

        expect(result.map(b => b.symbol)).toEqual(['HIGH', 'LOW', 'NULL']);
      });

      it('should handle multiple null usdValues', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'NULL1', usdValue: null }),
          createEnrichedBalance({ symbol: 'VALUE', usdValue: 100 }),
          createEnrichedBalance({ symbol: 'NULL2', usdValue: null }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'desc');

        expect(result[0]!.symbol).toBe('VALUE');
        // Null values should be at the end
        expect(result.slice(1).every(b => b.usdValue === null)).toBe(true);
      });

      it('should handle zero usdValue correctly', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'ZERO', usdValue: 0 }),
          createEnrichedBalance({ symbol: 'NULL', usdValue: null }),
          createEnrichedBalance({ symbol: 'POSITIVE', usdValue: 100 }),
        ];

        const result = service.sortBalances(balances, 'usdValue', 'asc');

        // Zero should be first (smallest value), then positive, null is always last
        expect(result.map(b => b.symbol)).toEqual(['ZERO', 'POSITIVE', 'NULL']);
      });
    });

    describe('sorting by symbol', () => {
      it('should sort by symbol in ascending order (A-Z)', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'USDC' }),
          createEnrichedBalance({ symbol: 'BTC' }),
          createEnrichedBalance({ symbol: 'ETH' }),
        ];

        const result = service.sortBalances(balances, 'symbol', 'asc');

        expect(result.map(b => b.symbol)).toEqual(['BTC', 'ETH', 'USDC']);
      });

      it('should sort by symbol in descending order (Z-A)', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'BTC' }),
          createEnrichedBalance({ symbol: 'USDC' }),
          createEnrichedBalance({ symbol: 'ETH' }),
        ];

        const result = service.sortBalances(balances, 'symbol', 'desc');

        expect(result.map(b => b.symbol)).toEqual(['USDC', 'ETH', 'BTC']);
      });

      it('should sort case-insensitively', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'usdc' }),
          createEnrichedBalance({ symbol: 'BTC' }),
          createEnrichedBalance({ symbol: 'Eth' }),
        ];

        const result = service.sortBalances(balances, 'symbol', 'asc');

        // localeCompare with default options is case-insensitive
        expect(result.map(b => b.symbol)).toEqual(['BTC', 'Eth', 'usdc']);
      });

      it('should handle special characters in symbols', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'WETH' }),
          createEnrichedBalance({ symbol: 'aUSDC' }),
          createEnrichedBalance({ symbol: 'ETH' }),
        ];

        const result = service.sortBalances(balances, 'symbol', 'asc');

        expect(result.map(b => b.symbol)).toEqual(['aUSDC', 'ETH', 'WETH']);
      });
    });

    describe('immutability', () => {
      it('should not mutate the original array', () => {
        const originalBalances = [
          createEnrichedBalance({ symbol: 'C', balance: '3000000000000000000' }),
          createEnrichedBalance({ symbol: 'A', balance: '1000000000000000000' }),
          createEnrichedBalance({ symbol: 'B', balance: '2000000000000000000' }),
        ];

        const originalOrder = originalBalances.map(b => b.symbol);

        service.sortBalances(originalBalances, 'balance', 'asc');

        // Original array should be unchanged
        expect(originalBalances.map(b => b.symbol)).toEqual(originalOrder);
      });

      it('should return a new array', () => {
        const balances = [
          createEnrichedBalance({ symbol: 'A' }),
          createEnrichedBalance({ symbol: 'B' }),
        ];

        const result = service.sortBalances(balances, 'symbol', 'asc');

        expect(result).not.toBe(balances);
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const result = service.sortBalances([], 'balance', 'asc');

        expect(result).toEqual([]);
      });

      it('should handle single element array', () => {
        const balances = [createEnrichedBalance({ symbol: 'ONLY' })];

        const result = service.sortBalances(balances, 'balance', 'asc');

        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe('ONLY');
      });
    });
  });
});
