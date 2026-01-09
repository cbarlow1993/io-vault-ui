import { describe, expect, it } from 'vitest';
import {
  TransactionClassification,
  type ClassificationData,
} from '@/src/domain/entities/transaction/classification.js';

describe('TransactionClassification', () => {
  const createClassificationData = (
    overrides: Partial<ClassificationData> = {}
  ): ClassificationData => ({
    type: 'transfer',
    direction: 'out',
    confidence: 'high',
    source: 'custom',
    label: 'Sent 1 ETH',
    ...overrides,
  });

  describe('create', () => {
    it('creates a classification with all fields', () => {
      const classification = TransactionClassification.create(
        createClassificationData()
      );

      expect(classification.type).toBe('transfer');
      expect(classification.direction).toBe('out');
      expect(classification.confidence).toBe('high');
      expect(classification.source).toBe('custom');
      expect(classification.label).toBe('Sent 1 ETH');
      expect(classification.protocol).toBeNull();
    });

    it('creates a classification with protocol', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ protocol: 'uniswap' })
      );

      expect(classification.protocol).toBe('uniswap');
    });

    it('handles all classification types', () => {
      const types = [
        'transfer',
        'swap',
        'bridge',
        'stake',
        'mint',
        'burn',
        'approve',
        'contract_deploy',
        'nft_transfer',
        'unknown',
      ] as const;

      for (const type of types) {
        const classification = TransactionClassification.create(
          createClassificationData({ type })
        );
        expect(classification.type).toBe(type);
      }
    });
  });

  describe('unknown', () => {
    it('creates an unknown classification', () => {
      const classification = TransactionClassification.unknown();

      expect(classification.type).toBe('unknown');
      expect(classification.direction).toBe('neutral');
      expect(classification.confidence).toBe('low');
      expect(classification.source).toBe('custom');
      expect(classification.label).toBe('Transaction');
      expect(classification.protocol).toBeNull();
    });
  });

  describe('computeDirection', () => {
    it('returns neutral for approve type', () => {
      const direction = TransactionClassification.computeDirection('approve', 0, 1);
      expect(direction).toBe('neutral');
    });

    it('returns neutral for contract_deploy type', () => {
      const direction = TransactionClassification.computeDirection('contract_deploy', 0, 1);
      expect(direction).toBe('neutral');
    });

    it('returns neutral for swap with both in and out', () => {
      const direction = TransactionClassification.computeDirection('swap', 1, 1);
      expect(direction).toBe('neutral');
    });

    it('returns neutral for swap with only outgoing', () => {
      const direction = TransactionClassification.computeDirection('swap', 0, 1);
      expect(direction).toBe('neutral');
    });

    it('returns neutral for swap with only incoming', () => {
      const direction = TransactionClassification.computeDirection('swap', 1, 0);
      expect(direction).toBe('neutral');
    });

    it('returns out for transfer with only outgoing', () => {
      const direction = TransactionClassification.computeDirection('transfer', 0, 1);
      expect(direction).toBe('out');
    });

    it('returns in for transfer with only incoming', () => {
      const direction = TransactionClassification.computeDirection('transfer', 1, 0);
      expect(direction).toBe('in');
    });

    it('returns neutral for transfer with both in and out', () => {
      const direction = TransactionClassification.computeDirection('transfer', 1, 1);
      expect(direction).toBe('neutral');
    });

    it('returns neutral when no transfers', () => {
      const direction = TransactionClassification.computeDirection('transfer', 0, 0);
      expect(direction).toBe('neutral');
    });
  });

  describe('generateLabel', () => {
    it('generates label for outgoing transfer', () => {
      const label = TransactionClassification.generateLabel('transfer', 'out', '1 ETH');
      expect(label).toBe('Sent 1 ETH');
    });

    it('generates label for incoming transfer', () => {
      const label = TransactionClassification.generateLabel('transfer', 'in', '1 ETH');
      expect(label).toBe('Received 1 ETH');
    });

    it('generates label for neutral transfer', () => {
      const label = TransactionClassification.generateLabel('transfer', 'neutral', '1 ETH');
      expect(label).toBe('Transferred 1 ETH');
    });

    it('generates label for swap', () => {
      const label = TransactionClassification.generateLabel('swap', 'neutral', '1 ETH');
      expect(label).toBe('Swapped ETH');
    });

    it('generates label for stake out', () => {
      const label = TransactionClassification.generateLabel('stake', 'out', '1 ETH');
      expect(label).toBe('Staked 1 ETH');
    });

    it('generates label for stake in (unstake)', () => {
      const label = TransactionClassification.generateLabel('stake', 'in', '1 ETH');
      expect(label).toBe('Unstaked 1 ETH');
    });

    it('generates label for mint', () => {
      const label = TransactionClassification.generateLabel('mint', 'in', '1 NFT');
      expect(label).toBe('Minted 1 NFT');
    });

    it('generates label for burn', () => {
      const label = TransactionClassification.generateLabel('burn', 'out', '1 ETH');
      expect(label).toBe('Burned 1 ETH');
    });

    it('generates label for approve', () => {
      const label = TransactionClassification.generateLabel('approve', 'neutral');
      expect(label).toBe('Token Approval');
    });

    it('generates label for contract deploy', () => {
      const label = TransactionClassification.generateLabel('contract_deploy', 'neutral');
      expect(label).toBe('Deployed Contract');
    });

    it('generates label for NFT transfer', () => {
      const label = TransactionClassification.generateLabel('nft_transfer', 'out');
      expect(label).toBe('Sent NFT');
    });

    it('generates label for bridge in', () => {
      const label = TransactionClassification.generateLabel('bridge', 'in', '1 ETH');
      expect(label).toBe('Bridged In 1 ETH');
    });

    it('generates label for bridge out', () => {
      const label = TransactionClassification.generateLabel('bridge', 'out', '1 ETH');
      expect(label).toBe('Bridged Out 1 ETH');
    });

    it('generates default label for unknown type', () => {
      const label = TransactionClassification.generateLabel('unknown', 'neutral');
      expect(label).toBe('Transaction');
    });

    it('uses default tokens when no amount provided', () => {
      const label = TransactionClassification.generateLabel('transfer', 'out');
      expect(label).toBe('Sent tokens');
    });
  });

  describe('computed properties', () => {
    it('isNeutral returns true for neutral direction', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ direction: 'neutral' })
      );
      expect(classification.isNeutral).toBe(true);
      expect(classification.isIncoming).toBe(false);
      expect(classification.isOutgoing).toBe(false);
    });

    it('isIncoming returns true for in direction', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ direction: 'in' })
      );
      expect(classification.isIncoming).toBe(true);
      expect(classification.isNeutral).toBe(false);
      expect(classification.isOutgoing).toBe(false);
    });

    it('isOutgoing returns true for out direction', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ direction: 'out' })
      );
      expect(classification.isOutgoing).toBe(true);
      expect(classification.isNeutral).toBe(false);
      expect(classification.isIncoming).toBe(false);
    });

    it('isHighConfidence returns true for high confidence', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ confidence: 'high' })
      );
      expect(classification.isHighConfidence).toBe(true);
    });

    it('isFromNoves returns true for noves source', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ source: 'noves' })
      );
      expect(classification.isFromNoves).toBe(true);
    });

    it('isTransfer returns true for transfer types', () => {
      const transfer = TransactionClassification.create(
        createClassificationData({ type: 'transfer' })
      );
      const nftTransfer = TransactionClassification.create(
        createClassificationData({ type: 'nft_transfer' })
      );
      const swap = TransactionClassification.create(
        createClassificationData({ type: 'swap' })
      );

      expect(transfer.isTransfer).toBe(true);
      expect(nftTransfer.isTransfer).toBe(true);
      expect(swap.isTransfer).toBe(false);
    });

    it('isSwapOrBridge returns true for swap or bridge', () => {
      const swap = TransactionClassification.create(
        createClassificationData({ type: 'swap' })
      );
      const bridge = TransactionClassification.create(
        createClassificationData({ type: 'bridge' })
      );
      const transfer = TransactionClassification.create(
        createClassificationData({ type: 'transfer' })
      );

      expect(swap.isSwapOrBridge).toBe(true);
      expect(bridge.isSwapOrBridge).toBe(true);
      expect(transfer.isSwapOrBridge).toBe(false);
    });

    it('isUnknown returns true for unknown type', () => {
      const unknown = TransactionClassification.unknown();
      const transfer = TransactionClassification.create(
        createClassificationData({ type: 'transfer' })
      );

      expect(unknown.isUnknown).toBe(true);
      expect(transfer.isUnknown).toBe(false);
    });
  });

  describe('withDirection', () => {
    it('creates new classification with updated direction', () => {
      const original = TransactionClassification.create(
        createClassificationData({ direction: 'out' })
      );

      const updated = original.withDirection('in');

      expect(updated.direction).toBe('in');
      expect(original.direction).toBe('out');
      expect(updated.type).toBe(original.type);
      expect(updated.label).toBe(original.label);
    });
  });

  describe('withLabel', () => {
    it('creates new classification with updated label', () => {
      const original = TransactionClassification.create(
        createClassificationData({ label: 'Old Label' })
      );

      const updated = original.withLabel('New Label');

      expect(updated.label).toBe('New Label');
      expect(original.label).toBe('Old Label');
    });
  });

  describe('withDirectionAndLabel', () => {
    it('creates new classification with updated direction and regenerated label', () => {
      const original = TransactionClassification.create(
        createClassificationData({ type: 'transfer', direction: 'out' })
      );

      const updated = original.withDirectionAndLabel('in', '2 ETH');

      expect(updated.direction).toBe('in');
      expect(updated.label).toBe('Received 2 ETH');
      expect(original.direction).toBe('out');
    });
  });

  describe('equals', () => {
    it('returns true for equal classifications', () => {
      const a = TransactionClassification.create(createClassificationData());
      const b = TransactionClassification.create(createClassificationData());

      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different types', () => {
      const a = TransactionClassification.create(createClassificationData({ type: 'transfer' }));
      const b = TransactionClassification.create(createClassificationData({ type: 'swap' }));

      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different directions', () => {
      const a = TransactionClassification.create(createClassificationData({ direction: 'in' }));
      const b = TransactionClassification.create(createClassificationData({ direction: 'out' }));

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const classification = TransactionClassification.create(createClassificationData());
      expect(Object.isFrozen(classification)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const classification = TransactionClassification.create(
        createClassificationData({ protocol: 'uniswap' })
      );

      const json = classification.toJSON();

      expect(json).toEqual({
        type: 'transfer',
        direction: 'out',
        confidence: 'high',
        source: 'custom',
        label: 'Sent 1 ETH',
        protocol: 'uniswap',
      });
    });

    it('serializes null protocol correctly', () => {
      const classification = TransactionClassification.create(createClassificationData());

      const json = classification.toJSON();

      expect(json.protocol).toBeNull();
    });
  });
});
