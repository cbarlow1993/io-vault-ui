import type { RpcClient } from '@/src/lib/rpc/types.js';
import type { BalanceFetcher, RawBalance } from '@/src/services/balances/fetchers/types.js';

// Multicall3 is deployed at same address across all EVM chains
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = '0x70a08231';

// Native token symbols per chain
const NATIVE_SYMBOLS: Record<string, { symbol: string; name: string; decimals: number }> = {
  ethereum: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  polygon: { symbol: 'POL', name: 'Polygon', decimals: 18 },
  arbitrum: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  optimism: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  base: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  avalanche: { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
  bsc: { symbol: 'BNB', name: 'BNB', decimals: 18 },
};

interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export class EVMBalanceFetcher implements BalanceFetcher {
  private readonly rpcClient: RpcClient;
  private readonly chain: string;
  private readonly network: string;

  constructor(rpcClient: RpcClient, chain: string, network: string) {
    this.rpcClient = rpcClient;
    this.chain = chain;
    this.network = network;
  }

  getChain(): string {
    return this.chain;
  }

  getNetwork(): string {
    return this.network;
  }

  async getNativeBalance(address: string): Promise<RawBalance> {
    const balanceHex = await this.rpcClient.call<string>('eth_getBalance', [
      address,
      'latest',
    ]);

    const nativeInfo = NATIVE_SYMBOLS[this.chain] ?? {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    };

    return {
      address,
      tokenAddress: null,
      isNative: true,
      balance: hexToBigIntString(balanceHex),
      decimals: nativeInfo.decimals,
      symbol: nativeInfo.symbol,
      name: nativeInfo.name,
    };
  }

  async getTokenBalances(address: string, tokens: TokenInfo[]): Promise<RawBalance[]> {
    if (tokens.length === 0) {
      return [];
    }

    // Try multicall first, fallback to individual calls
    try {
      return await this.getTokenBalancesMulticall(address, tokens);
    } catch {
      // Fallback to individual calls
      return await this.getTokenBalancesIndividual(address, tokens);
    }
  }

  private async getTokenBalancesMulticall(
    address: string,
    tokens: TokenInfo[]
  ): Promise<RawBalance[]> {
    // Encode aggregate3 call data
    const calldata = this.encodeAggregate3(address, tokens);

    const result = await this.rpcClient.call<string>('eth_call', [
      {
        to: MULTICALL3_ADDRESS,
        data: calldata,
      },
      'latest',
    ]);

    // Decode results
    return this.decodeAggregate3Results(address, tokens, result);
  }

  private encodeAggregate3(_address: string, _tokens: TokenInfo[]): string {
    // Multicall3.aggregate3 encoding is complex
    // For now, throw to use the fallback individual calls path
    throw new Error('Multicall encoding not implemented - using fallback');
  }

  private decodeAggregate3Results(
    _address: string,
    _tokens: TokenInfo[],
    _result: string
  ): RawBalance[] {
    // Multicall3 result decoding
    // Placeholder - would decode (bool success, bytes returnData)[] results
    throw new Error('Multicall decoding not implemented');
  }

  private async getTokenBalancesIndividual(
    address: string,
    tokens: TokenInfo[]
  ): Promise<RawBalance[]> {
    // Encode balanceOf call for each token
    const paddedAddress = address.toLowerCase().slice(2).padStart(64, '0');
    const calldata = BALANCE_OF_SELECTOR + paddedAddress;

    // Fetch all balances in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const balanceHex = await this.rpcClient.call<string>('eth_call', [
          {
            to: token.address,
            data: calldata,
          },
          'latest',
        ]);

        return {
          address,
          tokenAddress: token.address,
          isNative: false,
          balance: hexToBigIntString(balanceHex),
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
        } satisfies RawBalance;
      })
    );

    // Filter out failed results and extract successful ones
    const balances: RawBalance[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        balances.push(result.value);
      }
      // Failed token balance fetches are silently ignored
      // In production, we might want to log these failures
    }

    return balances;
  }
}

/**
 * Convert a hex string (with or without 0x prefix) to a BigInt string
 */
function hexToBigIntString(hex: string): string {
  if (!hex || hex === '0x' || hex === '0x0') {
    return '0';
  }

  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length === 0) {
    return '0';
  }

  try {
    return BigInt('0x' + cleanHex).toString();
  } catch {
    return '0';
  }
}
