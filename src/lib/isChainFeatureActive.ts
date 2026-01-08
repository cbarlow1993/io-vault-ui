import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import z, { ZodError } from 'zod';
import {
  ALL_CHAINS,
  activeFeatureStatuses,
  type ChainFeatures,
} from '@/src/lib/chains.js';

export const isChainFeatureActive = ({
  chainAlias,
  feature,
}: {
  chainAlias: ChainAlias;
  feature: ChainFeatures;
}) => {
  if (!(chainAlias in ALL_CHAINS)) {
    throw new ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `Invalid chainAlias: ${chainAlias}`,
        path: ['chainAlias'],
      },
    ]);
  }
  return activeFeatureStatuses.includes(
    ALL_CHAINS[chainAlias as keyof typeof ALL_CHAINS].features[feature]
  );
};
