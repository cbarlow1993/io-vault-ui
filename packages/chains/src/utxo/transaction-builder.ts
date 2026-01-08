// packages/chains/src/utxo/transaction-builder.ts

import type {
  ChainAlias,
  SigningPayload,
  TransactionOverrides,
  TransactionType,
  UtxoTransactionOverrides,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawBitcoinTransaction,
} from '../core/interfaces.js';
import type { UtxoChainConfig } from './config.js';
import { formatSatoshis, type UTXO, type TransactionInput, type TransactionOutput } from './utils.js';
import { SignedUtxoTransaction } from './signed-transaction.js';

// ============ UTXO Transaction Data Interface ============

export interface UtxoTransactionData {
  version: number;
  inputs: Array<{
    txid: string;
    vout: number;
    sequence: number;
    value: bigint; // For signing purposes
    scriptPubKey?: string;
  }>;
  outputs: Array<{
    value: bigint;
    address: string;
    scriptPubKey?: string;
  }>;
  locktime: number;
  // Metadata
  fee?: bigint;
  changeAddress?: string;
}

// ============ Unsigned UTXO Transaction ============

export class UnsignedUtxoTransaction implements UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: UtxoTransactionData;
  readonly serialized: string;

  constructor(
    private readonly config: UtxoChainConfig,
    txData: UtxoTransactionData
  ) {
    this.chainAlias = config.chainAlias;
    this.raw = txData;
    // Serialize with bigint conversion for JSON
    this.serialized = JSON.stringify(txData, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }

  rebuild(overrides: TransactionOverrides): UnsignedUtxoTransaction {
    const utxoOverrides = overrides as UtxoTransactionOverrides;
    const newTxData: UtxoTransactionData = { ...this.raw };

    if (utxoOverrides.feeRate !== undefined) {
      // Recalculate fee based on new rate
      // This is a simplified version - production would recalculate properly
      newTxData.fee = BigInt(utxoOverrides.feeRate);
    }

    if (utxoOverrides.rbf !== undefined) {
      // Enable RBF by setting sequence to 0xfffffffd
      const sequence = utxoOverrides.rbf ? 0xfffffffd : 0xffffffff;
      newTxData.inputs = newTxData.inputs.map((input) => ({
        ...input,
        sequence,
      }));
    }

    return new UnsignedUtxoTransaction(this.config, newTxData);
  }

  getSigningPayload(): SigningPayload {
    // For Bitcoin, each input needs its own signature
    // The signing payload is the sighash for each input
    const messages = this.raw.inputs.map((input, index) => {
      // Create sighash preimage for this input
      // In production, this would properly compute BIP143 sighash
      return this.computeSighash(index);
    });

    return {
      chainAlias: this.chainAlias,
      data: messages,
      algorithm: 'secp256k1',
    };
  }

  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length !== this.raw.inputs.length) {
      throw new Error(
        `Expected ${this.raw.inputs.length} signatures, got ${signatures.length}`
      );
    }

    return new SignedUtxoTransaction(this.config, this.raw, signatures);
  }

  toNormalised(): NormalisedTransaction {
    const type = this.classifyTransaction();
    const totalOutput = this.raw.outputs.reduce((sum, out) => sum + out.value, 0n);
    const formattedValue = formatSatoshis(totalOutput, this.config.nativeCurrency.decimals);

    // Find primary recipient (first non-change output)
    const recipient = this.findPrimaryRecipient();

    return {
      chainAlias: this.chainAlias,
      to: recipient,
      value: totalOutput.toString(),
      formattedValue,
      symbol: this.config.nativeCurrency.symbol,
      type,
      metadata: {
        isContractDeployment: false,
        inputCount: this.raw.inputs.length,
        outputCount: this.raw.outputs.length,
        fee: this.raw.fee?.toString(),
      },
    };
  }

  toRaw(): RawBitcoinTransaction {
    return {
      _chain: 'utxo',
      version: this.raw.version,
      inputs: this.raw.inputs.map((input) => ({
        txid: input.txid,
        vout: input.vout,
        sequence: input.sequence,
      })),
      outputs: this.raw.outputs.map((output) => ({
        value: output.value.toString(),
        address: output.address,
      })),
      locktime: this.raw.locktime,
    };
  }

  /**
   * Calculate total input value
   */
  getTotalInputValue(): bigint {
    return this.raw.inputs.reduce((sum, input) => sum + input.value, 0n);
  }

  /**
   * Calculate total output value
   */
  getTotalOutputValue(): bigint {
    return this.raw.outputs.reduce((sum, output) => sum + output.value, 0n);
  }

  /**
   * Calculate implicit fee (inputs - outputs)
   */
  getImplicitFee(): bigint {
    return this.getTotalInputValue() - this.getTotalOutputValue();
  }

  private classifyTransaction(): TransactionType {
    // UTXO transactions are always native transfers
    // Bitcoin doesn't have smart contracts in the same way
    return 'native-transfer';
  }

  private findPrimaryRecipient(): string | null {
    // Exclude change outputs (last output or outputs to change address)
    const nonChangeOutputs = this.raw.outputs.filter(
      (output) => output.address !== this.raw.changeAddress
    );

    if (nonChangeOutputs.length > 0) {
      return nonChangeOutputs[0]!.address;
    }

    // Fallback to first output
    return this.raw.outputs[0]?.address ?? null;
  }

  private computeSighash(inputIndex: number): string {
    // Simplified sighash computation
    // In production, this would implement BIP143 for SegWit
    const preimage = JSON.stringify(
      {
        version: this.raw.version,
        inputIndex,
        input: this.raw.inputs[inputIndex],
        outputs: this.raw.outputs,
        locktime: this.raw.locktime,
      },
      (_, value) => (typeof value === 'bigint' ? value.toString() : value)
    );
    return Buffer.from(preimage).toString('base64');
  }
}

// ============ Transaction Builder Helper ============

export interface BuildTransactionParams {
  utxos: UTXO[];
  recipients: Array<{ address: string; value: bigint }>;
  changeAddress: string;
  feeRate: number; // satoshis per vbyte
}

export function selectUtxos(
  available: UTXO[],
  targetAmount: bigint,
  feeEstimate: bigint
): { selected: UTXO[]; total: bigint } {
  // Simple coin selection: sort by value descending, select until target met
  const sorted = [...available].sort((a, b) =>
    a.value > b.value ? -1 : a.value < b.value ? 1 : 0
  );

  const selected: UTXO[] = [];
  let total = 0n;
  const target = targetAmount + feeEstimate;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= target) {
      break;
    }
  }

  return { selected, total };
}
