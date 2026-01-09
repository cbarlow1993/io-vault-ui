// packages/chains/src/xrp/balance.ts

import type { XrpChainConfig } from './config.js';
import type { IssuedCurrencyAmount } from './utils.js';
import { RpcError } from '../core/errors.js';
import { mergeHeaders } from '../core/utils.js';
import { isValidXrpAddress, formatDrops, decodeCurrencyCode, XRP_DECIMALS } from './utils.js';

/**
 * XRP balance result
 */
export interface XrpBalance {
  balance: string;
  formattedBalance: string;
  symbol: string;
  decimals: number;
  isNative: true;
  address: string;
  ownerCount: number;
  reserveBase: string;
  reserveOwner: string;
  availableBalance: string;
}

/**
 * Issued currency balance result
 */
export interface IssuedCurrencyBalance {
  balance: string;
  formattedBalance: string;
  symbol: string;
  decimals: number;
  isNative: false;
  currency: string;
  issuer: string;
  address: string;
}

/**
 * Account info from XRP Ledger
 */
export interface AccountInfo {
  exists: boolean;
  balance: bigint;
  ownerCount: number;
  sequence: number;
  previousTxnID?: string;
  previousTxnLgrSeq?: number;
  flags?: number;
}

/**
 * Trust line info
 */
export interface TrustLine {
  account: string;
  issuer: string; // Same as account, for clarity
  balance: string;
  currency: string;
  limit: string;
  limit_peer: string;
  quality_in: number;
  quality_out: number;
  no_ripple?: boolean;
  no_ripple_peer?: boolean;
  freeze?: boolean;
  freeze_peer?: boolean;
}

/**
 * Server info
 */
export interface ServerInfo {
  buildVersion: string;
  completeLedgers: string;
  hostId: string;
  validatedLedgerIndex: number;
  loadFactor: number;
  peers: number;
  serverState: string;
}

/**
 * XRP Balance Fetcher
 */
export class XrpBalanceFetcher {
  private readonly headers: Record<string, string>;

  constructor(private readonly config: XrpChainConfig) {
    this.headers = mergeHeaders({ 'Content-Type': 'application/json' }, config.auth);
  }

  /**
   * Make JSON-RPC call to XRP node
   */
  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`HTTP ${response.status}: ${response.statusText}`, this.config.chainAlias);
    }

    const json = (await response.json()) as {
      result?: T & { status?: string; error?: string; error_message?: string };
      error?: string;
      error_message?: string;
    };

    if (json.error) {
      throw new RpcError(json.error_message || json.error, this.config.chainAlias);
    }

    if (json.result?.status === 'error') {
      // actNotFound is not an error for balance queries - account just doesn't exist yet
      if (json.result.error === 'actNotFound') {
        return json.result;
      }
      throw new RpcError(json.result.error_message || json.result.error || 'Unknown error', this.config.chainAlias);
    }

    return json.result as T;
  }

  /**
   * Get native XRP balance
   */
  async getNativeBalance(address: string): Promise<XrpBalance> {
    if (!isValidXrpAddress(address)) {
      throw new RpcError(`Invalid XRP address: ${address}`, this.config.chainAlias);
    }

    try {
      const result = await this.rpcCall<{
        account_data?: {
          Account: string;
          Balance: string;
          OwnerCount: number;
          Sequence: number;
          Flags?: number;
        };
        error?: string;
      }>('account_info', [{ account: address, ledger_index: 'validated' }]);

      if (result.error === 'actNotFound' || !result.account_data) {
        // Account doesn't exist yet
        return {
          balance: '0',
          formattedBalance: '0',
          symbol: this.config.nativeCurrency.symbol,
          decimals: this.config.nativeCurrency.decimals,
          isNative: true,
          address,
          ownerCount: 0,
          reserveBase: this.config.reserveBase.toString(),
          reserveOwner: '0',
          availableBalance: '0',
        };
      }

      const balanceDrops = BigInt(result.account_data.Balance);
      const ownerCount = result.account_data.OwnerCount || 0;
      const reserveOwner = this.config.reserveIncrement * BigInt(ownerCount);
      const totalReserve = this.config.reserveBase + reserveOwner;
      const available = balanceDrops > totalReserve ? balanceDrops - totalReserve : 0n;

      return {
        balance: balanceDrops.toString(),
        formattedBalance: formatDrops(balanceDrops),
        symbol: this.config.nativeCurrency.symbol,
        decimals: this.config.nativeCurrency.decimals,
        isNative: true,
        address,
        ownerCount,
        reserveBase: this.config.reserveBase.toString(),
        reserveOwner: reserveOwner.toString(),
        availableBalance: available.toString(),
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
   * Get account info
   */
  async getAccountInfo(address: string): Promise<AccountInfo> {
    if (!isValidXrpAddress(address)) {
      throw new RpcError(`Invalid XRP address: ${address}`, this.config.chainAlias);
    }

    try {
      const result = await this.rpcCall<{
        account_data?: {
          Account: string;
          Balance: string;
          OwnerCount: number;
          Sequence: number;
          Flags?: number;
          PreviousTxnID?: string;
          PreviousTxnLgrSeq?: number;
        };
        error?: string;
      }>('account_info', [{ account: address, ledger_index: 'validated' }]);

      if (result.error === 'actNotFound' || !result.account_data) {
        return {
          exists: false,
          balance: 0n,
          ownerCount: 0,
          sequence: 0,
        };
      }

      return {
        exists: true,
        balance: BigInt(result.account_data.Balance),
        ownerCount: result.account_data.OwnerCount || 0,
        sequence: result.account_data.Sequence,
        previousTxnID: result.account_data.PreviousTxnID,
        previousTxnLgrSeq: result.account_data.PreviousTxnLgrSeq,
        flags: result.account_data.Flags,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch account info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get trust lines (issued currency balances)
   */
  async getTrustLines(address: string): Promise<TrustLine[]> {
    if (!isValidXrpAddress(address)) {
      throw new RpcError(`Invalid XRP address: ${address}`, this.config.chainAlias);
    }

    try {
      const result = await this.rpcCall<{
        lines?: Array<{
          account: string;
          balance: string;
          currency: string;
          limit: string;
          limit_peer: string;
          quality_in: number;
          quality_out: number;
          no_ripple?: boolean;
          no_ripple_peer?: boolean;
          freeze?: boolean;
          freeze_peer?: boolean;
        }>;
        error?: string;
      }>('account_lines', [{ account: address, ledger_index: 'validated' }]);

      if (result.error === 'actNotFound' || !result.lines) {
        return [];
      }

      return result.lines.map((line) => ({
        account: line.account,
        issuer: line.account, // issuer is same as account
        balance: line.balance,
        currency: line.currency,
        limit: line.limit,
        limit_peer: line.limit_peer,
        quality_in: line.quality_in,
        quality_out: line.quality_out,
        no_ripple: line.no_ripple,
        no_ripple_peer: line.no_ripple_peer,
        freeze: line.freeze,
        freeze_peer: line.freeze_peer,
      }));
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch trust lines: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get balance for a specific issued currency
   */
  async getIssuedCurrencyBalance(
    address: string,
    currency: string,
    issuer: string
  ): Promise<IssuedCurrencyBalance> {
    const trustLines = await this.getTrustLines(address);

    const line = trustLines.find(
      (l) =>
        l.account === issuer &&
        (l.currency === currency ||
          (l.currency.length === 40 && decodeCurrencyCode(l.currency) === currency))
    );

    const balance = line ? line.balance : '0';
    const symbol = currency.length <= 3 ? currency : decodeCurrencyCode(currency);

    return {
      balance,
      formattedBalance: balance, // Issued currencies typically have 15 significant digits
      symbol,
      decimals: 15, // XRP issued currencies have up to 15 significant digits
      isNative: false,
      currency,
      issuer,
      address,
    };
  }

  /**
   * Get all issued currency balances
   */
  async getAllIssuedCurrencyBalances(address: string): Promise<IssuedCurrencyBalance[]> {
    const trustLines = await this.getTrustLines(address);

    return trustLines.map((line) => ({
      balance: line.balance,
      formattedBalance: line.balance,
      symbol: line.currency.length <= 3 ? line.currency : decodeCurrencyCode(line.currency),
      decimals: 15,
      isNative: false,
      currency: line.currency,
      issuer: line.account,
      address,
    }));
  }

  /**
   * Get server info
   */
  async getServerInfo(): Promise<ServerInfo> {
    try {
      const result = await this.rpcCall<{
        info: {
          build_version: string;
          complete_ledgers: string;
          hostid: string;
          validated_ledger?: {
            seq: number;
          };
          load_factor: number;
          peers: number;
          server_state: string;
        };
      }>('server_info', [{}]);

      return {
        buildVersion: result.info.build_version,
        completeLedgers: result.info.complete_ledgers,
        hostId: result.info.hostid,
        validatedLedgerIndex: result.info.validated_ledger?.seq || 0,
        loadFactor: result.info.load_factor,
        peers: result.info.peers,
        serverState: result.info.server_state,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch server info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get current validated ledger index
   */
  async getLedgerIndex(): Promise<number> {
    try {
      const result = await this.rpcCall<{
        ledger_index?: number;
        ledger_current_index?: number;
        ledger?: {
          ledger_index?: number;
        };
      }>('ledger', [{ ledger_index: 'validated' }]);

      return result.ledger_index || result.ledger_current_index || result.ledger?.ledger_index || 0;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch ledger index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get current fee
   */
  async getFee(): Promise<{ baseFee: string; loadFactor: number; openLedgerFee: string }> {
    try {
      const result = await this.rpcCall<{
        current_ledger_size: string;
        current_queue_size: string;
        drops: {
          base_fee: string;
          median_fee: string;
          minimum_fee: string;
          open_ledger_fee: string;
        };
        expected_ledger_size: string;
        ledger_current_index: number;
        levels: {
          median_level: string;
          minimum_level: string;
          open_ledger_level: string;
          reference_level: string;
        };
        max_queue_size: string;
      }>('fee', [{}]);

      return {
        baseFee: result.drops.base_fee,
        loadFactor: parseInt(result.levels.open_ledger_level, 10) / parseInt(result.levels.reference_level, 10),
        openLedgerFee: result.drops.open_ledger_fee,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch fee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }
}
