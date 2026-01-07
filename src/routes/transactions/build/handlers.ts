/**
 * Build Transaction Route Handlers
 *
 * These handlers process incoming requests for building transactions,
 * verify vault ownership, and route to the appropriate transaction builder.
 */

import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import { ChainAlias, type EcoSystem, type SolanaWallet } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '@/utils/powertools.js';
import {
  routeNativeTransaction,
  routeTokenTransaction,
  type NativeTransactionParams,
  type TokenTransactionParams,
} from '@/src/services/build-transaction/index.js';
import {
  buildDurableNonceTransaction,
  getDurableNonceAccount,
} from '@/src/services/build-transaction/builders/svm-durable-nonce.js';
import type {
  BuildTransactionPathParams,
  SvmDurableNoncePathParams,
  SvmDurableNonceBody,
  SvmDurableNonceQuery,
} from './schemas.js';

// ==================== Helper Functions ====================

/**
 * Verify that the authenticated user's organisation owns the specified vault.
 * Throws OperationForbiddenError if the vault doesn't belong to the user's organisation.
 */
async function verifyVaultOwnership(
  server: FastifyInstance,
  vaultId: string,
  authOrgId: string
): Promise<void> {
  const vaultDetails = await server.services.vault.getVaultDetails(vaultId);
  if (!vaultDetails) {
    throw new NotFoundError(`Vault not found for id ${vaultId}`);
  }
  if (authOrgId !== vaultDetails.organisationId) {
    logger.warn('Organisation mismatch - vault ownership check failed', {
      authOrgId,
      vaultOrgId: vaultDetails.organisationId,
      vaultId,
    });
    throw new OperationForbiddenError('Forbidden');
  }
}

// ==================== Route Handlers ====================

/**
 * Build a native (non-token) transaction
 * POST /v1/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chainAlias/build-native
 */
export async function buildNativeTransaction(
  request: FastifyRequest<{
    Params: BuildTransactionPathParams;
    Body: NativeTransactionParams;
  }>,
  reply: FastifyReply
) {
  const { vaultId, ecosystem, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const body = request.body;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const params: NativeTransactionParams = {
    ...body,
    vaultId,
  };

  const result = await routeNativeTransaction(
    ecosystem as EcoSystem,
    chainAlias,
    params,
    request.server.services.walletFactory
  );

  return reply.status(201).send(result);
}

/**
 * Build a token transaction
 * POST /v1/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chainAlias/build-token
 */
export async function buildTokenTransaction(
  request: FastifyRequest<{
    Params: BuildTransactionPathParams;
    Body: TokenTransactionParams;
  }>,
  reply: FastifyReply
) {
  const { vaultId, ecosystem, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const body = request.body;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const params: TokenTransactionParams = {
    ...body,
    vaultId,
  };

  const result = await routeTokenTransaction(
    ecosystem as EcoSystem,
    chainAlias,
    params,
    request.server.services.walletFactory
  );

  return reply.status(201).send(result);
}

/**
 * Build a durable nonce account creation transaction (Solana only)
 * POST /v1/vaults/:vaultId/transactions/ecosystem/svm/chain/solana/durable-nonce
 */
export async function buildDurableNonceTransactionHandler(
  request: FastifyRequest<{
    Params: SvmDurableNoncePathParams;
    Body: SvmDurableNonceBody;
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const derivationPath = request.body?.derivationPath;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  // Create wallet for Solana
  const { wallet, chain } = await request.server.services.walletFactory.createWallet<SolanaWallet>(
    vaultId,
    ChainAlias.SOLANA,
    derivationPath
  );

  const result = await buildDurableNonceTransaction({ wallet, chain });

  return reply.status(201).send(result);
}

/**
 * Get durable nonce account information (Solana only)
 * GET /v1/vaults/:vaultId/transactions/ecosystem/svm/chain/solana/durable-nonce
 */
export async function getDurableNonceHandler(
  request: FastifyRequest<{
    Params: SvmDurableNoncePathParams;
    Querystring: SvmDurableNonceQuery;
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const { derivationPath } = request.query;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  // Create wallet for Solana
  const { wallet, chain } = await request.server.services.walletFactory.createWallet<SolanaWallet>(
    vaultId,
    ChainAlias.SOLANA,
    derivationPath
  );

  const result = await getDurableNonceAccount({ wallet, chain });

  return reply.status(200).send(result);
}
