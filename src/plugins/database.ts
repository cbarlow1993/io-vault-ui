import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Kysely } from 'kysely';
import { getDatabase, closeDatabase } from '@/src/lib/database/connection.js';
import type { Database } from '@/src/lib/database/types.js';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import { PostgresTokenRepository } from '@/src/repositories/token.repository.js';
import { PostgresTokenPriceRepository } from '@/src/repositories/token-price.repository.js';
import { PostgresTransactionRepository } from '@/src/repositories/transaction.repository.js';
import { PostgresTokenHoldingRepository } from '@/src/repositories/token-holding.repository.js';
import {
  PostgresVaultRepository,
  type VaultRepository,
} from '@/src/repositories/vault.repository.js';
import {
  PostgresRbacRepository,
  type RbacRepository,
} from '@/src/repositories/rbac.repository.js';
import type {
  AddressRepository,
  TokenRepository,
  TokenPriceRepository,
  TransactionRepository,
  TokenHoldingRepository,
} from '@/src/repositories/types.js';
import { config } from '@/src/lib/config.js';
import { getRpcUrl } from '@/src/lib/chains.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { PostgresAddressService } from '@/src/services/addresses/postgres-service.js';
import { logger } from '@/utils/powertools.js';

// Services
import { BalanceService } from '@/src/services/balances/balance-service.js';
import { PricingService } from '@/src/services/balances/pricing-service.js';
import { PostgresTransactionService } from '@/src/services/transactions/postgres-service.js';
import { VaultService } from '@/src/services/vaults/vault-service.js';
import { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';
import { createBalanceFetcher } from '@/src/services/balances/fetchers/factory.js';
import { WorkflowRepository } from '@/src/repositories/workflow.repository.js';
import { WorkflowEventsRepository } from '@/src/repositories/workflow-events.repository.js';
import { WorkflowOrchestrator } from '@/src/services/workflow/orchestrator.js';

// Configuration constants
const PRICE_CACHE_TTL_SECONDS = 3600; // 1 hour

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>;
    rbacRepository: RbacRepository;
    repositories: {
      addresses: AddressRepository;
      tokens: TokenRepository;
      tokenPrices: TokenPriceRepository;
      transactions: TransactionRepository;
      tokenHoldings: TokenHoldingRepository;
      vault: VaultRepository;
    };
    services: {
      addresses: PostgresAddressService;
      balances: BalanceService;
      pricing: PricingService;
      transactions: PostgresTransactionService;
      vault: VaultService;
      walletFactory: WalletFactory;
      workflowOrchestrator: WorkflowOrchestrator;
      workflowEventsRepo: WorkflowEventsRepository;
    };
  }
}

async function databasePlugin(fastify: FastifyInstance) {
  let db: Kysely<Database>;

  try {
    db = await getDatabase();
  } catch (error) {
    logger.error('Failed to initialize database connection', { error });
    throw error;
  }

  // Create repositories
  const addressRepository = new PostgresAddressRepository(db);
  const tokenRepository = new PostgresTokenRepository(db);
  const tokenPriceRepository = new PostgresTokenPriceRepository(db);
  const transactionRepository = new PostgresTransactionRepository(db);
  const tokenHoldingRepository = new PostgresTokenHoldingRepository(db);
  const vaultRepository = new PostgresVaultRepository(db);
  const rbacRepository = new PostgresRbacRepository(db);

  // Create services
  const pricingService = new PricingService(tokenPriceRepository, {
    cacheTtlSeconds: PRICE_CACHE_TTL_SECONDS,
  });

  const fetcherFactory = (chain: string, network: string) => {
    const rpcUrl = getRpcUrl(chain as ChainAlias);
    if (!rpcUrl) return null;
    return createBalanceFetcher(chain, network, rpcUrl);
  };

  const balanceService = new BalanceService(
    addressRepository,
    tokenRepository,
    tokenHoldingRepository,
    pricingService,
    fetcherFactory
  );

  const transactionService = new PostgresTransactionService({
    transactionRepository,
    addressRepository,
  });
  const addressService = new PostgresAddressService({ addressRepository });
  const vaultService = new VaultService(vaultRepository);
  const walletFactory = new WalletFactory(vaultService);

  // Workflow services
  const workflowRepository = new WorkflowRepository(db);
  const workflowEventsRepository = new WorkflowEventsRepository(db);
  const workflowOrchestrator = new WorkflowOrchestrator(
    workflowRepository,
    workflowEventsRepository,
    logger
  );

  // Decorate Fastify instance
  fastify.decorate('db', db);
  fastify.decorate('rbacRepository', rbacRepository);

  fastify.decorate('repositories', {
    addresses: addressRepository,
    tokens: tokenRepository,
    tokenPrices: tokenPriceRepository,
    transactions: transactionRepository,
    tokenHoldings: tokenHoldingRepository,
    vault: vaultRepository,
  });

  fastify.decorate('services', {
    addresses: addressService,
    balances: balanceService,
    pricing: pricingService,
    transactions: transactionService,
    vault: vaultService,
    walletFactory,
    workflowOrchestrator,
    workflowEventsRepo: workflowEventsRepository,
  });

  // Only close on container shutdown, not Lambda
  if (config.server.runtime !== 'lambda') {
    fastify.addHook('onClose', async () => {
      await closeDatabase();
    });
  }

  logger.info('Database plugin initialized');
}

export default fp(databasePlugin, { name: 'database' });
