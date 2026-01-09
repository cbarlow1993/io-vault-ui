// packages/chains/tests/unit/xrp/transaction-builder.test.ts

import { describe, it, expect } from 'vitest';
import {
  UnsignedXrpTransaction,
  SignedXrpTransaction,
  buildPayment,
  buildXrpTransfer,
  buildIssuedCurrencyTransfer,
  buildTrustSet,
  parseTransaction,
} from '../../../src/xrp/transaction-builder.js';
import { getXrpChainConfig } from '../../../src/xrp/config.js';

describe('XRP Transaction Builder', () => {
  const config = getXrpChainConfig('xrp');

  // Valid XRP addresses for testing
  const fromAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  const toAddress = 'rN7n3473SaZBCG4dFL83w7a1RXtXtbk2D9';
  const issuerAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

  describe('buildPayment', () => {
    it('builds XRP payment transaction', () => {
      const tx = buildPayment(config, {
        from: fromAddress,
        to: toAddress,
        amount: '1000000', // 1 XRP
        fee: '12',
        sequence: 1,
        lastLedgerSequence: 85000020,
      });

      expect(tx).toBeInstanceOf(UnsignedXrpTransaction);

      const raw = tx.toRaw();
      expect(raw._chain).toBe('xrp');
      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Account).toBe(fromAddress);
      expect(raw.Destination).toBe(toAddress);
      expect(raw.Amount).toBe('1000000');
      expect(raw.Fee).toBe('12');
      expect(raw.Sequence).toBe(1);
      expect(raw.LastLedgerSequence).toBe(85000020);
    });

    it('builds issued currency payment', () => {
      const tx = buildPayment(config, {
        from: fromAddress,
        to: toAddress,
        amount: {
          currency: 'USD',
          issuer: issuerAddress,
          value: '100',
        },
        fee: '12',
        sequence: 5,
      });

      const raw = tx.toRaw();
      expect(raw.Amount).toEqual({
        currency: 'USD',
        issuer: issuerAddress,
        value: '100',
      });
    });

    it('includes destination tag when provided', () => {
      const tx = buildPayment(config, {
        from: fromAddress,
        to: toAddress,
        amount: '1000000',
        fee: '12',
        sequence: 1,
        destinationTag: 12345,
      });

      const raw = tx.toRaw();
      expect(raw.DestinationTag).toBe(12345);
    });

    it('includes source tag when provided', () => {
      const tx = buildPayment(config, {
        from: fromAddress,
        to: toAddress,
        amount: '1000000',
        fee: '12',
        sequence: 1,
        sourceTag: 99999,
      });

      const raw = tx.toRaw();
      expect(raw.SourceTag).toBe(99999);
    });

    it('includes memos when provided', () => {
      const tx = buildPayment(config, {
        from: fromAddress,
        to: toAddress,
        amount: '1000000',
        fee: '12',
        sequence: 1,
        memos: [
          { type: 'text/plain', data: 'Test payment' },
        ],
      });

      const raw = tx.toRaw();
      expect(raw.Memos).toBeDefined();
      expect(raw.Memos).toHaveLength(1);
    });
  });

  describe('buildXrpTransfer', () => {
    it('builds native XRP transfer', () => {
      const tx = buildXrpTransfer(
        config,
        fromAddress,
        toAddress,
        1000000n, // 1 XRP
        '12',
        1,
        85000020
      );

      const raw = tx.toRaw();
      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Amount).toBe('1000000');
    });

    it('includes destination tag', () => {
      const tx = buildXrpTransfer(
        config,
        fromAddress,
        toAddress,
        1000000n,
        '12',
        1,
        85000020,
        12345
      );

      const raw = tx.toRaw();
      expect(raw.DestinationTag).toBe(12345);
    });
  });

  describe('buildIssuedCurrencyTransfer', () => {
    it('builds issued currency transfer', () => {
      const tx = buildIssuedCurrencyTransfer(
        config,
        fromAddress,
        toAddress,
        'USD',
        issuerAddress,
        '100.50',
        '12',
        5,
        85000020
      );

      const raw = tx.toRaw();
      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Amount).toEqual({
        currency: 'USD',
        issuer: issuerAddress,
        value: '100.50',
      });
    });
  });

  describe('buildTrustSet', () => {
    it('builds trust line transaction', () => {
      const tx = buildTrustSet(config, {
        from: fromAddress,
        currency: 'USD',
        issuer: issuerAddress,
        limit: '1000000',
        fee: '12',
        sequence: 1,
      });

      const raw = tx.toRaw();
      expect(raw.TransactionType).toBe('TrustSet');
      expect(raw.Account).toBe(fromAddress);
      expect(raw.LimitAmount).toEqual({
        currency: 'USD',
        issuer: issuerAddress,
        value: '1000000',
      });
    });

    it('includes quality settings when provided', () => {
      const tx = buildTrustSet(config, {
        from: fromAddress,
        currency: 'USD',
        issuer: issuerAddress,
        limit: '1000000',
        fee: '12',
        sequence: 1,
        qualityIn: 0,
        qualityOut: 0,
      });

      const raw = tx.toRaw();
      expect(raw.QualityIn).toBe(0);
      expect(raw.QualityOut).toBe(0);
    });

    it('includes flags when provided', () => {
      const tx = buildTrustSet(config, {
        from: fromAddress,
        currency: 'USD',
        issuer: issuerAddress,
        limit: '1000000',
        fee: '12',
        sequence: 1,
        flags: 131072, // tfSetNoRipple
      });

      const raw = tx.toRaw();
      expect(raw.Flags).toBe(131072);
    });
  });

  describe('UnsignedXrpTransaction', () => {
    it('returns signing payload', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const payload = tx.getSigningPayload();

      expect(payload.chainAlias).toBe('xrp');
      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.data).toHaveLength(1);
      expect(typeof payload.data[0]).toBe('string');
    });

    it('serializes to JSON string', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const serialized = tx.serialized;

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.TransactionType).toBe('Payment');
    });

    it('normalizes transaction correctly for native transfer', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const normalised = tx.toNormalised();

      expect(normalised.chainAlias).toBe('xrp');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.from).toBe(fromAddress);
      expect(normalised.to).toBe(toAddress);
      expect(normalised.value).toBe('1000000');
      expect(normalised.fee?.value).toBe('12');
    });

    it('normalizes transaction correctly for token transfer', () => {
      const tx = buildIssuedCurrencyTransfer(
        config,
        fromAddress,
        toAddress,
        'USD',
        issuerAddress,
        '100',
        '12',
        1
      );
      const normalised = tx.toNormalised();

      expect(normalised.type).toBe('token-transfer');
      expect(normalised.value).toBe('100');
    });

    it('normalizes transaction correctly for trust set', () => {
      const tx = buildTrustSet(config, {
        from: fromAddress,
        currency: 'USD',
        issuer: issuerAddress,
        limit: '1000000',
        fee: '12',
        sequence: 1,
      });
      const normalised = tx.toNormalised();

      expect(normalised.type).toBe('approval');
      expect(normalised.to).toBe(issuerAddress);
      expect(normalised.value).toBe('1000000');
    });

    it('applies signature correctly', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const signature = '3045022100abcd1234';
      const signed = tx.applySignature([signature]);

      expect(signed).toBeInstanceOf(SignedXrpTransaction);
    });

    it('strips 0x prefix from signature', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const signed = tx.applySignature(['0x3045022100abcd1234']);

      const raw = signed.toRaw();
      expect(raw.TxnSignature).toBe('3045022100abcd1234');
    });

    it('throws when applying empty signature array', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      expect(() => tx.applySignature([])).toThrow('At least one signature is required');
    });

    it('rebuilds with new fee', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const rebuilt = tx.rebuild({ fee: '100' });

      const raw = rebuilt.toRaw();
      expect(raw.Fee).toBe('100');
    });

    it('rebuilds with new lastLedgerSequence', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1, 85000020);
      const rebuilt = tx.rebuild({ lastLedgerSequence: 85000050 });

      const raw = rebuilt.toRaw();
      expect(raw.LastLedgerSequence).toBe(85000050);
    });
  });

  describe('SignedXrpTransaction', () => {
    it('serializes with signature', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const signed = tx.applySignature(['signature123']);

      const serialized = signed.serialized;
      const parsed = JSON.parse(serialized);
      expect(parsed.TxnSignature).toBe('signature123');
    });

    it('converts to raw format', () => {
      const tx = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const signed = tx.applySignature(['signature123']);

      const raw = signed.toRaw();
      expect(raw._chain).toBe('xrp');
      expect(raw.TxnSignature).toBe('signature123');
    });
  });

  describe('parseTransaction', () => {
    it('parses serialized transaction', () => {
      const original = buildXrpTransfer(config, fromAddress, toAddress, 1000000n, '12', 1);
      const serialized = original.serialized;

      const parsed = parseTransaction(config, serialized);
      const raw = parsed.toRaw();

      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Account).toBe(fromAddress);
      expect(raw.Destination).toBe(toAddress);
      expect(raw.Amount).toBe('1000000');
    });
  });
});
