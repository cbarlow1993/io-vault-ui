/**
 * Token entity aggregate root.
 * Combines token metadata, classification, and name analysis into a coherent entity.
 */
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { TokenAddress, TokenAmount } from '@/src/domain/value-objects/index.js';
import { TokenClassification, type RiskLevel, type UserOverride, type TokenClassificationData } from './token-classification.js';
import { TokenName } from './token-name.js';
import { InvalidTokenError } from '../errors.js';

export interface TokenMetadata {
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
}

export interface CreateTokenData {
  id: string;
  chainAlias: ChainAlias;
  address: string | null;
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string | null;
  coingeckoId?: string | null;
  isVerified?: boolean;
  classification?: TokenClassificationData;
}

export interface TokenRow {
  id: string;
  chainAlias: ChainAlias;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
  spamClassification: object | null;
  classificationUpdatedAt: Date | null;
}

/**
 * Token entity aggregate root.
 * Encapsulates token identity, metadata, and spam classification.
 *
 * @example
 * const token = Token.create({
 *   id: 'uuid',
 *   chainAlias: 'ethereum',
 *   address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
 *   name: 'USD Coin',
 *   symbol: 'USDC',
 *   decimals: 6,
 *   coingeckoId: 'usd-coin',
 *   isVerified: true,
 * });
 *
 * token.formatAmount('1000000').formatted; // '1'
 * token.isSpam; // false
 */
export class Token {
  private constructor(
    public readonly id: string,
    public readonly address: TokenAddress,
    public readonly tokenName: TokenName,
    public readonly decimals: number,
    public readonly classification: TokenClassification,
    public readonly metadata: TokenMetadata
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new Token entity
   */
  static create(data: CreateTokenData): Token {
    if (data.decimals < 0 || data.decimals > 77) {
      throw new InvalidTokenError('Decimals must be between 0 and 77', data.address);
    }

    const address = TokenAddress.create(data.address, data.chainAlias);
    const tokenName = TokenName.create(data.name, data.symbol);
    const classification = data.classification
      ? TokenClassification.create(data.classification)
      : TokenClassification.empty();

    const metadata: TokenMetadata = {
      logoUri: data.logoUri ?? null,
      coingeckoId: data.coingeckoId ?? null,
      isVerified: data.isVerified ?? false,
    };

    return new Token(
      data.id,
      address,
      tokenName,
      data.decimals,
      classification,
      metadata
    );
  }

  /**
   * Reconstitute from database row
   */
  static fromDatabase(row: TokenRow): Token {
    const address = TokenAddress.create(row.address, row.chainAlias);
    const tokenName = TokenName.create(row.name, row.symbol);
    const classification = TokenClassification.fromDatabase(row.spamClassification);

    const metadata: TokenMetadata = {
      logoUri: row.logoUri,
      coingeckoId: row.coingeckoId,
      isVerified: row.isVerified,
    };

    return new Token(
      row.id,
      address,
      tokenName,
      row.decimals,
      classification,
      metadata
    );
  }

  /**
   * Create a native token representation (ETH, SOL, BTC, etc.)
   */
  static native(
    chainAlias: ChainAlias,
    name: string,
    symbol: string,
    decimals: number,
    coingeckoId: string | null = null
  ): Token {
    const address = TokenAddress.native(chainAlias);
    const tokenName = TokenName.create(name, symbol);
    const classification = TokenClassification.empty();

    const metadata: TokenMetadata = {
      logoUri: null,
      coingeckoId,
      isVerified: true, // Native tokens are always verified
    };

    return new Token(
      `native-${chainAlias}`,
      address,
      tokenName,
      decimals,
      classification,
      metadata
    );
  }

  // --- Convenience accessors ---

  get chainAlias(): ChainAlias {
    return this.address.chainAlias;
  }

  get symbol(): string {
    return this.tokenName.symbol;
  }

  get name(): string {
    return this.tokenName.value;
  }

  get displayName(): string {
    return this.tokenName.value || this.tokenName.symbol;
  }

  get logoUri(): string | null {
    return this.metadata.logoUri;
  }

  get coingeckoId(): string | null {
    return this.metadata.coingeckoId;
  }

  get isVerified(): boolean {
    return this.metadata.isVerified;
  }

  get isNative(): boolean {
    return this.address.isNative;
  }

  /**
   * Whether the token is considered spam based on classification
   * Does not consider user override - use isEffectivelySpam() for that
   */
  get isSpam(): boolean {
    return this.classification.riskLevel === 'danger';
  }

  /**
   * Get risk level from classification
   */
  get riskLevel(): RiskLevel {
    return this.classification.riskLevel;
  }

  /**
   * Whether name analysis detected suspicious patterns
   */
  get hasSuspiciousName(): boolean {
    return this.tokenName.isSuspicious;
  }

  // --- Business methods ---

  /**
   * Format a raw amount using this token's decimals
   */
  formatAmount(raw: string): TokenAmount {
    return TokenAmount.fromRaw(raw, this.decimals);
  }

  /**
   * Calculate USD value for a given amount
   */
  calculateValue(amount: TokenAmount, price: number | null): number | null {
    if (price === null) return null;
    const numericAmount = parseFloat(amount.formatted);
    return numericAmount * price;
  }

  /**
   * Check if token should be treated as spam, considering user override
   */
  isEffectivelySpam(userOverride: UserOverride): boolean {
    return this.classification.isEffectivelySpam(userOverride);
  }

  /**
   * Check if classification needs refresh
   */
  needsReclassification(ttlHours: number): boolean {
    return this.classification.needsReclassification(ttlHours);
  }

  // --- Immutable update methods ---

  /**
   * Create a new Token with updated classification
   */
  withClassification(classificationData: TokenClassificationData): Token {
    const newClassification = TokenClassification.create(classificationData);
    return new Token(
      this.id,
      this.address,
      this.tokenName,
      this.decimals,
      newClassification,
      this.metadata
    );
  }

  /**
   * Create a new Token with updated metadata
   */
  withMetadata(updates: Partial<TokenMetadata>): Token {
    const newMetadata: TokenMetadata = {
      logoUri: updates.logoUri !== undefined ? updates.logoUri : this.metadata.logoUri,
      coingeckoId: updates.coingeckoId !== undefined ? updates.coingeckoId : this.metadata.coingeckoId,
      isVerified: updates.isVerified !== undefined ? updates.isVerified : this.metadata.isVerified,
    };

    return new Token(
      this.id,
      this.address,
      this.tokenName,
      this.decimals,
      this.classification,
      newMetadata
    );
  }

  // --- Serialization ---

  toJSON(): object {
    return {
      id: this.id,
      chainAlias: this.chainAlias,
      address: this.address.value,
      isNative: this.isNative,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      logoUri: this.logoUri,
      coingeckoId: this.coingeckoId,
      isVerified: this.isVerified,
      isSpam: this.isSpam,
      riskLevel: this.riskLevel,
      hasSuspiciousName: this.hasSuspiciousName,
      classification: this.classification.toJSON(),
    };
  }

  /**
   * Check equality with another Token
   */
  equals(other: Token): boolean {
    return this.id === other.id;
  }
}
