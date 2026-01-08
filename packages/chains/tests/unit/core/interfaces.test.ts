// packages/chains/tests/unit/core/interfaces.test.ts
import { describe, it, expect } from 'vitest';
import type {
  IBalanceFetcher,
  ITransactionBuilder,
  IContractInteraction,
  IChainProvider,
  UnsignedTransaction,
  SignedTransaction,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractCallParams,
} from '../../../src/core/interfaces.js';

describe('Interfaces', () => {
  it('UnsignedTransaction has required methods', () => {
    // Type-level test: ensure interface shape is correct
    const mockTx: UnsignedTransaction = {
      chainAlias: 'ethereum',
      raw: {},
      serialized: '0x...',
      rebuild: () => mockTx,
      getSigningPayload: () => ({ chainAlias: 'ethereum', data: ['0x'], algorithm: 'secp256k1' }),
      applySignature: () => ({
        chainAlias: 'ethereum',
        serialized: '0x...',
        hash: '0x...',
        broadcast: async () => ({ hash: '0x', success: true }),
      }),
      toNormalised: () => ({
        chainAlias: 'ethereum',
        to: '0x...',
        value: '0',
        formattedValue: '0',
        symbol: 'ETH',
        type: 'native-transfer',
        metadata: { isContractDeployment: false },
      }),
    };
    expect(mockTx.chainAlias).toBe('ethereum');
    expect(typeof mockTx.rebuild).toBe('function');
    expect(typeof mockTx.getSigningPayload).toBe('function');
    expect(typeof mockTx.applySignature).toBe('function');
  });

  it('NativeTransferParams has required fields', () => {
    const params: NativeTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000000000000000',
    };
    expect(params.from).toBeDefined();
    expect(params.to).toBeDefined();
    expect(params.value).toBeDefined();
  });

  it('TokenTransferParams extends NativeTransferParams with contractAddress', () => {
    const params: TokenTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000',
      contractAddress: '0xToken',
    };
    expect(params.contractAddress).toBe('0xToken');
  });
});
