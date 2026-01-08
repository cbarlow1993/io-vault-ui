import { InternalServerError, NotFoundError, UserInputError } from '@iofinnet/errors-sdk';
import type { TransactionAddressIdPathParams, TransactionListQuery } from '@/src/routes/transactions/schemas.js';
import { signedRequest } from '@/src/lib/signed-request.js';
import {
  Chain,
  type ChainAlias,
  EcoSystem,
  type EvmChainAlias,
  type EvmTransaction,
  type IWalletLike,
  type SolanaTransaction,
  type SvmChainAlias,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { Originator, UserOriginator } from '@iofinnet/io-vault-db-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildSolanaBlockaidTransactions,
  type RawSolanaTx,
} from '@/src/lib/blockaid/utils.js';
import { unmarshalWallet } from '@/src/lib/unmarshalWallet.js';
import { getHooks } from '@/src/lib/utils.js';
import { Blockaid } from '@/src/services/blockaid.js';
import { getTransactionWithOperation } from '@/src/services/transactions/transaction.js';
import type { Vault } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import type {
  CreateTransactionBody,
  CreateTransactionPathParams,
  GetTransactionPathParams,
  GetTransactionQuery,
  ListTransactionsPathParams,
  ListTransactionsQuery,
  ScanTransactionBody,
  ScanTransactionPathParams,
} from '@/src/routes/transactions/schemas.js';
import { validateEcosystemChainMatch } from '@/src/routes/transactions/schemas.js';

interface HDWallet extends IWalletLike {
  getDerivationPath: () => string;
}

// ==================== List Transactions ====================

/**
 * List transactions for an address
 * GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address
 */
export async function listTransactions(
  request: FastifyRequest<{
    Params: ListTransactionsPathParams;
    Querystring: ListTransactionsQuery;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address } = request.params;
  const { cursor, limit, sort, direction, includeTransfers } = request.query;

  // Check service availability
  if (!request.server.services?.transactions) {
    throw new InternalServerError('Transaction service not available');
  }

  const result = await request.server.services.transactions.listByChainAliasAndAddress({
    chainAlias,
    address,
    cursor,
    limit,
    sort,
    direction,
    includeTransfers,
  });

  return reply.send({
    data: result.transactions,
    pagination: result.pagination,
  });
}

// ==================== List Transactions By Address ID (PostgreSQL) ====================

/**
 * List transactions for an address by ID (PostgreSQL)
 * GET /addresses/:addressId/transactions
 */
export async function listTransactionsByAddressId(
  request: FastifyRequest<{
    Params: TransactionAddressIdPathParams;
    Querystring: TransactionListQuery;
  }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;
  const { limit, offset, chainAlias } = request.query;

  // Check service availability
  if (!request.server.services?.transactions || !request.server.repositories?.addresses) {
    throw new InternalServerError('Transaction service not available');
  }

  // Get address to get the actual address string
  const address = await request.server.repositories.addresses.findById(addressId);
  if (!address) {
    throw new NotFoundError(`Address not found: ${addressId}`);
  }

  const result = await request.server.services.transactions.listByAddress(address.address, {
    limit,
    offset,
    chainAlias: chainAlias as ChainAlias | undefined,
  });

  return reply.send({
    data: result.transactions,
    pagination: result.pagination,
  });
}

// ==================== Get Transaction Details ====================

/**
 * Get transaction details
 * GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash
 * @deprecated Will be replaced with PostgreSQL-based handler (getTransactionDetailsV2)
 */
export async function getTransactionDetails(
  request: FastifyRequest<{
    Params: GetTransactionPathParams;
    Querystring: GetTransactionQuery;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address, transactionHash, ecosystem } = request.params;
  const { include } = request.query ?? {};
  const { organisationId } = request.auth!;

  const transactionWithOperation = await getTransactionWithOperation({
    transactionHash,
    address,
    ecosystem,
    chain: chainAlias,
    organisationId,
    shouldIncludeOperation: include === 'operation',
  });

  return reply.send(transactionWithOperation);
}

// ==================== Get Transaction Details V2 (PostgreSQL) ====================

/**
 * Get transaction details v2 (PostgreSQL)
 * GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash
 */
export async function getTransactionDetailsV2(
  request: FastifyRequest<{
    Params: GetTransactionPathParams;
    Querystring: GetTransactionQuery;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address, transactionHash } = request.params;
  const { include } = request.query ?? {};

  // Check service availability
  if (!request.server.services?.transactions) {
    throw new InternalServerError('Transaction service not available');
  }

  const transaction = await request.server.services.transactions.getByChainAndHash({
    chainAlias,
    txHash: transactionHash,
    address,
  });

  // TODO: Implement operation inclusion when include === 'operation'
  if (include === 'operation') {
    logger.info('TODO: Operation inclusion not yet implemented for v2 transaction endpoint');
  }

  return reply.send(transaction);
}

// ==================== Scan Transaction ====================

/**
 * Scan a transaction for security threats using Blockaid
 * POST /v2/transactions/ecosystem/:ecosystem/chain/:chain/scan-transaction
 */
export async function scanTransaction(
  request: FastifyRequest<{
    Params: ScanTransactionPathParams;
    Body: ScanTransactionBody;
  }>,
  reply: FastifyReply
) {
  const { ecosystem, chainAlias } = request.params;
  const { marshalledHex, options, metadata, overrides } = request.body;

  // Validate ecosystem matches chain
  if (!validateEcosystemChainMatch(ecosystem, chainAlias)) {
    throw new UserInputError('Ecosystem does not match chainAlias');
  }

  const chain = await Chain.fromAlias(chainAlias as ChainAlias);
  const tx = await chain.TransactionBuilder.unmarshalHex(marshalledHex);

  const { data: wallet, error: walletError } = await tryCatch(unmarshalWallet(marshalledHex));

  if (walletError || !wallet) {
    logger.error('Error unmarshaling wallet', { error: walletError });
    throw new InternalServerError('Error unmarshaling wallet');
  }

  if (ecosystem === EcoSystem.EVM) {
    const evmOptions: Blockaid.EvmOption[] = [...options];

    if (overrides?.evm?.simulate_with_estimated_gas) {
      evmOptions.push('gas_estimation');
    }

    const raw = (tx as EvmTransaction).rawTx();
    const scan = await Blockaid.scanEvmTransaction(chainAlias as EvmChainAlias, {
      options: evmOptions,
      metadata: {
        domain: metadata.url ?? '',
      },
      simulate_with_estimated_gas: overrides?.evm?.simulate_with_estimated_gas ?? false,
      data: {
        from: wallet.getAddress(),
        to: raw.to?.toString(),
        data: raw.data,
        gas: raw.gas?.toString(),
      },
      account_address: wallet.getAddress(),
      block: 'latest',
    });
    return reply.send({ scan });
  }

  if (ecosystem === EcoSystem.SVM) {
    const svmOptions: Blockaid.SvmOption[] = [...options];

    const raw = (tx as SolanaTransaction).rawTx();
    const transactions = buildSolanaBlockaidTransactions(raw as unknown as RawSolanaTx);

    const scan = await Blockaid.scanSvmTransaction(chainAlias as SvmChainAlias, {
      options: svmOptions,
      encoding: 'base58',
      method: 'signAllTransactions',
      account_address: wallet.getAddress(),
      transactions: transactions,
      metadata: {
        url: metadata.url ?? '',
      },
    });
    return reply.send({ scan });
  }

  // For unsupported ecosystems, return the transaction without scan
  return reply.send({ tx });
}

// ==================== Create Transaction ====================

/**
 * Create a transaction (sign request)
 * POST /v2/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/transaction
 */
export async function createTransaction(
  request: FastifyRequest<{
    Params: CreateTransactionPathParams;
    Body: CreateTransactionBody;
  }>,
  reply: FastifyReply
) {
  const { marshalledHex, memo, broadcast, expiryTimestamp } = request.body;
  const { vaultId, chainAlias } = request.params;
  const appEndpoint = request.headers['x-iofinnet-multi-wallet-app-endpoint'] as string | undefined;
  const { organisationId, userId } = request.auth!;
  const createdBy: UserOriginator = { id: userId, type: 'User' };

  logger.info('create transaction request', { vaultId, chainAlias });

  const { data: wallet, error: walletError } = await tryCatch(unmarshalWallet(marshalledHex));

  if (walletError || !wallet) {
    logger.error('Error unmarshaling wallet', { error: walletError });
    throw new InternalServerError('Error unmarshaling wallet');
  }

  if (wallet.Chain.Alias !== chainAlias) {
    logger.error('Error unmarshalling transaction', {
      error: 'The transaction hex does not match the chain',
    });
    throw new UserInputError('The transaction hex does not match the chain');
  }

  const derivationPath = wallet.isHDWallet() ? (wallet as HDWallet).getDerivationPath() : undefined;

  const getVaultCurves = request.server.services.vault.getVaultCurves.bind(request.server.services.vault);

  const result = await createSignRequest({
    vaultId,
    chainAlias,
    marshalledHex,
    memo: memo ?? undefined,
    broadcast: broadcast ?? undefined,
    derivationPath,
    createdBy,
    organisationId,
    appEndpoint,
    expiryTimestamp: expiryTimestamp ?? undefined,
    getVaultCurves,
  });

  return reply.status(201).send(result);
}

// ==================== Helper Functions ====================

async function createSignRequest({
  vaultId,
  chainAlias,
  marshalledHex,
  memo,
  broadcast,
  derivationPath,
  createdBy,
  organisationId,
  appEndpoint,
  source,
  expiryTimestamp,
  getVaultCurves,
}: {
  vaultId: string;
  chainAlias: ChainAlias;
  marshalledHex: string;
  memo: string | undefined;
  broadcast: boolean | undefined;
  derivationPath: string | undefined;
  createdBy: Originator;
  organisationId: string;
  appEndpoint?: string;
  source?: string;
  expiryTimestamp: Date | undefined;
  getVaultCurves: (vaultId: string) => Promise<Vault | null>;
}): Promise<{ id: string }> {
  const { data: vault, error: vaultError } = await tryCatch(getVaultCurves(vaultId));

  if (vaultError || !vault) {
    if (vaultError) {
      logger.error('Error getting vault', { error: vaultError });
      throw new InternalServerError('Error getting vault');
    }
    logger.error('Vault not found for vaultId', { vaultId });
    throw new NotFoundError('Vault not found');
  }

  const { data: chain, error: chainError } = await tryCatch(Chain.fromAlias(chainAlias));

  if (chainError || !chain) {
    if (chainError) {
      logger.error('Error getting chain', { error: chainError });
      throw new InternalServerError('Error getting chain');
    }
    logger.error('Chain not found for chainName', { chainAlias });
    throw new InternalServerError('Chain not found');
  }

  const wallet = chain.loadWallet(vault);
  const { data: tx, error: txError } = await tryCatch(
    chain.TransactionBuilder.unmarshalHex(marshalledHex)
  );

  if (txError || !tx) {
    logger.error('Error unmarshalling transaction', { error: txError });
    throw new InternalServerError('Error unmarshalling transaction');
  }

  const dataToSign = await tx.serializeForSigning();
  const txEncoded = marshalledHex;
  const encodedWallet = encodeURIComponent(wallet.marshalHex());

  const INTERNAL_TRANSACTION_ROUTER_URL = config.services.internalTransactionRouterUrl;
  if (!INTERNAL_TRANSACTION_ROUTER_URL) {
    throw new InternalServerError('INTERNAL_TRANSACTION_ROUTER_URL is not configured');
  }
  const SIGN_REQUEST_ENDPOINT = `/transaction/organisation/${organisationId}/workspace/${organisationId}/create-sign-request`;
  const BATCH_SIGN_REQUEST_ENDPOINT = `/transaction/organisation/${organisationId}/workspace/${organisationId}/create-batch-sign-request`;
  const MULTI_CHAIN_WALLET_DEFAULT_SOURCE = 'Multi-Chain Wallet';

  const useBatchSignRequest = dataToSign.length > 1;

  const params = {
    vaultId,
    memo,
    metadata: {
      contentType: 'application/octet-stream+hex',
      sourceV2: source ?? MULTI_CHAIN_WALLET_DEFAULT_SOURCE,
      appId: config.multiChainWallet.appId,
    },
    data: useBatchSignRequest ? dataToSign : dataToSign[0],
    coseAlgorithm: wallet.getCoseAlgorithm(),
    derivationPath: derivationPath,
    hooks: getHooks({ txEncoded, encodedWallet, appEndpoint, broadcast: broadcast ?? true }),
    createdBy: createdBy,
    expiryTimestamp: expiryTimestamp,
  };

  const endpoint = useBatchSignRequest ? BATCH_SIGN_REQUEST_ENDPOINT : SIGN_REQUEST_ENDPOINT;
  const { data: result, error: resultError } = await tryCatch(
    signedRequest<{ id: string }, typeof params>({
      url: `${INTERNAL_TRANSACTION_ROUTER_URL}${endpoint}`,
      method: 'POST',
      body: params,
      retries: 3,
      retryDelay: 200,
    })
  );

  if (resultError) {
    logger.error('Error creating sign request', { error: resultError });
    throw resultError;
  }

  if (!result) {
    logger.error('No result from create sign request');
    throw new InternalServerError('No result from create sign request');
  }

  logger.info('sign request created', { id: result.id });
  return { id: result.id };
}
