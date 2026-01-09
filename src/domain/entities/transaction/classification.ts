/**
 * TransactionClassification value object.
 * Immutable representation of how a transaction is classified.
 */

export type ClassificationType =
  | 'transfer'
  | 'swap'
  | 'bridge'
  | 'stake'
  | 'mint'
  | 'burn'
  | 'approve'
  | 'contract_deploy'
  | 'nft_transfer'
  | 'unknown';

export type ClassificationDirection = 'in' | 'out' | 'neutral';
export type ClassificationConfidence = 'high' | 'medium' | 'low';
export type ClassificationSource = 'custom' | 'noves';

export interface ClassificationData {
  type: ClassificationType;
  direction: ClassificationDirection;
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  label: string;
  protocol?: string;
}

/**
 * Immutable value object representing transaction classification.
 *
 * @example
 * const classification = TransactionClassification.create({
 *   type: 'transfer',
 *   direction: 'out',
 *   confidence: 'high',
 *   source: 'custom',
 *   label: 'Sent 1.5 ETH',
 * });
 *
 * classification.isOutgoing; // true
 * classification.type; // 'transfer'
 */
export class TransactionClassification {
  private constructor(
    public readonly type: ClassificationType,
    public readonly direction: ClassificationDirection,
    public readonly confidence: ClassificationConfidence,
    public readonly source: ClassificationSource,
    public readonly label: string,
    public readonly protocol: string | null
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new classification
   */
  static create(data: ClassificationData): TransactionClassification {
    return new TransactionClassification(
      data.type,
      data.direction,
      data.confidence,
      data.source,
      data.label,
      data.protocol ?? null
    );
  }

  /**
   * Create an unknown classification (default)
   */
  static unknown(): TransactionClassification {
    return new TransactionClassification(
      'unknown',
      'neutral',
      'low',
      'custom',
      'Transaction',
      null
    );
  }

  /**
   * Compute direction from transfers relative to a perspective address.
   * Consolidates direction.ts logic.
   */
  static computeDirection(
    type: ClassificationType,
    incomingCount: number,
    outgoingCount: number
  ): ClassificationDirection {
    // Type-based overrides (no transfer analysis needed)
    switch (type) {
      case 'swap':
      case 'approve':
      case 'contract_deploy':
      case 'unknown':
        return 'neutral';

      case 'mint':
        return 'in';

      case 'burn':
        return 'out';

      default:
        break;
    }

    // For stake, transfer, nft_transfer, bridge: analyze transfers
    if (incomingCount > 0 && outgoingCount === 0) {
      return 'in';
    }
    if (outgoingCount > 0 && incomingCount === 0) {
      return 'out';
    }

    // Mixed or no transfers
    return 'neutral';
  }

  /**
   * Generate a human-readable label for the classification.
   * Consolidates label.ts logic.
   */
  static generateLabel(
    type: ClassificationType,
    direction: ClassificationDirection,
    amountWithSymbol?: string
  ): string {
    const tokens = amountWithSymbol ?? 'tokens';

    switch (type) {
      case 'transfer':
        switch (direction) {
          case 'in':
            return `Received ${tokens}`;
          case 'out':
            return `Sent ${tokens}`;
          default:
            return `Transferred ${tokens}`;
        }

      case 'stake':
        switch (direction) {
          case 'in':
            return `Unstaked ${tokens}`;
          case 'out':
            return `Staked ${tokens}`;
          default:
            return 'Stake Interaction';
        }

      case 'swap':
        return `Swapped ${amountWithSymbol ? tokens.split(' ')[1] ?? 'tokens' : 'tokens'}`;

      case 'mint':
        return `Minted ${tokens}`;

      case 'burn':
        return `Burned ${tokens}`;

      case 'approve':
        return 'Token Approval';

      case 'contract_deploy':
        return 'Deployed Contract';

      case 'nft_transfer':
        switch (direction) {
          case 'in':
            return 'Received NFT';
          case 'out':
            return 'Sent NFT';
          default:
            return 'NFT Transfer';
        }

      case 'bridge':
        switch (direction) {
          case 'in':
            return `Bridged In ${tokens}`;
          case 'out':
            return `Bridged Out ${tokens}`;
          default:
            return `Bridged ${tokens}`;
        }

      default:
        return 'Transaction';
    }
  }

  // --- Computed properties ---

  get isNeutral(): boolean {
    return this.direction === 'neutral';
  }

  get isIncoming(): boolean {
    return this.direction === 'in';
  }

  get isOutgoing(): boolean {
    return this.direction === 'out';
  }

  get isHighConfidence(): boolean {
    return this.confidence === 'high';
  }

  get isFromNoves(): boolean {
    return this.source === 'noves';
  }

  get isTransfer(): boolean {
    return this.type === 'transfer' || this.type === 'nft_transfer';
  }

  get isSwapOrBridge(): boolean {
    return this.type === 'swap' || this.type === 'bridge';
  }

  get isUnknown(): boolean {
    return this.type === 'unknown';
  }

  // --- Immutable update methods ---

  /**
   * Create a new classification with updated direction
   */
  withDirection(direction: ClassificationDirection): TransactionClassification {
    return new TransactionClassification(
      this.type,
      direction,
      this.confidence,
      this.source,
      this.label,
      this.protocol
    );
  }

  /**
   * Create a new classification with updated label
   */
  withLabel(label: string): TransactionClassification {
    return new TransactionClassification(
      this.type,
      this.direction,
      this.confidence,
      this.source,
      label,
      this.protocol
    );
  }

  /**
   * Create a new classification with direction and regenerated label
   */
  withDirectionAndLabel(
    direction: ClassificationDirection,
    amountWithSymbol?: string
  ): TransactionClassification {
    const label = TransactionClassification.generateLabel(this.type, direction, amountWithSymbol);
    return new TransactionClassification(
      this.type,
      direction,
      this.confidence,
      this.source,
      label,
      this.protocol
    );
  }

  // --- Serialization ---

  toJSON(): {
    type: ClassificationType;
    direction: ClassificationDirection;
    confidence: ClassificationConfidence;
    source: ClassificationSource;
    label: string;
    protocol: string | null;
  } {
    return {
      type: this.type,
      direction: this.direction,
      confidence: this.confidence,
      source: this.source,
      label: this.label,
      protocol: this.protocol,
    };
  }

  /**
   * Check equality with another classification
   */
  equals(other: TransactionClassification): boolean {
    return (
      this.type === other.type &&
      this.direction === other.direction &&
      this.confidence === other.confidence &&
      this.source === other.source
    );
  }
}
