import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { Connection } from '@solana/web3.js';
import type { ChainFetcher, SvmTransactionData, SvmInstruction, SvmTokenBalance } from '@/src/services/transaction-processor/types.js';

export interface SvmChainFetcherConfig {
  rpcUrls: Record<string, string>;
}

export class SvmChainFetcher implements ChainFetcher {
  private readonly rpcUrls: Record<string, string>;
  private readonly connections: Map<string, Connection> = new Map();

  constructor(config: SvmChainFetcherConfig) {
    this.rpcUrls = config.rpcUrls;
  }

  private getConnection(chainAlias: ChainAlias): Connection {
    let connection = this.connections.get(chainAlias);
    if (!connection) {
      const rpcUrl = this.rpcUrls[chainAlias];
      if (!rpcUrl) {
        throw new Error(`Unsupported chain: ${chainAlias}`);
      }
      connection = new Connection(rpcUrl);
      this.connections.set(chainAlias, connection);
    }
    return connection;
  }

  async fetch(chainAlias: ChainAlias, signature: string): Promise<SvmTransactionData> {
    const connection = this.getConnection(chainAlias);

    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    const { meta, transaction, slot, blockTime } = tx;

    const accountKeys = transaction.message.staticAccountKeys.map((k) =>
      typeof k === 'string' ? k : k.toBase58()
    );

    const instructions: SvmInstruction[] = transaction.message.compiledInstructions.map(
      (ix) => ({
        programId: accountKeys[ix.programIdIndex] ?? '',
        accounts: ix.accountKeyIndexes.map((i) => accountKeys[i] ?? ''),
        data: Buffer.from(ix.data).toString('base64'),
      })
    );

    const preTokenBalances: SvmTokenBalance[] = (meta?.preTokenBalances ?? []).map((b) => ({
      accountIndex: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? '',
      uiTokenAmount: {
        amount: b.uiTokenAmount.amount,
        decimals: b.uiTokenAmount.decimals,
      },
    }));

    const postTokenBalances: SvmTokenBalance[] = (meta?.postTokenBalances ?? []).map((b) => ({
      accountIndex: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? '',
      uiTokenAmount: {
        amount: b.uiTokenAmount.amount,
        decimals: b.uiTokenAmount.decimals,
      },
    }));

    return {
      type: 'svm',
      signature,
      slot,
      blockTime: blockTime ?? 0,
      fee: String(meta?.fee ?? 0),
      status: meta?.err === null ? 'success' : 'failed',
      instructions,
      // Convert balances to strings to avoid precision loss with large lamport values
      preBalances: (meta?.preBalances ?? []).map((b) => String(b)),
      postBalances: (meta?.postBalances ?? []).map((b) => String(b)),
      preTokenBalances,
      postTokenBalances,
    };
  }
}
