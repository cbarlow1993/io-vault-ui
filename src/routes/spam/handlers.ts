/**
 * Spam Override Route Handlers
 *
 * These handlers allow users to mark tokens as trusted or spam,
 * overriding the automatic classification.
 */

import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  SpamOverrideParams,
  SpamOverrideBody,
  BulkSpamOverrideParams,
  BulkSpamOverrideBody,
} from '@/src/routes/spam/schemas.js';
import { TokenAddress } from '@/src/domain/value-objects/index.js';

// ==================== Helper Functions ====================

/**
 * Verify that the authenticated user's organisation owns the specified address.
 * Throws NotFoundError if address doesn't exist.
 * Throws OperationForbiddenError if the address doesn't belong to the user's organisation.
 */
async function verifyAddressOwnership(
  request: FastifyRequest,
  addressId: string
): Promise<void> {
  const address = await request.server.repositories.addresses.findById(addressId);

  if (!address) {
    throw new NotFoundError('Address not found');
  }

  const { organisationId: authOrgId } = request.auth!;

  if (address.organisation_id !== authOrgId) {
    throw new OperationForbiddenError('Forbidden');
  }
}

/**
 * Identifier used for native tokens in API requests/responses.
 * Native tokens are stored as null in the database but exposed as 'native' in the API.
 */
const NATIVE_TOKEN_IDENTIFIER = 'native';

/**
 * Normalizes a token address for storage.
 * Returns null for native token, otherwise lowercases the address.
 */
function normalizeTokenAddress(tokenAddress: string): string | null {
  const normalized = TokenAddress.normalizeForComparison(tokenAddress);
  return normalized === NATIVE_TOKEN_IDENTIFIER ? null : normalized;
}

/**
 * Formats a token address for response.
 * Returns 'native' for null token address, otherwise returns the address.
 */
function formatTokenAddress(tokenAddress: string | null): string {
  return tokenAddress ?? NATIVE_TOKEN_IDENTIFIER;
}

// ==================== Route Handlers ====================

/**
 * Set a spam override for a token
 * PATCH /addresses/:addressId/tokens/:tokenAddress/spam-override
 */
export async function setSpamOverride(
  request: FastifyRequest<{
    Params: SpamOverrideParams;
    Body: SpamOverrideBody;
  }>,
  reply: FastifyReply
) {
  const { addressId, tokenAddress } = request.params;
  const { override } = request.body;

  // Authorization: verify address belongs to authenticated organisation
  await verifyAddressOwnership(request, addressId);

  const normalizedAddress = normalizeTokenAddress(tokenAddress);

  const result = await request.server.repositories.tokenHoldings.updateSpamOverride(
    addressId,
    normalizedAddress,
    override
  );

  if (!result) {
    throw new NotFoundError('Token holding not found');
  }

  return reply.send({
    tokenAddress: formatTokenAddress(result.tokenAddress),
    userOverride: result.userSpamOverride,
    updatedAt: result.updatedAt.toISOString(),
  });
}

/**
 * Remove a spam override for a token (reset to global classification)
 * DELETE /addresses/:addressId/tokens/:tokenAddress/spam-override
 */
export async function deleteSpamOverride(
  request: FastifyRequest<{
    Params: SpamOverrideParams;
  }>,
  reply: FastifyReply
) {
  const { addressId, tokenAddress } = request.params;

  // Authorization: verify address belongs to authenticated organisation
  await verifyAddressOwnership(request, addressId);

  const normalizedAddress = normalizeTokenAddress(tokenAddress);

  const result = await request.server.repositories.tokenHoldings.updateSpamOverride(
    addressId,
    normalizedAddress,
    null
  );

  if (!result) {
    throw new NotFoundError('Token holding not found');
  }

  return reply.send({
    tokenAddress: formatTokenAddress(result.tokenAddress),
    userOverride: result.userSpamOverride,
    updatedAt: result.updatedAt.toISOString(),
  });
}

/**
 * Set multiple spam overrides at once
 * PATCH /addresses/:addressId/tokens/spam-overrides
 *
 * Uses a database transaction to ensure atomicity - all updates succeed or all fail together.
 */
export async function setBulkSpamOverrides(
  request: FastifyRequest<{
    Params: BulkSpamOverrideParams;
    Body: BulkSpamOverrideBody;
  }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;
  const { overrides } = request.body;

  // Authorization: verify address belongs to authenticated organisation
  await verifyAddressOwnership(request, addressId);

  // Prepare overrides with normalized addresses
  const normalizedOverrides = overrides.map(({ tokenAddress, override }) => ({
    tokenAddress: normalizeTokenAddress(tokenAddress),
    override,
  }));

  // Execute all updates in a single transaction
  const results = await request.server.repositories.tokenHoldings.updateSpamOverrideBatch(
    addressId,
    normalizedOverrides
  );

  // Format response
  const updated = results.map((result) => ({
    tokenAddress: formatTokenAddress(result.tokenAddress),
    userOverride: result.userSpamOverride,
    updatedAt: result.updatedAt.toISOString(),
  }));

  return reply.send({ updated });
}
