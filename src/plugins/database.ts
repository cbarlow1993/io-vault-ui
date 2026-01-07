import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Kysely } from 'kysely';
import {
  getDatabase,
  closeDatabase,
  getVaultDatabase,
  closeVaultDatabase,
} from '@/src/lib/database/connection.js';
import type { Database, VaultDatabase } from '@/src/lib/database/types.js';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import { PostgresTokenRepository } from '@/src/repositories/token.repository.js';
import { PostgresTokenPriceRepository } from '@/src/repositories/token-price.repository.js';
import { PostgresTransactionRepository } from '@/src/repositories/transaction.repository.js';
import { PostgresTokenHoldingRepository } from '@/src/repositories/token-holding.repository.js';
import {
  PostgresVaultRepository,
  type VaultRepository,
} from '@/src/repositories/vault.repository.js';
import type {
  AddressRepository,
  TokenRepository,
  TokenPriceRepository,
  TransactionRepository,
  TokenHoldingRepository,
} from '@/src/repositories/types.js';
import { config } from '@/src/lib/config.js';
import { PostgresAddressService } from '@/src/services/addresses/postgres-service.js';
import { logger } from '@/utils/powertools.js';

// Services
import { BalanceService } from '@/src/services/balances/balance-service.js';
import { PricingService } from '@/src/services/balances/pricing-service.js';
import { PostgresTransactionService } from '@/src/services/transactions/postgres-service.js';
import { VaultService } from '@/src/services/vaults/vault-service.js';
import { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';
import { EVMBalanceFetcher } from '@/src/services/balances/fetchers/evm.js';
import { JsonRpcClient } from '@/src/lib/rpc/client.js';
import { WorkflowRepository } from '@/src/repositories/workflow.repository.js';
import { WorkflowEventsRepository } from '@/src/repositories/workflow-events.repository.js';
import { WorkflowOrchestrator } from '@/src/services/workflow/orchestrator.js';

// Configuration constants
const PRICE_CACHE_TTL_SECONDS = 3600; // 1 hour
const RPC_TIMEOUT_MS = 5000;

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>;
    vaultDb: Kysely<VaultDatabase>;
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
  let vaultDb: Kysely<VaultDatabase>;

  try {
    db = await getDatabase();
  } catch (error) {
    logger.error('Failed to initialize database connection', { error });
    throw error;
  }

  try {
    vaultDb = await getVaultDatabase();
  } catch (error) {
    logger.error('Failed to initialize vault database connection', { error });
    throw error;
  }

  // Create repositories
  const addressRepository = new PostgresAddressRepository(db);
  const tokenRepository = new PostgresTokenRepository(db);
  const tokenPriceRepository = new PostgresTokenPriceRepository(db);
  const transactionRepository = new PostgresTransactionRepository(db);
  const tokenHoldingRepository = new PostgresTokenHoldingRepository(db);
  const vaultRepository = new PostgresVaultRepository(vaultDb);

  // Create services
  const pricingService = new PricingService(tokenPriceRepository, {
    cacheTtlSeconds: PRICE_CACHE_TTL_SECONDS,
  });

  const fetcherFactory = (chain: string, network: string) => {
    const baseRpcUrl = config.apis.iofinnetNodes.rpcUrl;
    if (!baseRpcUrl) return null;
    // Append chain to base RPC URL (e.g., https://rpc.example.com/polygon)
    const rpcUrl = `${baseRpcUrl}/${chain}`;
    const rpc = new JsonRpcClient({ chain, network, url: rpcUrl, timeoutMs: RPC_TIMEOUT_MS });
    return new EVMBalanceFetcher(rpc, chain, network);
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
  fastify.decorate('vaultDb', vaultDb);

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
      await closeVaultDatabase();
    });
  }

  logger.info('Database plugin initialized');
}

export default fp(databasePlugin, { name: 'database' });
