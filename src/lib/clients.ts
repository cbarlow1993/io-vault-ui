import { Blockaid } from '@blockaid/client';
import { Translate, type TranslateEVM, type TranslateSVM, type TranslateUTXO, type TranslateXRPL, type TranslateTVM, type TranslatePOLKADOT } from '@noves/noves-sdk';
import { config } from '@/src/lib/config.js';

let blockaidApiClient: Blockaid | undefined;

export const blockaidClient = () => {
  if (!blockaidApiClient) {
    if (!config.apis.blockaid.apiKey) throw new Error('BLOCKAID_API_KEY not configured');
    blockaidApiClient = new Blockaid({ apiKey: config.apis.blockaid.apiKey });
  }
  return blockaidApiClient;
};

// Noves SDK client instances (singleton pattern)
let novesEvmClient: TranslateEVM | undefined;
let novesSvmClient: TranslateSVM | undefined;
let novesUtxoClient: TranslateUTXO | undefined;
let novesXrpClient: TranslateXRPL | undefined;
let novesTvmClient: TranslateTVM | undefined;
let novesPolkadotClient: TranslatePOLKADOT | undefined;

const getNovesApiKey = () => {
  if (!config.apis.noves?.apiKey) throw new Error('NOVES_API_KEY not configured');
  return config.apis.noves.apiKey;
};

export const NovesEVMClient = (() => {
  return {
    get client() {
      if (!novesEvmClient) {
        novesEvmClient = Translate.evm(getNovesApiKey());
      }
      return novesEvmClient;
    },
    getTransactions: (...args: Parameters<TranslateEVM['getTransactions']>) => {
      if (!novesEvmClient) novesEvmClient = Translate.evm(getNovesApiKey());
      return novesEvmClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslateEVM['getTransaction']>) => {
      if (!novesEvmClient) novesEvmClient = Translate.evm(getNovesApiKey());
      return novesEvmClient.getTransaction(...args);
    },
  };
})();

export const NovesSVMClient = (() => {
  return {
    get client() {
      if (!novesSvmClient) {
        novesSvmClient = Translate.svm(getNovesApiKey());
      }
      return novesSvmClient;
    },
    getTransactions: (...args: Parameters<TranslateSVM['getTransactions']>) => {
      if (!novesSvmClient) novesSvmClient = Translate.svm(getNovesApiKey());
      return novesSvmClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslateSVM['getTransaction']>) => {
      if (!novesSvmClient) novesSvmClient = Translate.svm(getNovesApiKey());
      return novesSvmClient.getTransaction(...args);
    },
  };
})();

export const NovesUTXOClient = (() => {
  return {
    get client() {
      if (!novesUtxoClient) {
        novesUtxoClient = Translate.utxo(getNovesApiKey());
      }
      return novesUtxoClient;
    },
    getTransactions: (...args: Parameters<TranslateUTXO['getTransactions']>) => {
      if (!novesUtxoClient) novesUtxoClient = Translate.utxo(getNovesApiKey());
      return novesUtxoClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslateUTXO['getTransaction']>) => {
      if (!novesUtxoClient) novesUtxoClient = Translate.utxo(getNovesApiKey());
      return novesUtxoClient.getTransaction(...args);
    },
  };
})();

export const NovesXRPClient = (() => {
  return {
    get client() {
      if (!novesXrpClient) {
        novesXrpClient = Translate.xrpl(getNovesApiKey());
      }
      return novesXrpClient;
    },
    getTransactions: (...args: Parameters<TranslateXRPL['getTransactions']>) => {
      if (!novesXrpClient) novesXrpClient = Translate.xrpl(getNovesApiKey());
      return novesXrpClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslateXRPL['getTransaction']>) => {
      if (!novesXrpClient) novesXrpClient = Translate.xrpl(getNovesApiKey());
      return novesXrpClient.getTransaction(...args);
    },
    getTokenBalances: (...args: Parameters<TranslateXRPL['getTokenBalances']>) => {
      if (!novesXrpClient) novesXrpClient = Translate.xrpl(getNovesApiKey());
      return novesXrpClient.getTokenBalances(...args);
    },
  };
})();

export const NovesTVMClient = (() => {
  return {
    get client() {
      if (!novesTvmClient) {
        novesTvmClient = Translate.tvm(getNovesApiKey());
      }
      return novesTvmClient;
    },
    getTransactions: (...args: Parameters<TranslateTVM['getTransactions']>) => {
      if (!novesTvmClient) novesTvmClient = Translate.tvm(getNovesApiKey());
      return novesTvmClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslateTVM['getTransaction']>) => {
      if (!novesTvmClient) novesTvmClient = Translate.tvm(getNovesApiKey());
      return novesTvmClient.getTransaction(...args);
    },
  };
})();

export const NovesPOLKADOTClient = (() => {
  return {
    get client() {
      if (!novesPolkadotClient) {
        novesPolkadotClient = Translate.polkadot(getNovesApiKey());
      }
      return novesPolkadotClient;
    },
    getTransactions: (...args: Parameters<TranslatePOLKADOT['getTransactions']>) => {
      if (!novesPolkadotClient) novesPolkadotClient = Translate.polkadot(getNovesApiKey());
      return novesPolkadotClient.getTransactions(...args);
    },
    getTransaction: (...args: Parameters<TranslatePOLKADOT['getTransaction']>) => {
      if (!novesPolkadotClient) novesPolkadotClient = Translate.polkadot(getNovesApiKey());
      return novesPolkadotClient.getTransaction(...args);
    },
  };
})();
