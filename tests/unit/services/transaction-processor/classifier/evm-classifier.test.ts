import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect } from 'vitest';
import { EvmClassifier } from '@/src/services/transaction-processor/classifier/evm-classifier.js';
import type { EvmTransactionData } from '@/src/services/transaction-processor/types.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

// Use valid EVM addresses (0x + 40 hex characters)
const SENDER_ADDR = '0x1111111111111111111111111111111111111111';
const RECIPIENT_ADDR = '0x2222222222222222222222222222222222222222';
const OTHER_ADDR = '0x3333333333333333333333333333333333333333';
const POOL_ADDR = '0x4444444444444444444444444444444444444444';
const TOKEN_ADDR = '0x5555555555555555555555555555555555555555';
const TOKEN_A_ADDR = '0x6666666666666666666666666666666666666666';
const TOKEN_B_ADDR = '0x7777777777777777777777777777777777777777';
const OWNER_ADDR = '0x8888888888888888888888888888888888888888';
const SPENDER_ADDR = '0x9999999999999999999999999999999999999999';

describe('EvmClassifier', () => {
  const classifier = new EvmClassifier();
  const senderWallet = WalletAddress.create(SENDER_ADDR, 'eth');

  const baseTx: EvmTransactionData = {
    type: 'evm',
    hash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
    from: SENDER_ADDR,
    to: RECIPIENT_ADDR,
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash0000000000000000000000000000000000000000000000000000000',
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
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('transfer');
      expect(result.confidence).toBe('high');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]!.type).toBe('native');
    });

    it('classifies ERC20 transfer from Transfer event', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000002222222222222222222222222222222222222222'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('transfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]!.type).toBe('token');
    });

    it('handles empty log data gracefully', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000002222222222222222222222222222222222222222'],
          data: '0x',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
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
          address: TOKEN_ADDR,
          topics: [APPROVAL_TOPIC, '0x0000000000000000000000008888888888888888888888888888888888888888', '0x0000000000000000000000009999999999999999999999999999999999999999'],
          data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('approve');
      expect(result.confidence).toBe('high');
    });
  });

  describe('mint classification', () => {
    it('classifies mint from zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000002222222222222222222222222222222222222222'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('mint');
    });
  });

  describe('burn classification', () => {
    it('classifies burn to zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
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
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('contract_deploy');
      expect(result.confidence).toBe('high');
    });
  });

  describe('swap classification', () => {
    it('classifies swap with multiple transfers', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          { address: TOKEN_A_ADDR, topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000004444444444444444444444444444444444444444'], data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', logIndex: 0 },
          { address: TOKEN_B_ADDR, topics: [TRANSFER_TOPIC, '0x0000000000000000000000004444444444444444444444444444444444444444', '0x0000000000000000000000001111111111111111111111111111111111111111'], data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000', logIndex: 1 },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('swap');
      expect(result.transfers).toHaveLength(2);
    });
  });

  describe('unknown classification', () => {
    it('returns unknown for unrecognized transactions', async () => {
      const tx: EvmTransactionData = { ...baseTx, input: '0xdeadbeef' };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });

  describe('direction classification', () => {
    it('classifies received ETH transfer as direction in', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        from: OTHER_ADDR,
        to: SENDER_ADDR,
        value: '1000000000000000000',
        input: '0x',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('in');
      expect(result.label).toContain('Received');
    });

    it('classifies sent ETH transfer as direction out', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        from: SENDER_ADDR,
        to: RECIPIENT_ADDR,
        value: '1000000000000000000',
        input: '0x',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('out');
      expect(result.label).toContain('Sent');
    });

    it('classifies swap as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          { address: TOKEN_A_ADDR, topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000004444444444444444444444444444444444444444'], data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', logIndex: 0 },
          { address: TOKEN_B_ADDR, topics: [TRANSFER_TOPIC, '0x0000000000000000000000004444444444444444444444444444444444444444', '0x0000000000000000000000001111111111111111111111111111111111111111'], data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000', logIndex: 1 },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('neutral');
    });

    it('classifies mint as direction in', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000001111111111111111111111111111111111111111'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('in');
    });

    it('classifies burn as direction out', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [{
          address: TOKEN_ADDR,
          topics: [TRANSFER_TOPIC, '0x0000000000000000000000001111111111111111111111111111111111111111', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('out');
    });

    it('classifies approve as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        input: '0x095ea7b3',
        logs: [{
          address: TOKEN_ADDR,
          topics: [APPROVAL_TOPIC, '0x0000000000000000000000008888888888888888888888888888888888888888', '0x0000000000000000000000009999999999999999999999999999999999999999'],
          data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          logIndex: 0,
        }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('neutral');
    });

    it('classifies contract deployment as direction neutral', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        to: null,
        input: '0x608060405234801561001057600080fd5b50',
      };
      const result = await classifier.classify(tx, { perspectiveAddress: senderWallet });
      expect(result.direction).toBe('neutral');
    });
  });
});
