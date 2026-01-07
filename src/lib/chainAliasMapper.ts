import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export const mapChainAliasToNovesChain = (chain: ChainAlias): string => {
  switch (chain) {
    case ChainAlias.BITCOIN:
      return 'btc';
    case ChainAlias.AVALANCHE_C:
      return 'avalanche';
    case ChainAlias.XRP:
      return 'xrpl';
  }

  return chain;
};

export const mapChainAliasToCoinGeckoAssetPlatform = (chain: ChainAlias) => {
  switch (chain) {
    case ChainAlias.XRP:
      return 'xrp';
    case ChainAlias.ARBITRUM:
      return 'arbitrum-one';
    case ChainAlias.AVALANCHE_C:
      return 'avalanche';
    case ChainAlias.BSC:
      return 'binance-smart-chain';
    case ChainAlias.ETH:
      return 'ethereum';
    case ChainAlias.DFK:
      return 'defi-kingdoms-blockchain';
    case ChainAlias.FRAXTAL:
      return 'fraxtal';
    case ChainAlias.GNOSIS:
      return 'xdai';
    case ChainAlias.METAL:
      return 'metal-l2';
    case ChainAlias.METIS:
      return 'metis-andromeda';
    case ChainAlias.MORPH:
      return 'morph-l2';
    case ChainAlias.OPTIMISM:
      return 'optimistic-ethereum';
    case ChainAlias.POLYGON:
      return 'polygon-pos';
    case ChainAlias.QUAI:
      return 'quai-network';
    case ChainAlias.XDC:
      return 'xdc-network';
    case ChainAlias.ZKSYNC_ERA:
      return 'zksync';
    case ChainAlias.ZORA:
      return 'zora-network';
    case ChainAlias.TRON:
      return 'tron';
    default:
      return chain;
  }
};

export const mapChainAliasToCoinGeckoNativeCoinId = (chain: ChainAlias) => {
  switch (chain) {
    case ChainAlias.XRP:
      return 'ripple';
    case ChainAlias.ABSTRACT:
      return 'ethereum';
    case ChainAlias.ARBITRUM:
      return 'ethereum';
    case ChainAlias.ARBITRUM_NOVA:
      return 'ethereum';
    case ChainAlias.AVALANCHE_C:
      return 'avalanche-2';
    case ChainAlias.BASE:
      return 'ethereum';
    case ChainAlias.BSC:
      return 'binancecoin';
    case ChainAlias.ETH:
      return 'ethereum';
    case ChainAlias.DFK:
      return 'defi-kingdoms';
    case ChainAlias.FRAXTAL:
      return 'fraxtal';
    case ChainAlias.GNOSIS:
      return 'xdai';
    case ChainAlias.METIS:
      return 'metis-token';
    case ChainAlias.MORPH:
      return 'weth';
    case ChainAlias.OPTIMISM:
      return 'ethereum';
    case ChainAlias.POLYGON:
      return 'polygon-ecosystem-token';
    case ChainAlias.QUAI:
      return 'quai-network';
    case ChainAlias.XDC:
      return 'xdce-crowd-sale';
    case ChainAlias.ZKSYNC_ERA:
      return 'ethereum';
    case ChainAlias.ZORA:
      return 'weth';
    case ChainAlias.BERACHAIN:
      return 'berachain-bera';
    case ChainAlias.BLAST:
      return 'blast-old';
    case ChainAlias.CRONOS:
      return 'crypto-com-chain';
    case ChainAlias.DEGEN:
      return 'degen-base';
    case ChainAlias.FLOW_EVM:
      return 'flow';
    case ChainAlias.FUSE:
      return 'fuse-network-token';
    case ChainAlias.INK:
      return 'ethereum';
    case ChainAlias.LIGHTLINK:
      return 'ethereum';
    case ChainAlias.LINEA:
      return 'ethereum';
    case ChainAlias.LUKSO:
      return 'lukso-token-2';
    case ChainAlias.MANTA_PACIFIC:
      return 'weth';
    case ChainAlias.POLYGON_ZKEVM:
      return 'ethereum';
    case ChainAlias.RARI:
      return 'weth';
    case ChainAlias.SCROLL:
      return 'weth';
    case ChainAlias.SONIC:
      return 'sonic-3';
    case ChainAlias.SOPHON_TESTNET:
      return 'sophon';
    case ChainAlias.SUPERSEED_SEPOLIA:
      return 'ethereum';
    case ChainAlias.XAI:
      return 'xai-blockchain';
    case ChainAlias.TRON:
      return 'tronix';
    default:
      return chain;
  }
};
