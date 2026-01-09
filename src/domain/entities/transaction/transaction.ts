/**
 * Transaction entity aggregate root.
 * Combines transaction data, classification, and transfers into a coherent aggregate.
 */
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { TransactionHash, WalletAddress, TokenAmount } from '@/src/domain/value-objects/index.js';
import {
  TransactionClassification,
  type ClassificationType,
  type ClassificationDirection,
  type ClassificationData,
} from './classification.js';
import { Transfer } from './transfer.js';

export type TransactionStatus = 'success' | 'failed' | 'pending';

export interface CreateTransactionData {
  id: string;
  chainAlias: ChainAlias;
  hash: string;
  blockNumber: string;
  blockHash: string;
  timestamp: Date;
  from: string;
  to: string | null;
  value: string;
  fee: string | null;
  status: TransactionStatus;
  classification?: ClassificationData;
  transfers?: Transfer[];
}

export interface TransactionRow {
  id: string;
  chainAlias: ChainAlias;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  timestamp: Date;
  fromAddress: string;
  toAddress: string | null;
  value: string;
  fee: string | null;
  status: TransactionStatus;
  classificationType: string | null;
  classificationLabel: string | null;
}

/**
 * Transaction entity aggregate root.
 * Encapsulates transaction identity, classification, and associated transfers.
 *
 * @example
 * const tx = Transaction.create({
 *   id: 'uuid',
 *   chainAlias: 'ethereum',
 *   hash: '0x...',
 *   blockNumber: '18000000',
 *   blockHash: '0x...',
 *   timestamp: new Date(),
 *   from: '0xSender...',
 *   to: '0xReceiver...',
 *   value: '1000000000000000000',
 *   fee: '21000000000000',
 *   status: 'success',
 * });
 *
 * tx.label; // 'Transaction'
 * tx.getDirection(senderAddress); // 'out'
 */
export class Transaction {
  private constructor(
    public readonly id: string,
    public readonly hash: TransactionHash,
    public readonly chainAlias: ChainAlias,
    public readonly blockNumber: string,
    public readonly blockHash: string,
    public readonly timestamp: Date,
    public readonly from: WalletAddress,
    public readonly to: WalletAddress | null,
    public readonly value: TokenAmount,
    public readonly fee: TokenAmount | null,
    public readonly status: TransactionStatus,
    public readonly classification: TransactionClassification,
    private readonly _transfers: readonly Transfer[]
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new Transaction entity
   */
  static create(data: CreateTransactionData): Transaction {
    const hash = TransactionHash.create(data.hash, data.chainAlias);
    const from = WalletAddress.create(data.from, data.chainAlias);
    const to = data.to ? WalletAddress.create(data.to, data.chainAlias) : null;

    // For EVM chains, value is in wei (18 decimals). For others, may vary.
    // For now, use 18 as default which works for most chains.
    const value = TokenAmount.fromRaw(data.value, 18);
    const fee = data.fee ? TokenAmount.fromRaw(data.fee, 18) : null;

    const classification = data.classification
      ? TransactionClassification.create(data.classification)
      : TransactionClassification.unknown();

    const transfers = data.transfers ?? [];

    return new Transaction(
      data.id,
      hash,
      data.chainAlias,
      data.blockNumber,
      data.blockHash,
      data.timestamp,
      from,
      to,
      value,
      fee,
      data.status,
      classification,
      Object.freeze([...transfers])
    );
  }

  /**
   * Reconstitute from database row
   */
  static fromDatabase(row: TransactionRow, transfers: Transfer[] = []): Transaction {
    const hash = TransactionHash.create(row.txHash, row.chainAlias);
    const from = WalletAddress.create(row.fromAddress, row.chainAlias);
    const to = row.toAddress ? WalletAddress.create(row.toAddress, row.chainAlias) : null;
    const value = TokenAmount.fromRaw(row.value, 18);
    const fee = row.fee ? TokenAmount.fromRaw(row.fee, 18) : null;

    // Build classification from stored type and label
    const classificationType = (row.classificationType as ClassificationType) ?? 'unknown';
    const classification = TransactionClassification.create({
      type: classificationType,
      direction: 'neutral', // Direction is computed per-perspective, not stored
      confidence: 'medium',
      source: 'custom',
      label: row.classificationLabel ?? 'Transaction',
    });

    return new Transaction(
      row.id,
      hash,
      row.chainAlias,
      row.blockNumber,
      row.blockHash,
      row.timestamp,
      from,
      to,
      value,
      fee,
      row.status,
      classification,
      Object.freeze([...transfers])
    );
  }

  // --- Computed properties ---

  get transfers(): readonly Transfer[] {
    return this._transfers;
  }

  get isSuccess(): boolean {
    return this.status === 'success';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get label(): string {
    return this.classification.label;
  }

  get type(): ClassificationType {
    return this.classification.type;
  }

  get nativeTransfers(): Transfer[] {
    return this._transfers.filter((t) => t.isNative);
  }

  get tokenTransfers(): Transfer[] {
    return this._transfers.filter((t) => t.isToken);
  }

  get nftTransfers(): Transfer[] {
    return this._transfers.filter((t) => t.isNft);
  }

  get hasTransfers(): boolean {
    return this._transfers.length > 0;
  }

  get transferCount(): number {
    return this._transfers.length;
  }

  // --- Business methods ---

  /**
   * Get direction from a specific address's perspective
   */
  getDirection(perspective: WalletAddress): ClassificationDirection {
    // Count transfers in each direction
    let inCount = 0;
    let outCount = 0;

    for (const transfer of this._transfers) {
      const dir = transfer.getDirection(perspective);
      if (dir === 'in') inCount++;
      if (dir === 'out') outCount++;
    }

    // If no transfers, check the main tx value
    if (this._transfers.length === 0) {
      if (this.from.equals(perspective)) outCount++;
      if (this.to?.equals(perspective)) inCount++;
    }

    return TransactionClassification.computeDirection(this.type, inCount, outCount);
  }

  /**
   * Get a label contextualized for a specific address
   */
  getLabel(perspective: WalletAddress): string {
    const direction = this.getDirection(perspective);

    // Find the primary transfer amount for the label
    const primaryTransfer = this._transfers[0];
    const amountWithSymbol = primaryTransfer?.displayAmount;

    return TransactionClassification.generateLabel(this.type, direction, amountWithSymbol);
  }

  /**
   * Get all unique addresses involved in this transaction
   */
  getInvolvedAddresses(): WalletAddress[] {
    const addresses = new Map<string, WalletAddress>();

    // Add from/to
    addresses.set(this.from.normalized, this.from);
    if (this.to) {
      addresses.set(this.to.normalized, this.to);
    }

    // Add transfer addresses
    for (const transfer of this._transfers) {
      if (transfer.from) {
        addresses.set(transfer.from.normalized, transfer.from);
      }
      if (transfer.to) {
        addresses.set(transfer.to.normalized, transfer.to);
      }
    }

    return Array.from(addresses.values());
  }

  /**
   * Get all unique token addresses involved in this transaction
   */
  getTokenAddresses(): string[] {
    const tokenAddresses = new Set<string>();

    for (const transfer of this._transfers) {
      if (!transfer.isNative && transfer.asset.address.value) {
        tokenAddresses.add(transfer.asset.address.value);
      }
    }

    return Array.from(tokenAddresses);
  }

  /**
   * Check if an address is involved in this transaction
   */
  involves(address: WalletAddress): boolean {
    if (this.from.equals(address)) return true;
    if (this.to?.equals(address)) return true;

    return this._transfers.some((t) => t.involves(address));
  }

  // --- Immutable update methods ---

  /**
   * Create a new Transaction with updated classification
   */
  withClassification(classificationData: ClassificationData): Transaction {
    const newClassification = TransactionClassification.create(classificationData);
    return new Transaction(
      this.id,
      this.hash,
      this.chainAlias,
      this.blockNumber,
      this.blockHash,
      this.timestamp,
      this.from,
      this.to,
      this.value,
      this.fee,
      this.status,
      newClassification,
      this._transfers
    );
  }

  /**
   * Create a new Transaction with transfers
   */
  withTransfers(transfers: Transfer[]): Transaction {
    return new Transaction(
      this.id,
      this.hash,
      this.chainAlias,
      this.blockNumber,
      this.blockHash,
      this.timestamp,
      this.from,
      this.to,
      this.value,
      this.fee,
      this.status,
      this.classification,
      Object.freeze([...transfers])
    );
  }

  // --- Serialization ---

  toJSON(): object {
    return {
      id: this.id,
      hash: this.hash.value,
      chainAlias: this.chainAlias,
      blockNumber: this.blockNumber,
      blockHash: this.blockHash,
      timestamp: this.timestamp.toISOString(),
      from: this.from.normalized,
      to: this.to?.normalized ?? null,
      value: this.value.raw,
      fee: this.fee?.raw ?? null,
      status: this.status,
      classification: this.classification.toJSON(),
      transfers: this._transfers.map((t) => t.toJSON()),
    };
  }

  /**
   * Check equality with another Transaction (by id)
   */
  equals(other: Transaction): boolean {
    return this.id === other.id;
  }
}
