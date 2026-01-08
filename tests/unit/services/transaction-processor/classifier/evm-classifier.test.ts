import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect } from 'vitest';
import { EvmClassifier } from '@/src/services/transaction-processor/classifier/evm-classifier.js';
import type { EvmTransactionData } from '@/src/services/transaction-processor/types.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

describe('EvmClassifier', () => {
  const classifier = new EvmClassifier();

  const baseTx: EvmTransactionData = {
    type: 'evm',
    hash: '0xabc123',
    from: '0xsender',
    to: '0xrecipient',
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash',
    timestamp: new Date(),
    status: 'success',
  };

  describe('transfer classification', () => {
    it('classifies native ETH transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        value: '1000000000000000000',
        input: '0x',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('transfer');
      expect(result.confidence).toBe('high');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]!.type).toBe('native');
    });

    it('classifies ERC20 transfer from Transfer event', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x000000000000000000000000recipient'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('transfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]!.type).toBe('token');
    });

    it('handles empty log data gracefully', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x000000000000000000000000recipient'],
          data: '0x',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('transfer');
      expect(result.transfers[0]!.amount).toBe('0');
    });
  });

  describe('approve classification', () => {
    it('classifies ERC20 approval', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        input: '0x095ea7b3',
        logs: [{
          address: '0xtoken',
          topics: [APPROVAL_TOPIC, '0x000000000000000000000000owner', '0x000000000000000000000000spender'],
          data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('approve');
      expect(result.confidence).toBe('high');
    });
  });

  describe('mint classification', () => {
    it('classifies mint from zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000recipient'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('mint');
    });
  });

  describe('burn classification', () => {
    it('classifies burn to zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('burn');
    });
  });

  describe('contract deploy classification', () => {
    it('classifies contract deployment', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        to: null,
        input: '0x608060405234801561001057600080fd5b50',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('contract_deploy');
      expect(result.confidence).toBe('high');
    });
  });

  describe('swap classification', () => {
    it('classifies swap with multiple transfers', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          { address: '0xtokenA', topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x000000000000000000000000pool'], data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', logIndex: 0 },
          { address: '0xtokenB', topics: [TRANSFER_TOPIC, '0x000000000000000000000000pool', '0x000000000000000000000000sender'], data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000', logIndex: 1 },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('swap');
      expect(result.transfers).toHaveLength(2);
    });
  });

  describe('unknown classification', () => {
    it('returns unknown for unrecognized transactions', async () => {
      const tx: EvmTransactionData = { ...baseTx, input: '0xdeadbeef' };
      const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });

  describe('direction classification', () => {
    const userAddress = '0xsender';

    it('classifies received ETH transfer as direction in', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        from: '0xother',
        to: userAddress,
        value: '1000000000000000000',
        input: '0x',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('in');
      expect(result.label).toContain('Received');
    });

    it('classifies sent ETH transfer as direction out', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        from: userAddress,
        to: '0xrecipient',
        value: '1000000000000000000',
        input: '0x',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('out');
      expect(result.label).toContain('Sent');
    });

    it('classifies swap as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          { address: '0xtokenA', topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x000000000000000000000000pool'], data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', logIndex: 0 },
          { address: '0xtokenB', topics: [TRANSFER_TOPIC, '0x000000000000000000000000pool', '0x000000000000000000000000sender'], data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000', logIndex: 1 },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('neutral');
    });

    it('classifies mint as direction in', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000sender'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('in');
    });

    it('classifies burn as direction out', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: '0xtoken',
          topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('out');
    });

    it('classifies approve as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        input: '0x095ea7b3',
        logs: [{
          address: '0xtoken',
          topics: [APPROVAL_TOPIC, '0x000000000000000000000000owner', '0x000000000000000000000000spender'],
          data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('neutral');
    });

    it('classifies contract deployment as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        to: null,
        input: '0x608060405234801561001057600080fd5b50',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
      expect(result.direction).toBe('neutral');
    });
  });
});
