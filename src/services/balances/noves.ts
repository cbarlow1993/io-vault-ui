import type {
  EVMTranslateBalancesData,
  SVMTranslateTokenBalance,
  UTXOTranslateBalanceData,
  XRPLTranslateBalancesResponse,
} from '@noves/noves-sdk';
import { NovesXRPClient } from '@/src/lib/clients.js';
import { withPerformanceMonitoring } from '@/src/lib/performance-monitoring.js';
import type { ProviderTokenBalance } from '@/src/services/balances/index.js';

type XRPLTokenBalance = XRPLTranslateBalancesResponse['balances'][number];

type NovesTokenBalance =
  | SVMTranslateTokenBalance
  | EVMTranslateBalancesData
  | UTXOTranslateBalanceData
  | XRPLTokenBalance;

export const transformNovesTokenBalances = (
  balances: NovesTokenBalance[]
): ProviderTokenBalance[] => {
  return balances.map((balance) => ({
    balance: balance.balance.toString(),
    symbol: balance.token.symbol,
    decimals: balance.token.decimals,
    address: balance.token.address,
    name: balance.token.name,
    usdValue: 'usdValue' in balance ? (balance.usdValue ?? null) : null,
  }));
};

export const listXrpTokenBalances = async (
  chain: string,
  address: string
): Promise<XRPLTokenBalance[]> => {
  const response = await withPerformanceMonitoring(
    () => NovesXRPClient.getTokenBalances(chain, address),
    {
      endpoint: 'NovesXRP.getTokenBalances',
      requestParams: { chain, address },
    }
  );
  return response.balances;
};
