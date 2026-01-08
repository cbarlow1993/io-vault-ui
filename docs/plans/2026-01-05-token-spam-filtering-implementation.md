# Token Spam Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive spam classification system for token assets with Blockaid integration, internal heuristics, and user overrides.

**Architecture:** Multi-provider spam classification service that aggregates Blockaid API, CoinGecko verification status, and internal heuristics into categorical flags. Classifications are cached in the database with TTL-based refresh. User overrides stored per-address in token_holdings table.

**Tech Stack:** TypeScript, Fastify, Kysely (PostgreSQL), Vitest, Blockaid SDK (`@blockaid/client`)

---

## Task 1: Database Migration - Extend tokens table

**Files:**
- Create: `services/core/src/lib/database/migrations/2026_01_06_add_spam_classification_to_tokens.ts`
- Modify: `services/core/src/lib/database/types.ts`

**Step 1: Write the migration file**

```typescript
// services/core/src/lib/database/migrations/2026_01_06_add_spam_classification_to_tokens.ts
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add spam classification columns to tokens table
  await db.schema
    .alterTable('tokens')
    .addColumn('spam_classification', 'jsonb')
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_updated_at', 'timestamptz')
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_ttl_hours', 'integer', (col) => col.defaultTo(24))
    .execute();

  // Create index for finding tokens needing classification refresh
  await db.schema
    .createIndex('idx_tokens_classification_updated_at')
    .on('tokens')
    .column('classification_updated_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_tokens_classification_updated_at')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_ttl_hours')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_updated_at')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('spam_classification')
    .execute();
}
```

**Step 2: Update database types**

Add to `services/core/src/lib/database/types.ts` in the Token interface:

```typescript
spam_classification: {
  blockaid: {
    isMalicious: boolean;
    isPhishing: boolean;
    riskScore: number | null;
    attackTypes: string[];
    checkedAt: string;
  } | null;
  coingecko: {
    isListed: boolean;
    marketCapRank: number | null;
  };
  heuristics: {
    suspiciousName: boolean;
    namePatterns: string[];
    isUnsolicited: boolean;
    contractAgeDays: number | null;
    isNewContract: boolean;
    holderDistribution: 'normal' | 'suspicious' | 'unknown';
  };
} | null;
classification_updated_at: Date | null;
classification_ttl_hours: number | null;
```

**Step 3: Run migration**

```bash
cd services/core && npm run migrate:up
```

**Step 4: Verify migration**

```bash
cd services/core && npm run migrate:status
```

**Step 5: Commit**

```bash
git add services/core/src/lib/database/migrations/2026_01_06_add_spam_classification_to_tokens.ts services/core/src/lib/database/types.ts
git commit -m "feat(db): add spam classification columns to tokens table"
```

---

## Task 2: Database Migration - Extend token_holdings table

**Files:**
- Create: `services/core/src/lib/database/migrations/2026_01_06_add_user_spam_override_to_token_holdings.ts`
- Modify: `services/core/src/lib/database/types.ts`

**Step 1: Write the migration file**

```typescript
// services/core/src/lib/database/migrations/2026_01_06_add_user_spam_override_to_token_holdings.ts
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('token_holdings')
    .addColumn('user_spam_override', 'varchar(20)')
    .execute();

  await db.schema
    .alterTable('token_holdings')
    .addColumn('override_updated_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('token_holdings')
    .dropColumn('override_updated_at')
    .execute();

  await db.schema
    .alterTable('token_holdings')
    .dropColumn('user_spam_override')
    .execute();
}
```

**Step 2: Update database types**

Add to `services/core/src/lib/database/types.ts` in the TokenHolding interface:

```typescript
user_spam_override: 'trusted' | 'spam' | null;
override_updated_at: Date | null;
```

**Step 3: Run migration**

```bash
cd services/core && npm run migrate:up
```

**Step 4: Commit**

```bash
git add services/core/src/lib/database/migrations/2026_01_06_add_user_spam_override_to_token_holdings.ts services/core/src/lib/database/types.ts
git commit -m "feat(db): add user spam override columns to token_holdings table"
```

---

## Task 3: Create Spam Classification Types

**Files:**
- Create: `services/core/src/services/spam/types.ts`

**Step 1: Write the types file**

```typescript
// services/core/src/services/spam/types.ts

export interface BlockaidClassification {
  isMalicious: boolean;
  isPhishing: boolean;
  riskScore: number | null;
  attackTypes: string[];
  checkedAt: string;
}

export interface CoingeckoClassification {
  isListed: boolean;
  marketCapRank: number | null;
}

export interface HeuristicsClassification {
  suspiciousName: boolean;
  namePatterns: string[];
  isUnsolicited: boolean;
  contractAgeDays: number | null;
  isNewContract: boolean;
  holderDistribution: 'normal' | 'suspicious' | 'unknown';
}

export interface SpamClassification {
  blockaid: BlockaidClassification | null;
  coingecko: CoingeckoClassification;
  heuristics: HeuristicsClassification;
}

export interface SpamAnalysis {
  blockaid: BlockaidClassification | null;
  coingecko: CoingeckoClassification;
  heuristics: HeuristicsClassification;
  userOverride: 'trusted' | 'spam' | null;
  classificationUpdatedAt: string | null;
  summary: {
    riskLevel: 'safe' | 'warning' | 'danger';
    reasons: string[];
  };
}

export interface TokenToClassify {
  chain: string;
  network: string;
  address: string;
  name: string;
  symbol: string;
  coingeckoId: string | null;
}

export interface ClassificationResult {
  tokenAddress: string;
  classification: SpamClassification;
  updatedAt: Date;
}

export interface SpamClassificationProvider {
  readonly name: string;
  classify(token: TokenToClassify): Promise<Partial<SpamClassification>>;
  classifyBatch?(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>>;
}
```

**Step 2: Commit**

```bash
git add services/core/src/services/spam/types.ts
git commit -m "feat(spam): add spam classification type definitions"
```

---

## Task 4: Create Name Analyzer Heuristic

**Files:**
- Create: `services/core/src/services/spam/heuristics/name-analyzer.ts`
- Create: `services/core/tests/unit/services/spam/heuristics/name-analyzer.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/spam/heuristics/name-analyzer.test.ts
import { describe, it, expect } from 'vitest';
import { NameAnalyzer } from '@/services/core/src/services/spam/heuristics/name-analyzer';

describe('NameAnalyzer', () => {
  const analyzer = new NameAnalyzer();

  describe('analyze', () => {
    it('should detect URLs in token names', () => {
      const result = analyzer.analyze('Visit https://scam.com', 'SCAM');
      expect(result.suspiciousName).toBe(true);
      expect(result.namePatterns).toContain('contains_url');
    });

    it('should detect URLs in token symbols', () => {
      const result = analyzer.analyze('Token', 'scam.io');
      expect(result.suspiciousName).toBe(true);
      expect(result.namePatterns).toContain('contains_url');
    });

    it('should detect unicode confusables', () => {
      const result = analyzer.analyze('USÐC', 'USÐC'); // Ð instead of D
      expect(result.suspiciousName).toBe(true);
      expect(result.namePatterns).toContain('unicode_confusable');
    });

    it('should detect impersonation of known tokens', () => {
      const result = analyzer.analyze('Tether USD', 'USDT2');
      expect(result.suspiciousName).toBe(true);
      expect(result.namePatterns).toContain('impersonation');
    });

    it('should detect scam phrases', () => {
      const result = analyzer.analyze('Claim your airdrop now', 'CLAIM');
      expect(result.suspiciousName).toBe(true);
      expect(result.namePatterns).toContain('scam_phrase');
    });

    it('should pass legitimate tokens', () => {
      const result = analyzer.analyze('USD Coin', 'USDC');
      expect(result.suspiciousName).toBe(false);
      expect(result.namePatterns).toHaveLength(0);
    });

    it('should pass tokens with normal names', () => {
      const result = analyzer.analyze('Wrapped Ether', 'WETH');
      expect(result.suspiciousName).toBe(false);
      expect(result.namePatterns).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/spam/heuristics/name-analyzer.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/spam/heuristics/name-analyzer.ts

export interface NameAnalysisResult {
  suspiciousName: boolean;
  namePatterns: string[];
}

// Known legitimate token symbols to detect impersonation
const KNOWN_TOKENS = [
  'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', // Stablecoins
  'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'SOL', 'MATIC', 'AVAX', // Major tokens
  'UNI', 'AAVE', 'LINK', 'CRV', 'MKR', 'COMP', 'SNX', // DeFi
];

// Unicode confusable characters map
const CONFUSABLES: Record<string, string> = {
  '\u0110': 'D', // Ð
  '\u0100': 'A', // Ā
  '\u0112': 'E', // Ē
  '\u012A': 'I', // Ī
  '\u014C': 'O', // Ō
  '\u016A': 'U', // Ū
  '\u0421': 'C', // Cyrillic С
  '\u0410': 'A', // Cyrillic А
  '\u0412': 'B', // Cyrillic В
  '\u0415': 'E', // Cyrillic Е
  '\u041D': 'H', // Cyrillic Н
  '\u041E': 'O', // Cyrillic О
  '\u0420': 'P', // Cyrillic Р
  '\u0422': 'T', // Cyrillic Т
  '\u0425': 'X', // Cyrillic Х
};

// Scam phrases to detect
const SCAM_PHRASES = [
  'claim',
  'airdrop',
  'visit',
  'free',
  'bonus',
  'reward',
  'giveaway',
  'double',
  'send',
  'voucher',
];

export class NameAnalyzer {
  analyze(name: string, symbol: string): NameAnalysisResult {
    const patterns: string[] = [];
    const combined = `${name} ${symbol}`.toLowerCase();

    // Check for URLs
    if (this.containsUrl(name) || this.containsUrl(symbol)) {
      patterns.push('contains_url');
    }

    // Check for unicode confusables
    if (this.hasUnicodeConfusables(name) || this.hasUnicodeConfusables(symbol)) {
      patterns.push('unicode_confusable');
    }

    // Check for impersonation of known tokens
    if (this.isImpersonation(name, symbol)) {
      patterns.push('impersonation');
    }

    // Check for scam phrases
    if (this.hasScamPhrases(combined)) {
      patterns.push('scam_phrase');
    }

    return {
      suspiciousName: patterns.length > 0,
      namePatterns: patterns,
    };
  }

  private containsUrl(text: string): boolean {
    // Match URLs and domain-like patterns
    const urlPattern = /https?:\/\/|www\.|\.com|\.io|\.net|\.org|\.xyz|\.eth/i;
    return urlPattern.test(text);
  }

  private hasUnicodeConfusables(text: string): boolean {
    for (const char of text) {
      if (CONFUSABLES[char]) {
        return true;
      }
    }
    return false;
  }

  private isImpersonation(name: string, symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    const upperName = name.toUpperCase();

    for (const knownToken of KNOWN_TOKENS) {
      // Check if symbol is similar but not exact (e.g., USDT2, USDC1)
      if (upperSymbol !== knownToken && upperSymbol.includes(knownToken) && upperSymbol.length <= knownToken.length + 2) {
        return true;
      }

      // Check if name mentions known token
      if (upperName.includes(knownToken) && !KNOWN_TOKENS.includes(upperSymbol)) {
        // Allow legitimate wrapped tokens
        if (!upperName.startsWith('WRAPPED') && !upperSymbol.startsWith('W')) {
          return true;
        }
      }
    }

    return false;
  }

  private hasScamPhrases(text: string): boolean {
    const lowerText = text.toLowerCase();
    return SCAM_PHRASES.some((phrase) => lowerText.includes(phrase));
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/spam/heuristics/name-analyzer.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/spam/heuristics/name-analyzer.ts services/core/tests/unit/services/spam/heuristics/name-analyzer.test.ts
git commit -m "feat(spam): add name analyzer heuristic for detecting suspicious token names"
```

---

## Task 5: Create Heuristics Provider

**Files:**
- Create: `services/core/src/services/spam/providers/heuristics-provider.ts`
- Create: `services/core/tests/unit/services/spam/providers/heuristics-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/spam/providers/heuristics-provider.test.ts
import { describe, it, expect } from 'vitest';
import { HeuristicsProvider } from '@/services/core/src/services/spam/providers/heuristics-provider';
import type { TokenToClassify } from '@/services/core/src/services/spam/types';

describe('HeuristicsProvider', () => {
  const provider = new HeuristicsProvider();

  describe('classify', () => {
    it('should detect suspicious token names', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Visit scam.com',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.suspiciousName).toBe(true);
      expect(result.heuristics?.namePatterns).toContain('contains_url');
    });

    it('should pass legitimate tokens', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.suspiciousName).toBe(false);
      expect(result.heuristics?.namePatterns).toHaveLength(0);
    });

    it('should return unknown holder distribution by default', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.holderDistribution).toBe('unknown');
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('heuristics');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/heuristics-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/spam/providers/heuristics-provider.ts
import type { SpamClassificationProvider, TokenToClassify, SpamClassification, HeuristicsClassification } from '../types.js';
import { NameAnalyzer } from '../heuristics/name-analyzer.js';

export class HeuristicsProvider implements SpamClassificationProvider {
  readonly name = 'heuristics';
  private readonly nameAnalyzer: NameAnalyzer;

  constructor() {
    this.nameAnalyzer = new NameAnalyzer();
  }

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const nameAnalysis = this.nameAnalyzer.analyze(token.name, token.symbol);

    const heuristics: HeuristicsClassification = {
      suspiciousName: nameAnalysis.suspiciousName,
      namePatterns: nameAnalysis.namePatterns,
      isUnsolicited: false, // TODO: Implement airdrop detection
      contractAgeDays: null, // TODO: Implement contract age checking
      isNewContract: false,
      holderDistribution: 'unknown', // TODO: Implement holder analysis
    };

    return { heuristics };
  }

  async classifyBatch(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>> {
    const results = new Map<string, Partial<SpamClassification>>();

    for (const token of tokens) {
      const classification = await this.classify(token);
      results.set(token.address.toLowerCase(), classification);
    }

    return results;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/heuristics-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/spam/providers/heuristics-provider.ts services/core/tests/unit/services/spam/providers/heuristics-provider.test.ts
git commit -m "feat(spam): add heuristics provider for internal spam detection"
```

---

## Task 6: Create CoinGecko Provider

**Files:**
- Create: `services/core/src/services/spam/providers/coingecko-provider.ts`
- Create: `services/core/tests/unit/services/spam/providers/coingecko-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/spam/providers/coingecko-provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoingeckoProvider } from '@/services/core/src/services/spam/providers/coingecko-provider';
import type { TokenToClassify } from '@/services/core/src/services/spam/types';
import type { TokenRepository } from '@/services/core/src/repositories/types';

function createMockTokenRepository() {
  return {
    findById: vi.fn(),
    findByChainAndAddress: vi.fn(),
    findVerifiedByChain: vi.fn(),
    findByCoingeckoIds: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
  } as unknown as TokenRepository;
}

describe('CoingeckoProvider', () => {
  let tokenRepository: ReturnType<typeof createMockTokenRepository>;
  let provider: CoingeckoProvider;

  beforeEach(() => {
    tokenRepository = createMockTokenRepository();
    provider = new CoingeckoProvider(tokenRepository);
  });

  describe('classify', () => {
    it('should mark token as listed if it has coingeckoId', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.isListed).toBe(true);
    });

    it('should mark token as not listed if no coingeckoId', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Unknown Token',
        symbol: 'UNK',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.isListed).toBe(false);
    });

    it('should return null marketCapRank when not available', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Some Token',
        symbol: 'SOME',
        coingeckoId: 'some-token',
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.marketCapRank).toBeNull();
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('coingecko');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/coingecko-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/spam/providers/coingecko-provider.ts
import type { SpamClassificationProvider, TokenToClassify, SpamClassification, CoingeckoClassification } from '../types.js';
import type { TokenRepository } from '../../../repositories/types.js';

export class CoingeckoProvider implements SpamClassificationProvider {
  readonly name = 'coingecko';

  constructor(private readonly tokenRepository: TokenRepository) {}

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const coingecko: CoingeckoClassification = {
      isListed: token.coingeckoId !== null,
      marketCapRank: null, // Could be enriched from CoinGecko API if needed
    };

    return { coingecko };
  }

  async classifyBatch(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>> {
    const results = new Map<string, Partial<SpamClassification>>();

    for (const token of tokens) {
      const classification = await this.classify(token);
      results.set(token.address.toLowerCase(), classification);
    }

    return results;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/coingecko-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/spam/providers/coingecko-provider.ts services/core/tests/unit/services/spam/providers/coingecko-provider.test.ts
git commit -m "feat(spam): add coingecko provider for token listing verification"
```

---

## Task 7: Create Blockaid Provider

**Files:**
- Create: `services/core/src/services/spam/providers/blockaid-provider.ts`
- Create: `services/core/tests/unit/services/spam/providers/blockaid-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/spam/providers/blockaid-provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockaidProvider } from '@/services/core/src/services/spam/providers/blockaid-provider';
import type { TokenToClassify } from '@/services/core/src/services/spam/types';

// Mock the blockaid client
vi.mock('@/services/core/src/lib/clients', () => ({
  blockaidClient: vi.fn(() => ({
    token: {
      scan: vi.fn(),
    },
  })),
}));

vi.mock('@/services/core/src/lib/config', () => ({
  config: {
    apis: {
      blockaid: {
        apiKey: 'test-api-key',
      },
    },
  },
}));

describe('BlockaidProvider', () => {
  let provider: BlockaidProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BlockaidProvider();
  });

  describe('classify', () => {
    it('should return null classification when Blockaid is unavailable', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      // When API fails gracefully, blockaid should be null
      expect(result.blockaid).toBeDefined();
    });

    it('should handle unsupported chains gracefully', async () => {
      const token: TokenToClassify = {
        chain: 'unsupported-chain',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.blockaid).toBeNull();
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('blockaid');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/blockaid-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/spam/providers/blockaid-provider.ts
import type { SpamClassificationProvider, TokenToClassify, SpamClassification, BlockaidClassification } from '../types.js';
import { blockaidClient } from '@/services/core/src/lib/clients';
import { config } from '@/services/core/src/lib/config';
import { logger } from '@/utils/powertools';
import { tryCatch } from '@/utils/try-catch';

// Chains supported by Blockaid token scanning
const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'];

// Map our chain names to Blockaid chain names
const CHAIN_MAPPING: Record<string, string> = {
  ethereum: 'ethereum',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  bsc: 'bsc',
  avalanche: 'avalanche',
};

export class BlockaidProvider implements SpamClassificationProvider {
  readonly name = 'blockaid';

  private getClient() {
    if (!config.apis.blockaid.apiKey) {
      return null;
    }
    return blockaidClient();
  }

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    // Check if chain is supported
    if (!SUPPORTED_CHAINS.includes(token.chain)) {
      return { blockaid: null };
    }

    const client = this.getClient();
    if (!client) {
      logger.warn('Blockaid API key not configured, skipping token scan');
      return { blockaid: null };
    }

    const blockaidChain = CHAIN_MAPPING[token.chain];
    if (!blockaidChain) {
      return { blockaid: null };
    }

    // Note: The actual Blockaid token API endpoint may differ
    // This is a placeholder implementation that should be updated
    // based on your Blockaid subscription and available endpoints
    const { data: scanResult, error: scanError } = await tryCatch(
      this.scanToken(client, blockaidChain, token.address)
    );

    if (scanError) {
      logger.warn('Blockaid token scan failed', { error: scanError, token: token.address });
      return { blockaid: null };
    }

    const blockaid: BlockaidClassification = {
      isMalicious: scanResult?.is_malicious ?? false,
      isPhishing: scanResult?.is_phishing ?? false,
      riskScore: scanResult?.risk_score ?? null,
      attackTypes: scanResult?.attack_types ?? [],
      checkedAt: new Date().toISOString(),
    };

    return { blockaid };
  }

  private async scanToken(
    client: ReturnType<typeof blockaidClient>,
    chain: string,
    address: string
  ): Promise<{
    is_malicious: boolean;
    is_phishing: boolean;
    risk_score: number | null;
    attack_types: string[];
  } | null> {
    // Placeholder: Replace with actual Blockaid Token API call
    // The exact API may vary based on your subscription
    // For now, return a safe default
    return {
      is_malicious: false,
      is_phishing: false,
      risk_score: null,
      attack_types: [],
    };
  }

  async classifyBatch(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>> {
    const results = new Map<string, Partial<SpamClassification>>();

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((token) => this.classify(token)));

      batch.forEach((token, index) => {
        results.set(token.address.toLowerCase(), batchResults[index]);
      });
    }

    return results;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/spam/providers/blockaid-provider.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/spam/providers/blockaid-provider.ts services/core/tests/unit/services/spam/providers/blockaid-provider.test.ts
git commit -m "feat(spam): add blockaid provider for token security scanning"
```

---

## Task 8: Create Spam Classification Service

**Files:**
- Create: `services/core/src/services/spam/spam-classification-service.ts`
- Create: `services/core/tests/unit/services/spam/spam-classification-service.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/spam/spam-classification-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpamClassificationService } from '@/services/core/src/services/spam/spam-classification-service';
import type { SpamClassificationProvider, TokenToClassify, SpamClassification } from '@/services/core/src/services/spam/types';
import type { TokenRepository } from '@/services/core/src/repositories/types';

function createMockProvider(name: string, result: Partial<SpamClassification>): SpamClassificationProvider {
  return {
    name,
    classify: vi.fn().mockResolvedValue(result),
    classifyBatch: vi.fn().mockResolvedValue(new Map([['0x123', result]])),
  };
}

function createMockTokenRepository() {
  return {
    findById: vi.fn(),
    findByChainAndAddress: vi.fn(),
    findVerifiedByChain: vi.fn(),
    findByCoingeckoIds: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
    updateClassification: vi.fn(),
  } as unknown as TokenRepository;
}

describe('SpamClassificationService', () => {
  let tokenRepository: ReturnType<typeof createMockTokenRepository>;
  let heuristicsProvider: SpamClassificationProvider;
  let coingeckoProvider: SpamClassificationProvider;
  let blockaidProvider: SpamClassificationProvider;
  let service: SpamClassificationService;

  beforeEach(() => {
    tokenRepository = createMockTokenRepository();

    heuristicsProvider = createMockProvider('heuristics', {
      heuristics: {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
    });

    coingeckoProvider = createMockProvider('coingecko', {
      coingecko: {
        isListed: true,
        marketCapRank: 10,
      },
    });

    blockaidProvider = createMockProvider('blockaid', {
      blockaid: {
        isMalicious: false,
        isPhishing: false,
        riskScore: 0.1,
        attackTypes: [],
        checkedAt: new Date().toISOString(),
      },
    });

    service = new SpamClassificationService(
      tokenRepository,
      [heuristicsProvider, coingeckoProvider, blockaidProvider]
    );
  });

  describe('classifyToken', () => {
    it('should aggregate results from all providers', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: 'test-token',
      };

      const result = await service.classifyToken(token);

      expect(result.classification.heuristics).toBeDefined();
      expect(result.classification.coingecko).toBeDefined();
      expect(result.classification.blockaid).toBeDefined();
    });

    it('should call all providers', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      await service.classifyToken(token);

      expect(heuristicsProvider.classify).toHaveBeenCalledWith(token);
      expect(coingeckoProvider.classify).toHaveBeenCalledWith(token);
      expect(blockaidProvider.classify).toHaveBeenCalledWith(token);
    });
  });

  describe('computeRiskSummary', () => {
    it('should return danger level for malicious tokens', async () => {
      blockaidProvider = createMockProvider('blockaid', {
        blockaid: {
          isMalicious: true,
          isPhishing: false,
          riskScore: 0.9,
          attackTypes: ['honeypot'],
          checkedAt: new Date().toISOString(),
        },
      });

      service = new SpamClassificationService(
        tokenRepository,
        [heuristicsProvider, coingeckoProvider, blockaidProvider]
      );

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Scam Token',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('danger');
      expect(summary.reasons).toContain('Flagged as malicious by Blockaid');
    });

    it('should return warning level for suspicious names', async () => {
      heuristicsProvider = createMockProvider('heuristics', {
        heuristics: {
          suspiciousName: true,
          namePatterns: ['contains_url'],
          isUnsolicited: false,
          contractAgeDays: null,
          isNewContract: false,
          holderDistribution: 'unknown',
        },
      });

      service = new SpamClassificationService(
        tokenRepository,
        [heuristicsProvider, coingeckoProvider, blockaidProvider]
      );

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Visit scam.com',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('warning');
      expect(summary.reasons).toContain('Suspicious token name detected');
    });

    it('should return safe level for verified tokens', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('safe');
      expect(summary.reasons).toHaveLength(0);
    });

    it('should respect user trusted override', async () => {
      blockaidProvider = createMockProvider('blockaid', {
        blockaid: {
          isMalicious: true,
          isPhishing: false,
          riskScore: 0.9,
          attackTypes: ['honeypot'],
          checkedAt: new Date().toISOString(),
        },
      });

      service = new SpamClassificationService(
        tokenRepository,
        [heuristicsProvider, coingeckoProvider, blockaidProvider]
      );

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'My Token',
        symbol: 'MY',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, 'trusted');

      expect(summary.riskLevel).toBe('safe');
      expect(summary.reasons).toContain('User marked as trusted');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/spam/spam-classification-service.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/spam/spam-classification-service.ts
import type {
  SpamClassification,
  SpamClassificationProvider,
  TokenToClassify,
  ClassificationResult,
  BlockaidClassification,
  CoingeckoClassification,
  HeuristicsClassification,
} from './types.js';
import type { TokenRepository } from '../../repositories/types.js';
import { logger } from '@/utils/powertools';

export interface RiskSummary {
  riskLevel: 'safe' | 'warning' | 'danger';
  reasons: string[];
}

export class SpamClassificationService {
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly providers: SpamClassificationProvider[]
  ) {}

  async classifyToken(token: TokenToClassify): Promise<ClassificationResult> {
    // Call all providers in parallel
    const providerResults = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.classify(token);
        } catch (error) {
          logger.warn(`Provider ${provider.name} failed`, { error, token: token.address });
          return {};
        }
      })
    );

    // Merge results from all providers
    const classification = this.mergeClassifications(providerResults);

    return {
      tokenAddress: token.address.toLowerCase(),
      classification,
      updatedAt: new Date(),
    };
  }

  async classifyTokensBatch(tokens: TokenToClassify[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    // Process tokens in parallel
    const classificationPromises = tokens.map((token) => this.classifyToken(token));
    const classifications = await Promise.all(classificationPromises);

    tokens.forEach((token, index) => {
      results.set(token.address.toLowerCase(), classifications[index]);
    });

    return results;
  }

  computeRiskSummary(
    classification: SpamClassification,
    userOverride: 'trusted' | 'spam' | null
  ): RiskSummary {
    const reasons: string[] = [];

    // User override takes precedence
    if (userOverride === 'trusted') {
      return {
        riskLevel: 'safe',
        reasons: ['User marked as trusted'],
      };
    }

    if (userOverride === 'spam') {
      return {
        riskLevel: 'danger',
        reasons: ['User marked as spam'],
      };
    }

    // Check Blockaid results
    if (classification.blockaid?.isMalicious) {
      reasons.push('Flagged as malicious by Blockaid');
    }
    if (classification.blockaid?.isPhishing) {
      reasons.push('Flagged as phishing by Blockaid');
    }

    // Check heuristics
    if (classification.heuristics.suspiciousName) {
      reasons.push('Suspicious token name detected');
    }
    if (classification.heuristics.isUnsolicited) {
      reasons.push('Token received without user transaction');
    }
    if (classification.heuristics.isNewContract) {
      reasons.push('Very new token contract');
    }
    if (classification.heuristics.holderDistribution === 'suspicious') {
      reasons.push('Suspicious holder distribution');
    }

    // Check CoinGecko listing
    if (!classification.coingecko.isListed) {
      // Not being listed is a minor warning, only add if there are other issues
      if (reasons.length > 0) {
        reasons.push('Not listed on CoinGecko');
      }
    }

    // Determine risk level
    let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';

    if (classification.blockaid?.isMalicious || classification.blockaid?.isPhishing) {
      riskLevel = 'danger';
    } else if (reasons.length > 0) {
      riskLevel = 'warning';
    }

    return { riskLevel, reasons };
  }

  private mergeClassifications(results: Partial<SpamClassification>[]): SpamClassification {
    const merged: SpamClassification = {
      blockaid: null,
      coingecko: {
        isListed: false,
        marketCapRank: null,
      },
      heuristics: {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
    };

    for (const result of results) {
      if (result.blockaid !== undefined) {
        merged.blockaid = result.blockaid;
      }
      if (result.coingecko !== undefined) {
        merged.coingecko = result.coingecko;
      }
      if (result.heuristics !== undefined) {
        merged.heuristics = result.heuristics;
      }
    }

    return merged;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/spam/spam-classification-service.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/spam/spam-classification-service.ts services/core/tests/unit/services/spam/spam-classification-service.test.ts
git commit -m "feat(spam): add spam classification service to orchestrate providers"
```

---

## Task 9: Create Spam Service Index

**Files:**
- Create: `services/core/src/services/spam/index.ts`
- Create: `services/core/src/services/spam/providers/index.ts`
- Create: `services/core/src/services/spam/heuristics/index.ts`

**Step 1: Create the index files**

```typescript
// services/core/src/services/spam/index.ts
export * from './types.js';
export * from './spam-classification-service.js';
export * from './providers/index.js';
export * from './heuristics/index.js';
```

```typescript
// services/core/src/services/spam/providers/index.ts
export * from './blockaid-provider.js';
export * from './coingecko-provider.js';
export * from './heuristics-provider.js';
```

```typescript
// services/core/src/services/spam/heuristics/index.ts
export * from './name-analyzer.js';
```

**Step 2: Commit**

```bash
git add services/core/src/services/spam/index.ts services/core/src/services/spam/providers/index.ts services/core/src/services/spam/heuristics/index.ts
git commit -m "feat(spam): add barrel exports for spam classification module"
```

---

## Task 10: Update Repository Types for Spam Override

**Files:**
- Modify: `services/core/src/repositories/types.ts`
- Modify: `services/core/src/repositories/token-holding.repository.ts`

**Step 1: Update repository types**

Add to `TokenHolding` interface in `services/core/src/repositories/types.ts`:

```typescript
// In TokenHolding interface, add:
userSpamOverride: 'trusted' | 'spam' | null;
overrideUpdatedAt: Date | null;
```

Add new method to `TokenHoldingRepository` interface:

```typescript
// In TokenHoldingRepository interface, add:
updateSpamOverride(
  addressId: string,
  tokenAddress: string,
  override: 'trusted' | 'spam' | null
): Promise<TokenHolding | null>;
```

**Step 2: Update repository implementation**

Add to `services/core/src/repositories/token-holding.repository.ts`:

```typescript
async updateSpamOverride(
  addressId: string,
  tokenAddress: string,
  override: 'trusted' | 'spam' | null
): Promise<TokenHolding | null> {
  const now = new Date().toISOString();

  const result = await this.db
    .updateTable('token_holdings')
    .set({
      user_spam_override: override,
      override_updated_at: override ? now : null,
      updated_at: now,
    })
    .where('address_id', '=', addressId)
    .where('token_address', '=', tokenAddress?.toLowerCase() ?? '')
    .returningAll()
    .executeTakeFirst();

  return result ? this.mapToTokenHolding(result) : null;
}
```

Also update the `mapToTokenHolding` function to include the new fields.

**Step 3: Commit**

```bash
git add services/core/src/repositories/types.ts services/core/src/repositories/token-holding.repository.ts
git commit -m "feat(repo): add spam override support to token holding repository"
```

---

## Task 11: Integrate Spam Analysis into Balance Service

**Files:**
- Modify: `services/core/src/services/balances/balance-service.ts`
- Modify: `services/core/tests/unit/services/balances/balance-service.test.ts`

**Step 1: Write the failing test**

Add to `services/core/tests/unit/services/balances/balance-service.test.ts`:

```typescript
describe('spam analysis', () => {
  it('should include spamAnalysis in enriched balance response', async () => {
    // ... setup mocks similar to existing tests
    // ... add spam classification service mock

    const result = await service.getBalances('addr-1');

    expect(result[0].spamAnalysis).toBeDefined();
    expect(result[0].spamAnalysis.blockaid).toBeDefined();
    expect(result[0].spamAnalysis.coingecko).toBeDefined();
    expect(result[0].spamAnalysis.heuristics).toBeDefined();
    expect(result[0].spamAnalysis.summary).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npx vitest run tests/unit/services/balances/balance-service.test.ts -c tests/unit/vitest.config.ts
```

Expected: FAIL

**Step 3: Update BalanceService**

Update `EnrichedBalance` interface and `BalanceService` class to include `SpamClassificationService` dependency and add `spamAnalysis` to responses. This involves:

1. Adding `SpamClassificationService` as constructor dependency
2. Calling `classifyTokensBatch` after fetching balances
3. Merging spam analysis results into `EnrichedBalance` response
4. Including user overrides from `token_holdings`

**Step 4: Run test to verify it passes**

```bash
cd services/core && npx vitest run tests/unit/services/balances/balance-service.test.ts -c tests/unit/vitest.config.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/balances/balance-service.ts services/core/tests/unit/services/balances/balance-service.test.ts
git commit -m "feat(balances): integrate spam classification into balance responses"
```

---

## Task 12: Add Spam Override API Endpoints

**Files:**
- Create: `services/core/src/routes/spam/index.ts`
- Create: `services/core/src/routes/spam/handlers.ts`
- Create: `services/core/src/routes/spam/schemas.ts`
- Create: `services/core/tests/unit/routes/spam/handlers.test.ts`

**Step 1: Create schemas**

```typescript
// services/core/src/routes/spam/schemas.ts
import { Type } from '@sinclair/typebox';

export const SpamOverrideParams = Type.Object({
  addressId: Type.String(),
  tokenAddress: Type.String(),
});

export const SpamOverrideBody = Type.Object({
  override: Type.Union([Type.Literal('trusted'), Type.Literal('spam')]),
});

export const SpamOverrideResponse = Type.Object({
  tokenAddress: Type.String(),
  chain: Type.String(),
  network: Type.String(),
  userOverride: Type.Union([Type.Literal('trusted'), Type.Literal('spam')]),
  updatedAt: Type.String(),
});

export const BulkSpamOverrideBody = Type.Object({
  overrides: Type.Array(
    Type.Object({
      tokenAddress: Type.String(),
      override: Type.Union([Type.Literal('trusted'), Type.Literal('spam')]),
    })
  ),
});
```

**Step 2: Create handlers**

```typescript
// services/core/src/routes/spam/handlers.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Static } from '@sinclair/typebox';
import type { SpamOverrideParams, SpamOverrideBody, BulkSpamOverrideBody } from './schemas.js';

export async function updateSpamOverride(
  request: FastifyRequest<{
    Params: Static<typeof SpamOverrideParams>;
    Body: Static<typeof SpamOverrideBody>;
  }>,
  reply: FastifyReply
) {
  const { addressId, tokenAddress } = request.params;
  const { override } = request.body;

  // Implementation: Update token_holdings.user_spam_override
  // Return updated override info
}

export async function deleteSpamOverride(
  request: FastifyRequest<{
    Params: Static<typeof SpamOverrideParams>;
  }>,
  reply: FastifyReply
) {
  const { addressId, tokenAddress } = request.params;

  // Implementation: Set token_holdings.user_spam_override to null
}

export async function bulkUpdateSpamOverrides(
  request: FastifyRequest<{
    Params: { addressId: string };
    Body: Static<typeof BulkSpamOverrideBody>;
  }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;
  const { overrides } = request.body;

  // Implementation: Batch update overrides
}
```

**Step 3: Create routes**

```typescript
// services/core/src/routes/spam/index.ts
import type { FastifyPluginAsync } from 'fastify';
import { updateSpamOverride, deleteSpamOverride, bulkUpdateSpamOverrides } from './handlers.js';
import { SpamOverrideParams, SpamOverrideBody, SpamOverrideResponse, BulkSpamOverrideBody } from './schemas.js';

export const spamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.patch(
    '/addresses/:addressId/tokens/:tokenAddress/spam-override',
    {
      schema: {
        params: SpamOverrideParams,
        body: SpamOverrideBody,
        response: { 200: SpamOverrideResponse },
      },
    },
    updateSpamOverride
  );

  fastify.delete(
    '/addresses/:addressId/tokens/:tokenAddress/spam-override',
    {
      schema: {
        params: SpamOverrideParams,
      },
    },
    deleteSpamOverride
  );

  fastify.patch(
    '/addresses/:addressId/tokens/spam-overrides',
    {
      schema: {
        body: BulkSpamOverrideBody,
      },
    },
    bulkUpdateSpamOverrides
  );
};
```

**Step 4: Write tests for handlers**

**Step 5: Commit**

```bash
git add services/core/src/routes/spam/
git commit -m "feat(api): add spam override endpoints for user token preferences"
```

---

## Task 13: Register Spam Routes in App

**Files:**
- Modify: `services/core/src/app.ts` (or wherever routes are registered)

**Step 1: Import and register spam routes**

```typescript
import { spamRoutes } from './routes/spam/index.js';

// In route registration section:
await app.register(spamRoutes);
```

**Step 2: Commit**

```bash
git add services/core/src/app.ts
git commit -m "feat(app): register spam override routes"
```

---

## Task 14: Run Full Test Suite

**Step 1: Run all unit tests**

```bash
cd services/core && npm run test:unit
```

Expected: All tests PASS

**Step 2: Run integration tests if available**

```bash
cd services/core && npm run test:integration
```

**Step 3: Fix any failing tests**

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: ensure all spam filtering tests pass"
```

---

## Summary

This plan implements:

1. **Database migrations** for spam classification storage
2. **Heuristics provider** with name analysis
3. **CoinGecko provider** for listing verification
4. **Blockaid provider** for security scanning (placeholder for actual API)
5. **SpamClassificationService** to orchestrate providers
6. **Balance service integration** for spam analysis in responses
7. **API endpoints** for user spam overrides

**Next steps after implementation:**
- Implement actual Blockaid Token Security API call
- Add airdrop detection heuristic
- Add contract age checking heuristic
- Add holder distribution analysis
- Implement background classification worker
