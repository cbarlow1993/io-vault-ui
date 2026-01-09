import { describe, expect, it } from 'vitest';
import { TokenName } from '@/src/domain/entities/token/token-name.js';

describe('TokenName', () => {
  describe('create', () => {
    it('creates a TokenName with name and symbol', () => {
      const tokenName = TokenName.create('USD Coin', 'USDC');

      expect(tokenName.value).toBe('USD Coin');
      expect(tokenName.symbol).toBe('USDC');
    });

    it('creates TokenName with empty values', () => {
      const tokenName = TokenName.create('', '');

      expect(tokenName.value).toBe('');
      expect(tokenName.symbol).toBe('');
    });

    it('preserves original casing', () => {
      const tokenName = TokenName.create('Wrapped Bitcoin', 'WBTC');

      expect(tokenName.value).toBe('Wrapped Bitcoin');
      expect(tokenName.symbol).toBe('WBTC');
    });
  });

  describe('normalizedSymbol', () => {
    it('returns uppercase symbol', () => {
      const tokenName = TokenName.create('Ethereum', 'eth');
      expect(tokenName.normalizedSymbol).toBe('ETH');
    });

    it('trims whitespace', () => {
      const tokenName = TokenName.create('Token', '  ABC  ');
      expect(tokenName.normalizedSymbol).toBe('ABC');
    });
  });

  describe('isSuspicious', () => {
    it('returns false for normal token name', () => {
      const tokenName = TokenName.create('USD Coin', 'USDC');
      expect(tokenName.isSuspicious).toBe(false);
    });

    it('returns true for name containing URL', () => {
      const tokenName = TokenName.create('Claim at example.com', 'SCAM');
      expect(tokenName.isSuspicious).toBe(true);
    });

    it('returns true for name with scam phrases', () => {
      const tokenName = TokenName.create('Free Airdrop', 'FREE');
      expect(tokenName.isSuspicious).toBe(true);
    });

    it('returns true for impersonation attempt', () => {
      const tokenName = TokenName.create('Ethereum', 'ETH '); // Trailing space
      expect(tokenName.isSuspicious).toBe(true);
    });
  });

  describe('suspiciousPatterns', () => {
    it('returns empty array for clean name', () => {
      const tokenName = TokenName.create('Bitcoin', 'BTC');
      expect(tokenName.suspiciousPatterns).toHaveLength(0);
    });

    it('identifies URL pattern', () => {
      const tokenName = TokenName.create('Visit www.scam.com', 'SCAM');
      expect(tokenName.suspiciousPatterns).toContain('contains_url');
    });

    it('identifies scam phrase', () => {
      const tokenName = TokenName.create('Claim Free Tokens', 'CLAIM');
      expect(tokenName.suspiciousPatterns.some((p) => p.includes('scam'))).toBe(true);
    });
  });

  describe('hasImpersonationRisk', () => {
    it('returns false for legitimate token', () => {
      const tokenName = TokenName.create('USD Coin', 'USDC');
      expect(tokenName.hasImpersonationRisk).toBe(false);
    });

    it('returns false for exact known token symbol match', () => {
      // ETH is a known token, so exact match is legitimate
      const tokenName = TokenName.create('Ethereium', 'ETH');
      expect(tokenName.hasImpersonationRisk).toBe(false);
    });

    it('returns true for symbol with hidden characters', () => {
      // ETH with trailing space is impersonation
      const tokenName = TokenName.create('Ethereum', 'ETH ');
      expect(tokenName.hasImpersonationRisk).toBe(true);
    });

    it('returns false for legitimate wrapped tokens', () => {
      const tokenName = TokenName.create('Wrapped Ether', 'WETH');
      expect(tokenName.hasImpersonationRisk).toBe(false);
    });

    it('returns false for staked tokens', () => {
      const tokenName = TokenName.create('Staked ETH', 'stETH');
      expect(tokenName.hasImpersonationRisk).toBe(false);
    });
  });

  describe('containsUrl', () => {
    it('returns false for normal name', () => {
      const tokenName = TokenName.create('Uniswap', 'UNI');
      expect(tokenName.containsUrl).toBe(false);
    });

    it('detects http URL', () => {
      const tokenName = TokenName.create('Go to http://scam.com', 'SCAM');
      expect(tokenName.containsUrl).toBe(true);
    });

    it('detects https URL', () => {
      const tokenName = TokenName.create('Visit https://fake.io', 'FAKE');
      expect(tokenName.containsUrl).toBe(true);
    });

    it('detects www URL', () => {
      const tokenName = TokenName.create('www.malicious.com rewards', 'MAL');
      expect(tokenName.containsUrl).toBe(true);
    });

    it('detects .com domain', () => {
      const tokenName = TokenName.create('Claim at scam.com now', 'SCAM');
      expect(tokenName.containsUrl).toBe(true);
    });
  });

  describe('hasScamPhrases', () => {
    it('returns false for legitimate name', () => {
      const tokenName = TokenName.create('Chainlink', 'LINK');
      expect(tokenName.hasScamPhrases).toBe(false);
    });

    it('detects "claim" phrase', () => {
      const tokenName = TokenName.create('Claim Your Tokens', 'CLAIM');
      expect(tokenName.hasScamPhrases).toBe(true);
    });

    it('detects "airdrop" phrase', () => {
      const tokenName = TokenName.create('ETH Airdrop', 'AIR');
      expect(tokenName.hasScamPhrases).toBe(true);
    });

    it('detects "free" phrase', () => {
      const tokenName = TokenName.create('Free Bitcoin', 'FREE');
      expect(tokenName.hasScamPhrases).toBe(true);
    });

    it('detects "reward" phrase', () => {
      const tokenName = TokenName.create('Reward Token', 'REW');
      expect(tokenName.hasScamPhrases).toBe(true);
    });
  });

  describe('isImpersonating', () => {
    it('returns false when not impersonating', () => {
      const tokenName = TokenName.create('My Token', 'MTK');
      expect(tokenName.isImpersonating('ETH')).toBe(false);
    });

    it('returns false for exact symbol match', () => {
      // Exact match is NOT impersonation - the symbol genuinely is that token
      const tokenName = TokenName.create('Fake Token', 'ETH');
      expect(tokenName.isImpersonating('ETH')).toBe(false);
    });

    it('returns true for symbol with extra characters', () => {
      // Symbol ETH2 impersonates ETH
      const tokenName = TokenName.create('Fake Token', 'ETH2');
      expect(tokenName.isImpersonating('ETH')).toBe(true);
    });

    it('returns false for legitimate derivatives', () => {
      const tokenName = TokenName.create('Wrapped Ether', 'WETH');
      expect(tokenName.isImpersonating('ETH')).toBe(false);
    });

    it('returns false for exact case-insensitive match', () => {
      // Exact match (case-insensitive) is NOT impersonation
      const tokenName = TokenName.create('Token', 'usdc');
      expect(tokenName.isImpersonating('USDC')).toBe(false);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const tokenName = TokenName.create('Test', 'TST');
      expect(Object.isFrozen(tokenName)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const tokenName = TokenName.create('Wrapped Ether', 'WETH');
      const json = tokenName.toJSON();

      expect(json.name).toBe('Wrapped Ether');
      expect(json.symbol).toBe('WETH');
      expect(json.isSuspicious).toBe(false);
      expect(json.patterns).toHaveLength(0);
    });

    it('includes suspicious patterns when present', () => {
      const tokenName = TokenName.create('Visit scam.com', 'SCAM');
      const json = tokenName.toJSON();

      expect(json.isSuspicious).toBe(true);
      expect(json.patterns.length).toBeGreaterThan(0);
    });
  });
});
