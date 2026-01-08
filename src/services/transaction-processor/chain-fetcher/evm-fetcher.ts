import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { JsonRpcProvider } from 'ethers';
import type { ChainFetcher, EvmTransactionData, EvmTransactionLog } from '@/src/services/transaction-processor/types.js';

export interface EvmChainFetcherConfig {
  rpcUrls: Record<string, string>;
}

export class EvmChainFetcher implements ChainFetcher {
  private readonly rpcUrls: Record<string, string>;
  private readonly providers: Map<string, JsonRpcProvider> = new Map();

  constructor(config: EvmChainFetcherConfig) {
    this.rpcUrls = config.rpcUrls;
  }

  private getProvider(chainAlias: ChainAlias): JsonRpcProvider {
    let provider = this.providers.get(chainAlias);
    if (!provider) {
      const rpcUrl = this.rpcUrls[chainAlias];
      if (!rpcUrl) {
        throw new Error(`Unsupported chain: ${chainAlias}`);
      }
      provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chainAlias, provider);
    }
    return provider;
  }

  async fetch(chainAlias: ChainAlias, txHash: string): Promise<EvmTransactionData> {
    const provider = this.getProvider(chainAlias);

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);

    if (!tx) {
      throw new Error(`Transaction not found: ${txHash}`);
    }

    if (!receipt) {
      throw new Error(`Transaction receipt not found: ${txHash}`);
    }

    const block = await provider.getBlock(tx.blockNumber!);
    if (!block) {
      throw new Error(`Block not found: ${tx.blockNumber}`);
    }

    const logs: EvmTransactionLog[] = receipt.logs.map((log) => ({
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      logIndex: log.index,
    }));

    return {
      type: 'evm',
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      input: tx.data,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() ?? '0',
      logs,
      blockNumber: tx.blockNumber!,
      blockHash: tx.blockHash!,
      timestamp: new Date(block.timestamp * 1000),
      status: receipt.status === 1 ? 'success' : 'failed',
    };
  }
}
