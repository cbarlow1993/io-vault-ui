// packages/chains/src/substrate/provider.ts

import type {
  SubstrateChainAlias,
  NativeBalance,
  TokenBalance,
  FeeEstimate,
  DecodeFormat,
  TransactionResult,
} from '../core/types.js';
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
  RawSubstrateTransaction,
} from '../core/interfaces.js';
import type { SubstrateChainConfig } from './config.js';
import { getSubstrateChainConfig } from './config.js';
import { SubstrateBalanceFetcher, type SubstrateAccountInfo } from './balance.js';
import { SubstrateTransactionBuilder, buildSubstrateTransfer, buildSubstrateTransferAllowDeath } from './transaction-builder.js';
import { isValidSubstrateAddress, formatPlanck } from './utils.js';
import { RpcError, ContractError } from '../core/errors.js';

/**
 * Substrate Chain Provider
 * Provides functionality for Substrate-based chains (Bittensor, Polkadot, etc.)
 */
export class SubstrateChainProvider implements IChainProvider {
  readonly config: SubstrateChainConfig;
  readonly chainAlias: SubstrateChainAlias;
  private readonly balanceFetcher: SubstrateBalanceFetcher;

  constructor(chainAlias: SubstrateChainAlias, rpcUrl?: string) {
    this.config = getSubstrateChainConfig(chainAlias, rpcUrl ? { rpcUrl } : undefined);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new SubstrateBalanceFetcher(this.config);
  }

  /**
   * Get ecosystem identifier
   */
  get ecosystem(): string {
    return 'substrate';
  }

  /**
   * Validate a Substrate address
   */
  validateAddress(address: string): boolean {
    return isValidSubstrateAddress(address, this.config.ss58Prefix);
  }

  // ============ IBalanceFetcher Methods ============

  async getNativeBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getNativeBalance(address);
  }

  async getTokenBalance(_address: string, _tokenAddress: string): Promise<TokenBalance> {
    throw new ContractError('Token balances not supported on native Substrate chains', this.config.chainAlias);
  }

  // ============ ITransactionBuilder Methods ============

  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    const { from, to, value, overrides } = params;
    const amount = BigInt(value);

    if (!this.validateAddress(from)) {
      throw new RpcError(`Invalid Substrate address: ${from}`, this.config.chainAlias);
    }
    if (!this.validateAddress(to)) {
      throw new RpcError(`Invalid Substrate address: ${to}`, this.config.chainAlias);
    }

    const accountInfo = await this.balanceFetcher.getAccountInfo(from);
    const runtimeVersion = await this.balanceFetcher.getRuntimeVersion();
    const genesisHash = await this.balanceFetcher.getGenesisHash();
    const blockNumber = await this.balanceFetcher.getBlockNumber();

    // Use current block hash for mortal transactions
    const blockHash = await this.getBlockHash(blockNumber);

    const substrateOverrides = overrides as { tip?: bigint; nonce?: number } | undefined;
    const tip = substrateOverrides?.tip ?? 0n;
    const nonce = substrateOverrides?.nonce ?? accountInfo.nonce;

    return buildSubstrateTransfer(
      this.config,
      from,
      to,
      amount,
      nonce,
      tip,
      runtimeVersion.specVersion,
      runtimeVersion.transactionVersion,
      genesisHash,
      blockHash,
      false
    );
  }

  async buildTokenTransfer(_params: TokenTransferParams): Promise<UnsignedTransaction> {
    throw new ContractError('Token transfers not supported on native Substrate chains', this.config.chainAlias);
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawSubstrateTransaction : NormalisedTransaction {
    // Parse serialized transaction
    const raw = JSON.parse(serialized) as RawSubstrateTransaction;

    if (format === 'raw') {
      return raw as F extends 'raw' ? RawSubstrateTransaction : NormalisedTransaction;
    }

    // Return normalised format
    const symbol = this.config.nativeCurrency.symbol;
    return {
      chainAlias: this.chainAlias,
      type: 'native-transfer',
      from: raw.address,
      to: null,
      value: '0',
      formattedValue: '0',
      symbol,
      metadata: {
        nonce: raw.nonce,
        isContractDeployment: false,
      },
    } as F extends 'raw' ? RawSubstrateTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    // Substrate fees are generally very low and predictable
    const baseFee = 10000000n; // 0.01 TAO
    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    return {
      slow: {
        fee: baseFee.toString(),
        formattedFee: `${formatPlanck(baseFee, decimals)} ${symbol}`,
      },
      standard: {
        fee: (baseFee * 2n).toString(),
        formattedFee: `${formatPlanck(baseFee * 2n, decimals)} ${symbol}`,
      },
      fast: {
        fee: (baseFee * 5n).toString(),
        formattedFee: `${formatPlanck(baseFee * 5n, decimals)} ${symbol}`,
      },
    };
  }

  async estimateGas(_params: ContractCallParams): Promise<string> {
    // Substrate doesn't have gas concept for native transfers
    return '10000000';
  }

  // ============ IContractInteraction Methods ============

  async contractRead(_params: ContractReadParams): Promise<ContractReadResult> {
    throw new ContractError('Smart contracts are not supported on this Substrate chain', this.config.chainAlias);
  }

  async contractCall(_params: ContractCallParams): Promise<UnsignedTransaction> {
    throw new ContractError('Smart contracts are not supported on this Substrate chain', this.config.chainAlias);
  }

  async contractDeploy(_params: ContractDeployParams): Promise<DeployedContract> {
    throw new ContractError('Smart contracts are not supported on this Substrate chain', this.config.chainAlias);
  }

  // ============ ITransactionFetcher Methods ============

  async getTransaction(hash: string): Promise<TransactionResult> {
    try {
      // Query events for the transaction
      const blockHash = await this.rpcCall<string | null>('chain_getBlockHash', []);

      let status: 'pending' | 'confirmed' | 'failed' = 'pending';

      if (blockHash) {
        const block = await this.rpcCall<{
          block: {
            extrinsics: string[];
          };
        }>('chain_getBlock', [blockHash]);

        // Check if our transaction hash is in the block
        const found = block.block.extrinsics.some((ext) => {
          return ext.includes(hash.slice(2, 18));
        });

        if (found) {
          status = 'confirmed';
        }
      }

      return {
        chainAlias: this.chainAlias,
        raw: {
          _chain: 'substrate',
          hash,
          result: { status },
        },
        normalized: {
          hash,
          status,
          blockNumber: null,
          blockHash: blockHash ?? null,
          timestamp: null,
          from: '',
          to: null,
          value: '0',
          fee: '0',
          confirmations: status === 'confirmed' ? 1 : 0,
          finalized: status === 'confirmed',
          tokenTransfers: [],
          internalTransactions: [],
          hasFullTokenData: false,
          hasFullInternalData: false,
        },
      };
    } catch {
      return {
        chainAlias: this.chainAlias,
        raw: {
          _chain: 'substrate',
          hash,
          result: { status: 'pending' },
        },
        normalized: {
          hash,
          status: 'pending',
          blockNumber: null,
          blockHash: null,
          timestamp: null,
          from: '',
          to: null,
          value: '0',
          fee: '0',
          confirmations: 0,
          finalized: false,
          tokenTransfers: [],
          internalTransactions: [],
          hasFullTokenData: false,
          hasFullInternalData: false,
        },
      };
    }
  }

  // Substrate-specific methods

  /**
   * Get account info
   */
  async getAccountInfo(address: string): Promise<SubstrateAccountInfo> {
    return this.balanceFetcher.getAccountInfo(address);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return this.balanceFetcher.getBlockNumber();
  }

  /**
   * Get genesis hash
   */
  async getGenesisHash(): Promise<string> {
    return this.balanceFetcher.getGenesisHash();
  }

  /**
   * Get runtime version
   */
  async getRuntimeVersion(): Promise<{
    specName: string;
    specVersion: number;
    transactionVersion: number;
  }> {
    return this.balanceFetcher.getRuntimeVersion();
  }

  /**
   * Get block hash by number
   */
  async getBlockHash(blockNumber: number): Promise<string> {
    try {
      return await this.rpcCall<string>('chain_getBlockHash', [blockNumber]);
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch block hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Get finalized head hash
   */
  async getFinalizedHead(): Promise<string> {
    try {
      return await this.rpcCall<string>('chain_getFinalizedHead', []);
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch finalized head: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.chainAlias
      );
    }
  }

  /**
   * Make JSON-RPC call
   */
  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    let httpUrl = this.config.rpcUrl;
    if (httpUrl.startsWith('wss://')) {
      httpUrl = httpUrl.replace('wss://', 'https://');
    } else if (httpUrl.startsWith('ws://')) {
      httpUrl = httpUrl.replace('ws://', 'http://');
    }

    const response = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`HTTP ${response.status}: ${response.statusText}`, this.config.chainAlias);
    }

    const json = (await response.json()) as { result?: T; error?: { code: number; message: string } };

    if (json.error) {
      throw new RpcError(json.error.message, this.config.chainAlias, json.error.code);
    }

    return json.result as T;
  }
}

/**
 * Create a Substrate chain provider
 * @deprecated Use new SubstrateChainProvider(chainAlias, rpcUrl?) instead
 */
export function createSubstrateProvider(chainAlias: SubstrateChainAlias, rpcUrl?: string): SubstrateChainProvider {
  return new SubstrateChainProvider(chainAlias, rpcUrl);
}
