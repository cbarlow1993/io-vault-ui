/**
 * Transfer value object.
 * Immutable representation of a single transfer within a transaction.
 */
import { TokenAddress, TokenAmount, WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export type TransferType = 'native' | 'token' | 'nft';

export interface TransferAsset {
  address: TokenAddress;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
}

export interface CreateTransferData {
  type: TransferType;
  chainAlias: ChainAlias;
  from: string | null;
  to: string | null;
  amount: string;
  decimals: number;
  tokenAddress?: string | null;
  tokenName?: string;
  tokenSymbol?: string;
  logoUri?: string | null;
  coingeckoId?: string | null;
  isVerified?: boolean;
  isSpam?: boolean;
  tokenId?: string;
}

/**
 * Immutable value object representing a transfer within a transaction.
 *
 * @example
 * const transfer = Transfer.native(
 *   'ethereum',
 *   '0xSender...',
 *   '0xReceiver...',
 *   '1000000000000000000',
 *   { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
 * );
 *
 * transfer.displayAmount; // '1 ETH'
 * transfer.getDirection(senderAddress); // 'out'
 */
export class Transfer {
  private constructor(
    public readonly type: TransferType,
    public readonly from: WalletAddress | null,
    public readonly to: WalletAddress | null,
    public readonly amount: TokenAmount,
    public readonly asset: TransferAsset,
    public readonly tokenId: string | null
  ) {
    Object.freeze(this);
  }

  /**
   * Create a transfer from raw data
   */
  static create(data: CreateTransferData): Transfer {
    const from = data.from ? WalletAddress.create(data.from, data.chainAlias) : null;
    const to = data.to ? WalletAddress.create(data.to, data.chainAlias) : null;
    const amount = TokenAmount.fromRaw(data.amount, data.decimals);

    const tokenAddress = data.type === 'native'
      ? TokenAddress.native(data.chainAlias)
      : TokenAddress.create(data.tokenAddress ?? null, data.chainAlias);

    const asset: TransferAsset = {
      address: tokenAddress,
      name: data.tokenName ?? '',
      symbol: data.tokenSymbol ?? '',
      decimals: data.decimals,
      logoUri: data.logoUri ?? null,
      coingeckoId: data.coingeckoId ?? null,
      isVerified: data.isVerified ?? false,
      isSpam: data.isSpam ?? false,
    };

    return new Transfer(
      data.type,
      from,
      to,
      amount,
      asset,
      data.tokenId ?? null
    );
  }

  /**
   * Create a native currency transfer
   */
  static native(
    chainAlias: ChainAlias,
    from: string | null,
    to: string | null,
    amount: string,
    assetInfo: { name: string; symbol: string; decimals: number; coingeckoId?: string | null }
  ): Transfer {
    return Transfer.create({
      type: 'native',
      chainAlias,
      from,
      to,
      amount,
      decimals: assetInfo.decimals,
      tokenName: assetInfo.name,
      tokenSymbol: assetInfo.symbol,
      coingeckoId: assetInfo.coingeckoId,
      isVerified: true,
    });
  }

  /**
   * Create a token transfer
   */
  static token(
    chainAlias: ChainAlias,
    from: string | null,
    to: string | null,
    amount: string,
    tokenInfo: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      logoUri?: string | null;
      coingeckoId?: string | null;
      isVerified?: boolean;
      isSpam?: boolean;
    }
  ): Transfer {
    return Transfer.create({
      type: 'token',
      chainAlias,
      from,
      to,
      amount,
      decimals: tokenInfo.decimals,
      tokenAddress: tokenInfo.address,
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      logoUri: tokenInfo.logoUri,
      coingeckoId: tokenInfo.coingeckoId,
      isVerified: tokenInfo.isVerified,
      isSpam: tokenInfo.isSpam,
    });
  }

  /**
   * Create an NFT transfer
   */
  static nft(
    chainAlias: ChainAlias,
    from: string | null,
    to: string | null,
    tokenInfo: {
      address: string;
      name: string;
      symbol: string;
      tokenId: string;
      logoUri?: string | null;
      isVerified?: boolean;
      isSpam?: boolean;
    }
  ): Transfer {
    return Transfer.create({
      type: 'nft',
      chainAlias,
      from,
      to,
      amount: '1', // NFTs always have amount of 1
      decimals: 0,
      tokenAddress: tokenInfo.address,
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      logoUri: tokenInfo.logoUri,
      tokenId: tokenInfo.tokenId,
      isVerified: tokenInfo.isVerified,
      isSpam: tokenInfo.isSpam,
    });
  }

  // --- Computed properties ---

  get isNative(): boolean {
    return this.type === 'native';
  }

  get isToken(): boolean {
    return this.type === 'token';
  }

  get isNft(): boolean {
    return this.type === 'nft';
  }

  get chainAlias(): ChainAlias {
    return this.asset.address.chainAlias;
  }

  get symbol(): string {
    return this.asset.symbol;
  }

  get name(): string {
    return this.asset.name;
  }

  get decimals(): number {
    return this.asset.decimals;
  }

  get formattedAmount(): string {
    return this.amount.formatted;
  }

  /**
   * Human-readable display amount with symbol (e.g., "1.5 ETH")
   */
  get displayAmount(): string {
    if (this.isNft) {
      return `1 ${this.symbol}`;
    }
    return `${this.formattedAmount} ${this.symbol}`;
  }

  // --- Business methods ---

  /**
   * Get direction of transfer relative to a perspective address
   */
  getDirection(perspective: WalletAddress): 'in' | 'out' | null {
    const isFrom = this.from?.equals(perspective) ?? false;
    const isTo = this.to?.equals(perspective) ?? false;

    if (isFrom && !isTo) return 'out';
    if (isTo && !isFrom) return 'in';
    if (isFrom && isTo) return 'out'; // Self-transfer counts as out

    return null; // Address not involved in this transfer
  }

  /**
   * Check if an address is involved in this transfer
   */
  involves(address: WalletAddress): boolean {
    return (
      (this.from !== null && this.from.equals(address)) ||
      (this.to !== null && this.to.equals(address))
    );
  }

  /**
   * Check if this transfer is from a specific address
   */
  isFrom(address: WalletAddress): boolean {
    return this.from !== null && this.from.equals(address);
  }

  /**
   * Check if this transfer is to a specific address
   */
  isTo(address: WalletAddress): boolean {
    return this.to !== null && this.to.equals(address);
  }

  // --- Serialization ---

  toJSON(): object {
    return {
      type: this.type,
      from: this.from?.normalized ?? null,
      to: this.to?.normalized ?? null,
      amount: this.amount.raw,
      formattedAmount: this.formattedAmount,
      displayAmount: this.displayAmount,
      tokenId: this.tokenId,
      asset: {
        address: this.asset.address.value,
        name: this.asset.name,
        symbol: this.asset.symbol,
        decimals: this.asset.decimals,
        logoUri: this.asset.logoUri,
        coingeckoId: this.asset.coingeckoId,
        isVerified: this.asset.isVerified,
        isSpam: this.asset.isSpam,
      },
    };
  }

  /**
   * Check equality with another Transfer
   */
  equals(other: Transfer): boolean {
    return (
      this.type === other.type &&
      this.from?.equals(other.from ?? WalletAddress.create('', this.chainAlias)) ===
        (other.from !== null) &&
      this.to?.equals(other.to ?? WalletAddress.create('', this.chainAlias)) ===
        (other.to !== null) &&
      this.amount.raw === other.amount.raw &&
      this.asset.address.equals(other.asset.address)
    );
  }
}
