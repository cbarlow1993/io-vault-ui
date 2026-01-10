// Signer data types and sample data

export type SignerType = 'ios' | 'android' | 'virtual';
export type SignerStatus = 'active' | 'pending' | 'revoked';
export type SignerHealthStatus = 'online' | 'idle' | 'offline' | 'unknown';

export type SignerConfig = {
  publicKey: string;
  supportedCurves: string[];
  apiEndpoint?: string;
  autoApprove: boolean;
  notificationsEnabled: boolean;
  maxDailySignatures?: number;
  allowedNetworks: string[];
  backupEnabled: boolean;
  lastSyncAt: string;
};

export type RegisteredSigner = {
  id: string;
  name: string;
  owner: string;
  type: SignerType;
  version: string;
  status: SignerStatus;
  registeredAt: string;
  lastSeen: string | null;
  deviceInfo?: string;
  vaultsCount: number;
  config: SignerConfig;
};

// Latest versions for each signer type
export const LATEST_VERSIONS: Record<SignerType, string> = {
  ios: '3.1.0',
  android: '3.1.0',
  virtual: '2.4.1',
};

// Check if a version is outdated
export const isVersionOutdated = (
  version: string,
  type: SignerType
): boolean => {
  const latest = LATEST_VERSIONS[type];
  return compareVersions(version, latest) < 0;
};

// Compare semantic versions: returns -1 if a < b, 0 if equal, 1 if a > b
const compareVersions = (a: string, b: string): number => {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
};

// Parse lastSeen string to determine health status
export const getSignerHealthStatus = (
  signer: RegisteredSigner
): SignerHealthStatus => {
  if (signer.status === 'pending') return 'unknown';
  if (signer.status === 'revoked') return 'offline';
  if (!signer.lastSeen) return 'unknown';

  const lastSeen = signer.lastSeen.toLowerCase();

  // Check for recent activity (online)
  if (
    lastSeen.includes('minute') ||
    lastSeen.includes('second') ||
    lastSeen === 'just now'
  ) {
    const match = lastSeen.match(/(\d+)\s*minute/);
    if (match && match[1]) {
      const minutes = parseInt(match[1], 10);
      if (minutes <= 15) return 'online';
    }
    if (lastSeen.includes('second') || lastSeen === 'just now') return 'online';
    return 'idle';
  }

  // Check for idle (within 24 hours)
  if (lastSeen.includes('hour')) {
    const match = lastSeen.match(/(\d+)\s*hour/);
    if (match && match[1]) {
      const hours = parseInt(match[1], 10);
      if (hours <= 24) return 'idle';
    }
    return 'offline';
  }

  // Anything else (days, dates) is offline
  if (lastSeen.includes('day') || lastSeen.match(/^\d{4}-\d{2}-\d{2}/)) {
    return 'offline';
  }

  return 'unknown';
};

export const allSigners: RegisteredSigner[] = [
  {
    id: 'signer-001',
    name: 'HSM Primary',
    owner: 'J. Doe',
    type: 'virtual',
    version: '2.4.1',
    status: 'active',
    registeredAt: '2024-11-15',
    lastSeen: '2 minutes ago',
    deviceInfo: 'Cloud HSM Instance',
    vaultsCount: 3,
    config: {
      publicKey:
        '0x04a8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      supportedCurves: ['ECDSA', 'EdDSA'],
      apiEndpoint: 'https://hsm-primary.io-vault.internal:8443',
      autoApprove: false,
      notificationsEnabled: true,
      maxDailySignatures: 1000,
      allowedNetworks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 14:30:00',
    },
  },
  {
    id: 'signer-002',
    name: 'HSM Backup',
    owner: 'M. Smith',
    type: 'virtual',
    version: '2.4.1',
    status: 'active',
    registeredAt: '2024-11-15',
    lastSeen: '1 hour ago',
    deviceInfo: 'Cloud HSM Instance',
    vaultsCount: 2,
    config: {
      publicKey:
        '0x04b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      supportedCurves: ['ECDSA', 'EdDSA'],
      apiEndpoint: 'https://hsm-backup.io-vault.internal:8443',
      autoApprove: false,
      notificationsEnabled: true,
      maxDailySignatures: 500,
      allowedNetworks: ['ethereum', 'polygon'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 13:15:00',
    },
  },
  {
    id: 'signer-003',
    name: "John's iPhone",
    owner: 'J. Doe',
    type: 'ios',
    version: '3.1.0',
    status: 'active',
    registeredAt: '2024-12-01',
    lastSeen: '5 minutes ago',
    deviceInfo: 'iPhone 15 Pro',
    vaultsCount: 4,
    config: {
      publicKey:
        '0x04c0d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
      supportedCurves: ['ECDSA', 'EdDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: ['ethereum', 'solana', 'polygon', 'bitcoin'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 14:25:00',
    },
  },
  {
    id: 'signer-004',
    name: 'Treasury Server',
    owner: 'M. Smith',
    type: 'virtual',
    version: '2.4.0',
    status: 'active',
    registeredAt: '2024-12-05',
    lastSeen: '30 minutes ago',
    deviceInfo: 'Cloud HSM Instance',
    vaultsCount: 2,
    config: {
      publicKey:
        '0x04d1e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
      supportedCurves: ['ECDSA'],
      apiEndpoint: 'https://treasury-server.io-vault.internal:8443',
      autoApprove: true,
      notificationsEnabled: false,
      maxDailySignatures: 100,
      allowedNetworks: ['ethereum', 'polygon'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 14:00:00',
    },
  },
  {
    id: 'signer-005',
    name: "Mike's iPad",
    owner: 'M. Smith',
    type: 'ios',
    version: '3.1.0',
    status: 'active',
    registeredAt: '2024-12-10',
    lastSeen: '2 hours ago',
    deviceInfo: 'iPad Pro 12.9"',
    vaultsCount: 1,
    config: {
      publicKey:
        '0x04e2f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
      supportedCurves: ['ECDSA', 'EdDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: ['ethereum', 'polygon'],
      backupEnabled: false,
      lastSyncAt: '2025-01-14 12:30:00',
    },
  },
  {
    id: 'signer-006',
    name: "John's Pixel",
    owner: 'J. Doe',
    type: 'android',
    version: '3.0.2',
    status: 'active',
    registeredAt: '2024-12-12',
    lastSeen: '1 day ago',
    deviceInfo: 'Pixel 8 Pro',
    vaultsCount: 1,
    config: {
      publicKey:
        '0x04f3a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
      supportedCurves: ['ECDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: ['ethereum'],
      backupEnabled: true,
      lastSyncAt: '2025-01-13 10:00:00',
    },
  },
  {
    id: 'signer-007',
    name: 'Backup HSM',
    owner: 'A. Kumar',
    type: 'virtual',
    version: '2.3.8',
    status: 'active',
    registeredAt: '2024-12-15',
    lastSeen: '3 hours ago',
    deviceInfo: 'Cloud HSM Instance',
    vaultsCount: 1,
    config: {
      publicKey:
        '0x04a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
      supportedCurves: ['ECDSA'],
      apiEndpoint: 'https://backup-hsm.io-vault.internal:8443',
      autoApprove: false,
      notificationsEnabled: true,
      maxDailySignatures: 250,
      allowedNetworks: ['ethereum', 'polygon'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 11:30:00',
    },
  },
  {
    id: 'signer-008',
    name: "Jenny's iPhone",
    owner: 'J. Chen',
    type: 'ios',
    version: '3.1.0',
    status: 'active',
    registeredAt: '2024-12-20',
    lastSeen: '15 minutes ago',
    deviceInfo: 'iPhone 14 Pro',
    vaultsCount: 2,
    config: {
      publicKey:
        '0x04b5c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9',
      supportedCurves: ['ECDSA', 'EdDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: ['ethereum', 'solana', 'avalanche'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 14:15:00',
    },
  },
  {
    id: 'signer-009',
    name: "Amit's Android",
    owner: 'A. Kumar',
    type: 'android',
    version: '3.0.9',
    status: 'active',
    registeredAt: '2024-12-22',
    lastSeen: '45 minutes ago',
    deviceInfo: 'Samsung Galaxy S24',
    vaultsCount: 2,
    config: {
      publicKey:
        '0x04c6d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0',
      supportedCurves: ['ECDSA', 'EdDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: ['ethereum', 'solana', 'polygon'],
      backupEnabled: true,
      lastSyncAt: '2025-01-14 13:45:00',
    },
  },
  {
    id: 'signer-010',
    name: 'Legacy Server',
    owner: 'S. Wilson',
    type: 'virtual',
    version: '1.9.2',
    status: 'revoked',
    registeredAt: '2024-09-01',
    lastSeen: '2024-12-20',
    deviceInfo: 'Cloud HSM Instance',
    vaultsCount: 0,
    config: {
      publicKey:
        '0x04d7e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1',
      supportedCurves: ['ECDSA'],
      apiEndpoint: 'https://legacy-server.io-vault.internal:8443',
      autoApprove: false,
      notificationsEnabled: false,
      allowedNetworks: ['ethereum'],
      backupEnabled: false,
      lastSyncAt: '2024-12-20 15:00:00',
    },
  },
  {
    id: 'signer-011',
    name: "Mike's iPhone",
    owner: 'M. Smith',
    type: 'ios',
    version: '3.1.0',
    status: 'pending',
    registeredAt: '2025-01-14',
    lastSeen: null,
    deviceInfo: 'iPhone 15',
    vaultsCount: 0,
    config: {
      publicKey:
        '0x04e8f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2',
      supportedCurves: ['ECDSA', 'EdDSA'],
      autoApprove: false,
      notificationsEnabled: true,
      allowedNetworks: [],
      backupEnabled: false,
      lastSyncAt: '2025-01-14 10:00:00',
    },
  },
];

// Helper to get signer by ID
export const getSignerById = (id: string): RegisteredSigner | undefined => {
  return allSigners.find((signer) => signer.id === id);
};

// Helper to get signers by type
export const getSignersByType = (type: SignerType): RegisteredSigner[] => {
  return allSigners.filter((signer) => signer.type === type);
};

// Helper to get active signers count
export const getActiveSignersCount = (): number => {
  return allSigners.filter((signer) => signer.status === 'active').length;
};

// Signature activity type for signer detail page
export type SignerSignatureActivity = {
  id: string;
  hash: string;
  vaultId: string;
  vaultName: string;
  signedAt: string;
  description: string;
  curveUsed: string;
  status: 'completed' | 'pending' | 'failed';
};

// Mock signature activity data for signers
// In a real app this would come from API based on signer participation
export const signerSignatureActivities: Record<
  string,
  SignerSignatureActivity[]
> = {
  'signer-001': [
    {
      id: 'sig-001',
      hash: '0x8f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      vaultId: 'vault-001',
      vaultName: 'Production Signing Vault',
      signedAt: '2025-01-14 14:32:00',
      description: 'ETH transfer to 0x742d...3f2a',
      curveUsed: 'ECDSA',
      status: 'completed',
    },
    {
      id: 'sig-002',
      hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      vaultId: 'vault-001',
      vaultName: 'Production Signing Vault',
      signedAt: '2025-01-14 12:15:00',
      description: 'Contract deployment',
      curveUsed: 'ECDSA',
      status: 'completed',
    },
  ],
  'signer-003': [
    {
      id: 'sig-003',
      hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
      vaultId: 'vault-001',
      vaultName: 'Production Signing Vault',
      signedAt: '2025-01-13 09:45:00',
      description: 'Solana SOL transfer',
      curveUsed: 'EdDSA',
      status: 'completed',
    },
    {
      id: 'sig-012',
      hash: '0xe0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
      vaultId: 'vault-007',
      vaultName: 'Hot Wallet Signer',
      signedAt: '2025-01-13 22:45:00',
      description: 'Automated DeFi yield harvest',
      curveUsed: 'ECDSA',
      status: 'completed',
    },
  ],
  'signer-004': [
    {
      id: 'sig-005',
      hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      vaultId: 'vault-002',
      vaultName: 'Treasury Operations',
      signedAt: '2025-01-13 11:00:00',
      description: 'Treasury disbursement',
      curveUsed: 'ECDSA',
      status: 'completed',
    },
  ],
  'signer-008': [
    {
      id: 'sig-009',
      hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
      vaultId: 'vault-006',
      vaultName: 'Cold Storage Primary',
      signedAt: '2025-01-07 14:00:00',
      description: 'Cold storage transfer',
      curveUsed: 'ECDSA',
      status: 'completed',
    },
  ],
  'signer-009': [
    {
      id: 'sig-011',
      hash: '0xc8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9',
      vaultId: 'vault-007',
      vaultName: 'Hot Wallet Signer',
      signedAt: '2025-01-14 08:15:00',
      description: 'Solana token swap',
      curveUsed: 'EdDSA',
      status: 'completed',
    },
  ],
};

// Get signature activities for a signer
export const getSignerSignatureActivities = (
  signerId: string
): SignerSignatureActivity[] => {
  return signerSignatureActivities[signerId] || [];
};

// Vault summary for signer detail page
export type SignerVaultSummary = {
  id: string;
  name: string;
  threshold: number;
  totalSigners: number;
  status: 'active' | 'pending' | 'revoked';
  votingPower: number;
};

// Get vaults that include a specific signer (mock data mapping)
// Maps signer IDs to vault summaries
export const signerVaultMappings: Record<string, SignerVaultSummary[]> = {
  'signer-001': [
    {
      id: 'vault-001',
      name: 'Production Signing Vault',
      threshold: 2,
      totalSigners: 3,
      status: 'active',
      votingPower: 1,
    },
  ],
  'signer-002': [
    {
      id: 'vault-001',
      name: 'Production Signing Vault',
      threshold: 2,
      totalSigners: 3,
      status: 'active',
      votingPower: 1,
    },
  ],
  'signer-003': [
    {
      id: 'vault-001',
      name: 'Production Signing Vault',
      threshold: 2,
      totalSigners: 3,
      status: 'active',
      votingPower: 1,
    },
    {
      id: 'vault-004',
      name: 'Backup Recovery Vault',
      threshold: 2,
      totalSigners: 2,
      status: 'pending',
      votingPower: 1,
    },
  ],
  'signer-004': [
    {
      id: 'vault-002',
      name: 'Treasury Operations',
      threshold: 3,
      totalSigners: 4,
      status: 'active',
      votingPower: 2,
    },
  ],
  'signer-005': [
    {
      id: 'vault-002',
      name: 'Treasury Operations',
      threshold: 3,
      totalSigners: 4,
      status: 'active',
      votingPower: 1,
    },
  ],
  'signer-006': [
    {
      id: 'vault-002',
      name: 'Treasury Operations',
      threshold: 3,
      totalSigners: 4,
      status: 'active',
      votingPower: 1,
    },
  ],
  'signer-007': [
    {
      id: 'vault-002',
      name: 'Treasury Operations',
      threshold: 3,
      totalSigners: 4,
      status: 'active',
      votingPower: 1,
    },
  ],
  'signer-008': [
    {
      id: 'vault-006',
      name: 'Cold Storage Primary',
      threshold: 2,
      totalSigners: 3,
      status: 'active',
      votingPower: 1,
    },
    {
      id: 'vault-008',
      name: 'Partner Integration Vault',
      threshold: 3,
      totalSigners: 4,
      status: 'pending',
      votingPower: 1,
    },
  ],
  'signer-009': [
    {
      id: 'vault-007',
      name: 'Hot Wallet Signer',
      threshold: 2,
      totalSigners: 3,
      status: 'active',
      votingPower: 1,
    },
  ],
};

// Get vaults for a signer
export const getSignerVaults = (signerId: string): SignerVaultSummary[] => {
  return signerVaultMappings[signerId] || [];
};
