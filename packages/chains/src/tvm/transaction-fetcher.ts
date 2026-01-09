// packages/chains/src/tvm/transaction-fetcher.ts

import type { TvmChainAlias } from '../core/types.js';
import type {
  TransactionResult,
  TransactionStatus,
  NormalizedTransactionResult,
  RawTronTransactionResult,
  TokenTransferEvent,
  InternalTransaction,
} from '../core/types.js';
import {
  TransactionNotFoundError,
  InvalidTransactionHashError,
  RpcError,
} from '../core/errors.js';
import type { TvmChainConfig } from './config.js';
import { hexToAddress } from './utils.js';

// TRC20 Transfer event topic (same as ERC20)
const TRANSFER_TOPIC = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface TronTransaction {
  txID: string;
  raw_data: {
    contract: Array<{
      parameter: {
        value: {
          owner_address: string;
          to_address?: string;
          amount?: number;
          contract_address?: string;
          data?: string;
        };
        type_url: string;
      };
      type: string;
    }>;
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
  };
  raw_data_hex: string;
  signature: string[];
  ret?: Array<{ contractRet: string }>;
}

interface TronTransactionInfo {
  id: string;
  blockNumber: number;
  blockTimeStamp: number;
  contractResult: string[];
  receipt: {
    net_fee?: number;
    energy_fee?: number;
    energy_usage_total?: number;
    result?: string;
  };
  log?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  internal_transactions?: Array<{
    caller_address: string;
    transferTo_address: string;
    callValueInfo: Array<{ callValue: number }>;
    note?: string;
  }>;
}

export class TvmTransactionFetcher {
  constructor(
    private readonly config: TvmChainConfig,
    private readonly chainAlias: TvmChainAlias
  ) {}

  async getTransaction(hash: string): Promise<TransactionResult> {
    // Validate hash format
    this.validateTransactionHash(hash);

    // Fetch transaction and info in parallel
    const [transaction, info] = await Promise.all([
      this.fetchTransaction(hash),
      this.fetchTransactionInfo(hash),
    ]);

    if (!transaction || !transaction.txID) {
      throw new TransactionNotFoundError(this.chainAlias, hash);
    }

    // Build raw result
    const raw: RawTronTransactionResult = {
      _chain: 'tvm',
      transaction,
      info: info ?? {
        id: hash,
        blockNumber: 0,
        blockTimeStamp: 0,
        contractResult: [],
        receipt: {},
      },
    };

    // Parse token transfers from logs
    const tokenTransfers = info?.log ? this.parseTokenTransfers(info.log) : [];

    // Parse internal transactions
    const internalTransactions = info?.internal_transactions
      ? this.parseInternalTransactions(info.internal_transactions)
      : [];

    // Build normalized result
    const normalized = this.buildNormalizedResult(
      transaction,
      info,
      tokenTransfers,
      internalTransactions
    );

    return {
      chainAlias: this.chainAlias,
      raw,
      normalized,
    };
  }

  private validateTransactionHash(hash: string): void {
    // TRON txIDs are 64 hex characters (no 0x prefix)
    if (hash.length !== 64) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be 64 characters'
      );
    }

    // Must be valid hex (no 0x prefix for TRON)
    if (!/^[0-9a-fA-F]+$/.test(hash)) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be valid hexadecimal'
      );
    }
  }

  private async fetchTransaction(hash: string): Promise<TronTransaction | null> {
    const url = `${this.config.rpcUrl}/wallet/gettransactionbyid`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.auth?.apiKey && this.config.auth?.apiKeyHeader
            ? { [this.config.auth.apiKeyHeader]: this.config.auth.apiKey }
            : {}),
        },
        body: JSON.stringify({ value: hash }),
      });

      if (!response.ok) {
        throw new RpcError(`RPC request failed: ${response.statusText}`, this.chainAlias);
      }

      const result = await response.json();

      // Empty response means not found
      if (!result || Object.keys(result).length === 0) {
        return null;
      }

      return result as TronTransaction;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.chainAlias
      );
    }
  }

  private async fetchTransactionInfo(hash: string): Promise<TronTransactionInfo | null> {
    const url = `${this.config.rpcUrl}/wallet/gettransactioninfobyid`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.auth?.apiKey && this.config.auth?.apiKeyHeader
            ? { [this.config.auth.apiKeyHeader]: this.config.auth.apiKey }
            : {}),
        },
        body: JSON.stringify({ value: hash }),
      });

      if (!response.ok) {
        throw new RpcError(`RPC request failed: ${response.statusText}`, this.chainAlias);
      }

      const result = await response.json();

      // Empty response means not found or pending
      if (!result || Object.keys(result).length === 0) {
        return null;
      }

      return result as TronTransactionInfo;
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Failed to fetch transaction info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.chainAlias
      );
    }
  }

  private parseTokenTransfers(
    logs: NonNullable<TronTransactionInfo['log']>
  ): TokenTransferEvent[] {
    const transfers: TokenTransferEvent[] = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;
      if (log.topics.length === 0) continue;

      const topic0 = log.topics[0]!.toLowerCase();

      if (topic0 === TRANSFER_TOPIC && log.topics.length >= 3 && log.topics[1] && log.topics[2]) {
        // TRC20 Transfer(address indexed from, address indexed to, uint256 value)
        const fromHex = '41' + log.topics[1].slice(24); // Add TRON address prefix
        const toHex = '41' + log.topics[2].slice(24);

        const from = hexToAddress(fromHex);
        const to = hexToAddress(toHex);
        const value = BigInt('0x' + log.data).toString();

        // Contract address is in hex format, convert to base58
        const contractHex = '41' + log.address;
        const contractAddress = hexToAddress(contractHex);

        transfers.push({
          contractAddress,
          from,
          to,
          value,
          tokenType: 'trc20',
          logIndex: i,
        });
      }
    }

    return transfers;
  }

  private parseInternalTransactions(
    internalTxs: NonNullable<TronTransactionInfo['internal_transactions']>
  ): InternalTransaction[] {
    return internalTxs.map((tx, index) => {
      const from = hexToAddress(tx.caller_address);
      const to = hexToAddress(tx.transferTo_address);
      const value = tx.callValueInfo[0]?.callValue?.toString() ?? '0';

      return {
        from,
        to,
        value,
        type: 'call' as const,
        traceIndex: index,
      };
    });
  }

  private buildNormalizedResult(
    transaction: TronTransaction,
    info: TronTransactionInfo | null,
    tokenTransfers: TokenTransferEvent[],
    internalTransactions: InternalTransaction[]
  ): NormalizedTransactionResult {
    // Determine status
    let status: TransactionStatus;
    if (!info) {
      status = 'pending';
    } else if (info.receipt.result === 'SUCCESS' || !info.receipt.result) {
      // Check contract result as well
      const contractRet = transaction.ret?.[0]?.contractRet;
      if (contractRet === 'SUCCESS' || !contractRet) {
        status = 'confirmed';
      } else {
        status = 'failed';
      }
    } else {
      status = 'failed';
    }

    // Extract from/to from contract
    const contract = transaction.raw_data.contract[0];
    const ownerAddress = contract?.parameter?.value?.owner_address ?? '';
    const toAddress = contract?.parameter?.value?.to_address ?? contract?.parameter?.value?.contract_address ?? '';

    const from = ownerAddress ? hexToAddress(ownerAddress) : 'unknown';
    const to = toAddress ? hexToAddress(toAddress) : null;

    // Value
    const value = (contract?.parameter?.value?.amount ?? 0).toString();

    // Fee
    const netFee = info?.receipt?.net_fee ?? 0;
    const energyFee = info?.receipt?.energy_fee ?? 0;
    const fee = (netFee + energyFee).toString();

    // Timestamp
    const timestamp = info?.blockTimeStamp
      ? Math.floor(info.blockTimeStamp / 1000) // Convert from ms to seconds
      : Math.floor(transaction.raw_data.timestamp / 1000);

    // Block info
    const blockNumber = info?.blockNumber ?? null;

    return {
      hash: transaction.txID,
      status,
      blockNumber,
      blockHash: null, // TRON doesn't expose block hash in transaction info
      timestamp,
      from,
      to,
      value,
      fee,
      confirmations: status === 'confirmed' ? 1 : 0,
      finalized: status === 'confirmed',
      tokenTransfers,
      internalTransactions,
      hasFullTokenData: true,
      hasFullInternalData: !!info?.internal_transactions, // Only if we got internal txs
    };
  }
}
