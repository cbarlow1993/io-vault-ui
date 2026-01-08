import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { AddressRepository, TokenHolding, TokenHoldingRepository, TokenRepository } from '@/src/repositories/types.js';
import type { SpamAnalysis, TokenToClassify } from '@/src/services/spam/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { BalanceFetcher, RawBalance } from '@/src/services/balances/fetchers/types.js';
import type { PricingService } from '@/src/services/balances/pricing-service.js';

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  coingeckoId: string | null;
  logoUri: string | null;
}

export interface EnrichedBalance {
  tokenAddress: string | null;
  isNative: boolean;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdPrice: number | null;
  usdValue: number | null;
  priceChange24h: number | null;
  isPriceStale: boolean;
  logoUri: string | null;
  coingeckoId: string | null;
  spamAnalysis: SpamAnalysis | null;
}

export interface BalanceServiceConfig {
  currency?: string;
}

export class BalanceService {
  private readonly currency: string;

  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenHoldingRepository: TokenHoldingRepository,
    private readonly pricingService: PricingService,
    private readonly fetcherFactory: (chain: string, network: string) => BalanceFetcher | null,
    config: BalanceServiceConfig = {},
    private readonly spamClassificationService?: SpamClassificationService
  ) {
    this.currency = config.currency ?? 'usd';
  }

  async getBalances(addressId: string): Promise<EnrichedBalance[]> {
    // Get address details
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new NotFoundError(`Address not found: ${addressId}`);
    }

    return this.fetchAndEnrichBalances(address.id, address.address, address.chain_alias, 'mainnet');
  }

  async getBalancesByChainAndAddress(
    chain: string,
    walletAddress: string,
    options?: { includeHidden?: boolean }
  ): Promise<EnrichedBalance[]> {
    // Look up address in database
    const address = await this.addressRepository.findByAddressAndChainAlias(walletAddress, chain as ChainAlias);
    if (!address) {
      throw new NotFoundError(`Address not found: ${walletAddress} on chain ${chain}`);
    }

    return this.fetchAndEnrichBalances(
      address.id,
      address.address,
      address.chain_alias,
      'mainnet',
      options
    );
  }

  private async fetchAndEnrichBalances(
    addressId: string,
    walletAddress: string,
    chain: string,
    network: string,
    options?: { includeHidden?: boolean }
  ): Promise<EnrichedBalance[]> {
    // Get balance fetcher for this chain
    const fetcher = this.fetcherFactory(chain, network);
    if (!fetcher) {
      throw new InternalServerError(`No balance fetcher for chain: ${chain}`);
    }

    // Get known token holdings (for token list hints)
    const holdings = options?.includeHidden
      ? await this.tokenHoldingRepository.findByAddressId(addressId)
      : await this.tokenHoldingRepository.findVisibleByAddressId(addressId);

    // Get verified tokens for this chain
    const verifiedTokens = await this.tokenRepository.findVerifiedByChainAlias(chain as ChainAlias);

    // Look up native token metadata from database
    // Native tokens are stored with chainAlias format (e.g., "polygon")
    const nativeTokenMetadata = await this.tokenRepository.findByChainAliasAndAddress(
      chain as ChainAlias,
      'native'
    );

    // Combine known holdings with verified tokens
    const tokenMap = new Map<string, TokenInfo>();

    for (const holding of holdings) {
      if (holding.tokenAddress) {
        tokenMap.set(holding.tokenAddress, {
          address: holding.tokenAddress,
          decimals: holding.decimals,
          symbol: holding.symbol,
          name: holding.name,
          coingeckoId: null,
          logoUri: null,
        });
      }
    }

    for (const token of verifiedTokens) {
      if (!tokenMap.has(token.address)) {
        tokenMap.set(token.address, {
          address: token.address,
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
          coingeckoId: token.coingeckoId,
          logoUri: token.logoUri,
        });
      } else {
        // Enrich existing with coingecko/logo info
        const existing = tokenMap.get(token.address)!;
        existing.coingeckoId = token.coingeckoId;
        existing.logoUri = token.logoUri;
      }
    }

    // Fetch balances from chain
    const [nativeBalance, tokenBalances] = await Promise.all([
      fetcher.getNativeBalance(walletAddress),
      fetcher.getTokenBalances(walletAddress, Array.from(tokenMap.values())),
    ]);

    const allBalances: RawBalance[] = [nativeBalance, ...tokenBalances];

    // Filter out zero balances
    const nonZeroBalances = allBalances.filter((b) => b.balance !== '0');

    // Collect coingecko IDs for pricing
    const coingeckoIds: string[] = [];
    const nativeCoingeckoId = nativeTokenMetadata?.coingeckoId ?? this.getNativeCoingeckoId(chain);
    if (nativeCoingeckoId) {
      coingeckoIds.push(nativeCoingeckoId);
    }

    for (const balance of nonZeroBalances) {
      if (balance.tokenAddress) {
        const token = tokenMap.get(balance.tokenAddress);
        if (token?.coingeckoId) {
          coingeckoIds.push(token.coingeckoId);
        }
      }
    }

    // Fetch prices
    const prices = await this.pricingService.getPrices(coingeckoIds, this.currency);

    // Build holdings map for user overrides lookup (keyed by token address, null for native)
    const holdingsMap = new Map<string | null, TokenHolding>();
    for (const holding of holdings) {
      holdingsMap.set(holding.tokenAddress, holding);
    }

    // Classify tokens for spam analysis if service is available
    const spamClassifications = await this.classifyBalancesForSpam(
      nonZeroBalances,
      tokenMap,
      nativeTokenMetadata,
      chain,
      network
    );

    // Enrich balances with prices
    return nonZeroBalances.map((balance) => {
      const coingeckoId = balance.isNative
        ? nativeCoingeckoId
        : tokenMap.get(balance.tokenAddress!)?.coingeckoId;

      const price = coingeckoId ? prices.get(coingeckoId) : undefined;
      const token = balance.tokenAddress ? tokenMap.get(balance.tokenAddress) : undefined;

      const formattedBalance = this.formatBalance(balance.balance, balance.decimals);
      const usdValue = price ? parseFloat(formattedBalance) * price.price : null;

      // For native tokens, use metadata from database if available
      const name = balance.isNative && nativeTokenMetadata?.name
        ? nativeTokenMetadata.name
        : balance.name;
      const symbol = balance.isNative && nativeTokenMetadata?.symbol
        ? nativeTokenMetadata.symbol
        : balance.symbol;
      const logoUri = balance.isNative
        ? nativeTokenMetadata?.logoUri ?? null
        : token?.logoUri ?? null;

      // Get spam analysis for this balance
      const spamAnalysis = this.buildSpamAnalysis(
        balance,
        spamClassifications,
        holdingsMap
      );

      return {
        tokenAddress: balance.tokenAddress,
        isNative: balance.isNative,
        symbol,
        name,
        decimals: balance.decimals,
        balance: balance.balance,
        formattedBalance,
        usdPrice: price?.price ?? null,
        usdValue,
        priceChange24h: price?.priceChange24h ?? null,
        isPriceStale: price?.isStale ?? true,
        logoUri,
        coingeckoId: coingeckoId ?? null,
        spamAnalysis,
      };
    });
  }

  private async classifyBalancesForSpam(
    balances: RawBalance[],
    tokenMap: Map<string, TokenInfo>,
    nativeTokenMetadata: { name: string; symbol: string; coingeckoId: string | null } | null,
    chain: string,
    network: string
  ): Promise<Map<string, import('@/src/services/spam/types.js').ClassificationResult> | null> {
    if (!this.spamClassificationService) {
      return null;
    }

    // Build tokens to classify
    const tokensToClassify: TokenToClassify[] = balances.map((balance) => {
      if (balance.isNative) {
        return {
          chain,
          network,
          address: 'native',
          name: nativeTokenMetadata?.name ?? balance.name,
          symbol: nativeTokenMetadata?.symbol ?? balance.symbol,
          coingeckoId: nativeTokenMetadata?.coingeckoId ?? null,
        };
      }

      const tokenInfo = tokenMap.get(balance.tokenAddress!);
      return {
        chain,
        network,
        address: balance.tokenAddress!,
        name: tokenInfo?.name ?? balance.name,
        symbol: tokenInfo?.symbol ?? balance.symbol,
        coingeckoId: tokenInfo?.coingeckoId ?? null,
      };
    });

    return this.spamClassificationService.classifyTokensBatch(tokensToClassify);
  }

  private buildSpamAnalysis(
    balance: RawBalance,
    classifications: Map<string, import('@/src/services/spam/types.js').ClassificationResult> | null,
    holdingsMap: Map<string | null, TokenHolding>
  ): SpamAnalysis | null {
    if (!classifications || !this.spamClassificationService) {
      return null;
    }

    // Get the classification key: 'native' for native tokens, lowercase address for tokens
    const classificationKey = balance.isNative
      ? 'native'
      : balance.tokenAddress!.toLowerCase();

    const classificationResult = classifications.get(classificationKey);
    if (!classificationResult) {
      return null;
    }

    // Get user override from holdings
    // For native tokens, holdingsMap uses null as key; for tokens, uses tokenAddress
    const holdingKey = balance.isNative ? null : balance.tokenAddress;
    const holding = holdingsMap.get(holdingKey);
    const userOverride = holding?.userSpamOverride ?? null;

    // Compute risk summary using the classification service
    const summary = this.spamClassificationService.computeRiskSummary(
      classificationResult.classification,
      userOverride
    );

    return {
      blockaid: classificationResult.classification.blockaid,
      coingecko: classificationResult.classification.coingecko,
      heuristics: classificationResult.classification.heuristics,
      userOverride,
      classificationUpdatedAt: classificationResult.updatedAt.toISOString(),
      summary,
    };
  }

  private formatBalance(balance: string, decimals: number): string {
    const value = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.slice(0, 8).replace(/0+$/, '');

    if (trimmedFractional === '') {
      return integerPart.toString();
    }

    return `${integerPart}.${trimmedFractional}`;
  }

  private getNativeCoingeckoId(chain: string): string | null {
    const mapping: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'polygon-ecosystem-token',
      arbitrum: 'ethereum',
      optimism: 'ethereum',
      base: 'ethereum',
      avalanche: 'avalanche-2',
      bsc: 'binancecoin',
      solana: 'solana',
      bitcoin: 'bitcoin',
      tron: 'tron',
      xrp: 'ripple',
    };

    return mapping[chain] ?? null;
  }

}
