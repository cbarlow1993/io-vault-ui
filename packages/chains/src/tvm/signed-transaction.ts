// packages/chains/src/tvm/signed-transaction.ts

import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { TvmChainConfig } from './config.js';
import type { TvmTransactionData } from './transaction-builder.js';

// ============ Broadcast Response Types ============

interface BroadcastResponse {
  result?: boolean;
  code?: string;
  txid?: string;
  message?: string;
}

// ============ Signed TVM Transaction ============

export class SignedTvmTransaction implements SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  constructor(
    private readonly config: TvmChainConfig,
    private readonly txData: TvmTransactionData,
    private readonly signatures: string[]
  ) {
    this.chainAlias = config.chainAlias;
    this.hash = txData.txID;

    // Create signed transaction structure
    const signedData = {
      ...txData,
      signature: this.signatures,
    };
    this.serialized = JSON.stringify(signedData);
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    // TRON broadcast endpoint
    const broadcastUrl = `${url}/wallet/broadcasttransaction`;

    const signedTx = {
      txID: this.txData.txID,
      raw_data: {
        contract: this.txData.rawData.contract,
        ref_block_bytes: this.txData.rawData.refBlockBytes,
        ref_block_hash: this.txData.rawData.refBlockHash,
        expiration: this.txData.rawData.expiration,
        timestamp: this.txData.rawData.timestamp,
        fee_limit: this.txData.rawData.feeLimit,
      },
      raw_data_hex: this.txData.rawDataHex,
      signature: this.signatures,
    };

    try {
      const response = await fetch(broadcastUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedTx),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new RpcError(`Broadcast failed: ${errorText}`, this.chainAlias);
      }

      const result: BroadcastResponse = await response.json();

      if (!result.result) {
        const errorMessage = result.message
          ? Buffer.from(result.message, 'hex').toString('utf8')
          : result.code ?? 'Unknown error';
        return {
          hash: this.hash,
          success: false,
          error: errorMessage,
        };
      }

      return {
        hash: result.txid ?? this.hash,
        success: true,
      };
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        `Broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.chainAlias
      );
    }
  }

  /**
   * Get the transaction in format suitable for submission
   */
  toSubmitFormat(): {
    txID: string;
    raw_data: Record<string, unknown>;
    raw_data_hex: string;
    signature: string[];
  } {
    return {
      txID: this.txData.txID,
      raw_data: {
        contract: this.txData.rawData.contract,
        ref_block_bytes: this.txData.rawData.refBlockBytes,
        ref_block_hash: this.txData.rawData.refBlockHash,
        expiration: this.txData.rawData.expiration,
        timestamp: this.txData.rawData.timestamp,
        fee_limit: this.txData.rawData.feeLimit,
      },
      raw_data_hex: this.txData.rawDataHex,
      signature: this.signatures,
    };
  }

  /**
   * Get transaction receipt (after confirmation)
   */
  async getReceipt(
    rpcUrl?: string
  ): Promise<{
    id: string;
    blockNumber: number;
    blockTimeStamp: number;
    contractResult: string[];
    receipt: {
      energy_usage?: number;
      energy_fee?: number;
      net_usage?: number;
      result?: string;
    };
  } | null> {
    const url = rpcUrl ?? this.config.rpcUrl;
    const receiptUrl = `${url}/wallet/gettransactioninfobyid`;

    try {
      const response = await fetch(receiptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: this.hash }),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (!result.id) {
        return null; // Transaction not found or not confirmed
      }

      return {
        id: result.id,
        blockNumber: result.blockNumber,
        blockTimeStamp: result.blockTimeStamp,
        contractResult: result.contractResult ?? [],
        receipt: {
          energy_usage: result.receipt?.energy_usage,
          energy_fee: result.receipt?.energy_fee,
          net_usage: result.receipt?.net_usage,
          result: result.receipt?.result,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if transaction is confirmed
   */
  async isConfirmed(rpcUrl?: string): Promise<boolean> {
    const receipt = await this.getReceipt(rpcUrl);
    return receipt !== null && receipt.blockNumber > 0;
  }
}
