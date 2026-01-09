/**
 * Immutable value object representing a token's name and symbol with analysis capabilities.
 * Encapsulates suspicious name detection, impersonation checks, and normalization.
 */

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
  'staked', 'wrapped', 'liquid', 'bridged', 'synthetic', 'rebasing',
  'interest bearing', 'yield bearing', 'lido', 'rocket pool', 'coinbase',
  'compound', 'aave', 'frax', 'origin', 'swell', 'ankr', 'mantle', 'binance',
  'name service', 'domain',
];

// Unicode confusable characters map
const CONFUSABLES: Record<string, string> = {
  '\u00D0': 'D', '\u0110': 'D', '\u0100': 'A', '\u0112': 'E',
  '\u012A': 'I', '\u014C': 'O', '\u016A': 'U', '\u0421': 'C',
  '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u041D': 'H',
  '\u041E': 'O', '\u0420': 'P', '\u0422': 'T', '\u0425': 'X',
};

// Known legitimate brand names that include domain-like patterns
const LEGITIMATE_BRAND_DOMAINS = new Set([
  'helium.io', 'lido.fi', 'curve.fi', 'yearn.fi', 'convex.fi',
  'pendle.fi', 'radiant.fi', 'balancer.fi', 'euler.fi', 'sommelier.fi',
  'maple.fi', 'ribbon.fi', 'sushi.com', 'aave.com', 'instadapp.io',
  'zapper.fi', 'zerion.io', 'debank.com', 'apecoin.com',
]);

// Scam phrases to detect
const SCAM_PHRASES = [
  'claim', 'airdrop', 'visit', 'free', 'bonus',
  'reward', 'giveaway', 'double', 'send', 'voucher',
];

// Maximum input length to prevent ReDoS attacks
const MAX_INPUT_LENGTH = 256;

export type SuspiciousPattern = 'contains_url' | 'unicode_confusable' | 'impersonation' | 'scam_phrase';

/**
 * Immutable value object for token name analysis.
 * Provides methods to detect suspicious naming patterns.
 *
 * @example
 * const name = TokenName.create('Fake USDT', 'SCAM');
 * name.isSuspicious; // true
 * name.suspiciousPatterns; // ['impersonation']
 */
export class TokenName {
  private readonly _name: string;
  private readonly _symbol: string;
  private readonly _patterns: SuspiciousPattern[];

  private constructor(name: string, symbol: string) {
    // Defensive input validation and length limiting
    this._name = (typeof name === 'string' ? name : '').slice(0, MAX_INPUT_LENGTH);
    this._symbol = (typeof symbol === 'string' ? symbol : '').slice(0, MAX_INPUT_LENGTH);
    this._patterns = this.analyze();
    Object.freeze(this);
  }

  /**
   * Create a TokenName value object
   */
  static create(name: string, symbol: string): TokenName {
    return new TokenName(name, symbol);
  }

  /**
   * The token's display name
   */
  get value(): string {
    return this._name;
  }

  /**
   * The token's symbol
   */
  get symbol(): string {
    return this._symbol;
  }

  /**
   * Whether any suspicious patterns were detected
   */
  get isSuspicious(): boolean {
    return this._patterns.length > 0;
  }

  /**
   * List of detected suspicious patterns
   */
  get suspiciousPatterns(): SuspiciousPattern[] {
    return [...this._patterns];
  }

  /**
   * Whether the token may be impersonating a known token
   */
  get hasImpersonationRisk(): boolean {
    return this._patterns.includes('impersonation');
  }

  /**
   * Whether name or symbol contains a URL pattern
   */
  get containsUrl(): boolean {
    return this._patterns.includes('contains_url');
  }

  /**
   * Whether scam-related phrases were detected
   */
  get hasScamPhrases(): boolean {
    return this._patterns.includes('scam_phrase');
  }

  /**
   * Whether unicode confusable characters were detected
   */
  get hasUnicodeConfusables(): boolean {
    return this._patterns.includes('unicode_confusable');
  }

  /**
   * Symbol normalized for comparison (stripped of confusables and special chars)
   */
  get normalizedSymbol(): string {
    return this.normalizeSymbol(this._symbol);
  }

  /**
   * Check if this token might be impersonating a specific known symbol
   */
  isImpersonating(knownSymbol: string): boolean {
    const normalized = this.normalizedSymbol;
    const upperKnown = knownSymbol.toUpperCase();

    // If normalized symbol contains the known token
    if (normalized.includes(upperKnown)) {
      // Allow legitimate derivative prefixes
      const hasLegitPrefix = LEGITIMATE_SYMBOL_PREFIXES.some((prefix) => {
        if (!normalized.startsWith(prefix)) return false;
        return normalized.slice(prefix.length) === upperKnown;
      });
      if (hasLegitPrefix) return false;

      // Allow legitimate name patterns
      const lowerName = this._name.toLowerCase();
      const hasLegitName = LEGITIMATE_NAME_PATTERNS.some((p) => lowerName.includes(p));
      if (hasLegitName) return false;

      // If not exact match, it's impersonation
      return normalized !== upperKnown;
    }

    return false;
  }

  /**
   * For database storage and API responses
   */
  toJSON(): { name: string; symbol: string; isSuspicious: boolean; patterns: SuspiciousPattern[] } {
    return {
      name: this._name,
      symbol: this._symbol,
      isSuspicious: this.isSuspicious,
      patterns: this._patterns,
    };
  }

  /**
   * Check equality with another TokenName
   */
  equals(other: TokenName): boolean {
    return this._name === other._name && this._symbol === other._symbol;
  }

  // --- Private analysis methods ---

  private analyze(): SuspiciousPattern[] {
    if (!this._name && !this._symbol) {
      return [];
    }

    const patterns: SuspiciousPattern[] = [];
    const combined = `${this._name} ${this._symbol}`.toLowerCase();

    if (this.checkContainsUrl(this._name) || this.checkContainsUrl(this._symbol)) {
      patterns.push('contains_url');
    }

    if (this.checkHasUnicodeConfusables(this._name) || this.checkHasUnicodeConfusables(this._symbol)) {
      patterns.push('unicode_confusable');
    }

    if (this.checkIsImpersonation()) {
      patterns.push('impersonation');
    }

    if (this.checkHasScamPhrases(combined)) {
      patterns.push('scam_phrase');
    }

    return patterns;
  }

  private checkContainsUrl(text: string): boolean {
    // Match explicit URLs (https://, http://, www.)
    const explicitUrlPattern = /https?:\/\/|www\./i;
    if (explicitUrlPattern.test(text)) {
      return true;
    }

    // Match domain-like patterns with TLDs
    const domainPattern = /\b[a-zA-Z0-9]{1,63}\.(com|io|net|org|xyz|eth|fi)\b/gi;
    const matches = text.matchAll(domainPattern);

    for (const match of matches) {
      const domain = match[0].toLowerCase();
      if (!LEGITIMATE_BRAND_DOMAINS.has(domain)) {
        return true;
      }
    }

    return false;
  }

  private checkHasUnicodeConfusables(text: string): boolean {
    for (const char of text) {
      if (CONFUSABLES[char]) {
        return true;
      }
    }
    return false;
  }

  private normalizeSymbol(symbol: string): string {
    return symbol
      .toUpperCase()
      .replace(/[\s.\-_\u200B\u200C\u200D\uFEFF]/g, '')
      .trim();
  }

  private checkIsImpersonation(): boolean {
    const normalizedSymbol = this.normalizeSymbol(this._symbol);
    const upperSymbol = this._symbol.toUpperCase();
    const upperName = this._name.toUpperCase();
    const lowerName = this._name.toLowerCase();

    // If the normalized symbol exactly matches a known token, it's legitimate
    if (KNOWN_TOKENS.includes(normalizedSymbol)) {
      // But if the original symbol had extra chars (dots, spaces, zero-width), it's impersonation
      return upperSymbol !== normalizedSymbol;
    }

    // Check if the name contains legitimate derivative patterns
    const hasLegitimateNamePattern = LEGITIMATE_NAME_PATTERNS.some(
      (pattern) => lowerName.includes(pattern)
    );

    // Check if symbol has a legitimate derivative prefix followed by a known token
    const hasLegitimateSymbolPrefix = LEGITIMATE_SYMBOL_PREFIXES.some((prefix) => {
      if (!normalizedSymbol.startsWith(prefix)) return false;
      const remainder = normalizedSymbol.slice(prefix.length);
      return KNOWN_TOKENS.includes(remainder);
    });

    for (const knownToken of KNOWN_TOKENS) {
      // Check if normalized symbol contains known token with extra chars
      if (normalizedSymbol.includes(knownToken) && normalizedSymbol.length < knownToken.length + 3) {
        if (hasLegitimateSymbolPrefix) continue;
        if (hasLegitimateNamePattern) continue;
        if (normalizedSymbol !== knownToken) return true;
      }

      // Check if name mentions known token but symbol doesn't match
      if (upperName.includes(knownToken)) {
        if (hasLegitimateNamePattern) continue;
        if (hasLegitimateSymbolPrefix) continue;
        if (!normalizedSymbol.includes(knownToken)) return true;
      }
    }

    return false;
  }

  private checkHasScamPhrases(text: string): boolean {
    const lowerText = text.toLowerCase();
    return SCAM_PHRASES.some((phrase) => lowerText.includes(phrase));
  }
}
