/**
 * Balance Route Handlers
 *
 * These handlers use the new PostgreSQL-based balance service.
 * The old DynamoDB/Noves-based functions have been removed as part of the PostgreSQL migration.
 */

import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import { type ChainAlias as ChainsChainAlias, getChainProvider } from '@io-vault/chains';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchNativeTokenMetadataByAlias } from '@/src/services/coingecko/index.js';
import { logger } from '@/utils/powertools.js';
import type {
  BalancePathParams,
  TokenBalancePathParams,
  TokenBalanceQuery,
} from '@/src/routes/balances/schemas.js';

// ==================== Route Handlers ====================

/**
 *
 * Get native balance for an address
 * GET /ecosystem/:ecosystem/chain/:chain/address/:address/native
 */
export async function getNativeBalance(
  request: FastifyRequest<{
    Params: BalancePathParams;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address } = request.params;

  try {
    const provider = getChainProvider(chainAlias as ChainsChainAlias);
    const balance = await provider.getNativeBalance(address);

    const tokenRepo = request.server.repositories?.tokens;
    const pricingService = request.server.services?.pricing;

    let usdValue: string | null = null;
    let name: string | null = null;
    let logo: string | null = null;

    // Check if we have cached native token metadata
    const cachedNativeToken = tokenRepo
      ? await tokenRepo.findByChainAliasAndAddress(chainAlias as ChainAlias, 'native')
      : null;

    if (cachedNativeToken?.coingeckoId) {
      // Use cached metadata
      name = cachedNativeToken.name;
      logo = cachedNativeToken.logoUri;

      // Get price from cache
      if (pricingService) {
        const prices = await pricingService.getPrices([cachedNativeToken.coingeckoId], 'usd');
        const priceInfo = prices.get(cachedNativeToken.coingeckoId);
        if (priceInfo) {
          const numericBalance = Number(balance.formattedBalance);
          if (Number.isFinite(numericBalance)) {
            usdValue = (priceInfo.price * numericBalance).toFixed(2);
          }
        }
      }
    } else {
      // Fetch from CoinGecko and cache
      const data = await fetchNativeTokenMetadataByAlias(chainAlias as ChainAlias);
      if (data) {
        name = data.name ?? null;
        logo = data.image?.small ?? null;

        // Store in tokens table for future use
        if (tokenRepo && data.name && data.symbol && data.id) {
          await tokenRepo.upsert({
            chainAlias: chainAlias as ChainAlias,
            address: 'native',
            name: data.name,
            symbol: data.symbol,
            decimals: provider.config.nativeCurrency.decimals,
            logoUri: data.image?.small ?? null,
            coingeckoId: data.id,
            isVerified: true,
            isSpam: false,
          });
        }

        // Cache the price and calculate USD value
        if (pricingService && data.id) {
          const prices = await pricingService.getPrices([data.id], 'usd');
          const priceInfo = prices.get(data.id);
          if (priceInfo) {
            const numericBalance = Number(balance.formattedBalance);
            if (Number.isFinite(numericBalance)) {
              usdValue = (priceInfo.price * numericBalance).toFixed(2);
            }
          }
        }
      }
    }

    return reply.send({
      balance: balance.formattedBalance,
      symbol: balance.symbol,
      name,
      logo,
      usdValue: usdValue ?? null,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.critical('Error retrieving native balance', { error });
    throw error;
  }
}

/**
 *
 * Get token balances for an address
 * GET /ecosystem/:ecosystem/chain/:chain/address/:address/tokens
 *
 * Uses cursor-based pagination per the pagination requirements.
 * @see docs/requirements/common/001-cursor-pagination.md
 * @see docs/requirements/api-balances/002-get-token-balances.md
 */
export async function getTokenBalances(
  request: FastifyRequest<{
    Params: TokenBalancePathParams;
    Querystring: TokenBalanceQuery;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address } = request.params;
  const { cursor, limit, showHiddenTokens, showSpam, sortBy, sortOrder } = request.query;

  if (!request.server.services?.balances) {
    throw new InternalServerError('Balance service not available');
  }

  const balanceService = request.server.services.balances;

  try {
    // Use chainAlias directly for database lookup (e.g., "polygon")
    // The BalanceService uses this format internally
    const options = {
      includeHidden: showHiddenTokens,
      showSpam,
      sortBy,
      sortOrder,
    };
    const balances = await balanceService.getBalancesByChainAndAddress(
      chainAlias,
      address,
      options
    );

    // Transform EnrichedBalance[] to response format with spam fields
    const allData = balances.map((b) => ({
      name: b.name,
      balance: b.formattedBalance,
      symbol: b.symbol,
      decimals: b.decimals,
      address: b.isNative ? 'native' : (b.tokenAddress ?? ''),
      usdValue: b.usdValue?.toFixed(2) ?? null,
      logo: b.logoUri,
      // Spam-related fields
      isSpam: b.spamAnalysis?.summary?.riskLevel === 'danger',
      userSpamOverride: b.spamAnalysis?.userOverride ?? null,
      effectiveSpamStatus: balanceService.computeEffectiveSpamStatus(b),
    }));

    // Apply in-memory cursor-based pagination
    // Cursor is the token address of the last item
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allData.findIndex((item) => item.address === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedData = allData.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allData.length;
    const lastItem = paginatedData[paginatedData.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.address : null;

    return reply.send({
      data: paginatedData,
      lastUpdated: new Date().toISOString(),
      pagination: {
        nextCursor,
        hasMore,
        total: allData.length,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.critical('Error retrieving token balances', {
      error,
      params: { pathParameters: request.params },
    });
    throw error;
  }
}
