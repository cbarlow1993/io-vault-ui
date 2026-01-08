import type { Classifier, ClassificationResult, ClassifyOptions, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { EvmClassifier } from '@/src/services/transaction-processor/classifier/evm-classifier.js';
import { SvmClassifier } from '@/src/services/transaction-processor/classifier/svm-classifier.js';
import { NovesClassifier } from '@/src/services/transaction-processor/classifier/noves-classifier.js';

export { EvmClassifier } from '@/src/services/transaction-processor/classifier/evm-classifier.js';
export { SvmClassifier } from '@/src/services/transaction-processor/classifier/svm-classifier.js';
export { NovesClassifier } from '@/src/services/transaction-processor/classifier/noves-classifier.js';
export { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
export { generateLabel, formatAmount } from '@/src/services/transaction-processor/classifier/label.js';

export interface ClassifierRegistryConfig {
  novesApiKey?: string;
}

export class ClassifierRegistry implements Classifier {
  private readonly evmClassifier: EvmClassifier;
  private readonly svmClassifier: SvmClassifier;
  private readonly novesClassifier?: NovesClassifier;

  constructor(config: ClassifierRegistryConfig) {
    this.evmClassifier = new EvmClassifier();
    this.svmClassifier = new SvmClassifier();
    if (config.novesApiKey) {
      this.novesClassifier = new NovesClassifier({ apiKey: config.novesApiKey });
    }
  }

  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    const customResult = await this.classifyWithCustom(tx, options);

    // If confident and not unknown, use custom result
    if (customResult.type !== 'unknown' && customResult.confidence !== 'low') {
      return customResult;
    }

    // Try Noves fallback
    if (this.novesClassifier && tx.type === 'evm') {
      const novesResult = await this.novesClassifier.classify(tx, options);
      if (novesResult.type !== 'unknown') {
        return novesResult;
      }
    }

    // Return custom result (may include parsed transfers even if unknown)
    return customResult;
  }

  private async classifyWithCustom(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    switch (tx.type) {
      case 'evm':
        return this.evmClassifier.classify(tx, options);
      case 'svm':
        return this.svmClassifier.classify(tx, options);
      default:
        return { type: 'unknown', direction: 'neutral', confidence: 'low', source: 'custom', label: 'Unknown Transaction', transfers: [] };
    }
  }
}
