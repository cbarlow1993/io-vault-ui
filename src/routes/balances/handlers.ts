/**
 * Balance Route Handlers
 *
 * These handlers use the new PostgreSQL-based balance service.
 * The old DynamoDB/Noves-based functions have been removed as part of the PostgreSQL migration.
 */

import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import { Chain, type ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { mapChainAliasToCoinGeckoAssetPlatform } from '@/src/config/chain-mappings/index.js';
import { fetchNativeTokenMetadata } from '@/src/services/coingecko/index.js';
import { logger } from '@/utils/powertools.js';
import type {
  AddressIdPathParams,
  BalancePathParams,
  TokenBalancePathParams,
  TokenBalanceQuery,
} from '@/src/routes/balances/schemas.js';

// ==================== Route Handlers ====================

/**
 * Get all balances (native + tokens) for an address by ID
 * GET /addresses/:addressId/balances
 */
export async function getBalancesByAddressId(
  request: FastifyRequest<{ Params: AddressIdPathParams }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;

  if (!request.server.services?.balances) {
    throw new InternalServerError('Balance service not available');
  }

  try {
    const balances = await request.server.services.balances.getBalances(addressId);

    return reply.send({
      balances: balances.map((b) => ({
        tokenAddress: b.tokenAddress,
        symbol: b.symbol,
        name: b.name,
        decimals: b.decimals,
        balance: b.formattedBalance,
        rawBalance: b.balance,
        usdPrice: b.usdPrice,
        usdValue: b.usdValue,
        priceChange24h: b.priceChange24h,
        logoUri: b.logoUri,
        isNative: b.isNative,
      })),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Failed to fetch balances', { message: (error as Error).message, addressId });
    throw error;
  }
}

/**
 * @deprecated Use getBalancesByAddressId instead. This handler will be removed in a future version.
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
    Chain.setAuthContext({
      apiBearerToken: request.auth?.token ?? '',
      rpcBearerToken: request.auth?.token ?? '',
    })
    const chain = await Chain.fromAlias(chainAlias as ChainAlias);
    const balance = await chain.Explorer.getBalance(address);

    const platform = mapChainAliasToCoinGeckoAssetPlatform(chainAlias as ChainAlias);
    const tokenRepo = request.server.repositories?.tokens;
    const pricingService = request.server.services?.pricing;

    let usdValue: string | null = null;
    let name: string | null = null;
    let logo: string | null = null;

    // Check if we have cached native token metadata
    let cachedNativeToken = tokenRepo
      ? await tokenRepo.findByChainAliasAndAddress(platform, 'native')
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
          const numericBalance = Number(balance.nativeBalance);
          if (Number.isFinite(numericBalance)) {
            usdValue = (priceInfo.price * numericBalance).toFixed(2);
          }
        }
      }
    } else {
      // Fetch from CoinGecko and cache
      const data = await fetchNativeTokenMetadata(chain);
      if (data) {
        name = data.name ?? null;
        logo = data.image?.small ?? null;

        // Store in tokens table for future use
        if (tokenRepo && data.name && data.symbol && data.id) {
          await tokenRepo.upsert({
            chainAlias: platform,
            address: 'native',
            name: data.name,
            symbol: data.symbol,
            decimals: chain.Config.nativeCurrency.decimals,
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
            const numericBalance = Number(balance.nativeBalance);
            if (Number.isFinite(numericBalance)) {
              usdValue = (priceInfo.price * numericBalance).toFixed(2);
            }
          }
        }
      }
    }

    return reply.send({
      balance: balance.nativeBalance,
      symbol: balance.nativeSymbol,
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
 * @deprecated Use getBalancesByAddressId instead. This handler will be removed in a future version.
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
  const { cursor, limit, showHiddenTokens } = request.query;

  if (!request.server.services?.balances) {
    throw new InternalServerError('Balance service not available');
  }

  try {
    // Use chainAlias directly for database lookup (e.g., "polygon")
    // The BalanceService uses this format internally
    const balances = await request.server.services.balances.getBalancesByChainAndAddress(
      chainAlias,
      address,
      { includeHidden: showHiddenTokens }
    );

    // Transform EnrichedBalance[] to response format
    const allData = balances.map((b) => ({
      name: b.name,
      balance: b.formattedBalance,
      symbol: b.symbol,
      decimals: b.decimals,
      address: b.isNative ? 'native' : (b.tokenAddress ?? ''),
      usdValue: b.usdValue?.toFixed(2) ?? null,
      logo: b.logoUri,
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
