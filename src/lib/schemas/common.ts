import { z } from 'zod';

/**
 * Schema for vault ID validation
 * Vault IDs are typically UUIDs or unique string identifiers
 */
export const vaultIdSchema = z.string().min(1, 'Vault ID is required');
