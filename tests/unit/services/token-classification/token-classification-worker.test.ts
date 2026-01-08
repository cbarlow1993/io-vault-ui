import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenClassificationWorker } from '@/src/services/token-classification/token-classification-worker.js';
import type { TokenRepository, Token } from '@/src/repositories/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('TokenClassificationWorker', () => {
  let mockTokenRepository: {
    findNeedingClassification: ReturnType<typeof vi.fn>;
    refreshExpiredClassifications: ReturnType<typeof vi.fn>;
    updateClassificationSuccess: ReturnType<typeof vi.fn>;
    updateClassificationFailure: ReturnType<typeof vi.fn>;
  };
  let mockClassificationService: {
    classifyToken: ReturnType<typeof vi.fn>;
  };
  let worker: TokenClassificationWorker;

  const createMockToken = (overrides: Partial<Token> = {}): Token => ({
    id: 'token-1',
    chainAlias: 'eth' as ChainAlias,
    address: '0xtoken1',
    name: 'Test Token',
    symbol: 'TKN',
    decimals: 18,
    logoUri: null,
    coingeckoId: null,
    isVerified: false,
    isSpam: false,
    spamClassification: null,
    classificationUpdatedAt: null,
    classificationTtlHours: 720,
    needsClassification: true,
    classificationAttempts: 0,
    classificationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockTokenRepository = {
      findNeedingClassification: vi.fn(),
      refreshExpiredClassifications: vi.fn(),
      updateClassificationSuccess: vi.fn(),
      updateClassificationFailure: vi.fn(),
    };

    mockClassificationService = {
      classifyToken: vi.fn(),
    };

    worker = new TokenClassificationWorker({
      tokenRepository: mockTokenRepository as unknown as TokenRepository,
      classificationService: mockClassificationService as unknown as SpamClassificationService,
      batchSize: 50,
      maxAttempts: 5,
      ttlHours: 720,
    });
  });

  describe('run', () => {
    it('should refresh expired classifications first', async () => {
      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(3);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([]);

      const result = await worker.run();

      expect(mockTokenRepository.refreshExpiredClassifications).toHaveBeenCalledWith(720);
      expect(result.refreshed).toBe(3);
    });

    it('should classify tokens and update on success', async () => {
      const token = createMockToken();
      const classification = {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: 100 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 365,
          isNewContract: false,
          holderDistribution: 'normal' as const,
        },
      };

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token]);
      mockClassificationService.classifyToken.mockResolvedValue({
        tokenAddress: token.address,
        classification,
        updatedAt: new Date(),
      });

      const result = await worker.run();

      expect(mockClassificationService.classifyToken).toHaveBeenCalled();
      expect(mockTokenRepository.updateClassificationSuccess).toHaveBeenCalledWith(
        token.id,
        classification
      );
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle classification failure and update error', async () => {
      const token = createMockToken();

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token]);
      mockClassificationService.classifyToken.mockRejectedValue(new Error('API timeout'));

      const result = await worker.run();

      expect(mockTokenRepository.updateClassificationFailure).toHaveBeenCalledWith(
        token.id,
        'API timeout'
      );
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should process multiple tokens independently', async () => {
      const token1 = createMockToken({ id: 'token-1' });
      const token2 = createMockToken({ id: 'token-2' });
      const classification = {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: null },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: null,
          isNewContract: false,
          holderDistribution: 'unknown' as const,
        },
      };

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token1, token2]);
      mockClassificationService.classifyToken
        .mockResolvedValueOnce({ tokenAddress: token1.address, classification, updatedAt: new Date() })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await worker.run();

      expect(mockTokenRepository.updateClassificationSuccess).toHaveBeenCalledTimes(1);
      expect(mockTokenRepository.updateClassificationFailure).toHaveBeenCalledTimes(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
