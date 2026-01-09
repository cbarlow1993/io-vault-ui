import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import type { AddressRepository, CreateTokenHoldingInput, TokenHolding, TokenHoldingRepository, TokenRepository } from '@/src/repositories/types.js';
import type { SpamAnalysis, TokenToClassify } from '@/src/services/spam/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { BalanceFetcher, RawBalance } from '@/src/services/balances/fetchers/types.js';
import type { PricingService } from '@/src/services/balances/pricing-service.js';
import { TokenAmount, getNativeCoingeckoId } from '@/src/domain/value-objects/index.js';
import { SpamAnalysis as SpamAnalysisEntity } from '@/src/domain/entities/index.js';

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

export interface TokenBalanceOptions {
  includeHidden?: boolean;
  showSpam?: boolean;
  sortBy?: 'balance' | 'usdValue' | 'symbol';
  sortOrder?: 'asc' | 'desc';
}

export class BalanceService {
  private readonly currency: string;

  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenHoldingRepository: TokenHoldingRepository,
    private readonly pricingService: PricingService,
    private readonly fetcherFactory: (chainAlias: ChainAlias, network: string) => BalanceFetcher | null,
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
    options?: TokenBalanceOptions
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
    options?: TokenBalanceOptions
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

    // Fetch balances from chain with fallback to cache
    let allBalances: RawBalance[];
    try {
      const [nativeBalance, tokenBalances] = await Promise.all([
        fetcher.getNativeBalance(walletAddress),
        fetcher.getTokenBalances(walletAddress, Array.from(tokenMap.values())),
      ]);
      allBalances = [nativeBalance, ...tokenBalances];
    } catch (error) {
      // Fall back to cached holdings if chain fetch fails
      if (holdings.length > 0) {
        logger.warn('Balance fetch failed, falling back to cached holdings', {
          addressId,
          walletAddress,
          chain,
          error: error instanceof Error ? error.message : String(error),
          cachedHoldingsCount: holdings.length,
        });
        allBalances = holdings.map((holding) => this.holdingToRawBalance(holding));
      } else {
        // No cache available, re-throw the error
        logger.error('Balance fetch failed and no cached holdings available', {
          addressId,
          walletAddress,
          chain,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    // Filter out zero balances
    const nonZeroBalances = allBalances.filter((b) => b.balance !== '0');

    // Detect any mismatches between fetched and cached balances (for logging)
    this.detectBalanceMismatches(addressId, chain, allBalances, holdings);

    // Update cache with fresh balances
    await this.upsertBalancesToCache(addressId, chain as ChainAlias, nonZeroBalances);

    // Collect coingecko IDs for pricing
    const coingeckoIds: string[] = [];
    const nativeCoingeckoId = nativeTokenMetadata?.coingeckoId ?? getNativeCoingeckoId(chain);
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
    const enrichedBalances: EnrichedBalance[] = nonZeroBalances.map((balance) => {
      const coingeckoId = balance.isNative
        ? nativeCoingeckoId
        : tokenMap.get(balance.tokenAddress!)?.coingeckoId;

      const price = coingeckoId ? prices.get(coingeckoId) : undefined;
      const token = balance.tokenAddress ? tokenMap.get(balance.tokenAddress) : undefined;

      const formattedBalance = TokenAmount.fromRaw(balance.balance, balance.decimals).formatted;
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

    // Apply spam filtering
    const filteredBalances = this.filterSpamBalances(
      enrichedBalances,
      options?.showSpam ?? false
    );

    // Apply sorting
    const sortedBalances = this.sortBalances(
      filteredBalances,
      options?.sortBy ?? 'usdValue',
      options?.sortOrder ?? 'desc'
    );

    return sortedBalances;
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
    if (!classifications) {
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

    // Use SpamAnalysis entity to build the analysis with computed risk summary
    const spamAnalysis = SpamAnalysisEntity.create({
      blockaid: classificationResult.classification.blockaid,
      coingecko: classificationResult.classification.coingecko,
      heuristics: classificationResult.classification.heuristics,
      userOverride,
      classificationUpdatedAt: classificationResult.updatedAt.toISOString(),
    });

    return spamAnalysis.toJSON();
  }

  /**
   * Filters balances based on spam status.
   * When showSpam is true, all balances are returned.
   * When showSpam is false, spam tokens are filtered out unless the user has trusted them.
   */
  filterSpamBalances(
    balances: EnrichedBalance[],
    showSpam: boolean
  ): EnrichedBalance[] {
    if (showSpam) {
      return balances;
    }

    // Filter out spam tokens unless user has trusted override
    return balances.filter((balance) => {
      const classification = balance.spamAnalysis;
      if (!classification) {
        return true; // No classification = show
      }

      // User override takes precedence
      if (classification.userOverride === 'trusted') {
        return true;
      }
      if (classification.userOverride === 'spam') {
        return false;
      }

      // If globally marked as spam by summary (riskLevel: 'danger' indicates spam)
      if (classification.summary?.riskLevel === 'danger') {
        return false;
      }

      return true;
    });
  }

  /**
   * Computes the effective spam status for a balance based on user override and classification.
   * User override takes precedence over system classification.
   */
  computeEffectiveSpamStatus(
    balance: EnrichedBalance
  ): 'spam' | 'trusted' | 'unknown' {
    const classification = balance.spamAnalysis;
    if (!classification) {
      return 'unknown';
    }

    // User override takes precedence
    if (classification.userOverride === 'trusted') {
      return 'trusted';
    }
    if (classification.userOverride === 'spam') {
      return 'spam';
    }

    // Use summary if available (riskLevel: 'danger' indicates spam)
    if (classification.summary?.riskLevel === 'danger') {
      return 'spam';
    }

    return 'unknown';
  }

  /**
   * Sorts balances by the specified field and order.
   * Does not mutate the input array - returns a new sorted array.
   */
  sortBalances(
    balances: EnrichedBalance[],
    sortBy: 'balance' | 'usdValue' | 'symbol',
    sortOrder: 'asc' | 'desc'
  ): EnrichedBalance[] {
    const sorted = [...balances].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'balance':
          // Compare as BigInt for precision
          comparison = this.compareBigInt(a.balance, b.balance);
          break;
        case 'usdValue': {
          // Sort by USD value, nulls always last (regardless of sort order)
          const aNull = a.usdValue === null;
          const bNull = b.usdValue === null;
          if (aNull && bNull) {
            comparison = 0;
          } else if (aNull) {
            // a is null, should always be last - bypass sort order reversal
            return 1;
          } else if (bNull) {
            // b is null, should always be last - bypass sort order reversal
            return -1;
          } else {
            comparison = a.usdValue - b.usdValue;
          }
          break;
        }
        case 'symbol':
          // Case-insensitive comparison using localeCompare
          comparison = a.symbol.localeCompare(b.symbol);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  private compareBigInt(a: string, b: string): number {
    const aBig = BigInt(a);
    const bBig = BigInt(b);
    if (aBig < bBig) return -1;
    if (aBig > bBig) return 1;
    return 0;
  }

  /**
   * Upserts fresh balances to the token_holdings cache.
   * Called after successful balance fetch to keep cache current.
   */
  private async upsertBalancesToCache(
    addressId: string,
    chain: ChainAlias,
    balances: RawBalance[]
  ): Promise<void> {
    const inputs: CreateTokenHoldingInput[] = balances.map((balance) => ({
      addressId,
      chainAlias: chain,
      tokenAddress: balance.tokenAddress,
      isNative: balance.isNative,
      balance: balance.balance,
      decimals: balance.decimals,
      name: balance.name,
      symbol: balance.symbol,
    }));

    await this.tokenHoldingRepository.upsertMany(inputs);
  }

  /**
   * Compares fetched balances with cached holdings and logs mismatches.
   */
  private detectBalanceMismatches(
    addressId: string,
    chain: string,
    fetchedBalances: RawBalance[],
    cachedHoldings: TokenHolding[]
  ): void {
    // Build a Map from cachedHoldings keyed by tokenAddress (null for native)
    const cachedMap = new Map<string | null, TokenHolding>();
    for (const holding of cachedHoldings) {
      cachedMap.set(holding.tokenAddress, holding);
    }

    // For each fetched balance, check if cache exists and balance differs
    for (const fetched of fetchedBalances) {
      const cached = cachedMap.get(fetched.tokenAddress);
      if (cached && cached.balance !== fetched.balance) {
        logger.warn('Balance mismatch detected', {
          addressId,
          tokenAddress: fetched.tokenAddress,
          cached: cached.balance,
          fetched: fetched.balance,
          chain,
        });
      }
    }
  }

  /**
   * Converts a cached TokenHolding to a RawBalance for fallback.
   */
  private holdingToRawBalance(holding: TokenHolding): RawBalance {
    return {
      address: '',
      tokenAddress: holding.tokenAddress,
      isNative: holding.tokenAddress === null,
      balance: holding.balance,
      decimals: holding.decimals,
      name: holding.name,
      symbol: holding.symbol,
    };
  }

}
