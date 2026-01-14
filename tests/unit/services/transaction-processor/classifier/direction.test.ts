import { describe, it, expect } from 'vitest';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
import type { ClassificationType, ParsedTransfer } from '@/src/services/transaction-processor/types.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

describe('calculateDirection', () => {
  // Use valid EVM addresses (0x + 40 hex characters)
  const USER_ADDR = '0x1234567890123456789012345678901234567890';
  const OTHER_ADDR = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const POOL_ADDR = '0x0000000000000000000000000000000000000001';
  const STAKING_ADDR = '0x0000000000000000000000000000000000000002';
  const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  const perspectiveAddress = WalletAddress.create(USER_ADDR, 'eth');

  describe('type-based overrides', () => {
    it('returns neutral for swap regardless of transfers', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: USER_ADDR.toLowerCase(), to: POOL_ADDR, amount: '100', token: { address: TOKEN_A } },
        { type: 'token', direction: 'in', from: POOL_ADDR, to: USER_ADDR.toLowerCase(), amount: '200', token: { address: TOKEN_B } },
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
        { type: 'token', direction: 'in', from: OTHER_ADDR, to: USER_ADDR, amount: '100', token: { address: TOKEN_A } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when user is sender', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: USER_ADDR, to: OTHER_ADDR, amount: '100', token: { address: TOKEN_A } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns neutral when user is both sender and recipient', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: USER_ADDR, to: OTHER_ADDR, amount: '100', token: { address: TOKEN_A } },
        { type: 'token', direction: 'in', from: OTHER_ADDR, to: USER_ADDR, amount: '50', token: { address: TOKEN_B } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('neutral');
    });

    it('handles case-insensitive address matching', () => {
      // Use uppercase in transfer, lowercase in WalletAddress
      const upperUserAddr = USER_ADDR.toUpperCase().replace('0X', '0x'); // 0x1234... -> 0x1234...
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: OTHER_ADDR, to: upperUserAddr, amount: '100', token: { address: TOKEN_A } },
      ];
      const lowerPerspective = WalletAddress.create(USER_ADDR.toLowerCase(), 'eth');
      expect(calculateDirection('transfer', transfers, lowerPerspective)).toBe('in');
    });
  });

  describe('stake direction', () => {
    it('returns out when staking (tokens leaving user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: USER_ADDR, to: STAKING_ADDR, amount: '100', token: { address: TOKEN_A } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns in when unstaking (tokens returning to user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: STAKING_ADDR, to: USER_ADDR, amount: '100', token: { address: TOKEN_A } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('in');
    });
  });

  describe('nft_transfer direction', () => {
    it('returns in when receiving NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'in', from: OTHER_ADDR, to: USER_ADDR, amount: '1', tokenId: '123' },
      ];
      expect(calculateDirection('nft_transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when sending NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'out', from: USER_ADDR, to: OTHER_ADDR, amount: '1', tokenId: '123' },
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
