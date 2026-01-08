import { describe, it, expect } from 'vitest';
import { generateLabel, formatAmount } from '@/src/services/transaction-processor/classifier/label.js';
import type { ClassificationType, ParsedTransfer } from '@/src/services/transaction-processor/types.js';

describe('formatAmount', () => {
  it('formats 18 decimal token amounts correctly', () => {
    expect(formatAmount('1000000000000000000', 18)).toBe('1');
    expect(formatAmount('800000000000000', 18)).toBe('0.0008');
    expect(formatAmount('1500000000000000000', 18)).toBe('1.5');
    expect(formatAmount('123456789000000000', 18)).toBe('0.123456789');
  });

  it('formats 6 decimal token amounts correctly (USDC)', () => {
    expect(formatAmount('1000000', 6)).toBe('1');
    expect(formatAmount('1500000', 6)).toBe('1.5');
    expect(formatAmount('100', 6)).toBe('0.0001');
    expect(formatAmount('123456', 6)).toBe('0.123456');
  });

  it('formats 9 decimal token amounts correctly (SOL)', () => {
    expect(formatAmount('1000000000', 9)).toBe('1');
    expect(formatAmount('500000000', 9)).toBe('0.5');
    expect(formatAmount('123456789', 9)).toBe('0.123456789');
  });

  it('handles zero and empty values', () => {
    expect(formatAmount('0', 18)).toBe('0');
    expect(formatAmount('', 18)).toBe('0');
  });

  it('removes trailing zeros', () => {
    expect(formatAmount('1000000000000000000', 18)).toBe('1');
    expect(formatAmount('1100000000000000000', 18)).toBe('1.1');
    expect(formatAmount('1010000000000000000', 18)).toBe('1.01');
  });

  it('handles amounts smaller than 1', () => {
    expect(formatAmount('1', 18)).toBe('0.000000000000000001');
    expect(formatAmount('10', 18)).toBe('0.00000000000000001');
    expect(formatAmount('1', 6)).toBe('0.000001');
  });

  it('handles large amounts', () => {
    expect(formatAmount('1000000000000000000000', 18)).toBe('1000');
    expect(formatAmount('1234567890000000000000000', 18)).toBe('1234567.89');
  });

  it('handles 0 decimals', () => {
    expect(formatAmount('100', 0)).toBe('100');
    expect(formatAmount('1', 0)).toBe('1');
  });
});

describe('generateLabel', () => {
  describe('transfer labels', () => {
    it('generates "Received" label for in direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '100000000', token: { address: '0xT', symbol: 'USDC', decimals: 6 } },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 100 USDC');
    });

    it('generates "Sent" label for out direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '50000000000000000000', token: { address: '0xT', symbol: 'ETH', decimals: 18 } },
      ];
      expect(generateLabel('transfer', 'out', transfers)).toBe('Sent 50 ETH');
    });

    it('generates "Transferred" label for neutral direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '25000000000000000000', token: { address: '0xT', symbol: 'DAI', decimals: 18 } },
      ];
      expect(generateLabel('transfer', 'neutral', transfers)).toBe('Transferred 25 DAI');
    });

    it('formats amounts with decimals correctly', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '800000000000000', token: { address: '0xT', symbol: 'ETH', decimals: 18 } },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 0.0008 ETH');
    });
  });

  describe('stake labels', () => {
    it('generates "Staked" label for out direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '1000000000000', token: { address: '0xT', symbol: 'SOL', decimals: 9 } },
      ];
      expect(generateLabel('stake', 'out', transfers)).toBe('Staked 1000 SOL');
    });

    it('generates "Unstaked" label for in direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '500000000000000000000', token: { address: '0xT', symbol: 'ETH', decimals: 18 } },
      ];
      expect(generateLabel('stake', 'in', transfers)).toBe('Unstaked 500 ETH');
    });
  });

  describe('other types', () => {
    it('generates swap label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '100000000', token: { address: '0xT', symbol: 'USDC', decimals: 6 } },
      ];
      expect(generateLabel('swap', 'neutral', transfers)).toBe('Swapped USDC');
    });

    it('generates mint label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0x0', to: '0xB', amount: '1000000000000000000000', token: { address: '0xT', symbol: 'NFT', decimals: 18 } },
      ];
      expect(generateLabel('mint', 'in', transfers)).toBe('Minted 1000 NFT');
    });

    it('generates burn label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0x0', amount: '50000000000000000000', token: { address: '0xT', symbol: 'TOKEN', decimals: 18 } },
      ];
      expect(generateLabel('burn', 'out', transfers)).toBe('Burned 50 TOKEN');
    });

    it('generates approve label', () => {
      expect(generateLabel('approve', 'neutral', [])).toBe('Token Approval');
    });

    it('generates contract_deploy label', () => {
      expect(generateLabel('contract_deploy', 'neutral', [])).toBe('Deployed Contract');
    });
  });

  describe('edge cases', () => {
    it('uses "tokens" when no symbol available and defaults to 18 decimals', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '100000000000000000000', token: { address: '0xT' } },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 100 tokens');
    });

    it('handles empty transfers', () => {
      expect(generateLabel('transfer', 'in', [])).toBe('Received tokens');
    });

    it('generates fallback for unknown type', () => {
      expect(generateLabel('unknown-type' as ClassificationType, 'neutral', [])).toBe('Transaction');
    });

    it('uses 18 decimals as default when decimals not provided', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'native', direction: 'in', from: '0xA', to: '0xB', amount: '1000000000000000000' },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 1 tokens');
    });
  });
});
