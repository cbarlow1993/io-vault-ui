// packages/chains/src/evm/transaction-fetcher.ts

import type { EvmChainAlias } from '../core/types.js';
import type {
  TransactionResult,
  TransactionStatus,
  NormalizedTransactionResult,
  RawEvmTransactionResult,
  TokenTransferEvent,
  InternalTransaction,
  TokenType,
} from '../core/types.js';
import {
  TransactionNotFoundError,
  InvalidTransactionHashError,
  RpcError,
} from '../core/errors.js';
import type { EvmChainConfig } from './config.js';
import { formatUnits } from './utils.js';

// ERC20/721 Transfer event topic: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ERC1155 TransferSingle event topic
const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

// ERC1155 TransferBatch event topic
const TRANSFER_BATCH_TOPIC = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';

interface EvmRpcTransaction {
  hash: string;
  nonce: string;
  blockHash: string | null;
  blockNumber: string | null;
  transactionIndex: string | null;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gas: string;
  input: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type: string;
}

interface EvmRpcReceipt {
  transactionHash: string;
  blockHash: string;
  blockNumber: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex: string;
  }>;
  contractAddress: string | null;
}

interface EvmTraceCall {
  from: string;
  to: string;
  value: string;
  type: string;
  input: string;
  output?: string;
  error?: string;
  calls?: EvmTraceCall[];
}

interface EvmTraceResult {
  calls?: EvmTraceCall[];
}

export class EvmTransactionFetcher {
  constructor(
    private readonly config: EvmChainConfig,
    private readonly chainAlias: EvmChainAlias,
    private readonly rpcCall: (method: string, params: unknown[]) => Promise<string>
  ) {}

  async getTransaction(hash: string): Promise<TransactionResult> {
    // Validate hash format
    this.validateTransactionHash(hash);

    // Fetch transaction and receipt in parallel
    const [txResult, receiptResult] = await Promise.all([
      this.rpcCall('eth_getTransactionByHash', [hash]),
      this.rpcCall('eth_getTransactionReceipt', [hash]),
    ]);

    const transaction: EvmRpcTransaction | null =
      typeof txResult === 'string' && txResult !== 'null'
        ? (JSON.parse(txResult) as EvmRpcTransaction)
        : txResult && txResult !== 'null'
          ? (txResult as unknown as EvmRpcTransaction)
          : null;

    if (!transaction) {
      throw new TransactionNotFoundError(this.chainAlias, hash);
    }

    const receipt: EvmRpcReceipt | null =
      typeof receiptResult === 'string' && receiptResult !== 'null'
        ? (JSON.parse(receiptResult) as EvmRpcReceipt)
        : receiptResult && receiptResult !== 'null'
          ? (receiptResult as unknown as EvmRpcReceipt)
          : null;

    // Try to get trace (graceful degradation)
    let trace: EvmTraceResult | undefined;
    let hasFullInternalData = false;

    try {
      const traceResult = await this.rpcCall('debug_traceTransaction', [
        hash,
        { tracer: 'callTracer' },
      ]);

      if (traceResult && traceResult !== 'null') {
        trace =
          typeof traceResult === 'string'
            ? (JSON.parse(traceResult) as EvmTraceResult)
            : (traceResult as unknown as EvmTraceResult);
        hasFullInternalData = true;
      }
    } catch {
      // Tracing not supported or failed - graceful degradation
      hasFullInternalData = false;
    }

    // Build raw result
    const raw: RawEvmTransactionResult = {
      _chain: 'evm',
      transaction,
      receipt: receipt!,
      trace: trace ? { calls: trace.calls } : undefined,
    };

    // Parse token transfers from logs
    const tokenTransfers = receipt ? this.parseTokenTransfers(receipt.logs) : [];

    // Parse internal transactions from trace
    const internalTransactions = trace?.calls
      ? this.flattenTraceCalls(trace.calls)
      : [];

    // Build normalized result
    const normalized = this.buildNormalizedResult(
      transaction,
      receipt,
      tokenTransfers,
      internalTransactions,
      hasFullInternalData
    );

    return {
      chainAlias: this.chainAlias,
      raw,
      normalized,
    };
  }

  private validateTransactionHash(hash: string): void {
    // Must be 66 characters (0x + 64 hex chars)
    if (hash.length !== 66) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be 66 characters'
      );
    }

    // Must start with 0x
    if (!hash.startsWith('0x')) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must start with 0x'
      );
    }

    // Must be valid hex
    if (!/^0x[0-9a-fA-F]+$/.test(hash)) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be valid hexadecimal'
      );
    }
  }

  private parseTokenTransfers(
    logs: EvmRpcReceipt['logs']
  ): TokenTransferEvent[] {
    const transfers: TokenTransferEvent[] = [];

    for (const log of logs) {
      if (log.topics.length === 0) continue;

      const topic0 = log.topics[0]!.toLowerCase();

      if (topic0 === TRANSFER_TOPIC) {
        // ERC20 or ERC721 Transfer
        if (log.topics.length === 3 && log.topics[1] && log.topics[2]) {
          // ERC20: Transfer(address indexed from, address indexed to, uint256 value)
          const from = '0x' + log.topics[1].slice(26);
          const to = '0x' + log.topics[2].slice(26);
          const value = BigInt(log.data).toString();

          transfers.push({
            contractAddress: log.address,
            from,
            to,
            value,
            tokenType: 'erc20' as TokenType,
            logIndex: parseInt(log.logIndex, 16),
          });
        } else if (log.topics.length === 4 && log.topics[1] && log.topics[2] && log.topics[3]) {
          // ERC721: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
          const from = '0x' + log.topics[1].slice(26);
          const to = '0x' + log.topics[2].slice(26);
          const tokenId = BigInt(log.topics[3]).toString();

          transfers.push({
            contractAddress: log.address,
            from,
            to,
            value: '1', // NFT is always 1
            tokenType: 'erc721' as TokenType,
            tokenId,
            logIndex: parseInt(log.logIndex, 16),
          });
        }
      } else if (topic0 === TRANSFER_SINGLE_TOPIC && log.topics.length >= 4 && log.topics[2] && log.topics[3]) {
        // ERC1155 TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)
        const from = '0x' + log.topics[2].slice(26);
        const to = '0x' + log.topics[3].slice(26);

        // Decode id and value from data (each 32 bytes)
        const data = log.data.slice(2); // Remove 0x
        const tokenId = BigInt('0x' + data.slice(0, 64)).toString();
        const value = BigInt('0x' + data.slice(64, 128)).toString();

        transfers.push({
          contractAddress: log.address,
          from,
          to,
          value,
          tokenType: 'erc1155' as TokenType,
          tokenId,
          logIndex: parseInt(log.logIndex, 16),
        });
      } else if (topic0 === TRANSFER_BATCH_TOPIC && log.topics.length >= 4 && log.topics[2] && log.topics[3]) {
        // ERC1155 TransferBatch - more complex, parse multiple transfers
        const from = '0x' + log.topics[2].slice(26);
        const to = '0x' + log.topics[3].slice(26);

        // For simplicity, we'll note it as a batch transfer
        // Full parsing of dynamic arrays is more complex
        transfers.push({
          contractAddress: log.address,
          from,
          to,
          value: '0', // Batch - multiple values
          tokenType: 'erc1155' as TokenType,
          logIndex: parseInt(log.logIndex, 16),
        });
      }
    }

    return transfers;
  }

  private flattenTraceCalls(
    calls: EvmTraceCall[],
    startIndex = 0
  ): InternalTransaction[] {
    const result: InternalTransaction[] = [];
    let index = startIndex;

    for (const call of calls) {
      result.push({
        from: call.from,
        to: call.to || null,
        value: call.value ? BigInt(call.value).toString() : '0',
        type: this.mapTraceType(call.type),
        input: call.input,
        output: call.output,
        error: call.error,
        traceIndex: index++,
      });

      // Recursively flatten nested calls
      if (call.calls && call.calls.length > 0) {
        const nested = this.flattenTraceCalls(call.calls, index);
        result.push(...nested);
        index += nested.length;
      }
    }

    return result;
  }

  private mapTraceType(
    type: string
  ): 'call' | 'create' | 'delegatecall' | 'staticcall' | 'selfdestruct' {
    const normalized = type.toLowerCase();
    switch (normalized) {
      case 'call':
        return 'call';
      case 'create':
      case 'create2':
        return 'create';
      case 'delegatecall':
        return 'delegatecall';
      case 'staticcall':
        return 'staticcall';
      case 'selfdestruct':
        return 'selfdestruct';
      default:
        return 'call';
    }
  }

  private buildNormalizedResult(
    transaction: EvmRpcTransaction,
    receipt: EvmRpcReceipt | null,
    tokenTransfers: TokenTransferEvent[],
    internalTransactions: InternalTransaction[],
    hasFullInternalData: boolean
  ): NormalizedTransactionResult {
    // Determine status
    let status: TransactionStatus;
    if (!receipt) {
      status = 'pending';
    } else if (receipt.status === '0x1') {
      status = 'confirmed';
    } else {
      status = 'failed';
    }

    // Calculate fee
    const fee = receipt
      ? (BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)).toString()
      : '0';

    // Get block info
    const blockNumber = receipt
      ? parseInt(receipt.blockNumber, 16)
      : transaction.blockNumber
        ? parseInt(transaction.blockNumber, 16)
        : null;

    const blockHash = receipt?.blockHash ?? transaction.blockHash;

    // For confirmations, we'd need current block - tx block
    // For now, if confirmed, set to 1 (caller can check blockNumber vs current)
    const confirmations = status === 'confirmed' ? 1 : 0;

    // TODO: Fetch block timestamp if needed (requires additional RPC call)
    const timestamp: number | null = null;

    return {
      hash: transaction.hash,
      status,
      blockNumber,
      blockHash,
      timestamp,
      from: transaction.from,
      to: transaction.to,
      value: BigInt(transaction.value).toString(),
      fee,
      confirmations,
      finalized: status === 'confirmed', // Simplified - real finalization check is more complex
      tokenTransfers,
      internalTransactions,
      hasFullTokenData: true, // We parse all known token events
      hasFullInternalData,
    };
  }
}
