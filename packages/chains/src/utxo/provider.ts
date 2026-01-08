// packages/chains/src/utxo/provider.ts

import type {
  UtxoChainAlias,
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
  RawBitcoinTransaction,
  NormalisedTransaction,
} from '../core/interfaces.js';
import { RpcError, ChainError } from '../core/errors.js';
import { type UtxoChainConfig, getUtxoChainConfig } from './config.js';
import { UtxoBalanceFetcher } from './balance.js';
import { UnsignedUtxoTransaction, selectUtxos, type UtxoTransactionData } from './transaction-builder.js';
import { formatSatoshis, estimateTransactionSize, calculateFee, getScriptTypeFromAddress, type UTXO } from './utils.js';

// ============ Fee Rate Response Types ============

interface MempoolFeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// ============ UTXO Chain Provider ============

export class UtxoChainProvider implements IChainProvider {
  readonly config: UtxoChainConfig;
  readonly chainAlias: UtxoChainAlias;
  private readonly balanceFetcher: UtxoBalanceFetcher;

  constructor(chainAlias: UtxoChainAlias, rpcUrl?: string) {
    this.config = getUtxoChainConfig(chainAlias, rpcUrl);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new UtxoBalanceFetcher(this.config);
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

    // Get UTXOs for the sender
    const utxos = await this.balanceFetcher.getUtxos(from);
    if (utxos.length === 0) {
      throw new ChainError(`No UTXOs found for address ${from}`, this.chainAlias);
    }

    // Get fee estimate
    const feeEstimates = await this.getFeeRates();
    const feeRate = feeEstimates.halfHourFee; // Use standard speed

    // Estimate transaction size (1 input, 2 outputs: recipient + change)
    const scriptType = getScriptTypeFromAddress(from) || 'p2wpkh';
    const estimatedSize = estimateTransactionSize(1, 2, scriptType);
    const estimatedFee = calculateFee(estimatedSize, feeRate);

    // Select UTXOs
    const targetAmount = BigInt(value);
    const { selected, total } = selectUtxos(utxos, targetAmount, estimatedFee);

    if (total < targetAmount + estimatedFee) {
      throw new ChainError(
        `Insufficient funds: have ${total}, need ${targetAmount + estimatedFee}`,
        this.chainAlias
      );
    }

    // Calculate change
    const actualSize = estimateTransactionSize(selected.length, 2, scriptType);
    const actualFee = calculateFee(actualSize, feeRate);
    const changeAmount = total - targetAmount - actualFee;

    // Build transaction data
    const txData: UtxoTransactionData = {
      version: 2,
      inputs: selected.map((utxo) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        sequence: 0xfffffffd, // Enable RBF
        value: utxo.value,
        scriptPubKey: utxo.scriptPubKey,
      })),
      outputs: [
        {
          value: targetAmount,
          address: to,
        },
      ],
      locktime: 0,
      fee: actualFee,
      changeAddress: from,
    };

    // Add change output if above dust limit
    if (changeAmount > BigInt(this.config.dustLimit)) {
      txData.outputs.push({
        value: changeAmount,
        address: from,
      });
    }

    const tx = new UnsignedUtxoTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async buildTokenTransfer(_params: TokenTransferParams): Promise<UnsignedTransaction> {
    // Bitcoin doesn't have native token transfers
    // BRC-20/Ordinals would require specialized handling
    throw new ChainError(
      'Token transfers not supported for UTXO chains. Use dedicated Ordinals/BRC-20 services.',
      this.chainAlias
    );
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawBitcoinTransaction : NormalisedTransaction {
    let txData: UtxoTransactionData;
    try {
      // Parse with BigInt revival
      txData = JSON.parse(serialized, (key, value) => {
        // Convert value fields back to BigInt
        if (key === 'value' || key === 'fee') {
          return BigInt(value);
        }
        return value;
      }) as UtxoTransactionData;
    } catch {
      throw new RpcError('Invalid transaction data: malformed JSON', this.chainAlias);
    }

    const tx = new UnsignedUtxoTransaction(this.config, txData);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawBitcoinTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawBitcoinTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    const rates = await this.getFeeRates();
    const size = 200; // Typical P2WPKH transaction size

    const slowFee = calculateFee(size, rates.hourFee);
    const standardFee = calculateFee(size, rates.halfHourFee);
    const fastFee = calculateFee(size, rates.fastestFee);

    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    return {
      slow: {
        fee: slowFee.toString(),
        formattedFee: `${formatSatoshis(slowFee, decimals)} ${symbol}`,
      },
      standard: {
        fee: standardFee.toString(),
        formattedFee: `${formatSatoshis(standardFee, decimals)} ${symbol}`,
      },
      fast: {
        fee: fastFee.toString(),
        formattedFee: `${formatSatoshis(fastFee, decimals)} ${symbol}`,
      },
    };
  }

  async estimateGas(_params: ContractCallParams): Promise<string> {
    // Bitcoin doesn't use gas
    throw new ChainError('Gas estimation not applicable for UTXO chains', this.chainAlias);
  }

  // ============ IContractInteraction Methods ============

  async contractRead(_params: ContractReadParams): Promise<ContractReadResult> {
    throw new ChainError('Contract read not supported for UTXO chains', this.chainAlias);
  }

  async contractCall(_params: ContractCallParams): Promise<UnsignedTransaction> {
    throw new ChainError('Contract calls not supported for UTXO chains', this.chainAlias);
  }

  async contractDeploy(_params: ContractDeployParams): Promise<DeployedContract> {
    throw new ChainError('Contract deployment not supported for UTXO chains', this.chainAlias);
  }

  // ============ UTXO-Specific Methods ============

  /**
   * Get UTXOs for an address
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    return this.balanceFetcher.getUtxos(address);
  }

  /**
   * Get confirmed balance only
   */
  async getConfirmedBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getConfirmedBalance(address);
  }

  /**
   * Get current fee rates
   */
  async getFeeRates(): Promise<MempoolFeeEstimates> {
    // Mempool.space API for fee estimates
    let feeUrl: string;
    if (this.config.network === 'mainnet') {
      feeUrl = 'https://mempool.space/api/v1/fees/recommended';
    } else if (this.config.network === 'testnet') {
      feeUrl = 'https://mempool.space/testnet/api/v1/fees/recommended';
    } else {
      feeUrl = 'https://mempool.space/signet/api/v1/fees/recommended';
    }

    try {
      const response = await fetch(feeUrl);
      if (!response.ok) {
        throw new RpcError(`Failed to fetch fee rates: ${response.statusText}`, this.chainAlias);
      }
      return await response.json();
    } catch {
      // Return sensible defaults if fee API is unavailable
      return {
        fastestFee: 20,
        halfHourFee: 10,
        hourFee: 5,
        economyFee: 2,
        minimumFee: 1,
      };
    }
  }
}
