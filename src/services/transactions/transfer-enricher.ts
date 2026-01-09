import { Chain, type ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type {
  NativeTransfer,
  TokenTransferWithMetadata,
  EnrichedTransfer,
  AssetMetadata,
} from '@/src/repositories/types.js';
import { formatAmount } from '@/src/services/transaction-processor/classifier/label.js';
import { getNativeCoingeckoId } from '@/src/domain/value-objects/index.js';

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
    const normalizedPerspective = perspectiveAddress.toLowerCase();

    // Get native currency metadata from chain SDK
    const nativeAsset = await this.getNativeAssetMetadata(chainAlias);

    // Enrich native transfers
    const enrichedNative = nativeTransfers.map((transfer) =>
      this.enrichNativeTransfer(transfer, nativeAsset, normalizedPerspective)
    );

    // Enrich token transfers
    const enrichedTokens = tokenTransfers.map((transfer) =>
      this.enrichTokenTransfer(transfer, normalizedPerspective)
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
   * Enriches a single native transfer.
   */
  private enrichNativeTransfer(
    transfer: NativeTransfer,
    asset: AssetMetadata,
    perspectiveAddress: string
  ): EnrichedTransfer {
    const direction = this.calculateDirection(
      transfer.fromAddress,
      transfer.toAddress,
      perspectiveAddress
    );

    const formattedAmount = formatAmount(transfer.amount, asset.decimals);
    const displayAmount = `${formattedAmount} ${asset.symbol}`;

    return {
      id: transfer.id,
      transferType: 'native',
      direction,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenAddress: null,
      amount: transfer.amount,
      formattedAmount,
      displayAmount,
      asset,
    };
  }

  /**
   * Enriches a single token transfer.
   */
  private enrichTokenTransfer(
    transfer: TokenTransferWithMetadata,
    perspectiveAddress: string
  ): EnrichedTransfer {
    const direction = this.calculateDirection(
      transfer.fromAddress,
      transfer.toAddress,
      perspectiveAddress
    );

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

    const formattedAmount = formatAmount(transfer.amount, decimals);
    const displayAmount = `${formattedAmount} ${symbol}`;

    return {
      id: transfer.id,
      transferType: 'token',
      direction,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenAddress: transfer.tokenAddress,
      amount: transfer.amount,
      formattedAmount,
      displayAmount,
      asset,
    };
  }

  /**
   * Calculates the direction of a transfer from the perspective address.
   */
  private calculateDirection(
    fromAddress: string | null,
    toAddress: string | null,
    perspectiveAddress: string
  ): 'in' | 'out' {
    const normalizedFrom = fromAddress?.toLowerCase();
    const normalizedTo = toAddress?.toLowerCase();

    if (normalizedTo === perspectiveAddress) {
      return 'in';
    }
    if (normalizedFrom === perspectiveAddress) {
      return 'out';
    }
    // Default to 'out' if perspective address is not involved
    // This shouldn't happen in practice as transfers are linked to the address
    return 'out';
  }
}
