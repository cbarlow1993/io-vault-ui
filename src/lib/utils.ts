import { config } from '@/src/lib/config.js';

export const getHooks = ({
  txEncoded,
  encodedWallet,
  appEndpoint,
  broadcast,
}: {
  txEncoded: string;
  encodedWallet: string;
  appEndpoint?: string;
  broadcast: boolean;
}) => {
  const stage = config.server.stage;
  const base =
    stage === 'dev' && appEndpoint !== 'undefined' && appEndpoint !== undefined
      ? appEndpoint
      : generatedHookEndpoint(stage);

  return {
    ...(broadcast && {
      onFinalStatus: {
        url: `${base}/on-final-status?tx=${txEncoded}&wallet=${encodedWallet}`,
      },
    }),
    onDecodeSignature: {
      url: `${base}/on-decode-signature?tx=${txEncoded}&wallet=${encodedWallet}`,
    },
  };
};

export function mapValues<T extends Record<string, any>, R>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fn(v, k as keyof T)])
  ) as Record<keyof T, R>;
}

const generatedHookEndpoint = (stage: string) => {
  return stage === 'prod'
    ? 'https://app-multi-wallet.apps.iofinnet.com/api'
    : `https://app-multi-wallet.apps.${stage}.iofinnet.com/api`;
};
