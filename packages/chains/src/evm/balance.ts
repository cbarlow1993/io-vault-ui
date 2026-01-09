// packages/chains/src/evm/balance.ts
import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import { mergeHeaders } from '../core/utils.js';
import type { EvmChainConfig } from './config.js';
import { formatUnits } from './utils.js';

export class EvmBalanceFetcher implements IBalanceFetcher {
  private readonly headers: Record<string, string>;

  constructor(private readonly config: EvmChainConfig) {
    this.headers = mergeHeaders({ 'Content-Type': 'application/json' }, config.auth);
  }

  async getNativeBalance(address: string): Promise<NativeBalance> {
    const result = await this.rpcCall('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(result);

    return {
      balance: balanceWei.toString(),
      formattedBalance: formatUnits(balanceWei, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
      isNative: true,
    };
  }

  async getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    // balanceOf(address)
    const balanceOfSelector = '0x70a08231';
    const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
    const balanceData = balanceOfSelector + paddedAddress;

    const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
      this.rpcCall('eth_call', [{ to: contractAddress, data: balanceData }, 'latest']),
      this.rpcCall('eth_call', [{ to: contractAddress, data: '0x313ce567' }, 'latest']), // decimals()
      this.rpcCall('eth_call', [{ to: contractAddress, data: '0x95d89b41' }, 'latest']), // symbol()
    ]);

    const balance = BigInt(balanceResult);
    const parsedDecimals = parseInt(decimalsResult, 16);
    const decimals = Number.isNaN(parsedDecimals) ? 18 : parsedDecimals;
    const symbol = this.decodeString(symbolResult);

    return {
      balance: balance.toString(),
      formattedBalance: formatUnits(balance, decimals),
      symbol,
      decimals,
      contractAddress,
    };
  }

  private async rpcCall(method: string, params: unknown[]): Promise<string> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`RPC request failed: ${response.statusText}`, this.config.chainAlias);
    }

    const json = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.config.chainAlias, json.error.code);
    }

    return json.result;
  }

  private decodeString(hex: string): string {
    if (hex === '0x' || hex.length < 66) return '';

    try {
      // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
      const lengthHex = hex.slice(66, 130);
      const length = parseInt(lengthHex, 16);
      const dataHex = hex.slice(130, 130 + length * 2);

      let result = '';
      for (let i = 0; i < dataHex.length; i += 2) {
        const charCode = parseInt(dataHex.slice(i, i + 2), 16);
        if (charCode > 0) result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }
}
