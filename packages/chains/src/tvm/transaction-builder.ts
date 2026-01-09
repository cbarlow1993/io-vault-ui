// packages/chains/src/tvm/transaction-builder.ts

import type {
  ChainAlias,
  SigningPayload,
  TransactionOverrides,
  TransactionType,
  TvmTransactionOverrides,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawTronTransaction,
} from '../core/interfaces.js';
import type { TvmChainConfig } from './config.js';
import { formatSun, addressToHex, hexToAddress, sha256, CONTRACT_TYPES, type ContractType } from './utils.js';
import { SignedTvmTransaction } from './signed-transaction.js';

// ============ TVM Transaction Data Interface ============

export interface TvmTransactionData {
  txID: string;
  rawData: {
    contract: Array<{
      type: ContractType;
      parameter: {
        value: Record<string, unknown>;
        type_url: string;
      };
    }>;
    refBlockBytes: string;
    refBlockHash: string;
    expiration: number;
    timestamp: number;
    feeLimit?: number;
  };
  rawDataHex: string;
}

// ============ Block Info Interface ============

export interface BlockInfo {
  blockID: string;
  block_header: {
    raw_data: {
      number: number;
      txTrieRoot: string;
      witness_address: string;
      parentHash: string;
      version: number;
      timestamp: number;
    };
    witness_signature: string;
  };
}

// ============ Unsigned TVM Transaction ============

export class UnsignedTvmTransaction implements UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: TvmTransactionData;
  readonly serialized: string;

  constructor(
    private readonly config: TvmChainConfig,
    txData: TvmTransactionData
  ) {
    this.chainAlias = config.chainAlias;
    this.raw = txData;
    this.serialized = JSON.stringify(txData);
  }

  rebuild(overrides: TransactionOverrides): UnsignedTvmTransaction {
    const tvmOverrides = overrides as TvmTransactionOverrides;
    const newTxData: TvmTransactionData = JSON.parse(this.serialized);

    if (tvmOverrides.feeLimit !== undefined) {
      newTxData.rawData.feeLimit = tvmOverrides.feeLimit;
    }

    if (tvmOverrides.permissionId !== undefined) {
      // Permission ID is typically in the contract parameter
      for (const contract of newTxData.rawData.contract) {
        contract.parameter.value.Permission_id = tvmOverrides.permissionId;
      }
    }

    return new UnsignedTvmTransaction(this.config, newTxData);
  }

  getSigningPayload(): SigningPayload {
    // TRON uses the txID as the signing message (SHA256 of rawData)
    return {
      chainAlias: this.chainAlias,
      data: [this.raw.txID],
      algorithm: 'secp256k1',
    };
  }

  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length === 0) {
      throw new Error('At least one signature is required');
    }

    return new SignedTvmTransaction(this.config, this.raw, signatures);
  }

  toNormalised(): NormalisedTransaction {
    const contract = this.raw.rawData.contract[0];
    if (!contract) {
      throw new Error('Transaction has no contract');
    }

    const type = this.classifyTransaction(contract.type);
    const { from, to, value } = this.extractTransferInfo(contract);

    const valueInSun = BigInt(value);
    const formattedValue = formatSun(valueInSun, this.config.nativeCurrency.decimals);

    return {
      chainAlias: this.chainAlias,
      hash: this.raw.txID,
      from,
      to,
      value: valueInSun.toString(),
      formattedValue,
      symbol: this.config.nativeCurrency.symbol,
      type,
      metadata: {
        isContractDeployment: contract.type === CONTRACT_TYPES.CREATE_SMART_CONTRACT,
      },
      ...(type === 'token-transfer' && this.extractTokenTransferInfo(contract)),
      ...(type === 'contract-call' && this.extractContractCallInfo(contract)),
    };
  }

  toRaw(): RawTronTransaction {
    return {
      _chain: 'tvm',
      txID: this.raw.txID,
      rawData: {
        contract: this.raw.rawData.contract.map((c) => ({
          type: c.type,
          parameter: {
            value: c.parameter.value,
            type_url: c.parameter.type_url,
          },
        })),
        refBlockBytes: this.raw.rawData.refBlockBytes,
        refBlockHash: this.raw.rawData.refBlockHash,
        expiration: this.raw.rawData.expiration,
        timestamp: this.raw.rawData.timestamp,
        feeLimit: this.raw.rawData.feeLimit,
      },
    };
  }

  // ============ Private Methods ============

  private classifyTransaction(contractType: string): TransactionType {
    switch (contractType) {
      case CONTRACT_TYPES.TRANSFER:
      case CONTRACT_TYPES.TRANSFER_ASSET:
        return 'native-transfer';
      case CONTRACT_TYPES.TRC20_TRANSFER:
        return this.isTrc20Transfer() ? 'token-transfer' : 'contract-call';
      case CONTRACT_TYPES.CREATE_SMART_CONTRACT:
        return 'contract-deployment';
      case CONTRACT_TYPES.TRIGGER_SMART_CONTRACT:
        return 'contract-call';
      default:
        return 'unknown';
    }
  }

  private isTrc20Transfer(): boolean {
    const contract = this.raw.rawData.contract[0];
    if (!contract || contract.type !== CONTRACT_TYPES.TRIGGER_SMART_CONTRACT) {
      return false;
    }

    const data = contract.parameter.value.data as string | undefined;
    if (!data) return false;

    // Check for transfer(address,uint256) selector
    return data.startsWith('a9059cbb');
  }

  private extractTransferInfo(contract: TvmTransactionData['rawData']['contract'][0]): {
    from: string;
    to: string | null;
    value: string;
  } {
    const value = contract.parameter.value;

    // Get owner (from) address
    const ownerHex = (value.owner_address as string) || '';
    const from = ownerHex ? hexToAddress(ownerHex) : '';

    // Get to address and amount based on contract type
    switch (contract.type) {
      case CONTRACT_TYPES.TRANSFER: {
        const toHex = (value.to_address as string) || '';
        const amount = (value.amount as number) || 0;
        return { from, to: toHex ? hexToAddress(toHex) : null, value: amount.toString() };
      }
      case CONTRACT_TYPES.TRIGGER_SMART_CONTRACT: {
        const contractHex = (value.contract_address as string) || '';
        return { from, to: contractHex ? hexToAddress(contractHex) : null, value: '0' };
      }
      case CONTRACT_TYPES.CREATE_SMART_CONTRACT: {
        return { from, to: null, value: '0' };
      }
      default: {
        return { from, to: null, value: '0' };
      }
    }
  }

  private extractTokenTransferInfo(
    contract: TvmTransactionData['rawData']['contract'][0]
  ): { tokenTransfer: NormalisedTransaction['tokenTransfer'] } | undefined {
    if (contract.type !== CONTRACT_TYPES.TRIGGER_SMART_CONTRACT) {
      return undefined;
    }

    const data = contract.parameter.value.data as string | undefined;
    if (!data || !data.startsWith('a9059cbb')) {
      return undefined;
    }

    // Decode transfer(address,uint256)
    const toHex = '41' + data.slice(32, 72);
    const amountHex = data.slice(72, 136);
    const amount = BigInt('0x' + amountHex);

    const contractHex = (contract.parameter.value.contract_address as string) || '';
    const ownerHex = (contract.parameter.value.owner_address as string) || '';

    return {
      tokenTransfer: {
        contractAddress: hexToAddress(contractHex),
        from: hexToAddress(ownerHex),
        to: hexToAddress(toHex),
        value: amount.toString(),
        formattedValue: amount.toString(), // Would need token decimals for proper formatting
        symbol: 'TRC20',
        decimals: 18, // Default, would need to fetch actual decimals
      },
    };
  }

  private extractContractCallInfo(
    contract: TvmTransactionData['rawData']['contract'][0]
  ): { contractCall: NormalisedTransaction['contractCall'] } | undefined {
    if (contract.type !== CONTRACT_TYPES.TRIGGER_SMART_CONTRACT) {
      return undefined;
    }

    const contractHex = (contract.parameter.value.contract_address as string) || '';
    const data = contract.parameter.value.data as string | undefined;

    return {
      contractCall: {
        contractAddress: hexToAddress(contractHex),
        selector: data?.slice(0, 8),
      },
    };
  }
}

// ============ Transaction Builder Helpers ============

/**
 * Build a TRX transfer transaction
 */
export function buildTrxTransfer(
  config: TvmChainConfig,
  from: string,
  to: string,
  amount: bigint,
  blockInfo: BlockInfo
): UnsignedTvmTransaction {
  const fromHex = from.startsWith('T') ? addressToHex(from) : from;
  const toHex = to.startsWith('T') ? addressToHex(to) : to;

  const timestamp = Date.now();
  const expiration = timestamp + 60 * 60 * 1000; // 1 hour expiration

  // Extract ref block info
  const blockHeight = blockInfo.block_header.raw_data.number;
  const blockHash = blockInfo.blockID;

  const refBlockBytes = blockHeight.toString(16).padStart(4, '0').slice(-4);
  const refBlockHash = blockHash.slice(16, 32);

  const txData: TvmTransactionData = {
    txID: '', // Will be computed
    rawData: {
      contract: [
        {
          type: CONTRACT_TYPES.TRANSFER,
          parameter: {
            value: {
              amount: Number(amount),
              owner_address: fromHex,
              to_address: toHex,
            },
            type_url: 'type.googleapis.com/protocol.TransferContract',
          },
        },
      ],
      refBlockBytes,
      refBlockHash,
      expiration,
      timestamp,
    },
    rawDataHex: '', // Would be computed from rawData
  };

  // Compute txID (SHA256 of rawData - simplified here)
  txData.txID = computeTransactionId(txData.rawData);

  return new UnsignedTvmTransaction(config, txData);
}

/**
 * Build a TRC20 transfer transaction
 */
export function buildTrc20Transfer(
  config: TvmChainConfig,
  from: string,
  to: string,
  contractAddress: string,
  amount: bigint,
  blockInfo: BlockInfo,
  feeLimit: number = 100_000_000 // 100 TRX default
): UnsignedTvmTransaction {
  const fromHex = from.startsWith('T') ? addressToHex(from) : from;
  const toHex = to.startsWith('T') ? addressToHex(to) : to;
  const contractHex = contractAddress.startsWith('T') ? addressToHex(contractAddress) : contractAddress;

  // Encode transfer(address,uint256) call
  const toParam = toHex.slice(2).padStart(64, '0'); // Remove 41 prefix, pad to 64 chars
  const amountParam = amount.toString(16).padStart(64, '0');
  const data = 'a9059cbb' + toParam + amountParam;

  const timestamp = Date.now();
  const expiration = timestamp + 60 * 60 * 1000;

  const blockHeight = blockInfo.block_header.raw_data.number;
  const blockHash = blockInfo.blockID;

  const refBlockBytes = blockHeight.toString(16).padStart(4, '0').slice(-4);
  const refBlockHash = blockHash.slice(16, 32);

  const txData: TvmTransactionData = {
    txID: '',
    rawData: {
      contract: [
        {
          type: CONTRACT_TYPES.TRIGGER_SMART_CONTRACT,
          parameter: {
            value: {
              data,
              owner_address: fromHex,
              contract_address: contractHex,
            },
            type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
          },
        },
      ],
      refBlockBytes,
      refBlockHash,
      expiration,
      timestamp,
      feeLimit,
    },
    rawDataHex: '',
  };

  txData.txID = computeTransactionId(txData.rawData);

  return new UnsignedTvmTransaction(config, txData);
}

/**
 * Compute transaction ID from raw data
 * Uses SHA256 hash of deterministic JSON serialization.
 * Note: TRON uses protobuf serialization for txID computation.
 * For full compatibility, protobuf serialization would be needed.
 */
function computeTransactionId(rawData: TvmTransactionData['rawData']): string {
  const dataStr = JSON.stringify(rawData, Object.keys(rawData).sort());
  const hash = sha256(Buffer.from(dataStr, 'utf8'));
  return hash.toString('hex');
}
