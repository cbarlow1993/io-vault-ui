# Build Transactions Feature Design

## Overview

Migrate the legacy Lambda-based build transaction endpoints to Fastify, maintaining the router pattern that dispatches to ecosystem-specific builders based on `ecosystem:chain` combination.

## Endpoints

Four endpoints registered under `vaultTransactionRoutes` (prefix: `/v1/vaults/:vaultId/transactions`):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ecosystem/:ecosystem/chain/:chainAlias/build-native-transaction` | Build native currency transfer (ETH, SOL, BTC, TRX, XRP, TAO) |
| POST | `/ecosystem/:ecosystem/chain/:chainAlias/build-token-transaction` | Build token transfer (ERC20, SPL, TRC20) - EVM, SVM, TVM only |
| POST | `/ecosystem/svm/chain/solana/build-durable-nonce-transaction` | Create Solana durable nonce account |
| GET | `/ecosystem/svm/chain/solana/durable-nonce` | Get Solana durable nonce account info |

### Path Parameters

- `vaultId` - From parent prefix, validated as non-empty string
- `ecosystem` - Enum: `evm`, `svm`, `utxo`, `tvm`, `xrp`, `substrate`
- `chainAlias` - Chain alias validated against ecosystem (e.g., `ethereum`, `polygon`, `solana`, `bitcoin`)

### Authorization

All routes require vault ownership verification using the same pattern as address handlers:
1. Get vault details from `VaultService`
2. Compare vault's `organisationId` with authenticated user's `organisationId`
3. Throw `OperationForbiddenError` if mismatch

## Architecture

```
src/
├── routes/transactions/build/
│   ├── index.ts           # Route registration
│   ├── handlers.ts        # Fastify request handlers
│   └── schemas.ts         # Zod schemas for validation
│
└── services/build-transaction/
    ├── index.ts           # Router logic
    ├── wallet-factory.ts  # Wallet instance creation
    └── builders/
        ├── evm.ts         # EVM transaction builder
        ├── svm.ts         # Solana transaction builder
        ├── svm-durable-nonce.ts  # Solana nonce account operations
        ├── utxo.ts        # Bitcoin transaction builder
        ├── utxo-mnee.ts   # MNEE transaction builder
        ├── tvm.ts         # Tron transaction builder
        ├── xrp.ts         # XRP transaction builder
        └── substrate.ts   # Bittensor transaction builder
```

### Request Flow

```
HTTP Request
    ↓
Route Handler (validates request, extracts params)
    ↓
Router (selects builder based on ecosystem:chain)
    ↓
WalletFactory (creates wallet from vault xpub)
    ↓
Ecosystem Builder (calls chain SDK)
    ↓
Response { marshalledHex, details }
```

## Request Schemas

### Common Body Fields

All build transaction endpoints share these base fields:

```typescript
{
  amount: string,           // Numeric string or "MAX"
  to: string,               // Recipient address
  derivationPath?: string   // Optional, e.g., "m/44/60/0/0/0"
}
```

### EVM-Specific Fields

```typescript
{
  gasPrice?: string,              // In GWEI (converted to WEI internally)
  gasLimit?: string,
  data?: string,                  // Hex calldata for contract interaction
  nonce?: number,
  type?: "legacy" | "eip1559",
  maxFeePerGas?: string,
  maxPriorityFeePerGas?: string
}
```

### SVM-Specific Fields

```typescript
{
  nonceAccount?: string   // For durable nonce transactions
}
```

### Token Transaction Fields (EVM/SVM/TVM)

```typescript
{
  tokenAddress: string    // Contract address (EVM/TVM) or mint address (SVM)
}
```

### UTXO-Specific Fields (Bitcoin)

```typescript
{
  feeRate?: number,                          // Satoshis per byte
  utxos?: Array<{txid, vout, value}>         // Optional UTXO selection
}
```

### Durable Nonce Build Request (SVM)

```typescript
{
  derivationPath?: string   // Optional derivation path
}
```

### Durable Nonce GET Query (SVM)

```typescript
{
  derivationPath?: string   // Optional derivation path
}
```

## Response Schema

All build endpoints return the same response structure:

```typescript
{
  marshalledHex: string,
  details: Array<{
    name: string,
    type: string,
    value: string
  }>
}
```

- `marshalledHex` - Serialized unsigned transaction ready for signing
- `details` - EIP-712 style array for transaction display in wallet UI

## WalletFactory Service

Creates wallet instances from vault data for use by transaction builders.

### Interface

```typescript
interface WalletFactoryResult<T extends IWalletLike> {
  wallet: T;
  chain: Chain;
}

class WalletFactory {
  constructor(private vaultService: VaultService) {}

  async createWallet<T extends IWalletLike>(
    vaultId: string,
    chainAlias: ChainAlias,
    derivationPath?: string
  ): Promise<WalletFactoryResult<T>>
}
```

### Flow

1. Get vault xpub via `VaultService.getVaultXpub(vaultId, chainAlias)`
2. Create chain instance via `Chain.fromAlias(chainAlias)`
3. Derive wallet from xpub using `Wallet.fromXpub(xpub, derivationPath)`
4. Return `{ wallet, chain }` tuple

### Registration

Added to Fastify's service container:

```typescript
server.services.walletFactory = new WalletFactory(server.services.vault);
```

### Error Handling

- `NotFoundError` - Vault or xpub not found
- `BadRequestError` - Chain not supported for vault's available curves

## Ecosystem Builders

### Interface

```typescript
interface BuildTransactionResult {
  marshalledHex: string;
  details: Array<{name: string, type: string, value: string}>;
}

interface NativeBuilder {
  buildNative(params: NativeParams): Promise<BuildTransactionResult>;
}

interface TokenBuilder {
  buildToken(params: TokenParams): Promise<BuildTransactionResult>;
}
```

### Builder Matrix

| Builder | File | Native | Token | Chains |
|---------|------|--------|-------|--------|
| EVM | `evm.ts` | Yes | Yes | ethereum, polygon, arbitrum, optimism, base, avalanche, bsc, etc. |
| SVM | `svm.ts` | Yes | Yes | solana |
| UTXO | `utxo.ts` | Yes | No | bitcoin |
| UTXO MNEE | `utxo-mnee.ts` | Yes | No | mnee |
| TVM | `tvm.ts` | Yes | Yes | tron |
| XRP | `xrp.ts` | Yes | No | xrp |
| Substrate | `substrate.ts` | Yes | No | bittensor |
| SVM Durable Nonce | `svm-durable-nonce.ts` | Special | No | solana |

### Builder Logic

1. Receive validated params + wallet + chain from router
2. Handle `MAX` amount calculation if applicable
3. Call chain SDK's `TransactionBuilder.buildNativeTransaction()` or `buildTokenTransaction()`
4. Marshal transaction to hex via `tx.marshalHex()`
5. Generate display details via `tx.toEIP712Details()`
6. Return `{ marshalledHex, details }`

### Error Mapping

Each builder defines a `knownErrors` map converting SDK errors to HTTP errors:

```typescript
const knownErrors = new Map<string, {status: number, message: string, path?: string[]}>([
  ['insufficient balance', { status: 400, message: 'Insufficient balance', path: ['amount'] }],
  ['invalid address', { status: 400, message: 'Invalid recipient address', path: ['to'] }],
  // ...
]);
```

- 400 errors for validation failures (user-correctable)
- 500 errors for internal/infrastructure failures

## Router Logic

### Builder Registry

```typescript
const nativeBuilders: Record<`${EcoSystem}:${ChainAlias}`, NativeBuilder> = {
  'evm:ethereum': evmBuilder,
  'evm:polygon': evmBuilder,
  'evm:arbitrum': evmBuilder,
  // ... all EVM chains
  'svm:solana': svmBuilder,
  'utxo:bitcoin': utxoBuilder,
  'utxo:mnee': mneeBuilder,
  'tvm:tron': tvmBuilder,
  'xrp:xrp': xrpBuilder,
  'substrate:bittensor': substrateBuilder,
};

const tokenBuilders: Record<`${EcoSystem}:${ChainAlias}`, TokenBuilder> = {
  // All EVM chains
  'evm:ethereum': evmBuilder,
  'evm:polygon': evmBuilder,
  // ...
  'svm:solana': svmBuilder,
  'tvm:tron': tvmBuilder,
};
```

### Router Function

```typescript
async function routeNativeTransaction(
  ecosystem: EcoSystem,
  chain: ChainAlias,
  params: NativeParams,
  walletFactory: WalletFactory
): Promise<BuildTransactionResult> {
  const key = `${ecosystem}:${chain}`;
  const builder = nativeBuilders[key];

  if (!builder) {
    throw new BadRequestError(`Unsupported ecosystem/chain: ${key}`);
  }

  const { wallet, chain: chainInstance } = await walletFactory.createWallet(
    params.vaultId,
    chain,
    params.derivationPath
  );

  return builder.buildNative({ ...params, wallet, chain: chainInstance });
}
```

## File Structure Summary

```
src/routes/transactions/build/
├── index.ts              # Route registration with Fastify
├── handlers.ts           # Request handlers calling router
└── schemas.ts            # Zod schemas (path, body, response)

src/services/build-transaction/
├── index.ts              # Router exports and builder registry
├── wallet-factory.ts     # WalletFactory class
├── types.ts              # Shared types and interfaces
└── builders/
    ├── evm.ts
    ├── svm.ts
    ├── svm-durable-nonce.ts
    ├── utxo.ts
    ├── utxo-mnee.ts
    ├── tvm.ts
    ├── xrp.ts
    └── substrate.ts
```

## Migration Notes

- Legacy code in `src/routes/transactions/legacy/` serves as reference
- Handlers adapted from Lambda event format to Fastify request/reply
- `wrapHttpHandler`/`wrapLambdaHandler` middleware replaced with Fastify schema validation
- `formatResponse()` replaced with `reply.status().send()`
- Error handling via Fastify error handler plugin (already configured)

## Testing Strategy

- Unit tests for each ecosystem builder
- Unit tests for WalletFactory
- Unit tests for router logic
- Integration tests for each endpoint with mocked chain SDK
- E2E tests against test vaults (if available)
