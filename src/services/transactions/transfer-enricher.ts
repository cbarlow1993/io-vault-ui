import { Chain, type ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type {
  NativeTransfer,
  TokenTransferWithMetadata,
  EnrichedTransfer,
  AssetMetadata,
} from '@/src/repositories/types.js';
import { getNativeCoingeckoId, WalletAddress } from '@/src/domain/value-objects/index.js';
import { Transfer } from '@/src/domain/entities/index.js';

/**
 * Default asset metadata for tokens without metadata in the database
 */
const DEFAULT_TOKEN_METADATA: Omit<AssetMetadata, 'name' | 'symbol' | 'decimals'> = {
  logoUri: null,
  coingeckoId: null,
  isVerified: false,
  isSpam: false,
};

/**
 * Enriches native and token transfers with asset metadata and formatted amounts.
 */
export class TransferEnricher {
  /**
   * Enriches transfers with asset metadata and formatted amounts.
   *
   * @param chainAlias - The chain alias (e.g., 'ethereum', 'solana')
   * @param nativeTransfers - Native transfers from the database
   * @param tokenTransfers - Token transfers with joined metadata from the database
   * @param perspectiveAddress - The address to calculate direction from
   * @returns Array of enriched transfers with full asset metadata
   */
  async enrichTransfers(
    chainAlias: ChainAlias,
    nativeTransfers: NativeTransfer[],
    tokenTransfers: TokenTransferWithMetadata[],
    perspectiveAddress: string
  ): Promise<EnrichedTransfer[]> {
    // Create WalletAddress for direction calculation
    const perspective = WalletAddress.create(perspectiveAddress, chainAlias);

    // Get native currency metadata from chain SDK
    const nativeAsset = await this.getNativeAssetMetadata(chainAlias);

    // Enrich native transfers using Transfer entity
    const enrichedNative = nativeTransfers.map((transfer) =>
      this.enrichNativeTransfer(chainAlias, transfer, nativeAsset, perspective)
    );

    // Enrich token transfers using Transfer entity
    const enrichedTokens = tokenTransfers.map((transfer) =>
      this.enrichTokenTransfer(chainAlias, transfer, perspective)
    );

    // Combine and return
    return [...enrichedNative, ...enrichedTokens];
  }

  /**
   * Gets native currency metadata from the chain SDK.
   */
  private async getNativeAssetMetadata(chainAlias: ChainAlias): Promise<AssetMetadata> {
    try {
      const chain = await Chain.fromAlias(chainAlias);
      const nativeCurrency = chain.Config.nativeCurrency;

      return {
        name: nativeCurrency.name,
        symbol: nativeCurrency.symbol,
        decimals: nativeCurrency.decimals,
        logoUri: null, // Could be added to chain config in future
        coingeckoId: getNativeCoingeckoId(chainAlias),
        isVerified: true,
        isSpam: false,
      };
    } catch {
      // Fallback for unknown chains
      return {
        name: 'Unknown',
        symbol: 'UNKNOWN',
        decimals: 18,
        logoUri: null,
        coingeckoId: null,
        isVerified: false,
        isSpam: false,
      };
    }
  }

  /**
   * Enriches a single native transfer using the Transfer domain entity.
   */
  private enrichNativeTransfer(
    chainAlias: ChainAlias,
    transfer: NativeTransfer,
    asset: AssetMetadata,
    perspective: WalletAddress
  ): EnrichedTransfer {
    // Create Transfer entity for amount formatting and direction calculation
    const transferEntity = Transfer.native(chainAlias, transfer.fromAddress, transfer.toAddress, transfer.amount, {
      name: asset.name,
      symbol: asset.symbol,
      decimals: asset.decimals,
      coingeckoId: asset.coingeckoId,
    });

    // Get direction, defaulting to 'out' if address not involved
    const direction = transferEntity.getDirection(perspective) ?? 'out';

    return {
      id: transfer.id,
      transferType: 'native',
      direction,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenAddress: null,
      amount: transfer.amount,
      formattedAmount: transferEntity.formattedAmount,
      displayAmount: transferEntity.displayAmount,
      asset,
    };
  }

  /**
   * Enriches a single token transfer using the Transfer domain entity.
   */
  private enrichTokenTransfer(
    chainAlias: ChainAlias,
    transfer: TokenTransferWithMetadata,
    perspective: WalletAddress
  ): EnrichedTransfer {
    // Use metadata from tokens table, or fallback to defaults
    const decimals = transfer.tokenDecimals ?? 18;
    const symbol = transfer.tokenSymbol ?? 'TOKEN';
    const name = transfer.tokenName ?? 'Unknown Token';

    const asset: AssetMetadata = {
      name,
      symbol,
      decimals,
      logoUri: transfer.tokenLogoUri ?? DEFAULT_TOKEN_METADATA.logoUri,
      coingeckoId: transfer.tokenCoingeckoId ?? DEFAULT_TOKEN_METADATA.coingeckoId,
      isVerified: transfer.tokenIsVerified ?? DEFAULT_TOKEN_METADATA.isVerified,
      isSpam: transfer.tokenIsSpam ?? DEFAULT_TOKEN_METADATA.isSpam,
    };

    // Create Transfer entity for amount formatting and direction calculation
    const transferEntity = Transfer.token(chainAlias, transfer.fromAddress, transfer.toAddress, transfer.amount, {
      address: transfer.tokenAddress,
      name,
      symbol,
      decimals,
      logoUri: asset.logoUri,
      coingeckoId: asset.coingeckoId,
      isVerified: asset.isVerified,
      isSpam: asset.isSpam,
    });

    // Get direction, defaulting to 'out' if address not involved
    const direction = transferEntity.getDirection(perspective) ?? 'out';

    return {
      id: transfer.id,
      transferType: 'token',
      direction,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenAddress: transfer.tokenAddress,
      amount: transfer.amount,
      formattedAmount: transferEntity.formattedAmount,
      displayAmount: transferEntity.displayAmount,
      asset,
    };
  }

}
