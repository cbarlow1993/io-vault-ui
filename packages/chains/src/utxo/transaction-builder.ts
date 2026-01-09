// packages/chains/src/utxo/transaction-builder.ts

import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import type {
  SigningPayload,
  TransactionOverrides,
  TransactionType,
  UtxoTransactionOverrides,
  UtxoChainAlias,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawUtxoTransaction,
} from '../core/interfaces.js';
import type { UtxoChainConfig } from './config.js';
import { PsbtBuilder, type InputMetadata, type ScriptType } from './psbt-builder.js';
import { SignatureApplier } from './signature-applier.js';
import { SignedUtxoTransaction } from './signed-transaction.js';
import { SignatureError } from './errors.js';
import type { UTXO } from './blockbook-client.js';
import { formatSatoshis } from './utils.js';

// ============ UTXO Transaction Data Interface ============

export interface UtxoTransactionData {
  psbtBase64: string;
  inputMetadata: InputMetadata[];
  outputs: Array<{
    address: string;
    value: bigint;
  }>;
  fee: bigint;
  changeAddress?: string;
  rbf: boolean;
}

// ============ Unsigned UTXO Transaction ============

export class UnsignedUtxoTransaction implements UnsignedTransaction {
  readonly chainAlias: UtxoChainAlias;
  readonly raw: UtxoTransactionData;
  readonly serialized: string;

  private readonly config: UtxoChainConfig;
  private readonly psbt: bitcoin.Psbt;
  private readonly psbtBuilder: PsbtBuilder;
  private readonly network: bitcoin.Network;

  constructor(
    config: UtxoChainConfig,
    psbt: bitcoin.Psbt,
    inputMetadata: InputMetadata[],
    outputs: Array<{ address: string; value: bigint }>,
    fee: bigint,
    changeAddress?: string,
    rbf: boolean = true
  ) {
    this.config = config;
    this.chainAlias = config.chainAlias;
    this.network = config.network === 'mainnet'
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
    this.psbt = psbt;

    // Create a PsbtBuilder wrapper for sighash computation
    this.psbtBuilder = PsbtBuilder.fromBase64(psbt.toBase64(), config.network, config.chainAlias);
    // Restore input metadata
    (this.psbtBuilder as unknown as { inputMetadata: InputMetadata[] }).inputMetadata = inputMetadata;

    this.raw = {
      psbtBase64: psbt.toBase64(),
      inputMetadata,
      outputs,
      fee,
      changeAddress,
      rbf,
    };

    this.serialized = psbt.toBase64();
  }

  /**
   * Rebuild transaction with overrides
   */
  rebuild(overrides: TransactionOverrides): UnsignedUtxoTransaction {
    const utxoOverrides = overrides as UtxoTransactionOverrides;

    // Clone PSBT
    const clonedPsbt = bitcoin.Psbt.fromBase64(this.serialized, { network: this.network });

    // Handle RBF override by modifying the underlying transaction
    // Note: PSBT updateInput doesn't support sequence directly in the type,
    // but we can modify the transaction before creating the new wrapper
    const newRbf = utxoOverrides.rbf ?? this.raw.rbf;

    // Note: feeRate and absoluteFee overrides require rebuilding outputs
    // which should be done at the provider level before creating the transaction

    return new UnsignedUtxoTransaction(
      this.config,
      clonedPsbt,
      this.raw.inputMetadata,
      this.raw.outputs,
      this.raw.fee,
      this.raw.changeAddress,
      newRbf
    );
  }

  /**
   * Get signing payload (sighashes for MPC)
   */
  getSigningPayload(): SigningPayload {
    // Use PsbtBuilder to compute proper BIP143/BIP341 sighashes
    const sighashData = this.psbtBuilder.getSighashes();
    const sighashes = sighashData.map((data) => data.hash.toString('hex'));

    return {
      chainAlias: this.chainAlias,
      data: sighashes,
      algorithm: 'secp256k1', // Both ECDSA and Schnorr use secp256k1 curve
    };
  }

  /**
   * Apply MPC signatures to create signed transaction
   * @param signatures - Array of 64-byte r||s signatures (hex strings)
   */
  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length !== this.raw.inputMetadata.length) {
      throw new SignatureError(
        `Signature count mismatch`,
        this.config.chainAlias,
        this.raw.inputMetadata.length,
        signatures.length
      );
    }

    // Clone PSBT for signing
    const psbtCopy = bitcoin.Psbt.fromBase64(this.serialized, { network: this.network });

    // Apply signatures
    const applier = new SignatureApplier(this.config.chainAlias);
    applier.applySignatures(psbtCopy, signatures, this.raw.inputMetadata);

    return new SignedUtxoTransaction(this.config, psbtCopy);
  }

  /**
   * Convert to normalised transaction format
   */
  toNormalised(): NormalisedTransaction {
    const type = this.classifyTransaction();

    // Find primary recipient (first non-change output)
    const recipient = this.findPrimaryRecipient();

    // Calculate total output value (excluding change)
    const primaryValue = this.raw.outputs
      .filter((o) => o.address !== this.raw.changeAddress)
      .reduce((sum, o) => sum + o.value, 0n);

    const formattedValue = formatSatoshis(primaryValue, this.config.nativeCurrency.decimals);

    return {
      chainAlias: this.chainAlias,
      to: recipient,
      value: primaryValue.toString(),
      formattedValue,
      symbol: this.config.nativeCurrency.symbol,
      fee: {
        value: this.raw.fee.toString(),
        formattedValue: formatSatoshis(this.raw.fee, this.config.nativeCurrency.decimals),
        symbol: this.config.nativeCurrency.symbol,
      },
      type,
      metadata: {
        isContractDeployment: false,
        inputCount: this.raw.inputMetadata.length,
        outputCount: this.raw.outputs.length,
      },
      outputs: this.raw.outputs.map((o) => ({
        address: o.address,
        value: o.value.toString(),
        formattedValue: formatSatoshis(o.value, this.config.nativeCurrency.decimals),
      })),
    };
  }

  /**
   * Convert to raw transaction format
   */
  toRaw(): RawUtxoTransaction {
    return {
      _chain: 'utxo',
      version: 2,
      locktime: 0,
      isSegwit: true,
      inputs: this.raw.inputMetadata.map((meta, i) => {
        const txInput = this.psbt.txInputs[i]!;
        return {
          txid: Buffer.from(txInput.hash).reverse().toString('hex'),
          vout: txInput.index,
          scriptSig: '',
          sequence: txInput.sequence ?? 0xffffffff,
          witness: [],
        };
      }),
      outputs: this.raw.outputs.map((o) => {
        try {
          const script = bitcoin.address.toOutputScript(o.address, this.network);
          return {
            value: o.value.toString(),
            scriptPubKey: Buffer.from(script).toString('hex'),
            address: o.address,
          };
        } catch {
          return {
            value: o.value.toString(),
            scriptPubKey: '',
            address: o.address,
          };
        }
      }),
    };
  }

  /**
   * Get total input value
   */
  getTotalInputValue(): bigint {
    return this.raw.inputMetadata.reduce((sum, meta) => sum + meta.value, 0n);
  }

  /**
   * Get total output value
   */
  getTotalOutputValue(): bigint {
    return this.raw.outputs.reduce((sum, o) => sum + o.value, 0n);
  }

  /**
   * Get the PSBT as base64
   */
  getPsbtBase64(): string {
    return this.serialized;
  }

  /**
   * Get the PSBT as hex
   */
  getPsbtHex(): string {
    return this.psbt.toHex();
  }

  private classifyTransaction(): TransactionType {
    return 'native-transfer';
  }

  private findPrimaryRecipient(): string | null {
    const nonChangeOutputs = this.raw.outputs.filter(
      (o) => o.address !== this.raw.changeAddress
    );

    if (nonChangeOutputs.length > 0) {
      return nonChangeOutputs[0]!.address;
    }

    return this.raw.outputs[0]?.address ?? null;
  }
}

// ============ UTXO Selection ============

export interface UtxoSelectionResult {
  selected: UTXO[];
  totalInput: bigint;
  fee: bigint;
  changeAmount: bigint;
}

/**
 * Select UTXOs for a transaction
 * Uses largest-first strategy for simplicity
 */
export function selectUtxos(
  available: UTXO[],
  targetAmount: bigint,
  feeRate: number,
  dustLimit: number,
  scriptType: ScriptType = 'p2wpkh'
): UtxoSelectionResult {
  // Sort by value descending (largest first)
  const sorted = [...available].sort((a, b) =>
    a.value > b.value ? -1 : a.value < b.value ? 1 : 0
  );

  const selected: UTXO[] = [];
  let totalInput = 0n;

  for (const utxo of sorted) {
    selected.push(utxo);
    totalInput += utxo.value;

    // Estimate fee with current input count (assume 2 outputs: recipient + change)
    const estimatedSize = estimateTransactionSize(selected.length, 2, scriptType);
    const fee = BigInt(Math.ceil(estimatedSize * feeRate));
    const required = targetAmount + fee;

    if (totalInput >= required) {
      const changeAmount = totalInput - targetAmount - fee;

      // If change is below dust limit, add it to fee instead
      if (changeAmount > 0n && changeAmount < BigInt(dustLimit)) {
        return {
          selected,
          totalInput,
          fee: fee + changeAmount,
          changeAmount: 0n,
        };
      }

      return {
        selected,
        totalInput,
        fee,
        changeAmount,
      };
    }
  }

  // Not enough funds - return what we have
  const estimatedSize = estimateTransactionSize(selected.length, 2, scriptType);
  const fee = BigInt(Math.ceil(estimatedSize * feeRate));

  return {
    selected,
    totalInput,
    fee,
    changeAmount: 0n,
  };
}

/**
 * Estimate transaction size in virtual bytes
 */
export function estimateTransactionSize(
  inputCount: number,
  outputCount: number,
  scriptType: ScriptType = 'p2wpkh'
): number {
  // Base transaction overhead (version + locktime + segwit marker/flag)
  const baseSize = 10.5;

  // Input sizes by script type (in vbytes)
  const inputSize = scriptType === 'p2wpkh' ? 68 : 57.5; // P2WPKH vs P2TR

  // Output size (P2WPKH output = 31 vbytes, P2TR = 43 vbytes)
  const outputSize = 31;

  return Math.ceil(baseSize + inputCount * inputSize + outputCount * outputSize);
}
