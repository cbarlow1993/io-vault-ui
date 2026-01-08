export interface RawBalance {
  address: string;
  tokenAddress: string | null; // null = native
  isNative: boolean;
  balance: string; // raw wei/lamports/satoshis
  decimals: number;
  symbol: string;
  name: string;
}

export interface BalanceFetcher {
  getChain(): string;
  getNetwork(): string;
  getNativeBalance(address: string): Promise<RawBalance>;
  getTokenBalances(
    address: string,
    tokens: Array<{ address: string; decimals: number; symbol: string; name: string }>
  ): Promise<RawBalance[]>;
}
