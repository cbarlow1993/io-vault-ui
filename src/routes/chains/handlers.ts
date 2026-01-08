import {
  Chain,
  type ChainAlias,
  EcoSystem,
  type EvmChain,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ALL_CHAINS, type Environment } from '@/src/lib/chains.js';
import { config } from '@/src/lib/config.js';
import type { ListChainsQuery } from '@/src/routes/chains/schemas.js';

export async function listChains(
  request: FastifyRequest<{ Querystring: ListChainsQuery }>,
  reply: FastifyReply
) {
  // Treat 'local' as 'dev' for chain environment filtering
  const environment = config.server.stage === 'local' ? 'dev' : config.server.stage;
  const { ecosystem, chainAlias, includeTestnets, asV1, chainId } = request.query;

  const chains = await Promise.all(
    Object.keys(ALL_CHAINS).map((alias) => Chain.fromAlias(alias as ChainAlias))
  );

  let filteredChains: Chain[] = chains;
  if (chainId) {
    filteredChains =
      chains.filter((chainItem) => {
        return chainItem.Config.id === chainId;
      }) || [];
  } else if (ecosystem && chainAlias) {
    filteredChains =
      chains.filter((chainItem) => chainItem.Alias === chainAlias && chainItem.isEcosystem(ecosystem)) ||
      [];
  } else if (ecosystem) {
    filteredChains = chains.filter((chainItem) => chainItem.isEcosystem(ecosystem)) || [];
  } else if (chainAlias) {
    filteredChains = chains.filter((chainItem) => chainItem.Alias === chainAlias) || [];
  }

  // asV1 is a parameter that determines whether the v1 list should be included regardless of the environment
  filteredChains = filteredChains.filter((chainItem) => {
    const supportedConfig = ALL_CHAINS[chainItem.Alias as keyof typeof ALL_CHAINS];
    if (asV1 === true && supportedConfig.isV1 === true) {
      return true;
    }
    if (supportedConfig.environments.includes(environment as Environment)) {
      return true;
    }
    return false;
  });

  const result = filteredChains
    .map((chainItem) => {
      const supportedConfig = ALL_CHAINS[chainItem.Alias as keyof typeof ALL_CHAINS];
      let blockExplorers: any;
      if (chainItem.isEcosystem(EcoSystem.EVM)) {
        const evmConfig = (chainItem as EvmChain).EvmChainConfig;
        blockExplorers = evmConfig.blockExplorers;
      }
      return {
        id: chainItem.Config.id,
        name: chainItem.Config.name,
        chainAlias: chainItem.Alias,
        nativeCurrency: chainItem.Config.nativeCurrency,
        ecosystem: chainItem.Config.ecosystem,
        features: supportedConfig.features,
        isTestnet: supportedConfig.isTestnet,
        blockExplorers,
        rpcUrls: {
          iofinnet: {
            http: [`https://nodes.iofinnet.com/${chainItem.Alias}`],
          },
        },
      };
    })
    .filter((mapped) => (includeTestnets === true ? true : !mapped.isTestnet));

  return reply.send({ data: result });
}
