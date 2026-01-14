import { describe, it, expect } from 'vitest';
import { createVaultBodySchema } from '@/src/routes/vaults/schemas.js';

describe('createVaultBodySchema', () => {
  it('should validate a valid request body', () => {
    const validBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [
        { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577...' },
        { curveType: 'ed25519', xpub: 'edpub...' },
      ],
    };

    const result = createVaultBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('should validate with single curve', () => {
    const validBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('should validate with empty curves array (domain validation handles this)', () => {
    // Note: Empty curves is now valid at schema level - domain entity validates this
    const body = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [],
    };

    const result = createVaultBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it('should validate with duplicate curve types (domain validation handles this)', () => {
    // Note: Duplicate curves is now valid at schema level - domain entity validates this
    const body = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [
        { curveType: 'secp256k1', xpub: 'xpub1...' },
        { curveType: 'secp256k1', xpub: 'xpub2...' },
      ],
    };

    const result = createVaultBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for id', () => {
    const invalidBody = {
      id: 'not-a-uuid',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('id must be a valid UUID');
    }
  });

  it('should reject invalid UUID for workspaceId', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: 'not-a-uuid',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('workspaceId must be a valid UUID');
    }
  });

  it('should reject invalid curve type', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'invalid-curve', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject empty xpub', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: '' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('xpub is required');
    }
  });

  it('should reject missing id', () => {
    const invalidBody = {
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject missing workspaceId', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject missing curves', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });
});
