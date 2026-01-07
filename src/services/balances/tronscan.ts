import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { config } from '@/src/lib/config.js';
import { getTokenUsdPrice } from '@/src/services/coingecko/index.js';
import type { Addresses } from '@/src/types/address.js';
import { logger } from '@/utils/powertools.js';

export type TronTokenBalance = {
  balance: number;
  token_name: string;
  token_abbr: string;
  token_id: string;
  token_decimal: number;
  token_url: string;
  usdValue: string | null;
};

const TRON_TOKEN_SYMBOL = 'TRX';

export const transformTronScanTokenBalances = (
  balances: TronTokenBalance[]
): Addresses.TokenBalance[] => {
  return balances.map((balance) => {
    if (balance.token_abbr.toUpperCase() === TRON_TOKEN_SYMBOL) {
      return {
        balance: balance.balance.toString(),
        symbol: TRON_TOKEN_SYMBOL,
        decimals: balance.token_decimal,
        address: TRON_TOKEN_SYMBOL,
        name: 'TRON',
        logo: null,
        usdValue: balance.usdValue,
      };
    }
    return {
      balance: balance.balance.toString(),
      symbol: balance.token_abbr,
      decimals: balance.token_decimal,
      address: balance.token_id,
      name: balance.token_name,
      logo: null,
      usdValue: balance.usdValue,
    };
  });
};

export const listTronTokenBalances = async (
  chain: string,
  address: string
): Promise<TronTokenBalance[]> => {
  logger.info('Fetching token balances from TronScan', { chain, address });
  const response = await fetch(
    `${config.apis.tronscan.apiUrl}/api/account/wallet?address=${address}&asset_type=0`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'io-finnet-io-vault-be',
        'TRON-PRO-API-KEY': config.apis.tronscan.apiKey!,
      },
    }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch token balances');
  }

  const jsonResponse = (await response.json()) as { data: Omit<TronTokenBalance, 'usdValue'>[] };
  const data = jsonResponse.data;
  const enrichedData = await Promise.all(
    data.map(async (balance) => {
      const price = await getTokenUsdPrice(ChainAlias.TRON, balance.token_id);
      let usdValue: string | null = null;
      if (price !== null) {
        // Convert balance from smallest unit to human-readable and multiply by price
        const adjustedBalance = balance.balance / Math.pow(10, balance.token_decimal);
        usdValue = (price * adjustedBalance).toFixed(2);
      }
      return {
        ...balance,
        usdValue,
      };
    })
  );
  return enrichedData;
};
