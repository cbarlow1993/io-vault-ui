import type { FastifyInstance } from 'fastify';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import {
  bulkCreateHDAddresses,
  createAddress,
  createHDAddress,
  getAddressDetails,
  listAddresses,
  listAddressesByChain,
  listHDAddresses,
  monitorAddress,
  unmonitorAddressHandler,
  updateAddress,
} from '@/src/routes/addresses/handlers.js';
import {
  addressListResponseSchema,
  addressPathParamsSchema,
  addressResponseSchema,
  bulkCreateHDAddressBodySchema,
  bulkHDAddressResponseSchema,
  createAddressBodySchema,
  createHDAddressBodySchema,
  fullAddressParamsSchema,
  hdAddressResponseSchema,
  listAddressesQuerySchema,
  updateAddressBodySchema,
  vaultIdParamsSchema,
} from '@/src/routes/addresses/schemas.js';

export default async function addressRoutes(fastify: FastifyInstance) {
  // Register chain validation plugin for routes that need ecosystem/chain validation
  await fastify.register(chainValidationPlugin);

  // ==================== List Routes ====================

  /**
   * GET /
   * List all addresses for a vault
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'List addresses for a vault',
        description:
          'Retrieves a paginated list of addresses for the specified vault. By default, returns both monitored and unmonitored addresses. Use the monitored query parameter to filter by monitoring status.',
        params: vaultIdParamsSchema,
        querystring: listAddressesQuerySchema,
        response: {
          200: addressListResponseSchema,
        },
      },
    },
    listAddresses
  );

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias
   * List addresses for a vault filtered by chain
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'List addresses for a vault and chain',
        description:
          'Retrieves a paginated list of addresses for the specified vault and chain. By default, returns both monitored and unmonitored addresses. Use the monitored query parameter to filter by monitoring status.',
        params: addressPathParamsSchema,
        querystring: listAddressesQuerySchema,
        response: {
          200: addressListResponseSchema,
        },
      },
    },
    listAddressesByChain
  );

  // ==================== Create Route ====================

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias
   * Create an address for a vault
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Create address for vault',
        description:
          'Create address for vault. By default, the address will not be monitored for transactions. Set monitor: true in the request body to monitor the address for transactions immediately.',
        params: addressPathParamsSchema,
        body: createAddressBodySchema,
        response: {
          200: addressResponseSchema,
          201: addressResponseSchema,
        },
      },
    },
    createAddress
  );

  // ==================== Address Detail Routes ====================

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address
   * Get address details
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Get registered address',
        description:
          'Retrieves details of an address registered for monitoring in the specified vault.',
        params: fullAddressParamsSchema,
        response: {
          200: addressResponseSchema,
        },
      },
    },
    getAddressDetails
  );

  /**
   * PATCH /ecosystem/:ecosystem/chain/:chainAlias/address/:address
   * Update an address (alias and/or hidden assets)
   */
  fastify.patch(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Update address',
        description: 'Updates the hidden assets and/or alias for registered address.',
        params: fullAddressParamsSchema,
        body: updateAddressBodySchema,
      },
    },
    updateAddress
  );

  // ==================== Monitoring Routes ====================

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/address/:address/monitoring
   * Start monitoring an address
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address/monitoring',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Start monitoring an address for transactions',
        description:
          'Start monitoring an existing address. If the address is already monitored, this operation is idempotent. If the address does not exist, returns 404.',
        params: fullAddressParamsSchema,
        response: {
          200: addressResponseSchema,
        },
      },
    },
    monitorAddress
  );

  /**
   * DELETE /ecosystem/:ecosystem/chain/:chainAlias/address/:address/monitoring
   * Stop monitoring an address
   */
  fastify.delete(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address/monitoring',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Stop monitoring an address',
        description:
          'Stop transaction monitoring for an address. The address will be marked as unmonitored but will remain associated with the vault.',
        params: fullAddressParamsSchema,
      },
    },
    unmonitorAddressHandler
  );

  // ==================== HD Address Routes ====================

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/hd-addresses
   * Create an HD address
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/hd-addresses',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Create HD address',
        description:
          'Create an HD (Hierarchical Deterministic) address for the vault. If no derivation path is provided, the next sequential index will be used automatically.',
        params: addressPathParamsSchema,
        body: createHDAddressBodySchema,
        response: {
          201: hdAddressResponseSchema,
        },
      },
    },
    createHDAddress
  );

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/hd-addresses/bulk
   * Bulk create HD addresses
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/hd-addresses/bulk',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Bulk create HD addresses',
        description:
          'Create multiple HD addresses for the vault within the specified index range. Maximum of 100 addresses can be created at once.',
        params: addressPathParamsSchema,
        body: bulkCreateHDAddressBodySchema,
        response: {
          201: bulkHDAddressResponseSchema,
        },
      },
    },
    bulkCreateHDAddresses
  );

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/hd-addresses
   * List HD addresses for a vault and chain
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/hd-addresses',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'List HD addresses',
        description:
          'Retrieves a paginated list of HD addresses for the specified vault and chain.',
        params: addressPathParamsSchema,
        querystring: listAddressesQuerySchema,
        response: {
          200: addressListResponseSchema,
        },
      },
    },
    listHDAddresses
  );
}
