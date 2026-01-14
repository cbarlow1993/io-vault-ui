import {
  Chain,
  type ChainAlias,
  type Curve,
  EcoSystem,
  type Vault as SdkVault,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { VaultRepository, VaultDetails } from '@/src/repositories/vault.repository.js';
import type { ElipticCurve, TagAssignmentRow } from '@/src/lib/database/types.js';
import { Vault } from '@/src/domain/entities/index.js';
import { logger } from '@/utils/powertools.js';

export class VaultService {
  constructor(private vaultRepository: VaultRepository) {}

  private async getCurveType(chainAlias: ChainAlias): Promise<ElipticCurve> {
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
  }

  async getVaultXpub(vaultId: string, chain: ChainAlias): Promise<string | null> {
    const curve = await this.getCurveType(chain);
    const xpub = await this.vaultRepository.findVaultXpub(vaultId, curve);

    logger.debug('[VaultService] getVaultXpub', { vaultId, chain, curve, xpub });

    return xpub;
  }

  async getWorkspaceId(vaultId: string): Promise<string | null> {
    return this.vaultRepository.findWorkspaceId(vaultId);
  }

  async getVaultCurves(vaultId: string): Promise<SdkVault | null> {
    const result = await this.vaultRepository.findVaultCurves(vaultId);

    if (!result) {
      return null;
    }

    return {
      vaultId: result.vaultId,
      curves: result.curves as unknown as Curve[],
    };
  }

  async getVaultDetails(vaultId: string): Promise<VaultDetails | null> {
    return this.vaultRepository.findVaultDetails(vaultId);
  }

  /**
   * Get a Vault domain entity by ID.
   * Returns the full Vault entity with all properties needed for domain operations.
   */
  async getVault(vaultId: string): Promise<Vault | null> {
    const vaultData = await this.vaultRepository.findVaultWithDetails(vaultId);

    if (!vaultData) {
      return null;
    }

    return Vault.create({
      id: vaultData.vaultId,
      organizationId: vaultData.organizationId,
      workspaceId: vaultData.workspaceId,
      createdAt: vaultData.createdAt,
    });
  }

  async getTagAssignment(params: {
    name: 'transaction-hash';
    value: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<TagAssignmentRow | null> {
    return this.vaultRepository.findTagAssignment(params);
  }
}
