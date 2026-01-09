// packages/chains/src/xrp/provider.ts

import type {
  IChainProvider,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  UnsignedTransaction,
  NormalisedTransaction,
  RawXrpTransaction,
} from '../core/interfaces.js';
import type {
  XrpChainAlias,
  NativeBalance,
  TokenBalance,
  FeeEstimate,
  DecodeFormat,
  TransactionResult,
} from '../core/types.js';
import { type XrpChainConfig, getXrpChainConfig } from './config.js';
import { RpcError, ContractError } from '../core/errors.js';
import { XrpBalanceFetcher, type AccountInfo, type TrustLine } from './balance.js';
import {
  UnsignedXrpTransaction,
  buildXrpTransfer,
  buildIssuedCurrencyTransfer,
  buildTrustSet,
  parseTransaction,
} from './transaction-builder.js';
import { isValidXrpAddress, formatDrops, parseDrops, XRP_DECIMALS } from './utils.js';

/**
 * XRP Chain Provider
 *
 * Implements IChainProvider for XRP Ledger
 */
export class XrpChainProvider implements IChainProvider {
  readonly config: XrpChainConfig;
  readonly chainAlias: XrpChainAlias;
  private readonly balanceFetcher: XrpBalanceFetcher;

  constructor(chainAlias: XrpChainAlias, rpcUrl?: string) {
    this.config = getXrpChainConfig(chainAlias, rpcUrl ? { rpcUrl } : undefined);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new XrpBalanceFetcher(this.config);
  }

  get ecosystem(): string {
    return 'xrp';
  }

  validateAddress(address: string): boolean {
    return isValidXrpAddress(address);
  }

  async getNativeBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getNativeBalance(address);
  }

  async getTokenBalance(address: string, tokenIdentifier: string): Promise<TokenBalance> {
    // Token identifier format: "currency:issuer" (e.g., "USD:rIssuerAddress")
    const [currency, issuer] = tokenIdentifier.split(':');
    if (!currency || !issuer) {
      throw new RpcError(
        'Invalid token identifier. Expected format: "currency:issuer"',
        this.config.chainAlias
      );
    }

    const balance = await this.balanceFetcher.getIssuedCurrencyBalance(address, currency, issuer);
    return {
      balance: balance.balance,
      formattedBalance: balance.formattedBalance,
      symbol: balance.symbol,
      decimals: balance.decimals,
      isNative: false,
      contractAddress: `${balance.currency}:${balance.issuer}`,
    };
  }

  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    const { from, to, value, overrides } = params;
    const amount = BigInt(value);

    if (!isValidXrpAddress(from)) {
      throw new RpcError(`Invalid XRP address: ${from}`, this.config.chainAlias);
    }
    if (!isValidXrpAddress(to)) {
      throw new RpcError(`Invalid XRP address: ${to}`, this.config.chainAlias);
    }

    // Get account info for sequence number
    const accountInfo = await this.balanceFetcher.getAccountInfo(from);
    if (!accountInfo.exists) {
      throw new RpcError(`Account not found: ${from}`, this.config.chainAlias);
    }

    // Get current fee
    const feeInfo = await this.balanceFetcher.getFee();

    // Get current ledger for LastLedgerSequence
    const ledgerIndex = await this.balanceFetcher.getLedgerIndex();

    const xrpOverrides = overrides as { fee?: string; sequence?: number; maxLedgerVersionOffset?: number } | undefined;
    const fee = xrpOverrides?.fee ?? feeInfo.baseFee;
    const sequence = xrpOverrides?.sequence ?? accountInfo.sequence;
    const lastLedgerSequence = ledgerIndex + (xrpOverrides?.maxLedgerVersionOffset ?? 20);

    return buildXrpTransfer(
      this.config,
      from,
      to,
      amount,
      fee,
      sequence,
      lastLedgerSequence
    );
  }

  async buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction> {
    const { from, to, contractAddress: tokenIdentifier, value, overrides } = params;

    if (!isValidXrpAddress(from)) {
      throw new RpcError(`Invalid XRP address: ${from}`, this.config.chainAlias);
    }
    if (!isValidXrpAddress(to)) {
      throw new RpcError(`Invalid XRP address: ${to}`, this.config.chainAlias);
    }

    // Token identifier format: "currency:issuer"
    const [currency, issuer] = tokenIdentifier.split(':');
    if (!currency || !issuer) {
      throw new RpcError(
        'Invalid token identifier. Expected format: "currency:issuer"',
        this.config.chainAlias
      );
    }

    // Get account info for sequence number
    const accountInfo = await this.balanceFetcher.getAccountInfo(from);
    if (!accountInfo.exists) {
      throw new RpcError(`Account not found: ${from}`, this.config.chainAlias);
    }

    // Get current fee
    const feeInfo = await this.balanceFetcher.getFee();

    // Get current ledger for LastLedgerSequence
    const ledgerIndex = await this.balanceFetcher.getLedgerIndex();

    const xrpOverrides = overrides as { fee?: string; sequence?: number; maxLedgerVersionOffset?: number } | undefined;
    const fee = xrpOverrides?.fee ?? feeInfo.baseFee;
    const sequence = xrpOverrides?.sequence ?? accountInfo.sequence;
    const lastLedgerSequence = ledgerIndex + (xrpOverrides?.maxLedgerVersionOffset ?? 20);

    return buildIssuedCurrencyTransfer(
      this.config,
      from,
      to,
      currency,
      issuer,
      value,
      fee,
      sequence,
      lastLedgerSequence
    );
  }

  // ============ ITransactionBuilder Methods ============

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawXrpTransaction : NormalisedTransaction {
    const tx = parseTransaction(this.config, serialized);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawXrpTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawXrpTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    const feeInfo = await this.balanceFetcher.getFee();
    const baseFee = BigInt(feeInfo.baseFee);
    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    // XRP fees are relatively flat, but we still provide tiers
    const slowFee = baseFee;
    const standardFee = baseFee * 2n;
    const fastFee = baseFee * 5n;

    return {
      slow: {
        fee: slowFee.toString(),
        formattedFee: `${formatDrops(slowFee)} ${symbol}`,
      },
      standard: {
        fee: standardFee.toString(),
        formattedFee: `${formatDrops(standardFee)} ${symbol}`,
      },
      fast: {
        fee: fastFee.toString(),
        formattedFee: `${formatDrops(fastFee)} ${symbol}`,
      },
    };
  }

  async estimateGas(_params: ContractCallParams): Promise<string> {
    // XRP doesn't have gas concept - fees are fixed in drops
    const feeInfo = await this.balanceFetcher.getFee();
    return feeInfo.baseFee;
  }

  // ============ IContractInteraction Methods ============

  async contractRead(_params: ContractReadParams): Promise<ContractReadResult> {
    throw new ContractError('Contract read operations are not supported on XRP Ledger', this.config.chainAlias);
  }

  async contractCall(_params: ContractCallParams): Promise<UnsignedTransaction> {
    throw new ContractError(
      'Contract call operations are not supported on XRP Ledger',
      this.config.chainAlias
    );
  }

  async contractDeploy(_params: ContractDeployParams): Promise<DeployedContract> {
    throw new ContractError(
      'Contract deployment is not supported on XRP Ledger',
      this.config.chainAlias
    );
  }

  // ============ ITransactionFetcher Methods ============

  async getTransaction(hash: string): Promise<TransactionResult> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tx',
          params: [{ transaction: hash }],
        }),
      });

      if (!response.ok) {
        throw new RpcError(`HTTP ${response.status}: ${response.statusText}`, this.config.chainAlias);
      }

      const json = (await response.json()) as {
        result?: {
          validated: boolean;
          meta?: {
            TransactionResult: string;
          };
          hash: string;
          Account?: string;
          Destination?: string;
          Amount?: string | { currency: string; issuer: string; value: string };
          Fee?: string;
          date?: number;
          ledger_index?: number;
        };
        error?: string;
        error_message?: string;
      };

      if (json.error === 'txnNotFound') {
        throw new RpcError(`Transaction not found: ${hash}`, this.config.chainAlias);
      }

      if (json.error) {
        throw new RpcError(json.error_message ?? json.error, this.config.chainAlias);
      }

      const result = json.result!;
      const txResult = result.meta?.TransactionResult ?? '';

      let status: 'pending' | 'confirmed' | 'failed';
      if (!result.validated) {
        status = 'pending';
      } else if (txResult === 'tesSUCCESS') {
        status = 'confirmed';
      } else {
        status = 'failed';
      }

      // Determine value
      let value = '0';
      if (result.Amount) {
        if (typeof result.Amount === 'string') {
          value = result.Amount;
        } else {
          value = result.Amount.value;
        }
      }

      return {
        chainAlias: this.chainAlias,
        raw: {
          _chain: 'xrp',
          hash: result.hash,
          result: result,
        },
        normalized: {
          hash: result.hash,
          status,
          blockNumber: result.ledger_index ?? null,
          blockHash: null,
          timestamp: result.date ? result.date + 946684800 : null, // XRP epoch starts at 2000-01-01
          from: result.Account ?? '',
          to: result.Destination ?? null,
          value,
          fee: result.Fee ?? '0',
          confirmations: result.validated ? 1 : 0,
          finalized: result.validated ?? false,
          tokenTransfers: [],
          internalTransactions: [],
          hasFullTokenData: false,
          hasFullInternalData: false,
        },
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  // ============ XRP-specific Methods ============

  /**
   * Get account info including sequence number and reserves
   */
  async getAccountInfo(address: string): Promise<AccountInfo> {
    return this.balanceFetcher.getAccountInfo(address);
  }

  /**
   * Get all trust lines for an account
   */
  async getTrustLines(address: string): Promise<TrustLine[]> {
    return this.balanceFetcher.getTrustLines(address);
  }

  /**
   * Build trust set transaction to create/modify a trust line
   */
  async buildTrustSet(
    from: string,
    currency: string,
    issuer: string,
    limit: string
  ): Promise<UnsignedTransaction> {
    if (!isValidXrpAddress(from)) {
      throw new RpcError(`Invalid XRP address: ${from}`, this.config.chainAlias);
    }
    if (!isValidXrpAddress(issuer)) {
      throw new RpcError(`Invalid XRP address: ${issuer}`, this.config.chainAlias);
    }

    const accountInfo = await this.balanceFetcher.getAccountInfo(from);
    if (!accountInfo.exists) {
      throw new RpcError(`Account not found: ${from}`, this.config.chainAlias);
    }

    const feeInfo = await this.balanceFetcher.getFee();
    const ledgerIndex = await this.balanceFetcher.getLedgerIndex();

    return buildTrustSet(this.config, {
      from,
      currency,
      issuer,
      limit,
      fee: feeInfo.baseFee,
      sequence: accountInfo.sequence,
      lastLedgerSequence: ledgerIndex + 20,
    });
  }

  /**
   * Get current ledger index
   */
  async getLedgerIndex(): Promise<number> {
    return this.balanceFetcher.getLedgerIndex();
  }
}
