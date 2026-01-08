import type { FastifyInstance } from 'fastify';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import buildTransactionRoutes from './build/index.js';
import {
  createTransaction,
  getTransactionDetailsV2,
  listTransactions,
  scanTransaction,
} from '@/src/routes/transactions/handlers.js';
import {
  createTransactionBodySchema,
  createTransactionPathParamsSchema,
  createTransactionResponseSchema,
  getTransactionPathParamsSchema,
  getTransactionQuerySchema,
  getTransactionV2ResponseSchema,
  listTransactionsPathParamsSchema,
  listTransactionsQuerySchema,
  postgresTransactionListResponseSchema,
  scanTransactionBodySchema,
  scanTransactionPathParamsSchema,
  scanTransactionResponseSchema,
} from '@/src/routes/transactions/schemas.js';

/**
 * Transaction routes - public routes for transaction operations
 * These routes do not require vault context
 */
export default async function transactionRoutes(fastify: FastifyInstance) {
  // Register chain validation plugin
  await fastify.register(chainValidationPlugin);

  // ==================== List Transactions ====================

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address
   * List transactions for an address
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'List transactions for an address',
        description:
          'Retrieves a paginated list of transactions for the specified address on the given chain.',
        params: listTransactionsPathParamsSchema,
        querystring: listTransactionsQuerySchema,
        response: {
          200: postgresTransactionListResponseSchema,
        },
      },
    },
    listTransactions
  );

  // ==================== Scan Transaction ====================

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/scan-transaction
   * Scan a transaction for security threats
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/scan-transaction',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Scan transaction for security threats',
        description:
          'Scans an EVM or SVM transaction for potential security threats using Blockaid.',
        params: scanTransactionPathParamsSchema,
        body: scanTransactionBodySchema,
        response: {
          200: scanTransactionResponseSchema,
        },
      },
    },
    scanTransaction
  );
}

/**
 * Vault-scoped transaction routes
 * These routes require vault context (vaultId in path)
 */
export async function vaultTransactionRoutes(fastify: FastifyInstance) {
  // Register chain validation plugin
  await fastify.register(chainValidationPlugin);

  // Register build transaction routes
  await fastify.register(buildTransactionRoutes);

  // ==================== Create Transaction ====================

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/transaction
   * Create a transaction (sign request)
   * Note: vaultId is in the parent prefix (/v2/vaults/:vaultId/transactions)
   */
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/transaction',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Create transaction from hex',
        description:
          'Creates a transaction record for signing using a pre-built transaction hex, scoped to a specific ecosystem and chain.',
        params: createTransactionPathParamsSchema,
        body: createTransactionBodySchema,
        response: {
          201: createTransactionResponseSchema,
        },
      },
    },
    createTransaction
  );
}

/**
 * Transaction routes v2 - public routes using PostgreSQL backend
 * These routes do not require vault context
 */
export async function transactionRoutesV2(fastify: FastifyInstance) {
  // Register chain validation plugin
  await fastify.register(chainValidationPlugin);

  // ==================== Get Transaction Details V2 ====================

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address/transaction/:transactionHash
   * Get transaction details from PostgreSQL
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address/transaction/:transactionHash',
    {
      schema: {
        tags: ['Transactions'],
        summary: 'Get transaction details (v2)',
        description:
          'Retrieves detailed information about a specific transaction from PostgreSQL including classification data, native transfers, and token transfers.',
        params: getTransactionPathParamsSchema,
        querystring: getTransactionQuerySchema,
        response: {
          200: getTransactionV2ResponseSchema,
        },
      },
    },
    getTransactionDetailsV2
  );
}
