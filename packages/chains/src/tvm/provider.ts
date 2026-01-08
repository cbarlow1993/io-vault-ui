// packages/chains/src/tvm/provider.ts

import type {
  TvmChainAlias,
  NativeBalance,
  TokenBalance,
  FeeEstimate,
  DecodeFormat,
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
  RawTronTransaction,
  NormalisedTransaction,
} from '../core/interfaces.js';
import { RpcError, ChainError } from '../core/errors.js';
import { type TvmChainConfig, getTvmChainConfig } from './config.js';
import { TvmBalanceFetcher } from './balance.js';
import {
  UnsignedTvmTransaction,
  buildTrxTransfer,
  buildTrc20Transfer,
  type TvmTransactionData,
  type BlockInfo,
} from './transaction-builder.js';
import { formatSun, parseSun, addressToHex, CONTRACT_TYPES } from './utils.js';

// ============ TVM Chain Provider ============

export class TvmChainProvider implements IChainProvider {
  readonly config: TvmChainConfig;
  readonly chainAlias: TvmChainAlias;
  private readonly balanceFetcher: TvmBalanceFetcher;

  constructor(chainAlias: TvmChainAlias, rpcUrl?: string) {
    this.config = getTvmChainConfig(chainAlias, rpcUrl);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new TvmBalanceFetcher(this.config);
  }

  // ============ IBalanceFetcher Methods ============

  async getNativeBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getNativeBalance(address);
  }

  async getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    return this.balanceFetcher.getTokenBalance(address, contractAddress);
  }

  // ============ ITransactionBuilder Methods ============

  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    const { from, to, value, overrides } = params;

    // Get latest block for ref block info
    const blockInfo = await this.getLatestBlock();

    // Parse value to SUN
    const amountInSun = this.parseValueToSun(value);

    // Build transfer transaction
    const tx = buildTrxTransfer(this.config, from, to, amountInSun, blockInfo);

    return overrides ? tx.rebuild(overrides) : tx;
  }

  async buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction> {
    const { from, to, contractAddress, value, overrides } = params;

    // Get latest block for ref block info
    const blockInfo = await this.getLatestBlock();

    // Parse value (assuming it's already in smallest units)
    const amount = BigInt(value);

    // Default fee limit: 100 TRX
    const feeLimit = 100_000_000;

    // Build TRC20 transfer transaction
    const tx = buildTrc20Transfer(this.config, from, to, contractAddress, amount, blockInfo, feeLimit);

    return overrides ? tx.rebuild(overrides) : tx;
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawTronTransaction : NormalisedTransaction {
    let txData: TvmTransactionData;
    try {
      txData = JSON.parse(serialized) as TvmTransactionData;
    } catch {
      throw new RpcError('Invalid transaction data: malformed JSON', this.chainAlias);
    }

    const tx = new UnsignedTvmTransaction(this.config, txData);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawTronTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawTronTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    // TRON uses bandwidth and energy for fees
    // Simple TRX transfers use bandwidth (free up to daily limit)
    // Smart contract calls use energy

    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    // Bandwidth cost: ~270 bandwidth points for simple transfer
    // If no free bandwidth, 1 bandwidth = 1000 SUN = 0.001 TRX
    const bandwidthCost = 270n * 1000n; // 0.27 TRX

    // Energy cost for TRC20: ~30,000 energy * 420 SUN/energy = 12.6 TRX
    const energyCost = 30000n * 420n;

    return {
      slow: {
        fee: bandwidthCost.toString(),
        formattedFee: `${formatSun(bandwidthCost, decimals)} ${symbol}`,
      },
      standard: {
        fee: bandwidthCost.toString(),
        formattedFee: `${formatSun(bandwidthCost, decimals)} ${symbol}`,
      },
      fast: {
        fee: (bandwidthCost + energyCost).toString(),
        formattedFee: `${formatSun(bandwidthCost + energyCost, decimals)} ${symbol} (with energy)`,
      },
    };
  }

  async estimateGas(params: ContractCallParams): Promise<string> {
    // Estimate energy consumption for a contract call
    const url = `${this.config.rpcUrl}/wallet/triggerconstantcontract`;

    const fromHex = params.from.startsWith('T') ? addressToHex(params.from) : params.from;
    const contractHex = params.contractAddress.startsWith('T')
      ? addressToHex(params.contractAddress)
      : params.contractAddress;

    const data = params.data.startsWith('0x') ? params.data.slice(2) : params.data;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_address: fromHex,
          contract_address: contractHex,
          function_selector: '',
          parameter: data.slice(8), // Remove function selector
          call_value: params.value ? parseInt(params.value) : 0,
        }),
      });

      if (!response.ok) {
        throw new RpcError(`Failed to estimate energy: ${response.statusText}`, this.chainAlias);
      }

      const result = await response.json();

      // Return energy estimate
      const energy = result.energy_used ?? 30000; // Default if not available
      return energy.toString();
    } catch (error) {
      if (error instanceof RpcError) throw error;
      // Return default estimate on error
      return '30000';
    }
  }

  // ============ IContractInteraction Methods ============

  async contractRead(params: ContractReadParams): Promise<ContractReadResult> {
    const url = `${this.config.rpcUrl}/wallet/triggerconstantcontract`;

    const contractHex = params.contractAddress.startsWith('T')
      ? addressToHex(params.contractAddress)
      : params.contractAddress;

    const ownerHex = params.from
      ? params.from.startsWith('T')
        ? addressToHex(params.from)
        : params.from
      : '410000000000000000000000000000000000000000'; // Zero address

    const data = params.data.startsWith('0x') ? params.data.slice(2) : params.data;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_address: ownerHex,
          contract_address: contractHex,
          function_selector: '',
          parameter: data.slice(8), // Remove function selector
        }),
      });

      if (!response.ok) {
        throw new RpcError(`Contract read failed: ${response.statusText}`, this.chainAlias);
      }

      const result = await response.json();

      if (!result.result?.result) {
        throw new RpcError(`Contract read failed: ${result.result?.message ?? 'Unknown error'}`, this.chainAlias);
      }

      return {
        data: '0x' + (result.constant_result?.[0] ?? ''),
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Contract read failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.chainAlias
      );
    }
  }

  async contractCall(params: ContractCallParams): Promise<UnsignedTransaction> {
    const { from, contractAddress, data, value, overrides } = params;

    // Get latest block for ref block info
    const blockInfo = await this.getLatestBlock();

    const fromHex = from.startsWith('T') ? addressToHex(from) : from;
    const contractHex = contractAddress.startsWith('T') ? addressToHex(contractAddress) : contractAddress;

    const callData = data.startsWith('0x') ? data.slice(2) : data;

    const timestamp = Date.now();
    const expiration = timestamp + 60 * 60 * 1000;

    const blockHeight = blockInfo.block_header.raw_data.number;
    const blockHash = blockInfo.blockID;

    const refBlockBytes = blockHeight.toString(16).padStart(4, '0').slice(-4);
    const refBlockHash = blockHash.slice(16, 32);

    const txData: TvmTransactionData = {
      txID: '',
      rawData: {
        contract: [
          {
            type: CONTRACT_TYPES.TRIGGER_SMART_CONTRACT,
            parameter: {
              value: {
                data: callData,
                owner_address: fromHex,
                contract_address: contractHex,
                call_value: value ? parseInt(value) : 0,
              },
              type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
            },
          },
        ],
        refBlockBytes,
        refBlockHash,
        expiration,
        timestamp,
        feeLimit: 100_000_000, // 100 TRX default
      },
      rawDataHex: '',
    };

    // Compute txID
    txData.txID = this.computeTxId(txData.rawData);

    const tx = new UnsignedTvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async contractDeploy(params: ContractDeployParams): Promise<DeployedContract> {
    const { from, bytecode, constructorArgs, overrides } = params;

    // Get latest block for ref block info
    const blockInfo = await this.getLatestBlock();

    const fromHex = from.startsWith('T') ? addressToHex(from) : from;
    const code = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    const args = constructorArgs ? (constructorArgs.startsWith('0x') ? constructorArgs.slice(2) : constructorArgs) : '';

    const timestamp = Date.now();
    const expiration = timestamp + 60 * 60 * 1000;

    const blockHeight = blockInfo.block_header.raw_data.number;
    const blockHash = blockInfo.blockID;

    const refBlockBytes = blockHeight.toString(16).padStart(4, '0').slice(-4);
    const refBlockHash = blockHash.slice(16, 32);

    const txData: TvmTransactionData = {
      txID: '',
      rawData: {
        contract: [
          {
            type: CONTRACT_TYPES.CREATE_SMART_CONTRACT,
            parameter: {
              value: {
                owner_address: fromHex,
                new_contract: {
                  bytecode: code + args,
                  consume_user_resource_percent: 100,
                  origin_energy_limit: 10_000_000,
                },
              },
              type_url: 'type.googleapis.com/protocol.CreateSmartContract',
            },
          },
        ],
        refBlockBytes,
        refBlockHash,
        expiration,
        timestamp,
        feeLimit: 1_000_000_000, // 1000 TRX for deployment
      },
      rawDataHex: '',
    };

    txData.txID = this.computeTxId(txData.rawData);

    const tx = new UnsignedTvmTransaction(this.config, txData);
    const finalTx = overrides ? tx.rebuild(overrides) : tx;

    // Expected address is derived from owner + nonce (simplified)
    const expectedAddress = 'T' + txData.txID.slice(0, 33);

    return {
      transaction: finalTx,
      expectedAddress,
    };
  }

  // ============ TVM-Specific Methods ============

  /**
   * Get latest block info for transaction building
   */
  async getLatestBlock(): Promise<BlockInfo> {
    const url = `${this.config.rpcUrl}/wallet/getnowblock`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new RpcError(`Failed to fetch block: ${response.statusText}`, this.chainAlias);
      }

      return (await response.json()) as BlockInfo;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch block: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.chainAlias
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
    return this.balanceFetcher.getAccountResources(address);
  }

  /**
   * Get all TRC20 token balances for an address
   */
  async getTrc20Balances(address: string): Promise<Array<{ contractAddress: string; balance: string }>> {
    return this.balanceFetcher.getTrc20Balances(address);
  }

  // ============ Private Methods ============

  private parseValueToSun(value: string): bigint {
    // If value contains a decimal point, parse as TRX
    if (value.includes('.')) {
      return parseSun(value);
    }
    // Otherwise assume it's already in SUN
    return BigInt(value);
  }

  private computeTxId(rawData: TvmTransactionData['rawData']): string {
    // Simplified hash computation
    const dataStr = JSON.stringify(rawData);
    let hash = 0;
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
