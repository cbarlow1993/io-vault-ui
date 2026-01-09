// packages/chains/src/utxo/provider.ts

import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import type {
  UtxoChainAlias,
  NativeBalance,
  TokenBalance,
  FeeEstimate,
  DecodeFormat,
  UtxoTransactionOverrides,
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
  RawUtxoTransaction,
  NormalisedTransaction,
} from '../core/interfaces.js';
import { ChainError, RpcError } from '../core/errors.js';
import { type UtxoChainConfig, getUtxoChainConfig } from './config.js';
import { BlockbookClient, type UTXO } from './blockbook-client.js';
import { PsbtBuilder, getScriptTypeFromAddress } from './psbt-builder.js';
import {
  UnsignedUtxoTransaction,
  selectUtxos,
  estimateTransactionSize,
  type UtxoTransactionData,
} from './transaction-builder.js';
import { UtxoSelectionError, UnsupportedAddressTypeError } from './errors.js';
import { UtxoTransactionFetcher } from './transaction-fetcher.js';
import { formatSatoshis } from './utils.js';

// ============ Extended Transfer Params ============

export interface UtxoNativeTransferParams extends NativeTransferParams {
  publicKey: string; // 33-byte compressed pubkey (hex)
}

// ============ UTXO Chain Provider ============

export class UtxoChainProvider implements IChainProvider {
  readonly config: UtxoChainConfig;
  readonly chainAlias: UtxoChainAlias;

  private readonly blockbook: BlockbookClient;
  private readonly network: bitcoin.Network;
  private readonly transactionFetcher: UtxoTransactionFetcher;

  constructor(chainAlias: UtxoChainAlias, rpcUrl?: string) {
    this.config = getUtxoChainConfig(chainAlias, rpcUrl ? { rpcUrl } : undefined);
    this.chainAlias = chainAlias;
    this.blockbook = new BlockbookClient(this.config.rpcUrl, chainAlias, { auth: this.config.auth });
    this.network = this.config.network === 'mainnet'
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
    this.transactionFetcher = new UtxoTransactionFetcher(
      this.config,
      this.chainAlias,
      this.blockbook
    );
  }

  // ============ IBalanceFetcher Methods ============

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
      'Token transfers not supported for UTXO chains. Use dedicated Ordinals/BRC-20 services.',
      this.chainAlias
    );
  }

  // ============ ITransactionBuilder Methods ============

  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    // Cast to get publicKey
    const utxoParams = params as UtxoNativeTransferParams;
    const { from, to, value, publicKey, overrides } = utxoParams;

    if (!publicKey) {
      throw new ChainError('publicKey is required for UTXO transactions', this.chainAlias);
    }

    const utxoOverrides = overrides as UtxoTransactionOverrides | undefined;
    const pubkeyBuffer = Buffer.from(publicKey, 'hex');

    // Validate address types
    const fromScriptType = getScriptTypeFromAddress(from);
    if (!fromScriptType) {
      throw new UnsupportedAddressTypeError(this.chainAlias, from);
    }

    // 1. Get UTXOs (or use override)
    const utxos = utxoOverrides?.utxos ?? await this.blockbook.getUtxos(from);
    if (utxos.length === 0) {
      throw new UtxoSelectionError(
        `No UTXOs found for address ${from}`,
        this.chainAlias,
        BigInt(value),
        0n
      );
    }

    // 2. Get fee rate
    const feeRate = utxoOverrides?.feeRate ?? await this.blockbook.estimateFee(3); // 3-block target

    // 3. Select UTXOs
    const targetAmount = BigInt(value);
    const selection = selectUtxos(
      utxos,
      targetAmount,
      feeRate,
      this.config.dustLimit,
      fromScriptType
    );

    // Check if we have enough funds
    const required = targetAmount + selection.fee;
    if (selection.totalInput < required) {
      throw new UtxoSelectionError(
        `Insufficient funds: have ${selection.totalInput} satoshis, need ${required}`,
        this.chainAlias,
        required,
        selection.totalInput
      );
    }

    // 4. Apply absolute fee override if provided
    let fee = selection.fee;
    let changeAmount = selection.changeAmount;

    if (utxoOverrides?.absoluteFee !== undefined) {
      fee = utxoOverrides.absoluteFee;
      changeAmount = selection.totalInput - targetAmount - fee;

      // If change is below dust, add to fee
      if (changeAmount > 0n && changeAmount < BigInt(this.config.dustLimit)) {
        fee += changeAmount;
        changeAmount = 0n;
      }
    }

    // 5. Build PSBT
    const rbf = utxoOverrides?.rbf ?? true;
    const builder = new PsbtBuilder(this.config.network, this.chainAlias);

    for (const utxo of selection.selected) {
      builder.addInput(utxo, pubkeyBuffer, rbf);
    }

    // Add recipient output
    builder.addOutput(to, targetAmount);

    // Add change output if above dust limit
    const changeAddress = utxoOverrides?.changeAddress ?? from;
    const outputs: Array<{ address: string; value: bigint }> = [
      { address: to, value: targetAmount },
    ];

    if (changeAmount > BigInt(this.config.dustLimit)) {
      builder.addOutput(changeAddress, changeAmount);
      outputs.push({ address: changeAddress, value: changeAmount });
    }

    // 6. Create unsigned transaction
    return new UnsignedUtxoTransaction(
      this.config,
      builder.toPsbt(),
      builder.getInputMetadata(),
      outputs,
      fee,
      changeAddress,
      rbf
    );
  }

  async buildTokenTransfer(_params: TokenTransferParams): Promise<UnsignedTransaction> {
    throw new ChainError(
      'Token transfers not supported for UTXO chains. Use dedicated Ordinals/BRC-20 services.',
      this.chainAlias
    );
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawUtxoTransaction : NormalisedTransaction {
    // Try to parse as PSBT base64 first
    let psbt: bitcoin.Psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(serialized, { network: this.network });
    } catch {
      // Try to parse as legacy JSON format for backwards compatibility
      try {
        const txData = JSON.parse(serialized, (key, value) => {
          if (key === 'value' || key === 'fee') {
            return BigInt(value);
          }
          return value;
        }) as UtxoTransactionData;

        // Reconstruct from legacy format
        psbt = bitcoin.Psbt.fromBase64(txData.psbtBase64, { network: this.network });
      } catch {
        throw new RpcError('Invalid transaction data: not a valid PSBT or JSON', this.chainAlias);
      }
    }

    // Create a minimal transaction for decoding
    const inputMetadata = psbt.data.inputs.map((input, index) => ({
      index,
      scriptType: input.tapInternalKey ? 'p2tr' as const : 'p2wpkh' as const,
      publicKey: Buffer.alloc(33),
      value: input.witnessUtxo?.value ?? 0n,
    }));

    const outputs = psbt.txOutputs.map((output) => ({
      address: output.address ?? '',
      value: output.value,
    }));

    const fee = 0n; // Can't determine fee without input values

    const tx = new UnsignedUtxoTransaction(
      this.config,
      psbt,
      inputMetadata,
      outputs,
      fee
    );

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawUtxoTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawUtxoTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    // Get fee rates for different confirmation targets
    const [fastRate, standardRate, slowRate] = await Promise.all([
      this.blockbook.estimateFee(1),   // Next block
      this.blockbook.estimateFee(3),   // ~30 min
      this.blockbook.estimateFee(6),   // ~1 hour
    ]);

    // Typical P2WPKH transaction size
    const size = estimateTransactionSize(1, 2, 'p2wpkh');

    const slowFee = BigInt(Math.ceil(size * slowRate));
    const standardFee = BigInt(Math.ceil(size * standardRate));
    const fastFee = BigInt(Math.ceil(size * fastRate));

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

  // ============ ITransactionFetcher Methods ============

  async getTransaction(hash: string): Promise<TransactionResult> {
    return this.transactionFetcher.getTransaction(hash);
  }

  // ============ UTXO-Specific Methods ============

  /**
   * Get UTXOs for an address
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    return this.blockbook.getUtxos(address);
  }

  /**
   * Get confirmed balance only
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
   * Get current fee rates (sat/vB)
   */
  async getFeeRates(): Promise<{
    fast: number;
    standard: number;
    slow: number;
  }> {
    const [fast, standard, slow] = await Promise.all([
      this.blockbook.estimateFee(1),
      this.blockbook.estimateFee(3),
      this.blockbook.estimateFee(6),
    ]);

    return { fast, standard, slow };
  }

  /**
   * Broadcast a raw transaction hex
   */
  async broadcastRawTransaction(txHex: string): Promise<string> {
    return this.blockbook.broadcastTransaction(txHex);
  }
}
