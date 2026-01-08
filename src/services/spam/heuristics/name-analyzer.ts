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

// Legitimate symbol prefixes for derivative tokens (staked, wrapped, liquid, etc.)
const LEGITIMATE_SYMBOL_PREFIXES = [
  'W',    // Wrapped (WETH, WBTC)
  'ST',   // Staked (stETH, stMATIC)
  'R',    // Rocket Pool (rETH)
  'CB',   // Coinbase (cbETH, cbBTC)
  'A',    // Aave (aETH, aDAI)
  'C',    // Compound (cETH, cDAI)
  'S',    // Staked/Synth (sETH, sUSD)
  'M',    // Morpho/Maker (mETH)
  'E',    // Eigenlayer (eETH)
  'WE',   // Wrapped Ether variants
  'OS',   // Origin (osETH)
  'SW',   // Swell (swETH)
  'AN',   // Ankr (ankrETH normalized)
  'F',    // Frax (frxETH normalized)
  'LS',   // Liquid Staked
  'B',    // Bridged
];

// Legitimate name patterns that indicate derivative tokens (case insensitive)
const LEGITIMATE_NAME_PATTERNS = [
  'staked',
  'wrapped',
  'liquid',
  'bridged',
  'synthetic',
  'rebasing',
  'interest bearing',
  'yield bearing',
  'lido',
  'rocket pool',
  'coinbase',
  'compound',
  'aave',
  'frax',
  'origin',
  'swell',
  'ankr',
  'mantle',
  'binance',
  'name service',  // Ethereum Name Service
  'domain',        // ENS domains
];

// Unicode confusable characters map
const CONFUSABLES: Record<string, string> = {
  '\u00D0': 'D', // Ð (Latin Capital Letter Eth)
  '\u0110': 'D', // Đ (Latin Capital Letter D with Stroke)
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

// Maximum input length to prevent ReDoS attacks
const MAX_INPUT_LENGTH = 256;

// Known legitimate brand names that include domain-like patterns
// These are real crypto projects that use TLDs in their branding
const LEGITIMATE_BRAND_DOMAINS = new Set([
  'helium.io',
  'lido.fi',
  'curve.fi',
  'yearn.fi',
  'convex.fi',
  'pendle.fi',
  'radiant.fi',
  'balancer.fi',
  'euler.fi',
  'sommelier.fi',
  'maple.fi',
  'ribbon.fi',
  'sushi.com',
  'aave.com',
  'instadapp.io',
  'zapper.fi',
  'zerion.io',
  'debank.com',
  'apecoin.com',
]);

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
    // Defensive input validation - treat null/undefined/non-string as empty
    let safeName = typeof name === 'string' ? name : '';
    let safeSymbol = typeof symbol === 'string' ? symbol : '';

    // Length limit to prevent ReDoS attacks
    safeName = safeName.slice(0, MAX_INPUT_LENGTH);
    safeSymbol = safeSymbol.slice(0, MAX_INPUT_LENGTH);

    // Early return for empty inputs
    if (!safeName && !safeSymbol) {
      return {
        suspiciousName: false,
        namePatterns: [],
      };
    }

    const patterns: string[] = [];
    const combined = `${safeName} ${safeSymbol}`.toLowerCase();

    // Check for URLs
    if (this.containsUrl(safeName) || this.containsUrl(safeSymbol)) {
      patterns.push('contains_url');
    }

    // Check for unicode confusables
    if (this.hasUnicodeConfusables(safeName) || this.hasUnicodeConfusables(safeSymbol)) {
      patterns.push('unicode_confusable');
    }

    // Check for impersonation of known tokens
    if (this.isImpersonation(safeName, safeSymbol)) {
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
    // Match explicit URLs (https://, http://, www.)
    const explicitUrlPattern = /https?:\/\/|www\./i;
    if (explicitUrlPattern.test(text)) {
      return true;
    }

    // Match domain-like patterns with TLDs that appear as actual domains
    // Require either: word boundary before TLD, or looks like a domain (word.tld pattern)
    // This prevents false positives like "CommonToken", "BioProtocol", "NetworkDAO"
    // Use bounded quantifier to prevent catastrophic backtracking (ReDoS)
    const domainPattern = /\b[a-zA-Z0-9]{1,63}\.(com|io|net|org|xyz|eth|fi)\b/gi;
    const matches = text.matchAll(domainPattern);

    for (const match of matches) {
      const domain = match[0].toLowerCase();
      // Allow known legitimate brand domains
      if (!LEGITIMATE_BRAND_DOMAINS.has(domain)) {
        return true;
      }
    }

    return false;
  }

  private hasUnicodeConfusables(text: string): boolean {
    for (const char of text) {
      if (CONFUSABLES[char]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Normalizes a symbol for comparison by removing spaces, dots, dashes,
   * underscores, and zero-width characters, then uppercasing.
   */
  private normalizeSymbol(symbol: string): string {
    return symbol
      .toUpperCase()
      .replace(/[\s.\-_\u200B\u200C\u200D\uFEFF]/g, '') // Remove spaces, dots, dashes, zero-width chars
      .trim();
  }

  private isImpersonation(name: string, symbol: string): boolean {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const upperSymbol = symbol.toUpperCase();
    const upperName = name.toUpperCase();
    const lowerName = name.toLowerCase();

    // If the normalized symbol exactly matches a known token, it's legitimate
    if (KNOWN_TOKENS.includes(normalizedSymbol)) {
      // But if the original symbol had extra chars (dots, spaces, zero-width), it's impersonation
      if (upperSymbol !== normalizedSymbol) {
        return true;
      }
      return false;
    }

    // Check if the name contains legitimate derivative patterns
    const hasLegitimateNamePattern = LEGITIMATE_NAME_PATTERNS.some(
      (pattern) => lowerName.includes(pattern)
    );

    // Check if symbol has a legitimate derivative prefix followed by a known token
    const hasLegitimateSymbolPrefix = LEGITIMATE_SYMBOL_PREFIXES.some((prefix) => {
      if (!normalizedSymbol.startsWith(prefix)) {
        return false;
      }
      const remainder = normalizedSymbol.slice(prefix.length);
      return KNOWN_TOKENS.includes(remainder);
    });

    for (const knownToken of KNOWN_TOKENS) {
      // Check if normalized symbol contains known token with extra chars (e.g., USDT2, USDTX)
      // Only flag symbols with 1-2 extra characters (likely impersonation)
      // 3+ extra characters are likely unrelated tokens, not impersonation
      if (normalizedSymbol.includes(knownToken) && normalizedSymbol.length < knownToken.length + 3) {
        // Allow symbols with legitimate derivative prefixes (stETH, cbETH, rETH, etc.)
        if (hasLegitimateSymbolPrefix) {
          continue;
        }
        // Allow if name has legitimate derivative patterns (staked, wrapped, liquid, etc.)
        if (hasLegitimateNamePattern) {
          continue;
        }
        // Flag symbols that add suspicious suffixes (USDT2, ETHX, etc.)
        if (normalizedSymbol !== knownToken) {
          return true;
        }
      }

      // Check if name mentions known token but symbol doesn't match
      if (upperName.includes(knownToken)) {
        // Allow if name has legitimate derivative patterns (staked, wrapped, liquid, etc.)
        if (hasLegitimateNamePattern) {
          continue;
        }
        // Allow if symbol has legitimate derivative prefix
        if (hasLegitimateSymbolPrefix) {
          continue;
        }
        // Flag if name contains known token but symbol is unrelated
        // (e.g., name="Fake USDT" symbol="SCAM")
        if (!normalizedSymbol.includes(knownToken)) {
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
