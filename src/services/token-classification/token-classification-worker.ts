import { logger } from '@/utils/powertools.js';
import type { TokenRepository, Token } from '@/src/repositories/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { ClassificationResult } from '@/src/services/spam/types.js';

export interface TokenClassificationWorkerOptions {
  tokenRepository: TokenRepository;
  classificationService: SpamClassificationService;
  batchSize: number;
  maxAttempts: number;
  ttlHours: number;
}

export interface WorkerResult {
  refreshed: number;
  processed: number;
  succeeded: number;
  failed: number;
}

export class TokenClassificationWorker {
  constructor(private readonly options: TokenClassificationWorkerOptions) {}

  async run(): Promise<WorkerResult> {
    // 1. Refresh expired classifications
    const refreshed = await this.options.tokenRepository.refreshExpiredClassifications(
      this.options.ttlHours
    );

    if (refreshed > 0) {
      logger.info('Refreshed expired token classifications', { count: refreshed });
    }

    // 2. Fetch tokens needing classification
    const tokens = await this.options.tokenRepository.findNeedingClassification({
      limit: this.options.batchSize,
      maxAttempts: this.options.maxAttempts,
    });

    if (tokens.length === 0) {
      return { refreshed, processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info('Processing tokens for classification', { count: tokens.length });

    // 3. Classify tokens one by one
    let succeeded = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        const result = await this.classifyToken(token);
        await this.options.tokenRepository.updateClassificationSuccess(
          token.id,
          result.classification
        );
        succeeded++;

        logger.debug('Token classified successfully', {
          tokenId: token.id,
          address: token.address,
          chainAlias: token.chainAlias,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.options.tokenRepository.updateClassificationFailure(token.id, errorMessage);
        failed++;

        logger.warn('Token classification failed', {
          tokenId: token.id,
          address: token.address,
          chainAlias: token.chainAlias,
          error: errorMessage,
          attempts: token.classificationAttempts + 1,
        });
      }
    }

    return { refreshed, processed: tokens.length, succeeded, failed };
  }

  private async classifyToken(token: Token): Promise<ClassificationResult> {
    return this.options.classificationService.classifyToken({
      chain: token.chainAlias,
      network: token.chainAlias,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      coingeckoId: token.coingeckoId,
    });
  }
}
