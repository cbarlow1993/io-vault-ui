// packages/chains/src/evm/provider.ts

import type {
  EvmChainAlias,
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
  RawEvmTransaction,
  NormalisedTransaction,
} from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import { type EvmChainConfig, getEvmChainConfig } from './config.js';
import { EvmBalanceFetcher } from './balance.js';
import { UnsignedEvmTransaction, type EvmTransactionData } from './transaction-builder.js';
import { formatUnits } from './utils.js';

// ============ Fee Data Interface ============

interface FeeData {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}

// ============ EVM Chain Provider ============

export class EvmChainProvider implements IChainProvider {
  readonly config: EvmChainConfig;
  readonly chainAlias: EvmChainAlias;
  private readonly balanceFetcher: EvmBalanceFetcher;

  constructor(chainAlias: EvmChainAlias, rpcUrl?: string) {
    this.config = getEvmChainConfig(chainAlias, rpcUrl);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new EvmBalanceFetcher(this.config);
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

    // Fetch nonce, gas estimate, and fee data in parallel
    const [nonce, gasLimit, feeData] = await Promise.all([
      this.getTransactionCount(from),
      this.estimateGasForTransfer({ from, to, value }),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = this.config.supportsEip1559
      ? {
          type: 2,
          chainId: this.config.chainId,
          nonce,
          to,
          value,
          data: '0x',
          gasLimit: gasLimit.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        }
      : {
          type: 0,
          chainId: this.config.chainId,
          nonce,
          to,
          value,
          data: '0x',
          gasLimit: gasLimit.toString(),
          gasPrice: feeData.gasPrice?.toString(),
        };

    // Apply overrides if provided
    const tx = new UnsignedEvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction> {
    const { from, to, contractAddress, value, overrides } = params;

    // Encode ERC20 transfer(address,uint256) data
    // Function selector: 0xa9059cbb
    const paddedTo = to.toLowerCase().replace('0x', '').padStart(64, '0');
    const paddedValue = BigInt(value).toString(16).padStart(64, '0');
    const data = `0xa9059cbb${paddedTo}${paddedValue}`;

    // Fetch nonce, gas estimate, and fee data in parallel
    const [nonce, gasLimit, feeData] = await Promise.all([
      this.getTransactionCount(from),
      this.estimateGas({ from, contractAddress, data }),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = this.config.supportsEip1559
      ? {
          type: 2,
          chainId: this.config.chainId,
          nonce,
          to: contractAddress,
          value: '0',
          data,
          gasLimit: gasLimit.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        }
      : {
          type: 0,
          chainId: this.config.chainId,
          nonce,
          to: contractAddress,
          value: '0',
          data,
          gasLimit: gasLimit.toString(),
          gasPrice: feeData.gasPrice?.toString(),
        };

    const tx = new UnsignedEvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawEvmTransaction : NormalisedTransaction {
    let txData: EvmTransactionData;
    try {
      txData = JSON.parse(serialized) as EvmTransactionData;
    } catch {
      throw new RpcError('Invalid transaction data: malformed JSON', this.chainAlias);
    }
    const tx = new UnsignedEvmTransaction(this.config, txData);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawEvmTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawEvmTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    const feeData = await this.getFeeData();
    const gasLimit = 21000n; // Standard ETH transfer gas

    let baseFee: bigint;

    if (this.config.supportsEip1559 && feeData.maxFeePerGas) {
      baseFee = feeData.maxFeePerGas;
    } else if (feeData.gasPrice) {
      baseFee = feeData.gasPrice;
    } else {
      throw new RpcError('Unable to get fee data', this.chainAlias);
    }

    // Calculate fee tiers
    const slowFee = (baseFee * gasLimit * 80n) / 100n;
    const standardFee = baseFee * gasLimit;
    const fastFee = (baseFee * gasLimit * 120n) / 100n;

    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    return {
      slow: {
        fee: slowFee.toString(),
        formattedFee: `${formatUnits(slowFee, decimals)} ${symbol}`,
      },
      standard: {
        fee: standardFee.toString(),
        formattedFee: `${formatUnits(standardFee, decimals)} ${symbol}`,
      },
      fast: {
        fee: fastFee.toString(),
        formattedFee: `${formatUnits(fastFee, decimals)} ${symbol}`,
      },
    };
  }

  async estimateGas(params: ContractCallParams): Promise<string> {
    const result = await this.rpcCall('eth_estimateGas', [
      {
        from: params.from,
        to: params.contractAddress,
        data: params.data,
        value: params.value ? `0x${BigInt(params.value).toString(16)}` : undefined,
      },
    ]);

    return BigInt(result).toString();
  }

  // ============ IContractInteraction Methods ============

  async contractRead(params: ContractReadParams): Promise<ContractReadResult> {
    const result = await this.rpcCall('eth_call', [
      {
        to: params.contractAddress,
        data: params.data,
        from: params.from,
      },
      'latest',
    ]);

    return { data: result };
  }

  async contractCall(params: ContractCallParams): Promise<UnsignedTransaction> {
    const { from, contractAddress, data, value, overrides } = params;

    const [nonce, gasLimit, feeData] = await Promise.all([
      this.getTransactionCount(from),
      this.estimateGas(params),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = this.config.supportsEip1559
      ? {
          type: 2,
          chainId: this.config.chainId,
          nonce,
          to: contractAddress,
          value: value ?? '0',
          data,
          gasLimit: gasLimit.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        }
      : {
          type: 0,
          chainId: this.config.chainId,
          nonce,
          to: contractAddress,
          value: value ?? '0',
          data,
          gasLimit: gasLimit.toString(),
          gasPrice: feeData.gasPrice?.toString(),
        };

    const tx = new UnsignedEvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async contractDeploy(params: ContractDeployParams): Promise<DeployedContract> {
    const { from, bytecode, constructorArgs, value, overrides } = params;

    const data = constructorArgs ? `${bytecode}${constructorArgs.replace('0x', '')}` : bytecode;

    const [nonce, gasLimit, feeData] = await Promise.all([
      this.getTransactionCount(from),
      this.rpcCall('eth_estimateGas', [
        {
          from,
          data,
          value: value ? `0x${BigInt(value).toString(16)}` : undefined,
        },
      ]).then((result) => BigInt(result)),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = this.config.supportsEip1559
      ? {
          type: 2,
          chainId: this.config.chainId,
          nonce,
          to: null,
          value: value ?? '0',
          data,
          gasLimit: gasLimit.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        }
      : {
          type: 0,
          chainId: this.config.chainId,
          nonce,
          to: null,
          value: value ?? '0',
          data,
          gasLimit: gasLimit.toString(),
          gasPrice: feeData.gasPrice?.toString(),
        };

    const tx = new UnsignedEvmTransaction(this.config, txData);
    const transaction = overrides ? tx.rebuild(overrides) : tx;

    // Calculate expected contract address (CREATE: keccak256(rlp([sender, nonce]))[12:])
    // Simplified deterministic address for now
    const expectedAddress = this.computeContractAddress(from, nonce);

    return {
      transaction,
      expectedAddress,
    };
  }

  // ============ Helper Methods ============

  async getTransactionCount(address: string): Promise<number> {
    const result = await this.rpcCall('eth_getTransactionCount', [address, 'pending']);
    return parseInt(result, 16);
  }

  async estimateGasForTransfer(params: { from: string; to: string; value: string }): Promise<bigint> {
    const result = await this.rpcCall('eth_estimateGas', [
      {
        from: params.from,
        to: params.to,
        value: `0x${BigInt(params.value).toString(16)}`,
      },
    ]);

    return BigInt(result);
  }

  async getFeeData(): Promise<FeeData> {
    if (this.config.supportsEip1559) {
      // Fetch block and priority fee in parallel
      const [blockResult, priorityFeeResult] = await Promise.all([
        this.rpcCall('eth_getBlockByNumber', ['latest', false]),
        this.rpcCall('eth_maxPriorityFeePerGas', []),
      ]);

      const block = typeof blockResult === 'string' ? JSON.parse(blockResult) : blockResult;
      if (!block.baseFeePerGas) {
        throw new RpcError('Block does not contain baseFeePerGas (pre-London hardfork?)', this.chainAlias);
      }
      const baseFee = BigInt(block.baseFeePerGas);
      const priorityFee = BigInt(priorityFeeResult);

      // maxFee = baseFee * 2 + priorityFee
      const maxFee = baseFee * 2n + priorityFee;

      return {
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: priorityFee,
      };
    } else {
      // Legacy gas price
      const gasPriceResult = await this.rpcCall('eth_gasPrice', []);
      return {
        gasPrice: BigInt(gasPriceResult),
      };
    }
  }

  async rpcCall(method: string, params: unknown[]): Promise<string> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`RPC request failed: ${response.statusText}`, this.chainAlias);
    }

    const json = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.chainAlias, json.error.code);
    }

    return json.result;
  }

  // ============ Private Helpers ============

  private computeContractAddress(sender: string, nonce: number): string {
    // Simplified deterministic contract address calculation
    // In production, would use RLP encoding and keccak256
    const combined = `${sender.toLowerCase()}${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hexHash = Math.abs(hash).toString(16).padStart(40, '0');
    return '0x' + hexHash.slice(0, 40);
  }
}
