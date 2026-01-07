import { JsonRpcProvider, Contract } from 'ethers';
import { logger } from '@/utils/powertools.js';
import { getCoinGeckoPlatform } from '@/src/config/chain-mappings/index.js';
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';
import type { TokenInfo } from '@/src/services/transaction-processor/types.js';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

export interface TokenMetadataFetcherConfig {
  rpcUrls?: Record<string, string>;
}

export interface TokenMetadataResult extends TokenInfo {
  coingeckoId?: string;
  logoUri?: string;
}

export class TokenMetadataFetcher {
  private readonly rpcUrls: Record<string, string>;

  constructor(config: TokenMetadataFetcherConfig = {}) {
    this.rpcUrls = config.rpcUrls ?? {};
  }

  /**
   * Fetches token metadata from on-chain RPC calls.
   *
   * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
   * @param address - The token contract address
   */
  async fetchOnChain(
    chainAlias: string,
    address: string
  ): Promise<Partial<TokenInfo>> {
    const rpcUrl = this.rpcUrls[chainAlias];
    if (!rpcUrl) {
      return { address: address.toLowerCase() };
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(address, ERC20_ABI, provider);

    const result: Partial<TokenInfo> = {
      address: address.toLowerCase(),
    };

    // Fetch each field separately to handle partial failures
    try {
      result.name = await contract.name!();
    } catch {
      // Token may not have name() function - this is expected for some tokens
    }

    try {
      result.symbol = await contract.symbol!();
    } catch {
      // Token may not have symbol() function - this is expected for some tokens
    }

    try {
      result.decimals = await contract.decimals!();
    } catch {
      // Token may not have decimals() function - this is expected for some tokens
    }

    return result;
  }

  /**
   * Fetches token metadata from CoinGecko.
   *
   * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
   * @param address - The token contract address
   */
  async fetchFromCoinGecko(
    chainAlias: string,
    address: string
  ): Promise<{ coingeckoId: string | null; logoUri: string | null } | null> {
    const platform = getCoinGeckoPlatform(chainAlias);
    if (!platform) {
      return null;
    }

    try {
      const client = getCoinGeckoClient();
      const data = await client.coins.contract.get(address.toLowerCase(), { id: platform });
      return {
        coingeckoId: data.id ?? null,
        logoUri: data.image?.large ?? data.image?.small ?? null,
      };
    } catch (error) {
      logger.warn('Failed to fetch token from CoinGecko', { address, chainAlias, error });
      return null;
    }
  }

  /**
   * Fetches complete token metadata from on-chain RPC and CoinGecko.
   *
   * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
   * @param address - The token contract address
   * @returns Token metadata including name, symbol, decimals, and optional CoinGecko data
   *
   * @note CoinGecko only has data for mainnet tokens. For testnet tokens,
   *       only on-chain data will be returned.
   */
  async fetch(chainAlias: string, address: string): Promise<TokenMetadataResult> {
    const [onChain, coinGecko] = await Promise.all([
      this.fetchOnChain(chainAlias, address),
      this.fetchFromCoinGecko(chainAlias, address),
    ]);

    return {
      address: address.toLowerCase(),
      name: onChain.name,
      symbol: onChain.symbol,
      decimals: onChain.decimals,
      coingeckoId: coinGecko?.coingeckoId ?? undefined,
      logoUri: coinGecko?.logoUri ?? undefined,
    };
  }
}
