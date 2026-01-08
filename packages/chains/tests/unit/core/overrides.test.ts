// packages/chains/tests/unit/core/overrides.test.ts
import { describe, it, expect } from 'vitest';
import type {
  TransactionOverrides,
  EvmTransactionOverrides,
  SvmTransactionOverrides,
  UtxoTransactionOverrides,
  TvmTransactionOverrides,
  XrpTransactionOverrides,
  SubstrateTransactionOverrides,
} from '../../../src/core/types.js';

describe('Transaction Overrides', () => {
  it('EvmTransactionOverrides accepts valid EVM override fields', () => {
    const overrides: EvmTransactionOverrides = {
      nonce: 42,
      maxFeePerGas: '50000000000',
      maxPriorityFeePerGas: '2000000000',
      gasLimit: '21000',
    };
    expect(overrides.nonce).toBe(42);
  });

  it('SvmTransactionOverrides accepts valid Solana override fields', () => {
    const overrides: SvmTransactionOverrides = {
      recentBlockhash: 'abc123',
      computeUnitLimit: 200000,
      computeUnitPrice: 1000,
    };
    expect(overrides.computeUnitLimit).toBe(200000);
  });

  it('UtxoTransactionOverrides accepts valid UTXO override fields', () => {
    const overrides: UtxoTransactionOverrides = {
      feeRate: 10,
    };
    expect(overrides.feeRate).toBe(10);
  });

  it('TvmTransactionOverrides accepts valid Tron override fields', () => {
    const overrides: TvmTransactionOverrides = {
      feeLimit: 100000000,
      expiration: 60000,
    };
    expect(overrides.feeLimit).toBe(100000000);
  });

  it('XrpTransactionOverrides accepts valid XRP override fields', () => {
    const overrides: XrpTransactionOverrides = {
      sequence: 12345,
      fee: '12',
      lastLedgerSequence: 67890,
    };
    expect(overrides.sequence).toBe(12345);
  });

  it('SubstrateTransactionOverrides accepts valid Substrate override fields', () => {
    const overrides: SubstrateTransactionOverrides = {
      tip: '1000000000',
      nonce: 5,
      era: 64,
    };
    expect(overrides.tip).toBe('1000000000');
  });

  it('TransactionOverrides union accepts any ecosystem override', () => {
    const evmOverride: TransactionOverrides = { nonce: 1 };
    const svmOverride: TransactionOverrides = { recentBlockhash: 'xyz' };
    const utxoOverride: TransactionOverrides = { feeRate: 5 };
    expect(evmOverride).toBeDefined();
    expect(svmOverride).toBeDefined();
    expect(utxoOverride).toBeDefined();
  });
});
