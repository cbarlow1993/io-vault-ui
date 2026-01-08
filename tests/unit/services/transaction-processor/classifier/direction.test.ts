import { describe, it, expect } from 'vitest';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
import type { ClassificationType, ParsedTransfer } from '@/src/services/transaction-processor/types.js';

describe('calculateDirection', () => {
  const perspectiveAddress = '0xUser123';

  describe('type-based overrides', () => {
    it('returns neutral for swap regardless of transfers', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xuser123', to: '0xPool', amount: '100', token: { address: '0xA' } },
        { type: 'token', direction: 'in', from: '0xPool', to: '0xuser123', amount: '200', token: { address: '0xB' } },
      ];
      expect(calculateDirection('swap', transfers, perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for approve', () => {
      expect(calculateDirection('approve', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for contract_deploy', () => {
      expect(calculateDirection('contract_deploy', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns in for mint', () => {
      expect(calculateDirection('mint', [], perspectiveAddress)).toBe('in');
    });

    it('returns out for burn', () => {
      expect(calculateDirection('burn', [], perspectiveAddress)).toBe('out');
    });
  });

  describe('transfer direction', () => {
    it('returns in when user is recipient', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUser123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when user is sender', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xOther', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns neutral when user is both sender and recipient', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xOther', amount: '100', token: { address: '0xA' } },
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUser123', amount: '50', token: { address: '0xB' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('neutral');
    });

    it('handles case-insensitive address matching', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUSER123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, '0xuser123')).toBe('in');
    });
  });

  describe('stake direction', () => {
    it('returns out when staking (tokens leaving user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xStakingContract', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns in when unstaking (tokens returning to user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xStakingContract', to: '0xUser123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('in');
    });
  });

  describe('nft_transfer direction', () => {
    it('returns in when receiving NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'in', from: '0xOther', to: '0xUser123', amount: '1', tokenId: '123' },
      ];
      expect(calculateDirection('nft_transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when sending NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'out', from: '0xUser123', to: '0xOther', amount: '1', tokenId: '123' },
      ];
      expect(calculateDirection('nft_transfer', transfers, perspectiveAddress)).toBe('out');
    });
  });

  describe('edge cases', () => {
    it('returns neutral when no transfers', () => {
      expect(calculateDirection('transfer', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for unknown type', () => {
      expect(calculateDirection('unknown-type' as ClassificationType, [], perspectiveAddress)).toBe('neutral');
    });
  });
});
