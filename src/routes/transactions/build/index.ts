import type { FastifyInstance } from 'fastify';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import { requireAccess } from '@/src/middleware/require-access.js';
import {
  buildNativeTransaction,
  buildTokenTransaction,
  buildDurableNonceTransactionHandler,
  getDurableNonceHandler,
} from './handlers.js';
import {
  buildTransactionPathParamsSchema,
  buildTransactionResponseSchema,
  combinedNativeBodySchema,
  combinedTokenBodySchema,
  svmDurableNoncePathParamsSchema,
  svmDurableNonceBodySchema,
  svmDurableNonceQuerySchema,
  durableNonceResponseSchema,
} from './schemas.js';

export default async function buildTransactionRoutes(fastify: FastifyInstance) {
  await fastify.register(chainValidationPlugin);

  // Native transaction - POST /ecosystem/:ecosystem/chain/:chainAlias/build-native-transaction
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/build-native-transaction',
    {
      preHandler: [requireAccess('treasury', 'initiate_transfer')],
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build native currency transaction',
        description: 'Builds an unsigned transaction for native currency transfer (ETH, SOL, BTC, etc.). Requires treasury:initiate_transfer permission.',
        params: buildTransactionPathParamsSchema,
        body: combinedNativeBodySchema,
        response: { 201: buildTransactionResponseSchema },
      },
    },
    buildNativeTransaction
  );

  // Token transaction - POST /ecosystem/:ecosystem/chain/:chainAlias/build-token-transaction
  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/build-token-transaction',
    {
      preHandler: [requireAccess('treasury', 'initiate_transfer')],
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build token transaction',
        description: 'Builds an unsigned transaction for token transfer (ERC20, SPL, TRC20). Requires treasury:initiate_transfer permission.',
        params: buildTransactionPathParamsSchema,
        body: combinedTokenBodySchema,
        response: { 201: buildTransactionResponseSchema },
      },
    },
    buildTokenTransaction
  );

  // Durable nonce transaction - POST /ecosystem/svm/chain/solana/build-durable-nonce-transaction
  fastify.post(
    '/ecosystem/svm/chain/solana/build-durable-nonce-transaction',
    {
      preHandler: [requireAccess('treasury', 'initiate_transfer')],
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build durable nonce account creation transaction',
        description: 'Builds a transaction to create a Solana durable nonce account. Requires treasury:initiate_transfer permission.',
        params: svmDurableNoncePathParamsSchema,
        body: svmDurableNonceBodySchema,
        response: { 201: buildTransactionResponseSchema },
      },
    },
    buildDurableNonceTransactionHandler
  );

  // Get durable nonce - GET /ecosystem/svm/chain/solana/durable-nonce
  fastify.get(
    '/ecosystem/svm/chain/solana/durable-nonce',
    {
      preHandler: [requireAccess('treasury', 'initiate_transfer')],
      schema: {
        tags: ['Build Transactions'],
        summary: 'Get durable nonce account info',
        description: 'Retrieves information about the Solana durable nonce account. Requires treasury:initiate_transfer permission.',
        params: svmDurableNoncePathParamsSchema,
        querystring: svmDurableNonceQuerySchema,
        response: { 200: durableNonceResponseSchema },
      },
    },
    getDurableNonceHandler
  );
}
