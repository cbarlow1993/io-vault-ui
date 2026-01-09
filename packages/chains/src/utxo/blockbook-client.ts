// packages/chains/src/utxo/blockbook-client.ts

import type { UtxoChainAlias, RpcAuth } from '../core/types.js';
import { buildAuthHeaders } from '../core/utils.js';
import { BlockbookError } from './errors.js';

// ============ Blockbook API Response Types ============

export interface BlockbookUtxo {
  txid: string;
  vout: number;
  value: string;
  height?: number;
  confirmations: number;
  scriptPubKey?: string;
  address?: string;
  path?: string;
}

export interface BlockbookAddressInfo {
  address: string;
  balance: string;
  unconfirmedBalance: string;
  totalReceived: string;
  totalSent: string;
  txs: number;
  unconfirmedTxs: number;
}

export interface BlockbookFeeEstimate {
  result: string; // Fee rate in sat/vB as string
}

export interface BlockbookBroadcastResult {
  result: string; // txid
}

// ============ Internal UTXO Type ============

export interface UTXO {
  txid: string;
  vout: number;
  value: bigint;
  scriptPubKey: string;
  address: string;
  confirmations: number;
  path?: string;
}

// ============ Blockbook Client ============

export class BlockbookClient {
  private readonly baseUrl: string;
  private readonly chainAlias: UtxoChainAlias;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;

  constructor(
    baseUrl: string,
    chainAlias: UtxoChainAlias,
    options?: { maxRetries?: number; timeoutMs?: number; auth?: RpcAuth }
  ) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.chainAlias = chainAlias;
    this.maxRetries = options?.maxRetries ?? 3;
    this.timeoutMs = options?.timeoutMs ?? 10000;
    this.headers = {
      Accept: 'application/json',
      ...buildAuthHeaders(options?.auth),
    };
  }

  /**
   * Get UTXOs for an address
   * GET /api/v2/utxo/:address
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    const endpoint = `/api/v2/utxo/${address}`;
    const data = await this.fetchWithRetry<BlockbookUtxo[]>(endpoint);

    return data.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: BigInt(utxo.value),
      scriptPubKey: utxo.scriptPubKey ?? '',
      address: utxo.address ?? address,
      confirmations: utxo.confirmations,
      path: utxo.path,
    }));
  }

  /**
   * Get address info (balance, tx count, etc.)
   * GET /api/v2/address/:address
   */
  async getAddressInfo(address: string): Promise<BlockbookAddressInfo> {
    const endpoint = `/api/v2/address/${address}`;
    return this.fetchWithRetry<BlockbookAddressInfo>(endpoint);
  }

  /**
   * Broadcast a signed transaction
   * GET /api/v2/sendtx/:txhex (Blockbook uses GET for broadcast)
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    const endpoint = `/api/v2/sendtx/${txHex}`;
    const result = await this.fetchWithRetry<BlockbookBroadcastResult>(endpoint);
    return result.result;
  }

  /**
   * Estimate fee rate for confirmation in N blocks
   * GET /api/v2/estimatefee/:blocks
   * Returns sat/vB
   */
  async estimateFee(blocks: number): Promise<number> {
    const endpoint = `/api/v2/estimatefee/${blocks}`;
    const result = await this.fetchWithRetry<BlockbookFeeEstimate>(endpoint);

    // Blockbook returns BTC/kB, convert to sat/vB
    const btcPerKb = parseFloat(result.result);
    if (btcPerKb <= 0) {
      // Fallback to minimum fee rate if estimation fails
      return 1;
    }

    // BTC/kB to sat/vB: multiply by 100000 (sat/BTC) / 1000 (vB/kB) = 100
    const satPerVb = Math.ceil(btcPerKb * 100000);
    return satPerVb;
  }

  /**
   * Get transaction details by txid
   * GET /api/v2/tx/:txid
   */
  async getTransaction(txid: string): Promise<unknown> {
    const endpoint = `/api/v2/tx/${txid}`;
    return this.fetchWithRetry(endpoint);
  }

  /**
   * Fetch with retry and exponential backoff
   */
  private async fetchWithRetry<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...this.headers,
            ...options?.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new BlockbookError(
            `HTTP ${response.status}: ${errorText}`,
            this.chainAlias,
            response.status,
            endpoint
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx client errors (except 429 rate limit)
        if (error instanceof BlockbookError) {
          if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms
        if (attempt < this.maxRetries) {
          await this.sleep(500 * Math.pow(2, attempt - 1));
        }
      }
    }

    // Wrap non-BlockbookError errors
    if (lastError instanceof BlockbookError) {
      throw lastError;
    }

    throw new BlockbookError(
      lastError?.message ?? 'Request failed after retries',
      this.chainAlias,
      undefined,
      endpoint,
      lastError
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
