/**
 * Address Route Handlers
 *
 * These handlers use the PostgreSQL repository for address operations.
 * The old DynamoDB-based functions have been removed as part of the PostgreSQL migration.
 */

import { InternalServerError, NotFoundError, OperationForbiddenError, UserInputError } from '@iofinnet/errors-sdk';
import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Addresses } from '@/src/types/address.js';
import { Address } from '@/src/services/addresses/address.js';
import { AddressValidator } from '@/src/routes/validators/index.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import type {
  AddressPathParams,
  CreateAddressBody,
  CreateHDAddressBody,
  FullAddressParams,
  GenerateAddressBody,
  ListAddressesQuery,
  UpdateAddressBody,
  VaultIdParams,
} from '@/src/routes/addresses/schemas.js';

// Shared validator instance for all handlers
const addressValidator = new AddressValidator();

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
 * List all addresses for a vault
 * GET /v2/vaults/:vaultId/addresses
 *
 * @see docs/requirements/api-addresses/002-list-vault-addresses.md
 */
export async function listAddresses(
  request: FastifyRequest<{
    Params: VaultIdParams;
    Querystring: ListAddressesQuery;
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const { cursor, limit, monitored } = request.query;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const result = await request.server.services.addresses.getAllForVault({
    vaultId,
    limit,
    cursor,
    monitored,
  });

  return reply.send({
    data: result.items,
    pagination: {
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasMore,
      total: result.total,
    },
  });
}

/**
 * List addresses for a vault filtered by chain
 * GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain
 *
 * @see docs/requirements/api-addresses/003-list-chain-addresses.md
 */
export async function listAddressesByChain(
  request: FastifyRequest<{
    Params: AddressPathParams;
    Querystring: ListAddressesQuery;
  }>,
  reply: FastifyReply
) {
  const { vaultId, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const { cursor, limit, monitored } = request.query;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const result = await request.server.services.addresses.getAllForVaultAndChain({
    vaultId,
    chain: chainAlias,
    limit,
    cursor,
    monitored,
  });

  return reply.send({
    data: result.items,
    pagination: {
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasMore,
      total: result.total,
    },
  });
}

/**
 * Create an address for a vault
 * POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain
 */
export async function createAddress(
  request: FastifyRequest<{
    Params: AddressPathParams;
    Body: CreateAddressBody;
  }>,
  reply: FastifyReply
) {
  const { address, derivationPath, monitor = false, alias } = request.body;
  const { vaultId, chainAlias, ecosystem } = request.params;
  const { organisationId } = request.auth!;

  // Validate address format using domain value object
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    throw new UserInputError(validation.error);
  }

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, organisationId);

  const getVaultCurves = request.server.services.vault.getVaultCurves.bind(request.server.services.vault);

  const [{ data: workspaceId, error: workspaceIdError }, { error: validationError }] =
    await Promise.all([
      tryCatch(request.server.services.vault.getWorkspaceId(vaultId)),
      tryCatch(
        Address.validateAgainstVault({
          chainAlias,
          address,
          derivationPath,
          vaultId,
          getVaultCurves,
        })
      ),
    ]);

  if (validationError) {
    logger.error('Error validating address', {
      error: validationError,
      address,
      chainAlias,
      vaultId,
    });
    throw validationError;
  }

  if (!workspaceId || workspaceIdError) {
    logger.error('Error getting workspace id', { error: workspaceIdError, vaultId });
    throw workspaceIdError ?? new Error('Error getting workspace id');
  }

  // Check if address already exists
  const existingAddress = await request.server.services.addresses.getAddress({
    chain: chainAlias,
    address,
  });

  if (existingAddress) {
    // Address already exists
    return reply.status(409).send({ message: 'Address already exists' });
  }

  // Create new address
  logger.info('Creating new address', { address, chain: chainAlias, monitor });
  const addressRecord = await request.server.services.addresses.createAddress({
    input: {
      address,
      chainAlias,
      vaultId,
      workspaceId,
      organisationId,
      ecosystem,
      derivationPath: derivationPath ?? undefined,
      alias: alias ?? undefined,
    },
    monitored: monitor,
  });

  if (!addressRecord) {
    logger.critical('Failed to create or retrieve address record');
    throw new InternalServerError('Failed to create or retrieve address record');
  }

  return reply.status(201).send(addressRecord);
}

/**
 * Generate and save an address for a vault
 * POST /v2/vaults/:vaultId/addresses
 *
 * This handler generates the address automatically from vault curves.
 * Only chainAlias is required - the address is derived from the vault's curves.
 */
export async function generateAddress(
  request: FastifyRequest<{
    Params: VaultIdParams;
    Body: GenerateAddressBody;
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { chainAlias, derivationPath, monitor = false, alias } = request.body;
  const { organisationId: authOrgId } = request.auth!;

  logger.info('Generating address for vault', {
    vaultId,
    chainAlias,
    derivationPath,
    monitor,
  });

  // 1. Get vault details (workspaceId and organisationId)
  const vaultDetails = await request.server.services.vault.getVaultDetails(vaultId);
  if (!vaultDetails) {
    throw new NotFoundError(`Vault not found for id ${vaultId}`);
  }

  // 2. Authorization check: auth org must match vault org
  if (authOrgId !== vaultDetails.organisationId) {
    logger.warn('Organisation mismatch', {
      authOrgId,
      vaultOrgId: vaultDetails.organisationId,
      vaultId,
    });
    throw new OperationForbiddenError('Forbidden');
  }

  // 3. Get vault curves
  const vault = await request.server.services.vault.getVaultCurves(vaultId);
  if (!vault) {
    throw new NotFoundError(`No curves found for vault ${vaultId}`);
  }

  // 4. Resolve chain and generate address
  const chain = await Chain.fromAlias(chainAlias);
  const wallet = chain.loadWallet(vault);
  let address: string;
  if (derivationPath) {
    try {
      logger.info('Attempting HD derivation', { derivationPath, vaultId, chainAlias, vaultCurves: JSON.stringify(vault.curves) });
      const hdWallet = wallet.deriveHDWallet({ derivationPath });
      address = hdWallet.getAddress();
    } catch (hdError) {
      logger.error('HD derivation failed', {
        error: hdError,
        message: (hdError as Error).message,
        stack: (hdError as Error).stack,
        derivationPath,
        vaultId,
        chainAlias
      });
      throw hdError;
    }
  } else {
    address = wallet.getAddress();
  }

  const ecosystem = chain.Config.ecosystem;
  logger.info('Generated address', { address, chainAlias, derivationPath });

  // 6. Check if address already exists
  const existingAddress = await request.server.services.addresses.getAddress({
    chain: chainAlias,
    address,
  });

  if (existingAddress) {
    return reply.status(409).send({ message: 'Address already exists' });
  }

  // 7. Save address to database
  let addressRecord: Addresses.Address | null = null;

  addressRecord = await request.server.services.addresses.createAddress({
    input: {
      address,
      chainAlias,
      vaultId,
      workspaceId: vaultDetails.workspaceId,
      organisationId: vaultDetails.organisationId,
      ecosystem,
      derivationPath: derivationPath ?? undefined,
      alias: alias ?? undefined,
    },
    monitored: monitor,
  });

  if (!addressRecord) {
    logger.critical('Failed to create address record');
    throw new InternalServerError('Failed to create address record');
  }

  return reply.status(201).send(addressRecord);
}

/**
 * Get address details
 * GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address
 */
export async function getAddressDetails(
  request: FastifyRequest<{
    Params: FullAddressParams;
  }>,
  reply: FastifyReply
) {
  const { vaultId, chainAlias, address } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  // Validate address format using domain value object
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    throw new UserInputError(validation.error);
  }

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const addressDetails = await request.server.services.addresses.getAddress({ chain: chainAlias, address });

  if (!addressDetails) {
    throw new NotFoundError('Address not found');
  }

  return reply.send(addressDetails);
}

/**
 * Update an address (alias and/or hidden assets)
 * PATCH /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address
 */
export async function updateAddress(
  request: FastifyRequest<{
    Params: FullAddressParams;
    Body: UpdateAddressBody;
  }>,
  reply: FastifyReply
) {
  const { vaultId, address: addressParam, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const { addToHiddenAssets, removeFromHiddenAssets, alias } = request.body;

  // Validate address format using domain value object
  const validation = addressValidator.validate(addressParam, chainAlias);
  if (!validation.isValid) {
    throw new UserInputError(validation.error);
  }

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  let address = null;

  // Update asset visibility if provided
  if (addToHiddenAssets || removeFromHiddenAssets) {
    address = await request.server.services.addresses.updateAssetVisibility({
      chain: chainAlias,
      address: addressParam,
      addToHiddenAssets: addToHiddenAssets || [],
      removeFromHiddenAssets: removeFromHiddenAssets || [],
    });
  }

  // Update alias if provided (undefined means not provided, null means remove alias)
  if (alias !== undefined) {
    address = await request.server.services.addresses.updateAlias({
      chain: chainAlias,
      address: addressParam,
      alias,
    });
  }

  if (!address) {
    // No updates were requested, fetch current state
    address = await request.server.services.addresses.getAddress({ chain: chainAlias, address: addressParam });
  }

  if (!address) {
    throw new NotFoundError('Address not found');
  }

  return reply.send(address);
}

/**
 * Start monitoring an address
 * POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address/monitoring
 */
export async function monitorAddress(
  request: FastifyRequest<{
    Params: FullAddressParams;
  }>,
  reply: FastifyReply
) {
  const { address, chainAlias, vaultId, ecosystem: _ecosystem } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  // Validate address format using domain value object
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    throw new UserInputError(validation.error);
  }

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  logger.info('Starting address monitoring', { address, chainAlias, vaultId });

  // Check if address exists
  const existingAddress = await request.server.services.addresses.getAddress({ chain: chainAlias, address });

  if (!existingAddress) {
    return reply.status(404).send({
      message: `Address ${address} not found for chain ${chainAlias}`,
    });
  }

  // Verify ownership (check vaultId matches)
  if (existingAddress.vaultId !== vaultId) {
    return reply.status(403).send({ message: 'Forbidden' });
  }

  if (existingAddress.monitored) {
    logger.info('Address is already monitored', { address, chainAlias, vaultId });
    return reply.send(existingAddress);
  }

  // Start monitoring
  const monitoredAddress = await request.server.services.addresses.monitorAddress({
    address,
    chain: chainAlias,
  });

  logger.info('Address successfully monitored', { address, chainAlias });

  return reply.send(monitoredAddress);
}

/**
 * Stop monitoring an address
 * DELETE /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address/monitoring
 */
export async function unmonitorAddressHandler(
  request: FastifyRequest<{
    Params: FullAddressParams;
  }>,
  reply: FastifyReply
) {
  const { address, chainAlias, vaultId } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  // Validate address format using domain value object
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    throw new UserInputError(validation.error);
  }

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  logger.info('Unregistering address', { address, chainAlias, vaultId });

  const existingAddress = await request.server.services.addresses.getAddress({ chain: chainAlias, address });

  if (!existingAddress) {
    // Idempotent: if address doesn't exist, treat as success
    logger.info('Address does not exist', { address, chainAlias, vaultId });
    return reply.status(204).send();
  }

  // Verify ownership
  if (existingAddress.vaultId !== vaultId) {
    return reply.status(403).send({ message: 'Forbidden' });
  }

  if (!existingAddress.monitored) {
    // Already unmonitored
    logger.info('Address already unmonitored', { address, chainAlias, vaultId });
    return reply.status(204).send();
  }

  try {
    await request.server.services.addresses.unmonitorAddress({ address, chain: chainAlias });
    logger.info('Address successfully unregistered and marked as unmonitored', { address, chainAlias });
  } catch (error) {
    if (error instanceof NotFoundError || (error as { statusCode?: number }).statusCode === 404) {
      logger.info('Address already unmonitored', { address, chainAlias });
    } else {
      throw error;
    }
  }

  return reply.status(204).send();
}

// ==================== HD Address Handlers ====================

/**
 * Create an HD address
 * POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/hd-addresses
 *
 * NOTE: HD address functionality requires PostgreSQL migration - currently not implemented
 */
export async function createHDAddress(
  request: FastifyRequest<{
    Params: AddressPathParams;
    Body: CreateHDAddressBody;
  }>,
  reply: FastifyReply
) {
  const { derivationPath } = request.body ?? {};
  const { vaultId, chainAlias, ecosystem } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  logger.debug('[createHDAddress] Creating HD address', {
    derivationPath,
    vaultId,
    chainAlias,
  });

  // Generate address with provided or default derivation path
  const resolvedDerivationPath = derivationPath ?? 'm/44/0/0/0';
  const getVaultCurves = request.server.services.vault.getVaultCurves.bind(request.server.services.vault);

  const address = await Address.generate({
    chainAlias,
    derivationPath: resolvedDerivationPath,
    vaultId,
    getVaultCurves,
  });

  return reply.status(201).send({
    address,
    derivationPath: resolvedDerivationPath,
    vaultId,
    chainAlias,
    ecosystem,
  });
}

/**
 * List HD addresses for a vault and chain
 * GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/hd-addresses
 *
 * @see docs/requirements/api-addresses/007-list-hd-addresses.md
 * NOTE: HD address listing requires PostgreSQL migration - returns addresses from main list filtered by derivation path
 */
export async function listHDAddresses(
  request: FastifyRequest<{
    Params: AddressPathParams;
    Querystring: ListAddressesQuery;
  }>,
  reply: FastifyReply
) {
  const { vaultId, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;
  const { cursor, limit } = request.query;

  // Authorization: verify vault belongs to authenticated organisation
  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  // Use the address service to get HD addresses (those with derivation paths)
  const result = await request.server.services.addresses.getHDAddressesForVaultAndChain({
    vaultId,
    chain: chainAlias,
    limit,
    cursor,
  });

  return reply.send({
    data: result.items,
    pagination: {
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasMore,
      total: result.total,
    },
  });
}
