import { Chain, ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  listTronTokenBalances,
  transformTronScanTokenBalances,
} from '@/src/services/balances/tronscan.js';
import type { Addresses } from '@/src/types/address.js';
import { logger } from '@/utils/powertools.js';

export type ProviderTokenBalance = Omit<Addresses.TokenBalance, 'logo'>;

type TokenBalanceFetcher = (chain: ChainAlias, address: string) => Promise<ProviderTokenBalance[]>;

/**
 * EVM token balance fetcher using the chain SDK's Explorer
 */
const evmBalanceFetcher = async (
  chainAlias: ChainAlias,
  address: string
): Promise<ProviderTokenBalance[]> => {
  const chain = await Chain.fromAlias(chainAlias);
  const results: ProviderTokenBalance[] = [];

  // Get native balance
  const nativeBalance = await chain.Explorer.getBalance(address);
  results.push({
    name: chain.Config.nativeCurrency.name,
    balance: nativeBalance.nativeBalance.toString(),
    symbol: nativeBalance.nativeSymbol,
    decimals: chain.Config.nativeCurrency.decimals,
    address: nativeBalance.nativeSymbol, // Use symbol as address for native tokens
    usdValue: null,
  });

  // Get token balances if explorer supports it
  if (chain.Explorer.hasTokenCapability()) {
    try {
      const tokenBalances = await chain.Explorer.getTokenBalances(address);
      for (const token of tokenBalances) {
        results.push({
          name: token.name,
          balance: token.balance,
          symbol: token.symbol,
          decimals: token.decimals,
          address: token.contractAddress,
          usdValue: token.usdValue,
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch EVM token balances', { error, chainAlias, address });
      // Continue with just native balance
    }
  }

  return results;
};

// Made this different because of the use of mapChainAliasToNovesChain by default in the fetcher.
const customUtxoBalanceFetcher = async (
  chainAlias: ChainAlias,
  address: string
): Promise<ProviderTokenBalance[]> => {
  if (chainAlias === ChainAlias.BITCOIN) {
    const chain = await Chain.fromAlias(ChainAlias.BITCOIN);
    const balance = await chain.Explorer.getBalance(address);
    return [
      {
        name: 'Bitcoin',
        balance: balance.nativeBalance.toString(),
        symbol: balance.nativeSymbol,
        decimals: 8,
        address: 'BTC',
        usdValue: null,
      },
    ];
  }

  if (chainAlias === ChainAlias.MNEE) {
    const chain = await Chain.fromAlias(ChainAlias.MNEE);
    const balance = await chain.Explorer.getBalance(address);
    return [
      {
        name: 'MNEE',
        balance: balance.nativeBalance.toString(),
        symbol: balance.nativeSymbol,
        decimals: 5,
        address: 'MNEE',
        usdValue: null,
      },
    ];
  }

  return [];
};

/**
 * Token balance fetchers - using native RPC/chain SDK
 *
 * Note: The new balance-service.ts provides a more comprehensive implementation
 * for PostgreSQL-based address repository. This export is kept for backwards
 * compatibility with legacy handlers.
 */
export const tokenBalanceFetchers: Record<EcoSystem, TokenBalanceFetcher | undefined> = {
  [EcoSystem.EVM]: evmBalanceFetcher,
  // SVM now uses balance-service.ts with RPC calls
  [EcoSystem.SVM]: undefined,
  [EcoSystem.UTXO]: async (chainAlias, address) => customUtxoBalanceFetcher(chainAlias, address),
  [EcoSystem.TVM]: async (chainAlias, address) => {
    const tokens = await listTronTokenBalances(chainAlias, address);
    return transformTronScanTokenBalances(tokens);
  },
  [EcoSystem.COSMOS]: undefined,
  [EcoSystem.SUBSTRATE]: undefined,
  [EcoSystem.XRP]: undefined, // XRP balance fetching now handled via chain SDK
};

// Re-export the new balance service for Fastify plugin usage
export { BalanceService } from '@/src/services/balances/balance-service.js';
