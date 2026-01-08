/** biome-ignore-all lint/style/noNonNullAssertion: we're using expect(var).toBeDefined before we do var!.propriety but biome doesn't understand that */
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { expect } from 'vitest';
import { data as rawData } from '@/tests/e2e/chains/chains-response.json';
import type { APITestClient } from '@/tests/utils/testApiClient.js';

interface ChainData {
  chainAlias: ChainAlias;
  features: string[];
}
const data = rawData as ChainData[];

export const checkForTransactionHash = async (params: {
  client: APITestClient;
  vaultId: string;
  txId: string;
  address: string;
  token?: string;
}) => {
  const { client, vaultId, txId, address, token } = params;
  const chainTx = await client.pollForTransactionFinalState({
    vaultId,
    operationId: txId,
  });

  expect(
    chainTx,
    `The transaction likely not broadcast \n the transaction id was ${txId}, ${token ? `for token ${token}` : ''} sent from ${address}`
  ).toBeDefined();
  expect(
    chainTx!.status,
    `Transaction ${txId} was not broadcasted, the status is ${chainTx!.status}`
  ).toBe('COMPLETED');
  expect(chainTx?.tags).toBeDefined();
  expect(chainTx?.tags).not.toBeNull();
  expect(chainTx?.tags!.length).toBeGreaterThan(0);
  const importantTag = chainTx!.tags!.find(
    (tag) =>
      tag.name === 'transaction-hash' ||
      (tag.name === 'error' && tag.value.includes('nonce too low'))
  );
  expect(
    importantTag,
    `Couldn't find transaction-hash tag in the transaction with id ${txId}, ${JSON.stringify(chainTx)}`
  ).toBeDefined();
};

export const findChainFeatures = (chainAlias: ChainAlias) => {
  const chain = data.find((c) => c.chainAlias.toLowerCase() === chainAlias.toLowerCase());
  return chain ? chain.features : null;
};
