import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/src/lib/database/types.js';
import { logger } from '@/utils/powertools.js';
import type {
  TransactionUpserter as ITransactionUpserter,
  NormalizedTransaction,
  ClassificationResult,
  ProcessResult,
  TokenInfo,
  ParsedTransfer,
  UpsertOptions,
} from '@/src/services/transaction-processor/types.js';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';

export class TransactionUpserter implements ITransactionUpserter {
  constructor(private readonly db: Kysely<Database>) {}

  async upsert(
    normalized: NormalizedTransaction,
    classification: ClassificationResult,
    tokens: TokenInfo[],
    options?: UpsertOptions
  ): Promise<ProcessResult> {
    const tokensDiscovered = tokens.length;
    let tokensUpserted = 0;

    const result = await this.db.transaction().execute(async (trx) => {
      // 1. Upsert tokens
      for (const token of tokens) {
        await this.upsertToken(trx, normalized.chainAlias, token);
        tokensUpserted++;
      }

      // 2. Upsert transaction
      const txResult = await this.upsertTransaction(trx, normalized, classification);

      // 3. Upsert transfers
      await this.upsertTransfers(
        trx,
        txResult.id,
        normalized.chainAlias,
        classification.transfers
      );

      // 4. Link address to transaction (for reconciliation lookups)
      await this.upsertAddressTransactions(
        trx,
        txResult.id,
        normalized,
        classification,
        options?.forAddress
      );

      return txResult;
    });

    return {
      transactionId: result.id,
      classificationType: classification.type,
      tokensDiscovered,
      tokensUpserted,
    };
  }

  private async upsertToken(
    trx: Kysely<Database>,
    chainAlias: ChainAlias,
    token: TokenInfo
  ): Promise<void> {
    const now = new Date().toISOString();

    await trx
      .insertInto('tokens')
      .values({
        id: uuidv4(),
        chain_alias: chainAlias,
        address: token.address,
        name: token.name ?? 'Unknown',
        symbol: token.symbol ?? 'UNKNOWN',
        decimals: token.decimals ?? 18,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        // Flag new tokens for classification by the background worker
        needs_classification: true,
        classification_attempts: 0,
        classification_error: null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['chain_alias', 'address']).doUpdateSet({
          name: token.name ?? 'Unknown',
          symbol: token.symbol ?? 'UNKNOWN',
          decimals: token.decimals ?? 18,
          updated_at: now,
        })
      )
      .execute();
  }

  private async upsertTransaction(
    trx: Kysely<Database>,
    normalized: NormalizedTransaction,
    classification: ClassificationResult
  ): Promise<{ id: string }> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const result = await trx
      .insertInto('transactions')
      .values({
        id,
        chain_alias: normalized.chainAlias,
        tx_hash: normalized.txHash.toLowerCase(), // tx hashes are hex, lowercase is safe
        block_number: normalized.blockNumber,
        block_hash: normalized.blockHash,
        tx_index: null,
        from_address: normalized.from,
        to_address: normalized.to ?? null,
        value: normalized.value,
        fee: normalized.fee,
        status: normalized.status,
        timestamp: normalized.timestamp.toISOString(),
        classification_type: classification.type,
        classification_label: classification.label,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['chain_alias', 'tx_hash']).doUpdateSet({
          classification_type: classification.type,
          classification_label: classification.label,
          updated_at: now,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return { id: result.id };
  }

  private async upsertTransfers(
    trx: Kysely<Database>,
    txId: string,
    chainAlias: ChainAlias,
    transfers: ParsedTransfer[]
  ): Promise<void> {
    const now = new Date().toISOString();

    // Delete existing transfers for this transaction to avoid duplicates on re-processing
    await trx.deleteFrom('native_transfers').where('tx_id', '=', txId).execute();
    await trx.deleteFrom('token_transfers').where('tx_id', '=', txId).execute();

    for (const transfer of transfers) {
      if (transfer.type === 'native') {
        await trx
          .insertInto('native_transfers')
          .values({
            id: uuidv4(),
            tx_id: txId,
            chain_alias: chainAlias,
            from_address: transfer.from || null,
            to_address: transfer.to || null,
            amount: transfer.amount,
            metadata: null,
            created_at: now,
          })
          .execute();
      } else if (transfer.type === 'token' || transfer.type === 'nft') {
        if (!transfer.token) {
          // Log warning but continue processing - missing token info is not fatal
          logger.warn('Transfer skipped: missing token info', {
            transferType: transfer.type,
            txId,
          });
          continue;
        }

        // For NFTs, include tokenId in metadata
        const metadata =
          transfer.type === 'nft' && transfer.tokenId
            ? JSON.stringify({ tokenId: transfer.tokenId, isNft: true })
            : null;

        await trx
          .insertInto('token_transfers')
          .values({
            id: uuidv4(),
            tx_id: txId,
            chain_alias: chainAlias,
            token_address: transfer.token.address,
            from_address: transfer.from || null,
            to_address: transfer.to || null,
            amount: transfer.amount,
            transfer_type: this.mapDirectionToTransferType(transfer.direction),
            metadata,
            created_at: now,
          })
          .execute();
      }
    }
  }

  private mapDirectionToTransferType(_direction: 'in' | 'out'): 'transfer' | 'mint' | 'burn' | 'approve' {
    // For now, map all directions to 'transfer'.
    // In the future, this could be enhanced based on classification type.
    return 'transfer';
  }

  /**
   * Links addresses to the transaction in the address_transactions table.
   * This enables efficient lookups of transactions by address.
   */
  private async upsertAddressTransactions(
    trx: Kysely<Database>,
    txId: string,
    normalized: NormalizedTransaction,
    classification: ClassificationResult,
    forAddress?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Collect all unique addresses involved in this transaction
    // Use Map<lowercase, original> to deduplicate case-insensitively while preserving original format
    const addressMap = new Map<string, string>();

    const addAddress = (addr: string) => {
      const lowerAddr = addr.toLowerCase();
      // Keep the first occurrence of each address (preserves original casing)
      if (!addressMap.has(lowerAddr)) {
        addressMap.set(lowerAddr, addr);
      }
    };

    // Add the requesting address if provided
    if (forAddress) {
      addAddress(forAddress);
    }

    // Add from/to addresses from the transaction
    if (normalized.from) {
      addAddress(normalized.from);
    }
    if (normalized.to) {
      addAddress(normalized.to);
    }

    // Add addresses from transfers
    for (const transfer of classification.transfers) {
      if (transfer.from) {
        addAddress(transfer.from);
      }
      if (transfer.to) {
        addAddress(transfer.to);
      }
    }

    // Determine transfer types for the transaction
    const hasNativeTransfer = classification.transfers.some((t) => t.type === 'native');
    const hasTokenTransfer = classification.transfers.some((t) => t.type === 'token');

    // Calculate total value (native transfers only)
    const totalValue = classification.transfers
      .filter((t) => t.type === 'native')
      .reduce((sum, t) => {
        try {
          return (BigInt(sum) + BigInt(t.amount)).toString();
        } catch {
          return sum;
        }
      }, '0');

    // Insert address_transactions for each involved address
    for (const [lowerAddr, originalAddr] of addressMap) {
      // Calculate direction from this address's perspective (use lowercase for comparison)
      const direction = calculateDirection(classification.type, classification.transfers, lowerAddr);

      await trx
        .insertInto('address_transactions')
        .values({
          id: uuidv4(),
          address: originalAddr,
          tx_id: txId,
          chain_alias: normalized.chainAlias,
          timestamp: normalized.timestamp.toISOString(),
          has_native_transfer: hasNativeTransfer,
          has_token_transfer: hasTokenTransfer,
          total_value: totalValue !== '0' ? totalValue : null,
          direction,
          created_at: now,
        })
        .onConflict((oc) =>
          oc.columns(['address', 'tx_id']).doUpdateSet({
            has_native_transfer: hasNativeTransfer,
            has_token_transfer: hasTokenTransfer,
            total_value: totalValue !== '0' ? totalValue : null,
            direction,
          })
        )
        .execute();
    }
  }
}
