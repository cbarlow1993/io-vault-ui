import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { type Kysely, sql } from 'kysely';
import type { Address, AddressToken, Database } from '@/src/lib/database/types.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type {
  AddressRepository,
  AddressWithDomain,
  CreateAddressInput,
  CreateTokenInput,
  CursorPaginatedResult,
  CursorPaginationOptions,
  FindByVaultCursorOptions,
  FindByVaultOptions,
  PaginatedResult,
  PaginationOptions,
} from '@/src/repositories/types.js';
import { AddressMapper } from './mappers/index.js';

// ==================== Cursor Utilities ====================

interface AddressCursor {
  id: string;
  createdAt: string;
}

function encodeCursor(cursor: AddressCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(cursor: string): AddressCursor | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as AddressCursor;
  } catch {
    return null;
  }
}

export class PostgresAddressRepository implements AddressRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateAddressInput): Promise<Address> {
    return this.db
      .insertInto('addresses')
      .values({
        address: input.address,
        chain_alias: input.chainAlias,
        vault_id: input.vaultId,
        organisation_id: input.organisationId,
        ecosystem: input.ecosystem,
        workspace_id: input.workspaceId,
        derivation_path: input.derivationPath ?? null,
        alias: input.alias ?? null,
        is_monitored: false,
        subscription_id: null,
        monitored_at: null,
        unmonitored_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findById(id: string): Promise<Address | null> {
    const result = await this.db
      .selectFrom('addresses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return result ?? null;
  }

  async findByAddressAndChainAlias(address: string, chainAlias: ChainAlias): Promise<AddressWithDomain | null> {
    const result = await this.db
      .selectFrom('addresses')
      .selectAll()
      .where(sql`LOWER(address)`, '=', WalletAddress.normalizeForComparison(address))
      .where('chain_alias', '=', chainAlias)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    // Enrich the database row with the WalletAddress domain value object
    const walletAddress = AddressMapper.toDomain({
      address: result.address,
      chain_alias: result.chain_alias as ChainAlias,
    });

    return {
      ...result,
      walletAddress,
    };
  }

  async findByVaultId(
    vaultId: string,
    options?: FindByVaultOptions
  ): Promise<PaginatedResult<Address>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = this.db.selectFrom('addresses').where('vault_id', '=', vaultId);

    if (options?.monitored !== undefined) {
      query = query.where('is_monitored', '=', options.monitored);
    }

    const [data, countResult] = await Promise.all([
      query.selectAll().orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    const total = Number(countResult.count);
    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  async findByVaultIdAndChainAlias(
    vaultId: string,
    chainAlias: ChainAlias,
    options?: FindByVaultOptions
  ): Promise<PaginatedResult<Address>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = this.db
      .selectFrom('addresses')
      .where('vault_id', '=', vaultId)
      .where('chain_alias', '=', chainAlias);

    if (options?.monitored !== undefined) {
      query = query.where('is_monitored', '=', options.monitored);
    }

    const [data, countResult] = await Promise.all([
      query.selectAll().orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    const total = Number(countResult.count);
    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  // ==================== Cursor-Based Pagination Methods ====================

  async findByVaultIdCursor(
    vaultId: string,
    options: FindByVaultCursorOptions
  ): Promise<CursorPaginatedResult<Address>> {
    const { limit, cursor, monitored } = options;

    let query = this.db.selectFrom('addresses').where('vault_id', '=', vaultId);

    if (monitored !== undefined) {
      query = query.where('is_monitored', '=', monitored);
    }

    // Apply cursor filter if provided
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query = query.where((eb) =>
          eb.or([
            eb('created_at', '<', new Date(decoded.createdAt)),
            eb.and([eb('created_at', '=', new Date(decoded.createdAt)), eb('id', '<', decoded.id)]),
          ])
        );
      }
    }

    // Get one extra to determine hasMore
    const [data, countResult] = await Promise.all([
      query
        .selectAll()
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .limit(limit + 1)
        .execute(),
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.created_at.toISOString() })
      : null;

    return {
      data: items,
      nextCursor,
      hasMore,
      total: Number(countResult.count),
    };
  }

  async findByVaultIdAndChainAliasCursor(
    vaultId: string,
    chainAlias: ChainAlias,
    options: FindByVaultCursorOptions
  ): Promise<CursorPaginatedResult<Address>> {
    const { limit, cursor, monitored } = options;

    let query = this.db
      .selectFrom('addresses')
      .where('vault_id', '=', vaultId)
      .where('chain_alias', '=', chainAlias);

    if (monitored !== undefined) {
      query = query.where('is_monitored', '=', monitored);
    }

    // Apply cursor filter if provided
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query = query.where((eb) =>
          eb.or([
            eb('created_at', '<', new Date(decoded.createdAt)),
            eb.and([eb('created_at', '=', new Date(decoded.createdAt)), eb('id', '<', decoded.id)]),
          ])
        );
      }
    }

    // Get one extra to determine hasMore
    const [data, countResult] = await Promise.all([
      query
        .selectAll()
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .limit(limit + 1)
        .execute(),
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.created_at.toISOString() })
      : null;

    return {
      data: items,
      nextCursor,
      hasMore,
      total: Number(countResult.count),
    };
  }

  async findHDAddressesByVaultIdAndChainAliasCursor(
    vaultId: string,
    chainAlias: ChainAlias,
    options: CursorPaginationOptions
  ): Promise<CursorPaginatedResult<Address>> {
    const { limit, cursor } = options;

    let query = this.db
      .selectFrom('addresses')
      .where('vault_id', '=', vaultId)
      .where('chain_alias', '=', chainAlias)
      .where('derivation_path', 'is not', null);

    // Apply cursor filter if provided
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query = query.where((eb) =>
          eb.or([
            eb('created_at', '<', new Date(decoded.createdAt)),
            eb.and([eb('created_at', '=', new Date(decoded.createdAt)), eb('id', '<', decoded.id)]),
          ])
        );
      }
    }

    // Get one extra to determine hasMore
    const [data, countResult] = await Promise.all([
      query
        .selectAll()
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .limit(limit + 1)
        .execute(),
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.created_at.toISOString() })
      : null;

    return {
      data: items,
      nextCursor,
      hasMore,
      total: Number(countResult.count),
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Address[]> {
    return this.db
      .selectFrom('addresses')
      .selectAll()
      .where('subscription_id', '=', subscriptionId)
      .execute();
  }

  async findMonitoredByVaultId(vaultId: string): Promise<Address[]> {
    return this.db
      .selectFrom('addresses')
      .selectAll()
      .where('vault_id', '=', vaultId)
      .where('is_monitored', '=', true)
      .execute();
  }

  async findByOrganisationId(
    organisationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Address>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.db
        .selectFrom('addresses')
        .selectAll()
        .where('organisation_id', '=', organisationId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      this.db
        .selectFrom('addresses')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('organisation_id', '=', organisationId)
        .executeTakeFirstOrThrow(),
    ]);

    const total = Number(countResult.count);
    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  async setMonitored(id: string, subscriptionId: string): Promise<Address> {
    return this.db
      .updateTable('addresses')
      .set({
        is_monitored: true,
        subscription_id: subscriptionId,
        monitored_at: new Date(),
        unmonitored_at: null,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async setUnmonitored(id: string): Promise<Address> {
    return this.db
      .updateTable('addresses')
      .set({
        is_monitored: false,
        subscription_id: null,
        unmonitored_at: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateAlias(id: string, alias: string | null): Promise<Address> {
    return this.db
      .updateTable('addresses')
      .set({
        alias,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async addToken(addressId: string, token: CreateTokenInput): Promise<AddressToken> {
    return this.db
      .insertInto('address_tokens')
      .values({
        address_id: addressId,
        contract_address: token.contractAddress,
        symbol: token.symbol ?? null,
        decimals: token.decimals ?? null,
        name: token.name ?? null,
        hidden: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async removeToken(addressId: string, contractAddress: string): Promise<void> {
    await this.db
      .deleteFrom('address_tokens')
      .where('address_id', '=', addressId)
      .where('contract_address', '=', contractAddress)
      .execute();
  }

  async findTokensByAddressId(addressId: string): Promise<AddressToken[]> {
    return this.db
      .selectFrom('address_tokens')
      .selectAll()
      .where('address_id', '=', addressId)
      .execute();
  }

  async setTokenHidden(addressId: string, contractAddress: string, hidden: boolean): Promise<void> {
    await this.db
      .updateTable('address_tokens')
      .set({ hidden })
      .where('address_id', '=', addressId)
      .where('contract_address', '=', contractAddress)
      .execute();
  }

  async setTokensHidden(
    addressId: string,
    contractAddresses: string[],
    hidden: boolean
  ): Promise<void> {
    if (contractAddresses.length === 0) {
      return;
    }

    await this.db
      .updateTable('address_tokens')
      .set({ hidden })
      .where('address_id', '=', addressId)
      .where('contract_address', 'in', contractAddresses)
      .execute();
  }

  async upsertTokens(addressId: string, tokens: CreateTokenInput[]): Promise<AddressToken[]> {
    if (tokens.length === 0) {
      return [];
    }

    return this.db
      .insertInto('address_tokens')
      .values(
        tokens.map((token) => ({
          address_id: addressId,
          contract_address: token.contractAddress,
          symbol: token.symbol ?? null,
          decimals: token.decimals ?? null,
          name: token.name ?? null,
          hidden: false,
        }))
      )
      .onConflict((oc) =>
        oc.columns(['address_id', 'contract_address']).doUpdateSet({
          symbol: (eb) => eb.ref('excluded.symbol'),
          decimals: (eb) => eb.ref('excluded.decimals'),
          name: (eb) => eb.ref('excluded.name'),
        })
      )
      .returningAll()
      .execute();
  }

  async createMany(inputs: CreateAddressInput[]): Promise<Address[]> {
    if (inputs.length === 0) {
      return [];
    }

    return this.db
      .insertInto('addresses')
      .values(
        inputs.map((input) => ({
          address: input.address,
          chain_alias: input.chainAlias,
          vault_id: input.vaultId,
          organisation_id: input.organisationId,
          ecosystem: input.ecosystem,
          workspace_id: input.workspaceId,
          derivation_path: input.derivationPath ?? null,
          alias: input.alias ?? null,
          is_monitored: false,
          subscription_id: null,
          monitored_at: null,
          unmonitored_at: null,
        }))
      )
      .returningAll()
      .execute();
  }

  async deleteByVaultId(vaultId: string): Promise<number> {
    const result = await this.db
      .deleteFrom('addresses')
      .where('vault_id', '=', vaultId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  async findAllMonitored(): Promise<Address[]> {
    return this.db
      .selectFrom('addresses')
      .selectAll()
      .where('is_monitored', '=', true)
      .execute();
  }

  async updateLastReconciledBlock(id: string, block: number): Promise<Address> {
    return this.db
      .updateTable('addresses')
      .set({
        last_reconciled_block: block,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
