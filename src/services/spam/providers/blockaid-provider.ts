import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { TokenScanResponse } from '@blockaid/client/resources/token.js';
import { blockaidClient } from '@/src/lib/clients.js';
import { mapChainToBlockaidTokenScanChain } from '@/src/config/chain-mappings/index.js';
import { logger } from '@/utils/powertools.js';
import type { SpamClassificationProvider, TokenToClassify, SpamClassification, BlockaidClassification } from '@/src/services/spam/types.js';

export class BlockaidProvider implements SpamClassificationProvider {
  readonly name = 'blockaid';

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const blockaidChain = mapChainToBlockaidTokenScanChain(token.chain as ChainAlias);

    // Unsupported chain - return null silently
    if (!blockaidChain) {
      return { blockaid: null };
    }

    // Skip native tokens (no contract to scan)
    if (token.address === 'native') {
      return { blockaid: null };
    }

    try {
      const response = await blockaidClient().token.scan({
        chain: blockaidChain,
        address: token.address,
      });

      return {
        blockaid: this.mapResponse(response),
      };
    } catch (error) {
      // API failure - return null, let other providers handle it
      logger.warn('Blockaid token scan failed', {
        error: error instanceof Error ? error.message : String(error),
        chain: token.chain,
        address: token.address,
      });
      return { blockaid: null };
    }
  }

  async classifyBatch(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>> {
    const results = new Map<string, Partial<SpamClassification>>();

    // Process in parallel
    await Promise.all(
      tokens.map(async (token) => {
        const result = await this.classify(token);
        results.set(token.address.toLowerCase(), result);
      })
    );

    return results;
  }

  private mapResponse(response: TokenScanResponse): BlockaidClassification {
    const attackTypes = Object.keys(response.attack_types);
    const isPhishing = attackTypes.some(
      (t) => t.toLowerCase().includes('impersonator') || t.toLowerCase().includes('phishing')
    );

    return {
      isMalicious: response.result_type === 'Malicious',
      isPhishing,
      riskScore: parseFloat(response.malicious_score),
      attackTypes,
      resultType: response.result_type,
      checkedAt: new Date().toISOString(),
      rawResponse: response,
    };
  }
}
