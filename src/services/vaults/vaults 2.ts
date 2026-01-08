import {
  Chain,
  type ChainAlias,
  type Curve,
  EcoSystem,
  type Vault,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '../../../utils/powertools';
import { lambdaSafeQuery } from '@iofinnet/io-vault-db-sdk';

const getCurveType = async (chainAlias: ChainAlias): Promise<string> => {
  const chain = await Chain.fromAlias(chainAlias);
  switch (chain.Config.ecosystem) {
    case EcoSystem.EVM:
    case EcoSystem.TVM:
    case EcoSystem.UTXO:
      return 'secp256k1';
    case EcoSystem.SVM:
    case EcoSystem.XRP:
      return 'ed25519';
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

/**
 * Gets a vault xPub by vault ID and chain
 */
export async function getVaultXpub(vaultId: string, chain: ChainAlias): Promise<string | null> {

  const curve = await getCurveType(chain);

  const sql = `SELECT "xpub" FROM "VaultCurve" WHERE "vaultId" = $1 AND "curve" = $2::"ElipticCurve"`;

  const result = await lambdaSafeQuery(
    {
      query: sql,
      params: [vaultId, curve],
    },
    { keepAlive: false, logger }
  );

  logger.debug('[/services/vaults.ts] getVaultXpub', { result });

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const vaultXpub = result.rows[0].xpub;

  return vaultXpub;
}

export async function getWorkspaceId(vaultId: string, keepAlive = false): Promise<string | null> {

  const sql = `SELECT "workspaceId" FROM "Vault" WHERE "id" = $1`;

  const result = await lambdaSafeQuery(
    {
      query: sql,
      params: [vaultId],
    },
    { keepAlive, logger }
  );

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const workspaceId = result.rows[0].workspaceId;

  return workspaceId;
}

export async function getVaultCurves(vaultId: string, keepAlive = false): Promise<Vault | null> {

  const sql = `SELECT * FROM "VaultCurve" WHERE "vaultId" = $1`;

  const result = await lambdaSafeQuery(
    {
      query: sql,
      params: [vaultId],
    },
    { keepAlive, logger }
  );

  if (!result.rows || result.rows.length === 0) {
    return null;
  }
  const curves = result.rows as Curve[];
  return { vaultId, curves };
}

export interface VaultDetails {
  vaultId: string;
  workspaceId: string;
  organisationId: string;
}

export async function getVaultDetails(
  vaultId: string,
  keepAlive = false
): Promise<VaultDetails | null> {

  const sql = `SELECT "id" as "vaultId", "workspaceId", "organisationId" FROM "Vault" WHERE "id" = $1`;

  const result = await lambdaSafeQuery(
    {
      query: sql,
      params: [vaultId],
    },
    { keepAlive, logger }
  );

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as VaultDetails;
}
