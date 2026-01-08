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
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  NormalisedTransaction,
  RawSolanaTransaction,
  RawTronTransaction,
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

  it('NativeTransferParams has required fields and optional overrides', () => {
    const params: NativeTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000000000000000',
      overrides: { gasLimit: '21000' },
    };
    expect(params.from).toBeDefined();
    expect(params.to).toBeDefined();
    expect(params.value).toBeDefined();
    expect(params.overrides).toBeDefined();
  });

  it('TokenTransferParams is flat with contractAddress and overrides', () => {
    const params: TokenTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000',
      contractAddress: '0xToken',
      overrides: { gasLimit: '50000' },
    };
    expect(params.contractAddress).toBe('0xToken');
    expect(params.overrides).toBeDefined();
  });

  it('ContractReadParams has data-based interface', () => {
    const params: ContractReadParams = {
      contractAddress: '0xContract',
      data: '0x70a08231',
      from: '0xCaller',
    };
    expect(params.contractAddress).toBe('0xContract');
    expect(params.data).toBe('0x70a08231');
    expect(params.from).toBe('0xCaller');
  });

  it('ContractReadResult returns data string', () => {
    const result: ContractReadResult = {
      data: '0x0000000000000000000000000000000000000000000000000000000000000001',
    };
    expect(result.data).toBeDefined();
  });

  it('ContractCallParams has data-based interface with overrides', () => {
    const params: ContractCallParams = {
      from: '0xCaller',
      contractAddress: '0xContract',
      data: '0xa9059cbb',
      value: '0',
      overrides: { gasLimit: '100000' },
    };
    expect(params.from).toBe('0xCaller');
    expect(params.contractAddress).toBe('0xContract');
    expect(params.data).toBe('0xa9059cbb');
    expect(params.overrides).toBeDefined();
  });

  it('ContractDeployParams has bytecode and constructorArgs', () => {
    const params: ContractDeployParams = {
      from: '0xDeployer',
      bytecode: '0x608060405234801561001057600080fd5b50',
      constructorArgs: '0x000000000000000000000000000000000000000000000000000000000000000a',
      value: '0',
      overrides: { gasLimit: '1000000' },
    };
    expect(params.from).toBe('0xDeployer');
    expect(params.bytecode).toBeDefined();
    expect(params.constructorArgs).toBeDefined();
    expect(params.overrides).toBeDefined();
  });

  it('DeployedContract has transaction and expectedAddress', () => {
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
        to: null,
        value: '0',
        formattedValue: '0',
        symbol: 'ETH',
        type: 'contract-deployment',
        metadata: { isContractDeployment: true },
      }),
    };

    const deployed: DeployedContract = {
      transaction: mockTx,
      expectedAddress: '0xExpectedContractAddress',
    };
    expect(deployed.transaction).toBe(mockTx);
    expect(deployed.expectedAddress).toBe('0xExpectedContractAddress');
  });

  it('NormalisedTransaction has all spec fields', () => {
    const tx: NormalisedTransaction = {
      chainAlias: 'ethereum',
      to: '0xRecipient',
      from: '0xSender',
      value: '1000000000000000000',
      formattedValue: '1.0',
      symbol: 'ETH',
      type: 'token-transfer',
      hash: '0xabcdef123456',
      fee: {
        value: '21000000000000',
        formattedValue: '0.000021',
        symbol: 'ETH',
      },
      tokenTransfer: {
        contractAddress: '0xToken',
        from: '0xSender',
        to: '0xRecipient',
        value: '1000000',
        formattedValue: '1.0',
        symbol: 'USDC',
        decimals: 6,
        tokenId: undefined,
      },
      contractCall: {
        contractAddress: '0xContract',
        method: 'transfer',
        selector: '0xa9059cbb',
      },
      outputs: [
        { address: '0xRecipient', value: '1000000', formattedValue: '1.0' },
        { address: null, value: '0', formattedValue: '0' },
      ],
      metadata: {
        isContractDeployment: false,
        nonce: 42,
        sequence: 1,
        memo: 'test memo',
        inputCount: 1,
        outputCount: 2,
      },
    };
    expect(tx.hash).toBe('0xabcdef123456');
    expect(tx.fee).toBeDefined();
    expect(tx.tokenTransfer).toBeDefined();
    expect(tx.contractCall).toBeDefined();
    expect(tx.outputs).toHaveLength(2);
    expect(tx.metadata.nonce).toBe(42);
  });

  it('RawSolanaTransaction uses svm discriminator and version', () => {
    const raw: RawSolanaTransaction = {
      _chain: 'svm',
      version: 'legacy',
      recentBlockhash: 'blockhash123',
      feePayer: 'payer123',
      instructions: [
        {
          programId: 'program123',
          accounts: [
            { pubkey: 'account1', isSigner: true, isWritable: true },
          ],
          data: 'base64data',
        },
      ],
      signatures: ['sig1'],
    };
    expect(raw._chain).toBe('svm');
    expect(raw.version).toBe('legacy');
    expect(raw.instructions[0].accounts).toBeDefined();
  });

  it('RawTronTransaction uses tvm discriminator with camelCase fields', () => {
    const raw: RawTronTransaction = {
      _chain: 'tvm',
      txID: 'txid123',
      rawData: {
        contract: [],
        refBlockBytes: '0000',
        refBlockHash: '00000000',
        expiration: 1234567890,
        timestamp: 1234567890,
        feeLimit: 1000000,
      },
      signature: ['sig1'],
    };
    expect(raw._chain).toBe('tvm');
    expect(raw.rawData.refBlockBytes).toBe('0000');
    expect(raw.rawData.refBlockHash).toBe('00000000');
    expect(raw.signature).toEqual(['sig1']);
  });

  it('ITransactionBuilder has synchronous decode and parameterless estimateFee', () => {
    // Type-level validation - just checking that the interface compiles correctly
    const mockBuilder: ITransactionBuilder = {
      buildNativeTransfer: async () => ({} as UnsignedTransaction),
      buildTokenTransfer: async () => ({} as UnsignedTransaction),
      estimateFee: async () => ({ baseFee: '21000', priorityFee: '1000000000', totalFee: '21000000000000' }),
      estimateGas: async () => '21000',
      decode: (serialized, format) => {
        if (format === 'raw') {
          return {
            _chain: 'evm',
            type: 2,
            chainId: 1,
            nonce: 0,
            to: null,
            value: '0',
            data: '0x',
            gasLimit: '21000',
          } as const;
        }
        return {
          chainAlias: 'ethereum',
          to: null,
          value: '0',
          formattedValue: '0',
          symbol: 'ETH',
          type: 'native-transfer',
          metadata: { isContractDeployment: false },
        } as const;
      },
    };
    expect(typeof mockBuilder.decode).toBe('function');
    expect(typeof mockBuilder.estimateGas).toBe('function');
    expect(typeof mockBuilder.estimateFee).toBe('function');
  });

  it('IContractInteraction has renamed methods', () => {
    // Type-level validation - just checking that the interface compiles correctly
    const mockContract: IContractInteraction = {
      contractRead: async () => ({ data: '0x' }),
      contractCall: async () => ({} as UnsignedTransaction),
      contractDeploy: async () => ({ transaction: {} as UnsignedTransaction, expectedAddress: '0x' }),
    };
    expect(typeof mockContract.contractRead).toBe('function');
    expect(typeof mockContract.contractCall).toBe('function');
    expect(typeof mockContract.contractDeploy).toBe('function');
  });

  it('IBalanceFetcher does not have getTokenBalances method', () => {
    const mockFetcher: IBalanceFetcher = {
      getNativeBalance: async () => ({ value: '1000000000000000000', formattedValue: '1.0', symbol: 'ETH', decimals: 18 }),
      getTokenBalance: async () => ({ contractAddress: '0x', value: '1000000', formattedValue: '1.0', symbol: 'USDC', decimals: 6 }),
    };
    expect(typeof mockFetcher.getNativeBalance).toBe('function');
    expect(typeof mockFetcher.getTokenBalance).toBe('function');
    // Ensure getTokenBalances is NOT in the interface
    expect((mockFetcher as Record<string, unknown>)['getTokenBalances']).toBeUndefined();
  });
});
