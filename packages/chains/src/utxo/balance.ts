// packages/chains/src/utxo/balance.ts

import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { ChainError } from '../core/errors.js';
import type { UtxoChainConfig } from './config.js';
import { BlockbookClient, type UTXO } from './blockbook-client.js';
import { formatSatoshis } from './utils.js';

// ============ UTXO Balance Fetcher ============

export class UtxoBalanceFetcher implements IBalanceFetcher {
  private readonly blockbook: BlockbookClient;

  constructor(private readonly config: UtxoChainConfig) {
    this.blockbook = new BlockbookClient(config.rpcUrl, config.chainAlias, { auth: config.auth });
  }

  async getNativeBalance(address: string): Promise<NativeBalance> {
    const info = await this.blockbook.getAddressInfo(address);

    const confirmedBalance = BigInt(info.balance);
    const unconfirmedBalance = BigInt(info.unconfirmedBalance);
    const totalBalance = confirmedBalance + unconfirmedBalance;

    return {
      isNative: true,
      balance: totalBalance.toString(),
      formattedBalance: formatSatoshis(totalBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }

  async getTokenBalance(_address: string, _contractAddress: string): Promise<TokenBalance> {
    throw new ChainError(
      'Token balance not supported for UTXO chains. Use dedicated Ordinals/BRC-20 indexers.',
      this.config.chainAlias
    );
  }

  /**
   * Get all UTXOs for an address
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    return this.blockbook.getUtxos(address);
  }

  /**
   * Get confirmed balance only (excluding unconfirmed)
   */
  async getConfirmedBalance(address: string): Promise<NativeBalance> {
    const info = await this.blockbook.getAddressInfo(address);
    const confirmedBalance = BigInt(info.balance);

    return {
      isNative: true,
      balance: confirmedBalance.toString(),
      formattedBalance: formatSatoshis(confirmedBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }

  /**
   * Get unconfirmed (pending) balance
   */
  async getUnconfirmedBalance(address: string): Promise<NativeBalance> {
    const info = await this.blockbook.getAddressInfo(address);
    const unconfirmedBalance = BigInt(info.unconfirmedBalance);

    return {
      isNative: true,
      balance: unconfirmedBalance.toString(),
      formattedBalance: formatSatoshis(unconfirmedBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }
}
