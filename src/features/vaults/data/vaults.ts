// Vault data types and sample data

export type VaultStatus = 'active' | 'draft' | 'archived';

export type CurveType = 'ECDSA' | 'EdDSA';

export type DeviceType = 'virtual' | 'ios' | 'android';

export type VaultCurve = {
  type: CurveType;
  curve: string;
  publicKey: string;
  fingerprint: string;
};

export type Signer = {
  id: string;
  name: string;
  owner: string;
  deviceType: DeviceType;
  votingPower: number;
  version: string;
};

export type Signature = {
  id: string;
  hash: string;
  signedAt: string;
  signedBy: string;
  curveUsed: CurveType;
  status: 'completed' | 'pending' | 'failed';
  description: string;
};

export type Vault = {
  id: string;
  name: string;
  curves: [VaultCurve, VaultCurve]; // Always 2 curves
  threshold: number;
  signers: Signer[];
  status: VaultStatus;
  createdAt: string;
  createdBy: string;
  lastUsed: string | null;
  signatures: Signature[];
  identityId?: string; // Optional linked identity
};

// Sample vault data
export const allVaults: Vault[] = [
  {
    id: 'vault-001',
    name: 'Production Signing Vault',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c6d1e4f7a2b5c8d3e6f1a4b7c0',
        fingerprint: '0x7a3f...8c2d',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x2b1e9f4a8c3d7e2f1a6b5c4d9e8f3a2b7c1d6e5f4a9b8c3d2e7f6a1b5c0d4e9f8',
        fingerprint: '0x2b1e...9f4a',
      },
    ],
    threshold: 2,
    signers: [
      {
        id: 'signer-001',
        name: 'HSM Primary',
        owner: 'J. Doe',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-002',
        name: 'HSM Backup',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-003',
        name: "John's iPhone",
        owner: 'J. Doe',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
    ],
    status: 'active',
    createdAt: '2025-01-10',
    createdBy: 'J. Doe',
    lastUsed: '2 hours ago',
    identityId: 'corp-001', // Linked to Acme Corporation
    signatures: [
      {
        id: 'sig-001',
        hash: '0x8f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
        signedAt: '2025-01-14 14:32:00',
        signedBy: 'J. Doe',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'ETH transfer to 0x742d...3f2a',
      },
      {
        id: 'sig-002',
        hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        signedAt: '2025-01-14 12:15:00',
        signedBy: 'M. Smith',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Contract deployment',
      },
      {
        id: 'sig-003',
        hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        signedAt: '2025-01-13 09:45:00',
        signedBy: 'J. Doe',
        curveUsed: 'EdDSA',
        status: 'completed',
        description: 'Solana SOL transfer',
      },
      {
        id: 'sig-004',
        hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
        signedAt: '2025-01-12 16:20:00',
        signedBy: 'A. Kumar',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Multi-sig approval',
      },
    ],
  },
  {
    id: 'vault-002',
    name: 'Treasury Operations',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
        fingerprint: '0x5c8d...1e7b',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
        fingerprint: '0x4e5f...c3d4',
      },
    ],
    threshold: 3,
    signers: [
      {
        id: 'signer-004',
        name: 'Treasury Server',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 2,
        version: '2.4.0',
      },
      {
        id: 'signer-005',
        name: "Mike's iPad",
        owner: 'M. Smith',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-006',
        name: "John's Pixel",
        owner: 'J. Doe',
        deviceType: 'android',
        votingPower: 1,
        version: '3.0.2',
      },
      {
        id: 'signer-007',
        name: 'Backup HSM',
        owner: 'A. Kumar',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.3.8',
      },
    ],
    status: 'active',
    createdAt: '2025-01-08',
    createdBy: 'M. Smith',
    lastUsed: '1 day ago',
    identityId: 'corp-002', // Linked to Global Investments Ltd
    signatures: [
      {
        id: 'sig-005',
        hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        signedAt: '2025-01-13 11:00:00',
        signedBy: 'M. Smith',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Treasury disbursement',
      },
      {
        id: 'sig-006',
        hash: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
        signedAt: '2025-01-12 15:30:00',
        signedBy: 'J. Doe',
        curveUsed: 'EdDSA',
        status: 'completed',
        description: 'Staking rewards claim',
      },
    ],
  },
  {
    id: 'vault-003',
    name: 'Multi-sig Vault #1',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
        fingerprint: '0x9f2a...4d8c',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
        fingerprint: '0x6a7b...e5f6',
      },
    ],
    threshold: 3,
    signers: [
      {
        id: 'signer-008',
        name: 'Co-signer Server A',
        owner: 'A. Kumar',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-009',
        name: 'Co-signer Server B',
        owner: 'J. Doe',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-010',
        name: 'Co-signer Server C',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.0',
      },
      {
        id: 'signer-011',
        name: "Amit's iPhone",
        owner: 'A. Kumar',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-012',
        name: "John's iPhone",
        owner: 'J. Doe',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.0.5',
      },
    ],
    status: 'active',
    createdAt: '2025-01-05',
    createdBy: 'A. Kumar',
    lastUsed: '3 days ago',
    signatures: [
      {
        id: 'sig-007',
        hash: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
        signedAt: '2025-01-11 10:15:00',
        signedBy: 'A. Kumar',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: '3/5 multi-sig transaction',
      },
    ],
  },
  {
    id: 'vault-004',
    name: 'Backup Recovery Vault',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
        fingerprint: '0x1a4b...6e3f',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0',
        fingerprint: '0x8c9d...a7b8',
      },
    ],
    threshold: 2,
    signers: [
      {
        id: 'signer-013',
        name: 'Recovery Server',
        owner: 'J. Doe',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-014',
        name: "John's iPhone",
        owner: 'J. Doe',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
    ],
    status: 'draft',
    createdAt: '2025-01-12',
    createdBy: 'J. Doe',
    lastUsed: null,
    signatures: [],
  },
  {
    id: 'vault-005',
    name: 'Legacy Vault (Deprecated)',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
        fingerprint: '0x3d7c...2a9e',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2',
        fingerprint: '0x0e1f...c9d0',
      },
    ],
    threshold: 1,
    signers: [
      {
        id: 'signer-015',
        name: 'Legacy Server',
        owner: 'S. Wilson',
        deviceType: 'virtual',
        votingPower: 1,
        version: '1.9.2',
      },
    ],
    status: 'archived',
    createdAt: '2024-11-15',
    createdBy: 'S. Wilson',
    lastUsed: '2024-12-20',
    signatures: [
      {
        id: 'sig-008',
        hash: '0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
        signedAt: '2024-12-20 08:00:00',
        signedBy: 'S. Wilson',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Final withdrawal before deprecation',
      },
    ],
  },
  {
    id: 'vault-006',
    name: 'Cold Storage Primary',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
        fingerprint: '0x8e4f...7b1c',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
        fingerprint: '0x2a3b...e1f2',
      },
    ],
    threshold: 2,
    signers: [
      {
        id: 'signer-016',
        name: 'Cold Storage HSM',
        owner: 'J. Chen',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-017',
        name: "Jenny's iPhone",
        owner: 'J. Chen',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-018',
        name: 'Backup Mobile',
        owner: 'M. Smith',
        deviceType: 'android',
        votingPower: 1,
        version: '3.0.8',
      },
    ],
    status: 'active',
    createdAt: '2024-12-20',
    createdBy: 'J. Chen',
    lastUsed: '1 week ago',
    identityId: 'corp-001', // Linked to Acme Corporation
    signatures: [
      {
        id: 'sig-009',
        hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        signedAt: '2025-01-07 14:00:00',
        signedBy: 'J. Chen',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Cold storage transfer',
      },
    ],
  },
  {
    id: 'vault-007',
    name: 'Hot Wallet Signer',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
        fingerprint: '0x6a2d...9c5f',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        fingerprint: '0x4c5d...a3b4',
      },
    ],
    threshold: 2,
    signers: [
      {
        id: 'signer-019',
        name: 'Hot Wallet Server',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 2,
        version: '2.4.1',
      },
      {
        id: 'signer-020',
        name: "Mike's iPhone",
        owner: 'M. Smith',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-021',
        name: "Amit's Android",
        owner: 'A. Kumar',
        deviceType: 'android',
        votingPower: 1,
        version: '3.0.9',
      },
    ],
    status: 'active',
    createdAt: '2024-12-18',
    createdBy: 'M. Smith',
    lastUsed: '5 hours ago',
    signatures: [
      {
        id: 'sig-010',
        hash: '0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
        signedAt: '2025-01-14 09:30:00',
        signedBy: 'M. Smith',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Hot wallet rebalance',
      },
      {
        id: 'sig-011',
        hash: '0xc8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9',
        signedAt: '2025-01-14 08:15:00',
        signedBy: 'A. Kumar',
        curveUsed: 'EdDSA',
        status: 'completed',
        description: 'Solana token swap',
      },
      {
        id: 'sig-012',
        hash: '0xe0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
        signedAt: '2025-01-13 22:45:00',
        signedBy: 'J. Doe',
        curveUsed: 'ECDSA',
        status: 'completed',
        description: 'Automated DeFi yield harvest',
      },
    ],
  },
  {
    id: 'vault-008',
    name: 'Partner Integration Vault',
    curves: [
      {
        type: 'ECDSA',
        curve: 'secp256k1',
        publicKey:
          '0x04b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9',
        fingerprint: '0x4b8e...3d2a',
      },
      {
        type: 'EdDSA',
        curve: 'ed25519',
        publicKey:
          '0x6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
        fingerprint: '0x6e7f...c5d6',
      },
    ],
    threshold: 3,
    signers: [
      {
        id: 'signer-022',
        name: 'Partner API Server',
        owner: 'J. Chen',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.1',
      },
      {
        id: 'signer-023',
        name: 'Internal HSM',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.0',
      },
      {
        id: 'signer-024',
        name: "Jenny's iPhone",
        owner: 'J. Chen',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-025',
        name: 'Partner Mobile',
        owner: 'Partner Co.',
        deviceType: 'android',
        votingPower: 1,
        version: '3.0.7',
      },
    ],
    status: 'draft',
    createdAt: '2025-01-13',
    createdBy: 'J. Chen',
    lastUsed: null,
    signatures: [],
  },
];

// Helper to get vault by ID
export const getVaultById = (id: string): Vault | undefined => {
  return allVaults.find((vault) => vault.id === id);
};

// Available signers pool (organization's registered devices/virtual signers)
export type AvailableSigner = {
  id: string;
  name: string;
  owner: string;
  deviceType: DeviceType;
  version: string;
};

export const availableSigners: AvailableSigner[] = [
  {
    id: 'avail-001',
    name: 'HSM Primary',
    owner: 'J. Doe',
    deviceType: 'virtual',
    version: '2.4.1',
  },
  {
    id: 'avail-002',
    name: 'HSM Backup',
    owner: 'M. Smith',
    deviceType: 'virtual',
    version: '2.4.1',
  },
  {
    id: 'avail-003',
    name: 'Treasury Server',
    owner: 'M. Smith',
    deviceType: 'virtual',
    version: '2.4.0',
  },
  {
    id: 'avail-004',
    name: 'Cold Storage HSM',
    owner: 'J. Chen',
    deviceType: 'virtual',
    version: '2.4.1',
  },
  {
    id: 'avail-005',
    name: 'Hot Wallet Server',
    owner: 'M. Smith',
    deviceType: 'virtual',
    version: '2.4.1',
  },
  {
    id: 'avail-006',
    name: 'Partner API Server',
    owner: 'J. Chen',
    deviceType: 'virtual',
    version: '2.4.1',
  },
  {
    id: 'avail-007',
    name: "John's iPhone",
    owner: 'J. Doe',
    deviceType: 'ios',
    version: '3.1.0',
  },
  {
    id: 'avail-008',
    name: "Mike's iPhone",
    owner: 'M. Smith',
    deviceType: 'ios',
    version: '3.1.0',
  },
  {
    id: 'avail-009',
    name: "Mike's iPad",
    owner: 'M. Smith',
    deviceType: 'ios',
    version: '3.1.0',
  },
  {
    id: 'avail-010',
    name: "Jenny's iPhone",
    owner: 'J. Chen',
    deviceType: 'ios',
    version: '3.1.0',
  },
  {
    id: 'avail-011',
    name: "Amit's iPhone",
    owner: 'A. Kumar',
    deviceType: 'ios',
    version: '3.1.0',
  },
  {
    id: 'avail-012',
    name: "John's Pixel",
    owner: 'J. Doe',
    deviceType: 'android',
    version: '3.0.2',
  },
  {
    id: 'avail-013',
    name: "Amit's Android",
    owner: 'A. Kumar',
    deviceType: 'android',
    version: '3.0.9',
  },
  {
    id: 'avail-014',
    name: 'Backup Mobile',
    owner: 'M. Smith',
    deviceType: 'android',
    version: '3.0.8',
  },
  {
    id: 'avail-015',
    name: 'Partner Mobile',
    owner: 'Partner Co.',
    deviceType: 'android',
    version: '3.0.7',
  },
];

// Pending reshare request type
export type PendingReshare = {
  id: string;
  vaultId: string;
  requestedAt: string;
  requestedBy: string;
  newThreshold: number;
  newSigners: Signer[];
  approvals: { signerId: string; approved: boolean; approvedAt?: string }[];
};

// Sample pending reshares
export const pendingReshares: PendingReshare[] = [
  {
    id: 'reshare-001',
    vaultId: 'vault-002',
    requestedAt: '2025-01-14 10:00:00',
    requestedBy: 'M. Smith',
    newThreshold: 2,
    newSigners: [
      {
        id: 'signer-004',
        name: 'Treasury Server',
        owner: 'M. Smith',
        deviceType: 'virtual',
        votingPower: 1,
        version: '2.4.0',
      },
      {
        id: 'signer-005',
        name: "Mike's iPad",
        owner: 'M. Smith',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
      {
        id: 'signer-new',
        name: "John's iPhone",
        owner: 'J. Doe',
        deviceType: 'ios',
        votingPower: 1,
        version: '3.1.0',
      },
    ],
    approvals: [
      {
        signerId: 'signer-004',
        approved: true,
        approvedAt: '2025-01-14 10:15:00',
      },
      { signerId: 'signer-005', approved: false },
      { signerId: 'signer-006', approved: false },
      { signerId: 'signer-007', approved: false },
    ],
  },
];

// Helper to get pending reshare for a vault
export const getPendingReshareByVaultId = (
  vaultId: string
): PendingReshare | undefined => {
  return pendingReshares.find((reshare) => reshare.vaultId === vaultId);
};

// Pending async operations for notifications
export type PendingOperationType = 'signature' | 'reshare';

export type SignerApproval = {
  signerId: string;
  signerName: string;
  approved: boolean;
  approvedAt?: string;
};

// Signature context - details about what is being signed
export type SignatureContext = {
  transactionType: 'transfer' | 'swap' | 'contract' | 'stake' | 'withdraw';
  chain: string;
  chainId: number;
  asset: string;
  amount: string;
  amountUsd: string;
  fromAddress: string;
  toAddress: string;
  gasEstimate?: string;
  data?: string; // Raw transaction data (hex)
  nonce?: number;
  memo?: string;
};

// Reshare context - before and after state
export type ReshareSignerState = {
  id: string;
  name: string;
  owner: string;
  deviceType: DeviceType;
  votingPower: number;
};

export type ReshareContext = {
  reason: string;
  beforeState: {
    threshold: number;
    signers: ReshareSignerState[];
  };
  afterState: {
    threshold: number;
    signers: ReshareSignerState[];
  };
  addedSigners: string[]; // IDs of new signers
  removedSigners: string[]; // IDs of removed signers
  thresholdChanged: boolean;
};

export type PendingOperation = {
  id: string;
  type: PendingOperationType;
  vaultId: string;
  vaultName: string;
  description: string;
  requestedAt: string;
  requestedBy: string;
  threshold: number;
  approvals: SignerApproval[];
  expiresAt?: string;
  signatureContext?: SignatureContext;
  reshareContext?: ReshareContext;
};

// Sample pending operations for demo
export const pendingOperations: PendingOperation[] = [
  {
    id: 'op-001',
    type: 'signature',
    vaultId: 'vault-001',
    vaultName: 'Production Signing Vault',
    description: 'ETH transfer of 15.5 ETH to 0x8a2f...4c1e',
    requestedAt: '2025-01-14 15:30:00',
    requestedBy: 'J. Doe',
    threshold: 2,
    approvals: [
      {
        signerId: 'signer-001',
        signerName: 'HSM Primary',
        approved: true,
        approvedAt: '2025-01-14 15:31:00',
      },
      { signerId: 'signer-002', signerName: 'HSM Backup', approved: false },
      { signerId: 'signer-003', signerName: "John's iPhone", approved: false },
    ],
    expiresAt: '2025-01-14 16:30:00',
    signatureContext: {
      transactionType: 'transfer',
      chain: 'Ethereum',
      chainId: 1,
      asset: 'ETH',
      amount: '15.5',
      amountUsd: '$52,234.50',
      fromAddress: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
      toAddress: '0x8a2f4c1e9d3b7a6f5c2e8d1a4b9c6e3f7d2a5b8c',
      gasEstimate: '0.0021 ETH (~$7.08)',
      nonce: 142,
      memo: 'Q1 treasury disbursement to partner',
    },
  },
  {
    id: 'op-002',
    type: 'signature',
    vaultId: 'vault-007',
    vaultName: 'Hot Wallet Signer',
    description: 'USDC swap for 50,000 USDC on Uniswap',
    requestedAt: '2025-01-14 14:45:00',
    requestedBy: 'M. Smith',
    threshold: 2,
    approvals: [
      {
        signerId: 'signer-019',
        signerName: 'Hot Wallet Server',
        approved: true,
        approvedAt: '2025-01-14 14:46:00',
      },
      {
        signerId: 'signer-020',
        signerName: "Mike's iPhone",
        approved: true,
        approvedAt: '2025-01-14 14:50:00',
      },
      { signerId: 'signer-021', signerName: "Amit's Android", approved: false },
    ],
    signatureContext: {
      transactionType: 'swap',
      chain: 'Ethereum',
      chainId: 1,
      asset: 'USDC',
      amount: '50,000',
      amountUsd: '$50,000.00',
      fromAddress: '0x6a2d9c5f8e1b4a7f3c6d9e2a5b8c1d4e7f3a6b9c',
      toAddress: '0x7a86ba0d86e3000f0e8e7a7e7c8f3f6e5d4c3b2a', // Uniswap Router
      gasEstimate: '0.0089 ETH (~$30.01)',
      data: '0x38ed1739000000000000000000000000000000000000000000000000000000000bebc200...',
      nonce: 89,
    },
  },
  {
    id: 'op-003',
    type: 'reshare',
    vaultId: 'vault-002',
    vaultName: 'Treasury Operations',
    description: 'Add new signer and reduce threshold to 2',
    requestedAt: '2025-01-14 10:00:00',
    requestedBy: 'M. Smith',
    threshold: 3,
    approvals: [
      {
        signerId: 'signer-004',
        signerName: 'Treasury Server',
        approved: true,
        approvedAt: '2025-01-14 10:15:00',
      },
      { signerId: 'signer-005', signerName: "Mike's iPad", approved: false },
      { signerId: 'signer-006', signerName: "John's Pixel", approved: false },
      { signerId: 'signer-007', signerName: 'Backup HSM', approved: false },
    ],
    reshareContext: {
      reason:
        'Adding new team member and adjusting threshold for faster operations',
      beforeState: {
        threshold: 3,
        signers: [
          {
            id: 'signer-004',
            name: 'Treasury Server',
            owner: 'M. Smith',
            deviceType: 'virtual',
            votingPower: 2,
          },
          {
            id: 'signer-005',
            name: "Mike's iPad",
            owner: 'M. Smith',
            deviceType: 'ios',
            votingPower: 1,
          },
          {
            id: 'signer-006',
            name: "John's Pixel",
            owner: 'J. Doe',
            deviceType: 'android',
            votingPower: 1,
          },
          {
            id: 'signer-007',
            name: 'Backup HSM',
            owner: 'A. Kumar',
            deviceType: 'virtual',
            votingPower: 1,
          },
        ],
      },
      afterState: {
        threshold: 2,
        signers: [
          {
            id: 'signer-004',
            name: 'Treasury Server',
            owner: 'M. Smith',
            deviceType: 'virtual',
            votingPower: 2,
          },
          {
            id: 'signer-005',
            name: "Mike's iPad",
            owner: 'M. Smith',
            deviceType: 'ios',
            votingPower: 1,
          },
          {
            id: 'signer-new-001',
            name: "Sarah's iPhone",
            owner: 'S. Chen',
            deviceType: 'ios',
            votingPower: 1,
          },
        ],
      },
      addedSigners: ['signer-new-001'],
      removedSigners: ['signer-006', 'signer-007'],
      thresholdChanged: true,
    },
  },
  {
    id: 'op-004',
    type: 'signature',
    vaultId: 'vault-006',
    vaultName: 'Cold Storage Primary',
    description: 'BTC withdrawal of 2.5 BTC to cold wallet',
    requestedAt: '2025-01-14 12:00:00',
    requestedBy: 'J. Chen',
    threshold: 2,
    approvals: [
      {
        signerId: 'signer-016',
        signerName: 'Cold Storage HSM',
        approved: false,
      },
      { signerId: 'signer-017', signerName: "Jenny's iPhone", approved: false },
      { signerId: 'signer-018', signerName: 'Backup Mobile', approved: false },
    ],
    expiresAt: '2025-01-14 18:00:00',
    signatureContext: {
      transactionType: 'withdraw',
      chain: 'Bitcoin',
      chainId: 0,
      asset: 'BTC',
      amount: '2.5',
      amountUsd: '$236,450.00',
      fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      toAddress: 'bc1q9h5yjfkz2c9e0tyd3rqn8v4g5l8yqjxqhqz6m5',
      gasEstimate: '0.00012 BTC (~$11.35)',
      memo: 'Quarterly cold storage rotation',
    },
  },
];

// Helper to get all pending operations
export const getAllPendingOperations = (): PendingOperation[] => {
  return pendingOperations;
};

// Helper to get pending operations for a specific vault
export const getPendingOperationsByVaultId = (
  vaultId: string
): PendingOperation[] => {
  return pendingOperations.filter((op) => op.vaultId === vaultId);
};

// Helper to get a single pending operation by ID
export const getPendingOperationById = (
  id: string
): PendingOperation | undefined => {
  return pendingOperations.find((op) => op.id === id);
};

// Helper to get vaults linked to an identity
export const getVaultsByIdentityId = (identityId: string): Vault[] => {
  return allVaults.filter((vault) => vault.identityId === identityId);
};
