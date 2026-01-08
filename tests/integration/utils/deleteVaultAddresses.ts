import { getDatabase } from '@/src/lib/database/index.js';
import { PostgresAddressRepository } from '@/src/repositories/index.js';

export const deleteVaultAddresses = async (vaultId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const repository = new PostgresAddressRepository(db);
    await repository.deleteByVaultId(vaultId);
  } catch (error) {
    console.error('Error deleting vault addresses:', error);
  }
};
