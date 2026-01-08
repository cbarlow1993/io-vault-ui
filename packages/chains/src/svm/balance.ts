// packages/chains/src/svm/balance.ts
import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { SvmChainConfig } from './config.js';
import { formatUnits, SPL_TOKEN_PROGRAM_ID } from './utils.js';

// ============ Solana RPC Response Types ============

interface SolanaRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface GetBalanceResult {
  context: { slot: number };
  value: number;
}

interface TokenAccountInfo {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          owner: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
          };
        };
        type: string;
      };
      program: string;
      space: number;
    };
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch: number;
  };
}

interface GetTokenAccountsResult {
  context: { slot: number };
  value: TokenAccountInfo[];
}

interface MintInfo {
  context: { slot: number };
  value: {
    data: {
      parsed: {
        info: {
          decimals: number;
          freezeAuthority: string | null;
          isInitialized: boolean;
          mintAuthority: string | null;
          supply: string;
        };
        type: string;
      };
      program: string;
      space: number;
    };
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch: number;
  } | null;
}

// ============ SVM Balance Fetcher ============

export class SvmBalanceFetcher implements IBalanceFetcher {
  constructor(private readonly config: SvmChainConfig) {}

  async getNativeBalance(address: string): Promise<NativeBalance> {
    const result = await this.rpcCall<GetBalanceResult>('getBalance', [address]);
    const balanceLamports = BigInt(result.value);

    return {
      balance: balanceLamports.toString(),
      formattedBalance: formatUnits(balanceLamports, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
      isNative: true,
    };
  }

  async getTokenBalance(address: string, mintAddress: string): Promise<TokenBalance> {
    // Get all token accounts for the owner filtered by the specific mint
    const tokenAccounts = await this.rpcCall<GetTokenAccountsResult>('getTokenAccountsByOwner', [
      address,
      { mint: mintAddress },
      { encoding: 'jsonParsed' },
    ]);

    // If the user has a token account for this mint, return its balance
    if (tokenAccounts.value.length > 0) {
      const tokenAccount = tokenAccounts.value[0]!;
      const tokenInfo = tokenAccount.account.data.parsed.info;

      return {
        balance: tokenInfo.tokenAmount.amount,
        formattedBalance: formatUnits(BigInt(tokenInfo.tokenAmount.amount), tokenInfo.tokenAmount.decimals),
        symbol: '', // SPL tokens don't have on-chain symbol, would need metadata
        decimals: tokenInfo.tokenAmount.decimals,
        contractAddress: mintAddress,
      };
    }

    // No token account exists, get decimals from mint and return zero balance
    const mintInfo = await this.rpcCall<MintInfo>('getAccountInfo', [
      mintAddress,
      { encoding: 'jsonParsed' },
    ]);

    const decimals = mintInfo.value?.data.parsed.info.decimals ?? 9;

    return {
      balance: '0',
      formattedBalance: '0',
      symbol: '',
      decimals,
      contractAddress: mintAddress,
    };
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`RPC request failed: ${response.statusText}`, this.config.chainAlias);
    }

    const json: SolanaRpcResponse<T> = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.config.chainAlias, json.error.code);
    }

    return json.result as T;
  }
}
