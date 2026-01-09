/**
 * Balance entity.
 * Represents a token or native currency balance for an address.
 */
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { TokenAddress, TokenAmount } from '@/src/domain/value-objects/index.js';
import { Token } from '../token/token.js';
import { SpamAnalysis } from './spam-analysis.js';
import type { UserOverride } from '../token/token-classification.js';
import { InvalidBalanceError } from '../errors.js';

export interface BalancePriceInfo {
  price: number;
  priceChange24h: number | null;
  updatedAt: Date;
  isStale: boolean;
}

export interface NativeAsset {
  chainAlias: ChainAlias;
  name: string;
  symbol: string;
  decimals: number;
  coingeckoId: string | null;
}

export interface CreateBalanceData {
  id: string;
  addressId: string;
  chainAlias: ChainAlias;
  tokenAddress: string | null;
  isNative: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  logoUri?: string | null;
  coingeckoId?: string | null;
  isVerified?: boolean;
  visibility?: 'visible' | 'hidden';
  userSpamOverride?: UserOverride;
  price?: BalancePriceInfo | null;
  spamAnalysis?: SpamAnalysis;
}

/**
 * Enriched balance interface for API responses.
 * Matches existing EnrichedBalance structure for backward compatibility.
 */
export interface EnrichedBalanceDTO {
  tokenAddress: string | null;
  isNative: boolean;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdPrice: number | null;
  usdValue: number | null;
  priceChange24h: number | null;
  isPriceStale: boolean;
  logoUri: string | null;
  coingeckoId: string | null;
  spamAnalysis: ReturnType<SpamAnalysis['toJSON']> | null;
}

/**
 * Balance entity representing a token or native balance for an address.
 *
 * @example
 * const balance = Balance.create({
 *   id: 'uuid',
 *   addressId: 'address-uuid',
 *   chainAlias: 'ethereum',
 *   tokenAddress: null,
 *   isNative: true,
 *   balance: '1000000000000000000',
 *   decimals: 18,
 *   name: 'Ethereum',
 *   symbol: 'ETH',
 * });
 *
 * balance.formattedBalance; // '1'
 * balance.usdValue; // 3500 (if price is set)
 */
export class Balance {
  private constructor(
    public readonly id: string,
    public readonly addressId: string,
    public readonly tokenAddress: TokenAddress,
    public readonly amount: TokenAmount,
    public readonly name: string,
    public readonly symbol: string,
    public readonly logoUri: string | null,
    public readonly coingeckoId: string | null,
    public readonly isVerified: boolean,
    public readonly visibility: 'visible' | 'hidden',
    public readonly spamAnalysis: SpamAnalysis,
    public readonly price: BalancePriceInfo | null
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new Balance entity
   */
  static create(data: CreateBalanceData): Balance {
    if (data.decimals < 0 || data.decimals > 77) {
      throw new InvalidBalanceError('Decimals must be between 0 and 77', data.tokenAddress);
    }

    const tokenAddress = data.isNative
      ? TokenAddress.native(data.chainAlias)
      : TokenAddress.create(data.tokenAddress, data.chainAlias);

    const amount = TokenAmount.fromRaw(data.balance, data.decimals);
    const spamAnalysis = data.spamAnalysis ?? SpamAnalysis.none();

    return new Balance(
      data.id,
      data.addressId,
      tokenAddress,
      amount,
      data.name,
      data.symbol,
      data.logoUri ?? null,
      data.coingeckoId ?? null,
      data.isVerified ?? false,
      data.visibility ?? 'visible',
      spamAnalysis,
      data.price ?? null
    );
  }

  /**
   * Create a native currency balance
   */
  static native(
    id: string,
    addressId: string,
    chainAlias: ChainAlias,
    balance: string,
    asset: NativeAsset,
    price?: BalancePriceInfo | null
  ): Balance {
    return Balance.create({
      id,
      addressId,
      chainAlias,
      tokenAddress: null,
      isNative: true,
      balance,
      decimals: asset.decimals,
      name: asset.name,
      symbol: asset.symbol,
      coingeckoId: asset.coingeckoId,
      isVerified: true,
      price,
    });
  }

  /**
   * Create a balance from a Token entity
   */
  static fromToken(
    id: string,
    addressId: string,
    token: Token,
    balance: string,
    userOverride: UserOverride,
    price?: BalancePriceInfo | null,
    visibility?: 'visible' | 'hidden'
  ): Balance {
    const amount = token.formatAmount(balance);
    const spamAnalysis = SpamAnalysis.fromClassification(
      token.classification,
      userOverride,
      token.classification.classifiedAt
    );

    return new Balance(
      id,
      addressId,
      token.address,
      amount,
      token.name,
      token.symbol,
      token.logoUri,
      token.coingeckoId,
      token.isVerified,
      visibility ?? 'visible',
      spamAnalysis,
      price ?? null
    );
  }

  // --- Computed properties ---

  get chainAlias(): ChainAlias {
    return this.tokenAddress.chainAlias;
  }

  get isNative(): boolean {
    return this.tokenAddress.isNative;
  }

  get decimals(): number {
    return this.amount.decimals;
  }

  get rawBalance(): string {
    return this.amount.raw;
  }

  get formattedBalance(): string {
    return this.amount.formatted;
  }

  get usdPrice(): number | null {
    return this.price?.price ?? null;
  }

  get usdValue(): number | null {
    if (this.price === null) return null;
    const numericAmount = parseFloat(this.amount.formatted);
    return numericAmount * this.price.price;
  }

  get priceChange24h(): number | null {
    return this.price?.priceChange24h ?? null;
  }

  get isPriceStale(): boolean {
    return this.price?.isStale ?? false;
  }

  get isSpam(): boolean {
    return this.spamAnalysis.isEffectivelySpam;
  }

  get userSpamOverride(): UserOverride {
    return this.spamAnalysis.userOverride;
  }

  get isHidden(): boolean {
    return this.visibility === 'hidden';
  }

  get isVisible(): boolean {
    return this.visibility === 'visible';
  }

  // --- Business methods ---

  /**
   * Determine if this balance should be displayed based on spam settings
   */
  shouldDisplay(showSpam: boolean): boolean {
    if (this.isHidden) return false;
    if (showSpam) return true;
    return !this.isSpam;
  }

  // --- Immutable update methods ---

  /**
   * Create a new Balance with updated visibility
   */
  withVisibility(visibility: 'visible' | 'hidden'): Balance {
    return new Balance(
      this.id,
      this.addressId,
      this.tokenAddress,
      this.amount,
      this.name,
      this.symbol,
      this.logoUri,
      this.coingeckoId,
      this.isVerified,
      visibility,
      this.spamAnalysis,
      this.price
    );
  }

  /**
   * Create a new Balance with updated spam override
   */
  withUserOverride(override: UserOverride): Balance {
    // Recalculate spam analysis with new override
    const newSpamAnalysis = SpamAnalysis.create({
      blockaid: this.spamAnalysis.blockaid,
      coingecko: this.spamAnalysis.coingecko,
      heuristics: this.spamAnalysis.heuristics,
      userOverride: override,
      classificationUpdatedAt: this.spamAnalysis.classificationUpdatedAt,
    });

    return new Balance(
      this.id,
      this.addressId,
      this.tokenAddress,
      this.amount,
      this.name,
      this.symbol,
      this.logoUri,
      this.coingeckoId,
      this.isVerified,
      this.visibility,
      newSpamAnalysis,
      this.price
    );
  }

  /**
   * Create a new Balance with updated price
   */
  withPrice(price: BalancePriceInfo | null): Balance {
    return new Balance(
      this.id,
      this.addressId,
      this.tokenAddress,
      this.amount,
      this.name,
      this.symbol,
      this.logoUri,
      this.coingeckoId,
      this.isVerified,
      this.visibility,
      this.spamAnalysis,
      price
    );
  }

  // --- Serialization ---

  /**
   * Convert to EnrichedBalance DTO for API responses.
   * Maintains backward compatibility with existing API structure.
   */
  toEnrichedBalance(): EnrichedBalanceDTO {
    return {
      tokenAddress: this.tokenAddress.value,
      isNative: this.isNative,
      symbol: this.symbol,
      name: this.name,
      decimals: this.decimals,
      balance: this.rawBalance,
      formattedBalance: this.formattedBalance,
      usdPrice: this.usdPrice,
      usdValue: this.usdValue,
      priceChange24h: this.priceChange24h,
      isPriceStale: this.isPriceStale,
      logoUri: this.logoUri,
      coingeckoId: this.coingeckoId,
      spamAnalysis: this.spamAnalysis.hasClassification ? this.spamAnalysis.toJSON() : null,
    };
  }

  toJSON(): object {
    return {
      id: this.id,
      addressId: this.addressId,
      chainAlias: this.chainAlias,
      tokenAddress: this.tokenAddress.value,
      isNative: this.isNative,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      balance: this.rawBalance,
      formattedBalance: this.formattedBalance,
      usdPrice: this.usdPrice,
      usdValue: this.usdValue,
      priceChange24h: this.priceChange24h,
      isPriceStale: this.isPriceStale,
      logoUri: this.logoUri,
      coingeckoId: this.coingeckoId,
      isVerified: this.isVerified,
      visibility: this.visibility,
      isSpam: this.isSpam,
      spamAnalysis: this.spamAnalysis.toJSON(),
    };
  }

  /**
   * Check equality with another Balance (by id)
   */
  equals(other: Balance): boolean {
    return this.id === other.id;
  }
}
