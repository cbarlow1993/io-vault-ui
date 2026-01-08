// packages/chains/src/evm/transaction-builder.ts

import type {
  ChainAlias,
  SigningPayload,
  TransactionOverrides,
  TransactionType,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawEvmTransaction,
} from '../core/interfaces.js';
import type { EvmChainConfig } from './config.js';
import { formatUnits } from './utils.js';
import { SignedEvmTransaction } from './signed-transaction.js';

// ============ EVM Transaction Data Interface ============

export interface EvmTransactionData {
  type: 0 | 1 | 2;
  chainId: number;
  nonce: number;
  to: string | null;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
}

// ============ EVM Transaction Overrides for rebuild ============

interface EvmRebuildOverrides {
  nonce?: number;
  gasLimit?: bigint | string;
  gasPrice?: bigint | string;
  maxFeePerGas?: bigint | string;
  maxPriorityFeePerGas?: bigint | string;
}

// ============ Unsigned EVM Transaction ============

export class UnsignedEvmTransaction implements UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: EvmTransactionData;
  readonly serialized: string;

  constructor(
    private readonly config: EvmChainConfig,
    txData: EvmTransactionData
  ) {
    this.chainAlias = config.chainAlias;
    this.raw = txData;
    this.serialized = JSON.stringify(txData);
  }

  rebuild(overrides: TransactionOverrides): UnsignedEvmTransaction {
    const rebuildOverrides = overrides as EvmRebuildOverrides;
    const newTxData: EvmTransactionData = {
      ...this.raw,
    };

    // Helper to convert bigint or string to string
    const toStringValue = (value: bigint | string | undefined): string | undefined => {
      if (value === undefined) return undefined;
      return typeof value === 'bigint' ? value.toString() : value;
    };

    if (rebuildOverrides.nonce !== undefined) {
      newTxData.nonce = rebuildOverrides.nonce;
    }
    if (rebuildOverrides.gasLimit !== undefined) {
      newTxData.gasLimit = toStringValue(rebuildOverrides.gasLimit) ?? newTxData.gasLimit;
    }
    if (rebuildOverrides.gasPrice !== undefined) {
      newTxData.gasPrice = toStringValue(rebuildOverrides.gasPrice);
    }
    if (rebuildOverrides.maxFeePerGas !== undefined) {
      newTxData.maxFeePerGas = toStringValue(rebuildOverrides.maxFeePerGas);
    }
    if (rebuildOverrides.maxPriorityFeePerGas !== undefined) {
      newTxData.maxPriorityFeePerGas = toStringValue(rebuildOverrides.maxPriorityFeePerGas);
    }

    return new UnsignedEvmTransaction(this.config, newTxData);
  }

  getSigningPayload(): SigningPayload {
    // Compute the transaction hash that needs to be signed
    const hash = this.computeTransactionHash();

    return {
      chainAlias: this.chainAlias,
      data: [hash],
      algorithm: 'secp256k1',
    };
  }

  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length !== 1) {
      throw new Error('EVM transactions require exactly one signature');
    }

    const signature = signatures[0]!;

    // Validate signature format: must be hex string of correct length (65 bytes = 130 hex chars + 0x prefix)
    if (!signature.startsWith('0x') || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      throw new Error('Invalid EVM signature format: expected 65-byte hex string with 0x prefix');
    }

    return new SignedEvmTransaction(this.config, this.raw, signature);
  }

  toNormalised(): NormalisedTransaction {
    const type = this.classifyTransaction();
    const formattedValue = formatUnits(
      BigInt(this.raw.value),
      this.config.nativeCurrency.decimals
    );

    const normalised: NormalisedTransaction = {
      chainAlias: this.chainAlias,
      to: this.raw.to,
      value: this.raw.value,
      formattedValue,
      symbol: this.config.nativeCurrency.symbol,
      type,
      data: this.raw.data,
      metadata: {
        nonce: this.raw.nonce,
        isContractDeployment: type === 'contract-deployment',
      },
    };

    // Add contract call info if applicable
    if (type === 'contract-call' && this.raw.to) {
      normalised.contractCall = {
        contractAddress: this.raw.to,
        selector: this.raw.data.slice(0, 10),
      };
    }

    // Add token transfer info if applicable
    if ((type === 'token-transfer' || type === 'nft-transfer') && this.raw.to) {
      const decoded = this.decodeTransferData();
      if (decoded) {
        normalised.tokenTransfer = {
          contractAddress: this.raw.to,
          from: '', // Would need to be set by caller
          to: decoded.to,
          value: decoded.value,
          formattedValue: decoded.value, // Would need decimals to format properly
          symbol: '', // Would need to be fetched
          decimals: 18,
          tokenId: decoded.tokenId,
        };
      }
    }

    return normalised;
  }

  toRaw(): RawEvmTransaction {
    return {
      _chain: 'evm',
      ...this.raw,
    };
  }

  private classifyTransaction(): TransactionType {
    // Contract deployment: to is null
    if (this.raw.to === null) {
      return 'contract-deployment';
    }

    // Native transfer: no data or just '0x'
    if (!this.raw.data || this.raw.data === '0x') {
      return 'native-transfer';
    }

    const selector = this.raw.data.slice(0, 10).toLowerCase();

    // ERC20 transfer: transfer(address,uint256)
    if (selector === '0xa9059cbb') {
      return 'token-transfer';
    }

    // ERC20 transferFrom: transferFrom(address,address,uint256)
    if (selector === '0x23b872dd') {
      // Could be ERC20 transferFrom or ERC721 transferFrom
      // Check if value is 0 and data length suggests NFT
      return 'token-transfer';
    }

    // ERC721 safeTransferFrom: safeTransferFrom(address,address,uint256)
    if (selector === '0x42842e0e') {
      return 'nft-transfer';
    }

    // ERC721 safeTransferFrom with data: safeTransferFrom(address,address,uint256,bytes)
    if (selector === '0xb88d4fde') {
      return 'nft-transfer';
    }

    // ERC20 approve: approve(address,uint256)
    if (selector === '0x095ea7b3') {
      return 'approval';
    }

    // ERC721 setApprovalForAll: setApprovalForAll(address,bool)
    if (selector === '0xa22cb465') {
      return 'approval';
    }

    // Default to contract call for any other data
    return 'contract-call';
  }

  private decodeTransferData(): { to: string; value: string; tokenId?: string } | null {
    if (!this.raw.data || this.raw.data.length < 10) {
      return null;
    }

    const selector = this.raw.data.slice(0, 10).toLowerCase();
    const params = this.raw.data.slice(10);

    // Helper to safely parse hex to BigInt
    const safeHexToBigInt = (hex: string): bigint | null => {
      try {
        // Validate hex contains only valid characters
        if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
        return BigInt('0x' + hex);
      } catch {
        return null;
      }
    };

    // ERC20 transfer: transfer(address,uint256)
    if (selector === '0xa9059cbb' && params.length >= 128) {
      const to = '0x' + params.slice(24, 64);
      const value = safeHexToBigInt(params.slice(64, 128));
      if (value === null) return null;
      return { to, value: value.toString() };
    }

    // ERC20 transferFrom: transferFrom(address,address,uint256)
    if (selector === '0x23b872dd' && params.length >= 192) {
      const to = '0x' + params.slice(88, 128);
      const value = safeHexToBigInt(params.slice(128, 192));
      if (value === null) return null;
      return { to, value: value.toString() };
    }

    // ERC721 safeTransferFrom: safeTransferFrom(address,address,uint256)
    if (selector === '0x42842e0e' && params.length >= 192) {
      const to = '0x' + params.slice(88, 128);
      const tokenId = safeHexToBigInt(params.slice(128, 192));
      if (tokenId === null) return null;
      return { to, value: '1', tokenId: tokenId.toString() };
    }

    return null;
  }

  private computeTransactionHash(): string {
    // For now, return a placeholder hash based on serialized data
    // In production, this would use RLP encoding and keccak256
    // This is a simplified implementation that creates a deterministic hash
    const dataToHash = this.serialized;
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad to 64 characters (32 bytes)
    const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
    return '0x' + hexHash;
  }
}
