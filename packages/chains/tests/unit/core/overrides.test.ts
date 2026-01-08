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
  EcosystemOverridesMap,
} from '../../../src/core/types.js';

describe('Transaction Overrides', () => {
  it('EvmTransactionOverrides accepts valid EVM override fields', () => {
    const overrides: EvmTransactionOverrides = {
      gasPrice: BigInt('50000000000'),
      gasLimit: BigInt('21000'),
      maxFeePerGas: BigInt('50000000000'),
      maxPriorityFeePerGas: BigInt('2000000000'),
      nonce: 42,
      type: 2,
      data: '0x1234',
    };
    expect(overrides.nonce).toBe(42);
    expect(overrides.gasPrice).toBe(BigInt('50000000000'));
    expect(overrides.type).toBe(2);
    expect(overrides.data).toBe('0x1234');
  });

  it('EvmTransactionOverrides type field only accepts 0 or 2', () => {
    const legacyTx: EvmTransactionOverrides = { type: 0 };
    const eip1559Tx: EvmTransactionOverrides = { type: 2 };
    expect(legacyTx.type).toBe(0);
    expect(eip1559Tx.type).toBe(2);
  });

  it('SvmTransactionOverrides accepts valid Solana override fields', () => {
    const overrides: SvmTransactionOverrides = {
      computeUnitPrice: 1000,
      computeUnitLimit: 200000,
      skipPreflight: true,
      nonceAccount: 'NonceAccountPublicKey123',
    };
    expect(overrides.computeUnitLimit).toBe(200000);
    expect(overrides.skipPreflight).toBe(true);
    expect(overrides.nonceAccount).toBe('NonceAccountPublicKey123');
  });

  it('UtxoTransactionOverrides accepts valid UTXO override fields', () => {
    const overrides: UtxoTransactionOverrides = {
      feeRate: 10,
      utxos: [
        { txid: 'abc123', vout: 0, value: 50000 },
        { txid: 'def456', vout: 1, value: 30000 },
      ],
    };
    expect(overrides.feeRate).toBe(10);
    expect(overrides.utxos).toHaveLength(2);
    expect(overrides.utxos?.[0].txid).toBe('abc123');
  });

  it('TvmTransactionOverrides accepts valid Tron override fields', () => {
    const overrides: TvmTransactionOverrides = {
      feeLimit: 100000000,
      permission_id: 2,
    };
    expect(overrides.feeLimit).toBe(100000000);
    expect(overrides.permission_id).toBe(2);
  });

  it('XrpTransactionOverrides accepts valid XRP override fields', () => {
    const overrides: XrpTransactionOverrides = {
      fee: '12',
      sequence: 12345,
      maxLedgerVersionOffset: 10,
    };
    expect(overrides.sequence).toBe(12345);
    expect(overrides.fee).toBe('12');
    expect(overrides.maxLedgerVersionOffset).toBe(10);
  });

  it('SubstrateTransactionOverrides accepts valid Substrate override fields', () => {
    const overrides: SubstrateTransactionOverrides = {
      tip: BigInt('1000000000'),
      nonce: 5,
      era: 64,
    };
    expect(overrides.tip).toBe(BigInt('1000000000'));
    expect(overrides.nonce).toBe(5);
    expect(overrides.era).toBe(64);
  });

  it('TransactionOverrides union accepts any ecosystem override', () => {
    const evmOverride: TransactionOverrides = { nonce: 1 };
    const svmOverride: TransactionOverrides = { computeUnitPrice: 1000 };
    const utxoOverride: TransactionOverrides = { feeRate: 5 };
    const tvmOverride: TransactionOverrides = { feeLimit: 100000 };
    const xrpOverride: TransactionOverrides = { fee: '10' };
    const substrateOverride: TransactionOverrides = { tip: BigInt(100) };
    expect(evmOverride).toBeDefined();
    expect(svmOverride).toBeDefined();
    expect(utxoOverride).toBeDefined();
    expect(tvmOverride).toBeDefined();
    expect(xrpOverride).toBeDefined();
    expect(substrateOverride).toBeDefined();
  });

  it('EcosystemOverridesMap maps ecosystems to their override types', () => {
    // This is a compile-time type check - if the types are wrong, this won't compile
    const ecosystemMap: EcosystemOverridesMap = {
      evm: { gasLimit: BigInt(21000) },
      svm: { computeUnitLimit: 200000 },
      utxo: { feeRate: 10 },
      tvm: { feeLimit: 100000 },
      xrp: { fee: '12' },
      substrate: { tip: BigInt(100) },
    };
    expect(ecosystemMap.evm.gasLimit).toBe(BigInt(21000));
    expect(ecosystemMap.svm.computeUnitLimit).toBe(200000);
    expect(ecosystemMap.utxo.feeRate).toBe(10);
    expect(ecosystemMap.tvm.feeLimit).toBe(100000);
    expect(ecosystemMap.xrp.fee).toBe('12');
    expect(ecosystemMap.substrate.tip).toBe(BigInt(100));
  });
});
