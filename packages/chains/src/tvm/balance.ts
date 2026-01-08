// packages/chains/src/tvm/balance.ts

import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { TvmChainConfig } from './config.js';
import { formatSun, encodeBalanceOf, encodeDecimals, encodeSymbol, addressToHex } from './utils.js';

// ============ TronGrid API Response Types ============

interface TronAccountResponse {
  address?: string;
  balance?: number;
  create_time?: number;
  trc20?: Array<Record<string, string>>;
  assetV2?: Array<{ key: string; value: number }>;
  free_net_usage?: number;
  free_net_limit?: number;
  net_usage?: number;
  net_limit?: number;
  account_resource?: {
    energy_usage?: number;
    energy_limit?: number;
    frozen_balance_for_energy?: { frozen_balance: number };
  };
}

interface TriggerSmartContractResponse {
  result?: {
    result: boolean;
    message?: string;
  };
  constant_result?: string[];
  transaction?: unknown;
}

// ============ TVM Balance Fetcher ============

export class TvmBalanceFetcher implements IBalanceFetcher {
  constructor(private readonly config: TvmChainConfig) {}

  /**
   * Get native TRX balance for an address
   */
  async getNativeBalance(address: string): Promise<NativeBalance> {
    const url = `${this.config.rpcUrl}/v1/accounts/${address}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new RpcError(`Failed to fetch balance: ${response.statusText}`, this.config.chainAlias);
      }

      const data: { data?: TronAccountResponse[]; success?: boolean } = await response.json();

      // Account might not exist yet (balance = 0)
      const account = data.data?.[0];
      const balanceInSun = BigInt(account?.balance ?? 0);

      return {
        balance: balanceInSun.toString(),
        formattedBalance: formatSun(balanceInSun, this.config.nativeCurrency.decimals),
        symbol: this.config.nativeCurrency.symbol,
        decimals: this.config.nativeCurrency.decimals,
        isNative: true,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch native balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get TRC20 token balance for an address
   */
  async getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    try {
      // Get balance using triggerConstantContract
      const balanceData = encodeBalanceOf(address);
      const balanceResult = await this.triggerConstantContract(contractAddress, balanceData, address);

      const balance = balanceResult ? BigInt('0x' + balanceResult) : 0n;

      // Get decimals
      const decimalsData = encodeDecimals();
      const decimalsResult = await this.triggerConstantContract(contractAddress, decimalsData, address);
      const decimals = decimalsResult ? parseInt(decimalsResult, 16) : 18;

      // Get symbol
      const symbolData = encodeSymbol();
      const symbolResult = await this.triggerConstantContract(contractAddress, symbolData, address);
      const symbol = symbolResult ? this.decodeString(symbolResult) : 'TRC20';

      return {
        balance: balance.toString(),
        formattedBalance: this.formatTokenBalance(balance, decimals),
        symbol,
        decimals,
        contractAddress,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch token balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get account resources (bandwidth, energy)
   */
  async getAccountResources(address: string): Promise<{
    freeNetUsed: number;
    freeNetLimit: number;
    netUsed: number;
    netLimit: number;
    energyUsed: number;
    energyLimit: number;
  }> {
    const url = `${this.config.rpcUrl}/v1/accounts/${address}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new RpcError(`Failed to fetch account resources: ${response.statusText}`, this.config.chainAlias);
      }

      const data: { data?: TronAccountResponse[]; success?: boolean } = await response.json();
      const account = data.data?.[0];

      return {
        freeNetUsed: account?.free_net_usage ?? 0,
        freeNetLimit: account?.free_net_limit ?? 600,
        netUsed: account?.net_usage ?? 0,
        netLimit: account?.net_limit ?? 0,
        energyUsed: account?.account_resource?.energy_usage ?? 0,
        energyLimit: account?.account_resource?.energy_limit ?? 0,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch account resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get all TRC20 token balances for an address
   */
  async getTrc20Balances(address: string): Promise<Array<{ contractAddress: string; balance: string }>> {
    const url = `${this.config.rpcUrl}/v1/accounts/${address}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new RpcError(`Failed to fetch TRC20 balances: ${response.statusText}`, this.config.chainAlias);
      }

      const data: { data?: TronAccountResponse[]; success?: boolean } = await response.json();
      const account = data.data?.[0];

      if (!account?.trc20) {
        return [];
      }

      const balances: Array<{ contractAddress: string; balance: string }> = [];

      for (const token of account.trc20) {
        // Each token is an object with contract address as key
        for (const [contractAddress, balance] of Object.entries(token)) {
          balances.push({
            contractAddress,
            balance,
          });
        }
      }

      return balances;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch TRC20 balances: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  // ============ Private Methods ============

  /**
   * Call a constant smart contract function (read-only)
   */
  private async triggerConstantContract(
    contractAddress: string,
    data: string,
    ownerAddress: string
  ): Promise<string | null> {
    const url = `${this.config.rpcUrl}/wallet/triggerconstantcontract`;

    // Convert addresses to hex format
    const contractHex = contractAddress.startsWith('T') ? addressToHex(contractAddress) : contractAddress;
    const ownerHex = ownerAddress.startsWith('T') ? addressToHex(ownerAddress) : ownerAddress;

    const body = {
      contract_address: contractHex,
      function_selector: '',
      parameter: data.slice(8), // Remove function selector
      owner_address: ownerHex,
    };

    // If data is just a selector (8 chars), use function_selector format
    if (data.length <= 8) {
      body.function_selector = this.getSelectorName(data);
      body.parameter = '';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return null;
      }

      const result: TriggerSmartContractResponse = await response.json();

      if (!result.result?.result || !result.constant_result?.[0]) {
        return null;
      }

      return result.constant_result[0];
    } catch {
      return null;
    }
  }

  /**
   * Get function selector name from hex
   */
  private getSelectorName(selector: string): string {
    const selectorMap: Record<string, string> = {
      '70a08231': 'balanceOf(address)',
      '313ce567': 'decimals()',
      '95d89b41': 'symbol()',
      '06fdde03': 'name()',
      '18160ddd': 'totalSupply()',
    };
    return selectorMap[selector] ?? '';
  }

  /**
   * Decode a string from ABI-encoded hex
   */
  private decodeString(hex: string): string {
    // ABI string encoding: offset (32 bytes) + length (32 bytes) + data (padded to 32 bytes)
    if (hex.length < 128) {
      // Short encoding - try direct decode
      const trimmed = hex.replace(/^0+/, '').replace(/0+$/, '');
      if (trimmed.length > 0) {
        return Buffer.from(trimmed, 'hex').toString('utf8').replace(/\0/g, '');
      }
      return '';
    }

    try {
      // Skip offset (first 32 bytes = 64 chars)
      const lengthHex = hex.slice(64, 128);
      const length = parseInt(lengthHex, 16);

      if (length > 0 && length < 100) {
        const dataHex = hex.slice(128, 128 + length * 2);
        return Buffer.from(dataHex, 'hex').toString('utf8');
      }
    } catch {
      // Fallback: try direct decode
    }

    return '';
  }

  /**
   * Format token balance with decimals
   */
  private formatTokenBalance(balance: bigint, decimals: number): string {
    const divisor = 10n ** BigInt(decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');

    if (fractionalStr === '') {
      return wholePart.toString();
    }

    return `${wholePart}.${fractionalStr}`;
  }
}
