// packages/chains/src/utxo/balance.ts

import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { RpcError, ChainError } from '../core/errors.js';
import type { UtxoChainConfig } from './config.js';
import { formatSatoshis, type UTXO } from './utils.js';

// ============ Esplora API Response Types ============

interface EsploraUtxo {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
}

interface EsploraAddressStats {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

// ============ UTXO Balance Fetcher ============

export class UtxoBalanceFetcher implements IBalanceFetcher {
  constructor(private readonly config: UtxoChainConfig) {}

  async getNativeBalance(address: string): Promise<NativeBalance> {
    // Esplora API: GET /address/:address
    const url = `${this.config.rpcUrl}/address/${address}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new RpcError(`Failed to fetch balance: ${response.statusText}`, this.config.chainAlias);
    }

    const data: EsploraAddressStats = await response.json();

    // Calculate balance from chain_stats and mempool_stats
    const chainBalance = BigInt(data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
    const mempoolBalance = BigInt(data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);
    const totalBalance = chainBalance + mempoolBalance;

    return {
      balance: totalBalance.toString(),
      formattedBalance: formatSatoshis(totalBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }

  async getTokenBalance(_address: string, _contractAddress: string): Promise<TokenBalance> {
    // Bitcoin doesn't have native token support like EVM chains
    // Ordinals/BRC-20 would need special handling
    throw new ChainError(
      'Token balance not supported for UTXO chains. Use dedicated Ordinals/BRC-20 indexers.',
      this.config.chainAlias
    );
  }

  /**
   * Get all UTXOs for an address
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    // Esplora API: GET /address/:address/utxo
    const url = `${this.config.rpcUrl}/address/${address}/utxo`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new RpcError(`Failed to fetch UTXOs: ${response.statusText}`, this.config.chainAlias);
    }

    const data: EsploraUtxo[] = await response.json();

    return data.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: BigInt(utxo.value),
      scriptPubKey: '', // Would need to fetch from tx details
      address,
      confirmations: utxo.status.confirmed ? 1 : 0, // Simplified
    }));
  }

  /**
   * Get confirmed balance only (excluding mempool)
   */
  async getConfirmedBalance(address: string): Promise<NativeBalance> {
    const url = `${this.config.rpcUrl}/address/${address}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new RpcError(`Failed to fetch balance: ${response.statusText}`, this.config.chainAlias);
    }

    const data: EsploraAddressStats = await response.json();
    const confirmedBalance = BigInt(data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);

    return {
      balance: confirmedBalance.toString(),
      formattedBalance: formatSatoshis(confirmedBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }

  /**
   * Get pending (mempool) balance
   */
  async getPendingBalance(address: string): Promise<NativeBalance> {
    const url = `${this.config.rpcUrl}/address/${address}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new RpcError(`Failed to fetch balance: ${response.statusText}`, this.config.chainAlias);
    }

    const data: EsploraAddressStats = await response.json();
    const pendingBalance = BigInt(data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);

    return {
      balance: pendingBalance.toString(),
      formattedBalance: formatSatoshis(pendingBalance, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }
}
