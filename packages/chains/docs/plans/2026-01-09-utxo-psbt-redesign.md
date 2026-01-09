# UTXO/Bitcoin PSBT Redesign

**Date:** 2026-01-09
**Status:** Approved

## Overview

Redesign the UTXO/Bitcoin chain integration to use proper BIP-174 PSBT format with correct sighash computation, replacing the current broken implementation.

## Requirements

- **PSBT format** for transaction construction (BIP-174)
- **MPC signing workflow** with 64-byte `r||s` signature input
- **Address types:** P2WPKH (bc1q...) and P2TR (bc1p...)
- **Signature schemes:** ECDSA (P2WPKH) and Schnorr (P2TR)
- **RBF support** enabled by default
- **Custom fees** via feeRate or absoluteFee
- **Blockbook API** backend (replaces Esplora)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UtxoChainProvider                         │
├─────────────────────────────────────────────────────────────────┤
│  buildNativeTransfer(from, to, value, publicKey)                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │ BlockbookClient │───▶│ Fetch UTXOs with │                    │
│  │                 │    │ scriptPubKey     │                    │
│  └─────────────────┘    └──────────────────┘                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │  PSBT Builder   │  ← @iofinnet/bitcoinjs-lib Psbt class      │
│  │  - Add inputs   │                                            │
│  │  - Add outputs  │                                            │
│  │  - Set witness  │                                            │
│  └─────────────────┘                                            │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ UnsignedUtxoTransaction                 │                    │
│  │  - getSigningPayload() → sighashes      │ ──▶ To MPC        │
│  │  - applySignature(r||s[]) → signed      │ ◀── From MPC      │
│  └─────────────────────────────────────────┘                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ SignedUtxoTransaction                   │                    │
│  │  - Finalized PSBT → raw tx hex          │                    │
│  │  - broadcast() → txid                   │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Structures

### Extended Transfer Params

```typescript
interface UtxoNativeTransferParams extends NativeTransferParams {
  publicKey: string;  // 33-byte compressed pubkey (hex)
}
```

### Enhanced UTXO Type

```typescript
interface UTXO {
  txid: string;
  vout: number;
  value: bigint;
  scriptPubKey: string;    // From Blockbook
  address: string;
  confirmations: number;
  path?: string;           // Optional derivation path
}
```

### Transaction Overrides

```typescript
interface UtxoTransactionOverrides {
  feeRate?: number;        // sat/vB
  absoluteFee?: bigint;    // Exact fee (takes precedence)
  rbf?: boolean;           // Enable RBF (default: true)
  utxos?: UTXO[];          // Override UTXO selection
  changeAddress?: string;  // Custom change address
}
```

## Components

### BlockbookClient

API client for Blockbook JSON-RPC:

- `getUtxos(address)` - GET /api/v2/utxo/:address
- `getAddressInfo(address)` - GET /api/v2/address/:address
- `broadcastTransaction(txHex)` - POST /api/v2/sendtx
- `estimateFee(blocks)` - GET /api/v2/estimatefee/:blocks

Features:
- Retry with exponential backoff (3 attempts)
- 10s request timeout
- Structured error types

### PsbtBuilder

Wraps `@iofinnet/bitcoinjs-lib` Psbt class:

- `addInput(utxo, publicKey, rbf)` - Add P2WPKH or P2TR input
- `addOutput(address, value)` - Add output
- `getSighashes()` - Extract BIP143/BIP341 sighashes for MPC
- `toPsbt()` - Return underlying Psbt instance

### SignatureApplier

Converts MPC signatures to Bitcoin format:

- `toDER(signature)` - Convert 64-byte r||s to DER + sighash byte
- `applyEcdsaSignature(psbt, index, sig, pubkey)` - For P2WPKH
- `applySchnorrSignature(psbt, index, sig)` - For P2TR (raw 64 bytes)

### UnsignedUtxoTransaction

Implements `UnsignedTransaction` interface:

- `getSigningPayload()` - Returns sighashes for each input
- `applySignature(signatures)` - Creates SignedUtxoTransaction
- `rebuild(overrides)` - Clone with modified parameters
- `toNormalised()` / `toRaw()` - Serialization formats

### SignedUtxoTransaction

Implements `SignedTransaction` interface:

- Finalizes PSBT and extracts raw transaction hex
- Computes proper txid (double-SHA256)
- `broadcast(rpcUrl?)` - Submit via Blockbook

## Sighash Computation

| Address Type | BIP | Method | Hash Size |
|--------------|-----|--------|-----------|
| P2WPKH | BIP143 | `psbt.getHashForSig(index, SIGHASH_ALL)` | 32 bytes |
| P2TR | BIP341 | `psbt.getTaprootHashForSig(index)` | 32 bytes |

## Signature Formats

| Type | Input (from MPC) | Output (for witness) |
|------|------------------|----------------------|
| ECDSA | 64-byte r\|\|s | DER-encoded + 0x01 sighash byte |
| Schnorr | 64-byte signature | Raw 64 bytes (SIGHASH_DEFAULT implicit) |

## Configuration

```typescript
const UTXO_CHAIN_CONFIGS = {
  bitcoin: {
    chainAlias: 'bitcoin',
    network: 'mainnet',
    rpcUrl: 'https://attentive-attentive-liquid.btc.quiknode.pro/de06a76c6f93fa3c0614ded00a2f332963620310/',
    nativeCurrency: { symbol: 'BTC', decimals: 8 },
    bech32Prefix: 'bc',
    dustLimit: 546,
    taprootSupported: true,
  },
  // ... testnet, mnee
};
```

## Error Types

- `InsufficientFundsError` - Not enough UTXOs
- `UtxoSelectionError` - UTXO selection failed
- `SignatureError` - Invalid signature format or count
- `PsbtError` - PSBT construction/finalization failed
- `BlockbookError` - API errors with status code

## File Structure

```
src/utxo/
├── index.ts                 # MODIFY - update exports
├── config.ts                # MODIFY - add taprootSupported, update URLs
├── errors.ts                # CREATE - error classes
├── blockbook-client.ts      # CREATE - Blockbook API
├── psbt-builder.ts          # CREATE - PSBT construction
├── signature-applier.ts     # CREATE - signature conversion
├── provider.ts              # REWRITE - PSBT flow
├── transaction-builder.ts   # REWRITE - UnsignedUtxoTransaction
├── signed-transaction.ts    # REWRITE - SignedUtxoTransaction
├── balance.ts               # MODIFY - use BlockbookClient
└── utils.ts                 # MODIFY - keep unit conversion only
```

## Dependencies

```json
{
  "@iofinnet/bitcoinjs-lib": "^6.x.x",
  "tiny-secp256k1": "^2.2.3"
}
```

## Implementation Order

1. Add dependencies
2. Create `errors.ts`
3. Create `blockbook-client.ts`
4. Create `psbt-builder.ts`
5. Create `signature-applier.ts`
6. Rewrite `transaction-builder.ts`
7. Rewrite `signed-transaction.ts`
8. Rewrite `provider.ts`
9. Update `balance.ts`
10. Update `config.ts`
11. Update `index.ts`
12. Update tests
