import { describe, it, expect } from 'vitest';
import { NameAnalyzer } from '@/src/services/spam/heuristics/name-analyzer.js';

describe('NameAnalyzer', () => {
  const analyzer = new NameAnalyzer();

  describe('analyze', () => {
    describe('input validation', () => {
      it('should handle empty strings gracefully', () => {
        const result = analyzer.analyze('', '');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should handle null inputs gracefully', () => {
        const result = analyzer.analyze(null as unknown as string, null as unknown as string);
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should handle undefined inputs gracefully', () => {
        const result = analyzer.analyze(undefined as unknown as string, undefined as unknown as string);
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should handle mixed null and valid inputs', () => {
        const result = analyzer.analyze(null as unknown as string, 'USDC');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should handle empty name with valid symbol', () => {
        const result = analyzer.analyze('', 'USDC');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should handle valid name with empty symbol', () => {
        const result = analyzer.analyze('USD Coin', '');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });
    });

    describe('URL detection', () => {
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

      it('should detect www. prefixed URLs', () => {
        const result = analyzer.analyze('Visit www.scamsite.com', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
      });

      it('should detect http:// URLs', () => {
        const result = analyzer.analyze('Visit http://phishing.org', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
      });

      it('should detect .eth domains', () => {
        const result = analyzer.analyze('claim.eth rewards', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
      });

      it('should detect .xyz domains', () => {
        const result = analyzer.analyze('Visit token.xyz', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
      });

      describe('false positive prevention', () => {
        it('should NOT flag "CommonToken" as containing URL', () => {
          const result = analyzer.analyze('CommonToken', 'COM');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "BioProtocol" as containing URL', () => {
          const result = analyzer.analyze('BioProtocol', 'BIO');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "NetworkDAO" as containing URL', () => {
          const result = analyzer.analyze('NetworkDAO', 'NET');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "Ethereum" as containing URL', () => {
          const result = analyzer.analyze('Ethereum', 'ETH');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "Compound" as containing URL', () => {
          const result = analyzer.analyze('Compound', 'COMP');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "Internet Computer" as containing URL', () => {
          const result = analyzer.analyze('Internet Computer', 'ICP');
          expect(result.namePatterns).not.toContain('contains_url');
        });

        it('should NOT flag "Organization Token" as containing URL', () => {
          const result = analyzer.analyze('Organization Token', 'ORG');
          expect(result.namePatterns).not.toContain('contains_url');
        });
      });
    });

    describe('unicode confusables', () => {
      it('should detect unicode confusables', () => {
        const result = analyzer.analyze('USÐC', 'USÐC'); // Ð instead of D
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('unicode_confusable');
      });

      it('should detect Cyrillic characters', () => {
        const result = analyzer.analyze('USDС', 'USDС'); // Cyrillic С instead of C
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('unicode_confusable');
      });
    });

    describe('impersonation detection', () => {
      it('should detect impersonation of known tokens', () => {
        const result = analyzer.analyze('Tether USD', 'USDT2');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('impersonation');
      });

      it('should detect symbol variations with suffix', () => {
        const result = analyzer.analyze('USD Coin Fake', 'USDC1');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('impersonation');
      });

      it('should detect name impersonation with mismatched symbol', () => {
        const result = analyzer.analyze('Tether USDT Token', 'FAKE');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('impersonation');
      });

      it('should NOT flag legitimate known tokens', () => {
        const result = analyzer.analyze('Tether USD', 'USDT');
        expect(result.namePatterns).not.toContain('impersonation');
      });

      it('should NOT flag wrapped tokens as impersonation', () => {
        const result = analyzer.analyze('Wrapped Ether', 'WETH');
        expect(result.namePatterns).not.toContain('impersonation');
      });

      it('should NOT flag wrapped bitcoin', () => {
        const result = analyzer.analyze('Wrapped BTC', 'WBTC');
        expect(result.namePatterns).not.toContain('impersonation');
      });

      describe('boundary conditions', () => {
        it('should detect symbol with exactly 2 extra characters', () => {
          const result = analyzer.analyze('Fake Token', 'USDTXX');
          expect(result.namePatterns).toContain('impersonation');
        });

        it('should NOT flag symbol with 3 or more extra characters', () => {
          const result = analyzer.analyze('Fake Token', 'USDTXXX');
          expect(result.namePatterns).not.toContain('impersonation');
        });
      });

      describe('impersonation detection improvements', () => {
        // Use names that don't accidentally contain known tokens like 'ETH' (Tether contains ETH)
        it('detects lowercase impersonation "usdt2"', () => {
          const result = analyzer.analyze('Dollar Coin Copy', 'usdt2');
          expect(result.namePatterns).toContain('impersonation');
        });

        it('detects symbol with trailing space "USDT "', () => {
          const result = analyzer.analyze('Dollar Coin Copy', 'USDT ');
          expect(result.namePatterns).toContain('impersonation');
        });

        it('detects symbol with dots "U.S.D.T"', () => {
          const result = analyzer.analyze('Dollar Coin', 'U.S.D.T');
          expect(result.namePatterns).toContain('impersonation');
        });

        it('detects zero-width character impersonation "USD\u200BT"', () => {
          const result = analyzer.analyze('Dollar Coin', 'USD\u200BT'); // Zero-width space
          expect(result.namePatterns).toContain('impersonation');
        });

        it('does not flag legitimate USDT', () => {
          const result = analyzer.analyze('Dollar Coin', 'USDT');
          expect(result.namePatterns).not.toContain('impersonation');
        });

        it('does not flag legitimate wrapped tokens', () => {
          const result = analyzer.analyze('Wrapped Bitcoin', 'WBTC');
          expect(result.namePatterns).not.toContain('impersonation');
        });
      });
    });

    describe('scam phrases', () => {
      it('should detect scam phrases', () => {
        const result = analyzer.analyze('Claim your airdrop now', 'CLAIM');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('scam_phrase');
      });

      it('should detect "free" scam phrase', () => {
        const result = analyzer.analyze('Free Token Giveaway', 'FREE');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('scam_phrase');
      });

      it('should detect "visit" scam phrase', () => {
        const result = analyzer.analyze('Visit our site', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('scam_phrase');
      });

      it('should detect "reward" scam phrase', () => {
        const result = analyzer.analyze('Reward Token', 'RWD');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('scam_phrase');
      });
    });

    describe('multiple pattern matches', () => {
      it('should detect multiple patterns simultaneously', () => {
        const result = analyzer.analyze('Claim free USDT at scam.com', 'USDT2');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
        expect(result.namePatterns).toContain('scam_phrase');
        expect(result.namePatterns).toContain('impersonation');
        expect(result.namePatterns.length).toBeGreaterThanOrEqual(3);
      });

      it('should detect URL and scam phrase together', () => {
        const result = analyzer.analyze('Visit https://claim.io for airdrop', 'TOKEN');
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('contains_url');
        expect(result.namePatterns).toContain('scam_phrase');
      });

      it('should detect unicode confusable and impersonation together', () => {
        const result = analyzer.analyze('USÐT Token', 'USDT2'); // Ð instead of D
        expect(result.suspiciousName).toBe(true);
        expect(result.namePatterns).toContain('unicode_confusable');
        expect(result.namePatterns).toContain('impersonation');
      });
    });

    describe('ReDoS protection', () => {
      it('handles long strings without hanging', () => {
        const analyzer = new NameAnalyzer();
        const maliciousInput = 'a'.repeat(10000) + '!';

        const startTime = Date.now();
        const result = analyzer.analyze(maliciousInput, 'TEST');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(100); // Should complete quickly
        expect(result).toBeDefined();
      });

      it('truncates inputs longer than MAX_INPUT_LENGTH', () => {
        const analyzer = new NameAnalyzer();
        const longName = 'Token ' + 'X'.repeat(5000) + ' visit.com for rewards';

        const startTime = Date.now();
        const result = analyzer.analyze(longName, 'TEST');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(100);
        // URL at end should not be detected because input is truncated
        expect(result.namePatterns).not.toContain('contains_url');
      });
    });

    describe('legitimate tokens', () => {
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

      it('should pass Uniswap', () => {
        const result = analyzer.analyze('Uniswap', 'UNI');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should pass Chainlink', () => {
        const result = analyzer.analyze('Chainlink', 'LINK');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });

      it('should pass Aave', () => {
        const result = analyzer.analyze('Aave', 'AAVE');
        expect(result.suspiciousName).toBe(false);
        expect(result.namePatterns).toHaveLength(0);
      });
    });
  });
});
