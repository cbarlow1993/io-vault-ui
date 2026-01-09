import type { IBalanceFetcher, NativeBalance, TokenBalance, Ecosystem } from '@io-vault/chains';
import type { BalanceFetcher, RawBalance } from './types.js';

/**
 * Adapter that wraps an IBalanceFetcher from the chains package
 * to implement the service layer BalanceFetcher interface.
 */
export class ChainsBalanceFetcherAdapter implements BalanceFetcher {
  constructor(
    private readonly fetcher: IBalanceFetcher,
    private readonly chain: string,
    private readonly network: string,
    private readonly ecosystem: Ecosystem
  ) {}

  getChain(): string {
    return this.chain;
  }

  getNetwork(): string {
    return this.network;
  }

  async getNativeBalance(address: string): Promise<RawBalance> {
    const native = await this.fetcher.getNativeBalance(address);
    return this.toRawBalance(address, native, null);
  }

  async getTokenBalances(
    address: string,
    tokens: Array<{ address: string; decimals: number; symbol: string; name: string }>
  ): Promise<RawBalance[]> {
    // UTXO chains don't support tokens - return empty immediately
    if (this.ecosystem === 'utxo') {
      return [];
    }

    // Fetch in parallel with error handling per token
    const promises = tokens.map(async (token) => {
      try {
        const balance = await this.fetcher.getTokenBalance(address, token.address);
        return this.toRawBalance(address, balance, token);
      } catch {
        return null; // Silent failure for individual tokens
      }
    });

    const balances = await Promise.all(promises);
    return balances.filter((b): b is RawBalance => b !== null);
  }

  private toRawBalance(
    userAddress: string,
    balance: NativeBalance | TokenBalance,
    tokenInfo: { address: string; name: string } | null
  ): RawBalance {
    const isNative = 'isNative' in balance && balance.isNative === true;
    return {
      address: userAddress,
      tokenAddress: isNative ? null : (balance as TokenBalance).contractAddress,
      isNative,
      balance: balance.balance,
      decimals: balance.decimals,
      symbol: balance.symbol,
      name: tokenInfo?.name ?? (balance as TokenBalance).name ?? balance.symbol,
    };
  }
}
