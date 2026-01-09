// packages/chains/src/xrp/transaction-builder.ts

import type {
  SigningPayload,
  TransactionOverrides,
  BroadcastResult,
  XrpChainAlias,
} from '../core/types.js';
import type {
  UnsignedTransaction as IUnsignedTransaction,
  SignedTransaction as ISignedTransaction,
  NormalisedTransaction,
  RawXrpTransaction as IRawXrpTransaction,
} from '../core/interfaces.js';
import type { XrpChainConfig } from './config.js';
import {
  XRP_TRANSACTION_TYPES,
  classifyTransaction,
  formatDrops,
  isNativeAmount,
  computeTransactionHash,
  type XrpAmount,
  type IssuedCurrencyAmount,
} from './utils.js';

/**
 * XRP Transaction structure
 */
export interface XrpTransaction {
  TransactionType: string;
  Account: string;
  Fee: string;
  Sequence: number;
  LastLedgerSequence?: number;
  Memos?: Array<{
    Memo: {
      MemoType?: string;
      MemoData?: string;
      MemoFormat?: string;
    };
  }>;
  Flags?: number;
  SourceTag?: number;
  DestinationTag?: number;
  SigningPubKey?: string;
  TxnSignature?: string;
  // Payment-specific
  Destination?: string;
  Amount?: XrpAmount;
  SendMax?: XrpAmount;
  DeliverMin?: XrpAmount;
  // TrustSet-specific
  LimitAmount?: IssuedCurrencyAmount;
  QualityIn?: number;
  QualityOut?: number;
}

/**
 * Raw XRP transaction format (local representation)
 * This wraps the XrpTransaction in a typed structure
 */
export interface RawXrpTransactionData {
  txJson: XrpTransaction;
  txBlob?: string;
  hash?: string;
}

/**
 * Parameters for building XRP payment
 */
export interface PaymentParams {
  from: string;
  to: string;
  amount: XrpAmount;
  fee: string;
  sequence: number;
  lastLedgerSequence?: number;
  destinationTag?: number;
  sourceTag?: number;
  memos?: Array<{ type?: string; data?: string }>;
  sendMax?: XrpAmount;
  deliverMin?: XrpAmount;
}

/**
 * Parameters for building trust line
 */
export interface TrustSetParams {
  from: string;
  currency: string;
  issuer: string;
  limit: string;
  fee: string;
  sequence: number;
  lastLedgerSequence?: number;
  qualityIn?: number;
  qualityOut?: number;
  flags?: number;
}

/**
 * Signed XRP Transaction
 */
export class SignedXrpTransaction implements ISignedTransaction {
  readonly chainAlias: XrpChainAlias;

  constructor(
    private readonly config: XrpChainConfig,
    private readonly txJson: XrpTransaction,
    private readonly signature: string
  ) {
    this.chainAlias = config.chainAlias as XrpChainAlias;
  }

  get serialized(): string {
    return JSON.stringify({
      ...this.txJson,
      TxnSignature: this.signature,
    });
  }

  get hash(): string {
    // XRP transaction hash is computed from the signed transaction blob
    // Convert the serialized JSON to bytes for hashing
    const txBytes = new TextEncoder().encode(this.serialized);
    return computeTransactionHash(txBytes);
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'submit',
          params: [{
            tx_json: {
              ...this.txJson,
              TxnSignature: this.signature,
            },
          }],
        }),
      });

      if (!response.ok) {
        return {
          hash: '',
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const json = (await response.json()) as {
        result?: {
          engine_result: string;
          engine_result_message: string;
          tx_json?: { hash: string };
          hash?: string;
        };
        error?: string;
        error_message?: string;
      };

      if (json.error) {
        return {
          hash: '',
          success: false,
          error: json.error_message ?? json.error,
        };
      }

      const result = json.result!;
      const isSuccess =
        result.engine_result === 'tesSUCCESS' ||
        result.engine_result.startsWith('tec') ||
        result.engine_result.startsWith('ter');

      return {
        hash: result.tx_json?.hash ?? result.hash ?? '',
        success: isSuccess,
        error: isSuccess ? undefined : `${result.engine_result}: ${result.engine_result_message}`,
      };
    } catch (error) {
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  toRaw(): IRawXrpTransaction {
    return {
      _chain: 'xrp',
      TransactionType: this.txJson.TransactionType,
      Account: this.txJson.Account,
      Destination: this.txJson.Destination,
      Amount: this.txJson.Amount as string | { currency: string; issuer: string; value: string } | undefined,
      Fee: this.txJson.Fee,
      Sequence: this.txJson.Sequence,
      LastLedgerSequence: this.txJson.LastLedgerSequence,
      SigningPubKey: this.txJson.SigningPubKey,
      TxnSignature: this.signature,
      Memos: this.txJson.Memos,
      DestinationTag: this.txJson.DestinationTag,
      SourceTag: this.txJson.SourceTag,
      Flags: this.txJson.Flags,
      LimitAmount: this.txJson.LimitAmount,
      QualityIn: this.txJson.QualityIn,
      QualityOut: this.txJson.QualityOut,
    };
  }
}

/**
 * Unsigned XRP Transaction
 */
export class UnsignedXrpTransaction implements IUnsignedTransaction {
  readonly chainAlias: XrpChainAlias;

  constructor(
    private readonly config: XrpChainConfig,
    private readonly txJson: XrpTransaction
  ) {
    this.chainAlias = config.chainAlias as XrpChainAlias;
  }

  get raw(): IRawXrpTransaction {
    return this.toRaw();
  }

  get serialized(): string {
    return JSON.stringify(this.txJson);
  }

  getSigningPayload(): SigningPayload {
    // For XRP, we sign the transaction hash
    // The actual signing data is computed from the serialized transaction
    // For now, we return the JSON which the signer will serialize
    return {
      chainAlias: this.config.chainAlias,
      algorithm: 'secp256k1',
      data: [JSON.stringify(this.txJson)],
    };
  }

  applySignature(signatures: string[]): SignedXrpTransaction {
    if (signatures.length === 0) {
      throw new Error('At least one signature is required');
    }
    // XRP single-sig uses one signature
    const sig = signatures[0];
    if (!sig) {
      throw new Error('At least one signature is required');
    }
    const signature = sig.startsWith('0x') ? sig.slice(2) : sig;
    return new SignedXrpTransaction(this.config, this.txJson, signature);
  }

  rebuild(overrides: TransactionOverrides): UnsignedXrpTransaction {
    const updated = { ...this.txJson };

    // Cast to XRP-specific overrides
    const xrpOverrides = overrides as { fee?: string; sequence?: number; lastLedgerSequence?: number };

    if (xrpOverrides.fee !== undefined) {
      updated.Fee = xrpOverrides.fee;
    }

    if (xrpOverrides.sequence !== undefined) {
      updated.Sequence = xrpOverrides.sequence;
    }

    if (xrpOverrides.lastLedgerSequence !== undefined) {
      updated.LastLedgerSequence = xrpOverrides.lastLedgerSequence;
    }

    return new UnsignedXrpTransaction(this.config, updated);
  }

  toNormalised(): NormalisedTransaction {
    const type = classifyTransaction(this.txJson);
    let value = '0';
    let toAddress: string | null = null;

    if (this.txJson.TransactionType === XRP_TRANSACTION_TYPES.PAYMENT) {
      toAddress = this.txJson.Destination ?? null;
      if (this.txJson.Amount) {
        if (isNativeAmount(this.txJson.Amount)) {
          value = this.txJson.Amount;
        } else {
          value = this.txJson.Amount.value;
        }
      }
    } else if (this.txJson.TransactionType === XRP_TRANSACTION_TYPES.TRUST_SET) {
      toAddress = this.txJson.LimitAmount?.issuer ?? null;
      value = this.txJson.LimitAmount?.value ?? '0';
    }

    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    return {
      chainAlias: this.config.chainAlias,
      type,
      from: this.txJson.Account,
      to: toAddress,
      value,
      formattedValue: formatDrops(BigInt(value)),
      symbol,
      fee: {
        value: this.txJson.Fee,
        formattedValue: formatDrops(BigInt(this.txJson.Fee)),
        symbol,
      },
      data: this.txJson.TransactionType,
      metadata: {
        sequence: this.txJson.Sequence,
        isContractDeployment: false,
      },
    };
  }

  toRaw(): IRawXrpTransaction {
    return {
      _chain: 'xrp',
      TransactionType: this.txJson.TransactionType,
      Account: this.txJson.Account,
      Destination: this.txJson.Destination,
      Amount: this.txJson.Amount as string | { currency: string; issuer: string; value: string } | undefined,
      Fee: this.txJson.Fee,
      Sequence: this.txJson.Sequence,
      LastLedgerSequence: this.txJson.LastLedgerSequence,
      SigningPubKey: this.txJson.SigningPubKey,
      Memos: this.txJson.Memos,
      DestinationTag: this.txJson.DestinationTag,
      SourceTag: this.txJson.SourceTag,
      Flags: this.txJson.Flags,
      LimitAmount: this.txJson.LimitAmount,
      QualityIn: this.txJson.QualityIn,
      QualityOut: this.txJson.QualityOut,
    };
  }
}

/**
 * Build XRP payment transaction
 */
export function buildPayment(config: XrpChainConfig, params: PaymentParams): UnsignedXrpTransaction {
  const txJson: XrpTransaction = {
    TransactionType: XRP_TRANSACTION_TYPES.PAYMENT,
    Account: params.from,
    Destination: params.to,
    Amount: params.amount,
    Fee: params.fee,
    Sequence: params.sequence,
    SigningPubKey: '', // Will be filled during signing
  };

  if (params.lastLedgerSequence !== undefined) {
    txJson.LastLedgerSequence = params.lastLedgerSequence;
  }

  if (params.destinationTag !== undefined) {
    txJson.DestinationTag = params.destinationTag;
  }

  if (params.sourceTag !== undefined) {
    txJson.SourceTag = params.sourceTag;
  }

  if (params.memos && params.memos.length > 0) {
    txJson.Memos = params.memos.map((memo) => ({
      Memo: {
        MemoType: memo.type ? Buffer.from(memo.type).toString('hex').toUpperCase() : undefined,
        MemoData: memo.data ? Buffer.from(memo.data).toString('hex').toUpperCase() : undefined,
      },
    }));
  }

  if (params.sendMax !== undefined) {
    txJson.SendMax = params.sendMax;
  }

  if (params.deliverMin !== undefined) {
    txJson.DeliverMin = params.deliverMin;
  }

  return new UnsignedXrpTransaction(config, txJson);
}

/**
 * Build XRP native transfer (simple payment)
 */
export function buildXrpTransfer(
  config: XrpChainConfig,
  from: string,
  to: string,
  amount: bigint,
  fee: string,
  sequence: number,
  lastLedgerSequence?: number,
  destinationTag?: number
): UnsignedXrpTransaction {
  return buildPayment(config, {
    from,
    to,
    amount: amount.toString(),
    fee,
    sequence,
    lastLedgerSequence,
    destinationTag,
  });
}

/**
 * Build issued currency transfer
 */
export function buildIssuedCurrencyTransfer(
  config: XrpChainConfig,
  from: string,
  to: string,
  currency: string,
  issuer: string,
  value: string,
  fee: string,
  sequence: number,
  lastLedgerSequence?: number,
  destinationTag?: number
): UnsignedXrpTransaction {
  return buildPayment(config, {
    from,
    to,
    amount: {
      currency,
      issuer,
      value,
    },
    fee,
    sequence,
    lastLedgerSequence,
    destinationTag,
  });
}

/**
 * Build trust line (TrustSet transaction)
 */
export function buildTrustSet(config: XrpChainConfig, params: TrustSetParams): UnsignedXrpTransaction {
  const txJson: XrpTransaction = {
    TransactionType: XRP_TRANSACTION_TYPES.TRUST_SET,
    Account: params.from,
    LimitAmount: {
      currency: params.currency,
      issuer: params.issuer,
      value: params.limit,
    },
    Fee: params.fee,
    Sequence: params.sequence,
    SigningPubKey: '',
  };

  if (params.lastLedgerSequence !== undefined) {
    txJson.LastLedgerSequence = params.lastLedgerSequence;
  }

  if (params.qualityIn !== undefined) {
    txJson.QualityIn = params.qualityIn;
  }

  if (params.qualityOut !== undefined) {
    txJson.QualityOut = params.qualityOut;
  }

  if (params.flags !== undefined) {
    txJson.Flags = params.flags;
  }

  return new UnsignedXrpTransaction(config, txJson);
}

/**
 * Parse serialized transaction
 */
export function parseTransaction(config: XrpChainConfig, serialized: string): UnsignedXrpTransaction {
  const txJson = JSON.parse(serialized) as XrpTransaction;
  return new UnsignedXrpTransaction(config, txJson);
}
