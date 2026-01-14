// Identity types
export type IdentityType = 'corporate' | 'individual';
export type KycStatus = 'verified' | 'pending' | 'expired' | 'rejected';

// Bank account type
export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
};

// Wallet address type
export type WalletAddress = {
  id: string;
  label: string;
  address: string;
  chain: string;
  addedAt: string;
};

// KYC verification event
export type KycEvent = {
  id: string;
  date: string;
  action:
    | 'submitted'
    | 'verified'
    | 'expired'
    | 'rejected'
    | 'renewed'
    | 'document_added';
  description: string;
  performedBy: string;
  documentRef?: string;
};

// Base identity type
type BaseIdentity = {
  id: string;
  type: IdentityType;
  name: string;
  displayName?: string;
  kycStatus: KycStatus;
  kycVerifiedAt?: string;
  kycExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  bankAccounts: BankAccount[];
  walletAddresses: WalletAddress[];
  kycHistory: KycEvent[];
};

// Corporate identity
export type CorporateIdentity = BaseIdentity & {
  type: 'corporate';
  registrationNumber?: string;
  jurisdiction?: string;
  linkedContactIds: string[];
};

// Individual identity
export type IndividualIdentity = BaseIdentity & {
  type: 'individual';
  role?: string;
  email?: string;
  phone?: string;
  linkedCorporateId?: string;
};

// Union type for any identity
export type Identity = CorporateIdentity | IndividualIdentity;

// Type guards
export const isCorporateIdentity = (
  identity: Identity
): identity is CorporateIdentity => {
  return identity.type === 'corporate';
};

export const isIndividualIdentity = (
  identity: Identity
): identity is IndividualIdentity => {
  return identity.type === 'individual';
};

// Sample data
export const allIdentities: Identity[] = [
  // Corporate identities
  {
    id: 'corp-1',
    type: 'corporate',
    name: 'Acme Corporation',
    displayName: 'Acme Corp',
    registrationNumber: 'DE-HRB-123456',
    jurisdiction: 'Germany',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-06-15',
    kycExpiresAt: '2025-06-15',
    createdAt: '2024-01-10',
    updatedAt: '2024-06-15',
    linkedContactIds: ['ind-1', 'ind-2'],
    bankAccounts: [
      {
        id: 'bank-1',
        bankName: 'Deutsche Bank',
        accountName: 'Acme Corporation',
        accountNumber: 'DE89370400440532013000',
        swiftCode: 'DEUTDEFF',
        iban: 'DE89370400440532013000',
        currency: 'EUR',
      },
    ],
    walletAddresses: [
      {
        id: 'wallet-1',
        label: 'Treasury Wallet',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21',
        chain: 'Ethereum',
        addedAt: '2024-02-15',
      },
    ],
    kycHistory: [
      {
        id: 'kyc-1',
        date: '2024-06-15',
        action: 'verified',
        description: 'KYC verification completed',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-0615',
      },
      {
        id: 'kyc-2',
        date: '2024-06-10',
        action: 'document_added',
        description: 'Certificate of incorporation uploaded',
        performedBy: 'M. Smith',
        documentRef: 'DOC-2024-0610',
      },
      {
        id: 'kyc-3',
        date: '2024-06-01',
        action: 'submitted',
        description: 'KYC application submitted',
        performedBy: 'M. Smith',
      },
    ],
  },
  {
    id: 'corp-2',
    type: 'corporate',
    name: 'Global Industries Ltd',
    displayName: 'Global Industries',
    registrationNumber: 'UK-12345678',
    jurisdiction: 'United Kingdom',
    kycStatus: 'pending',
    createdAt: '2024-11-20',
    updatedAt: '2024-11-20',
    linkedContactIds: ['ind-3'],
    bankAccounts: [
      {
        id: 'bank-2',
        bankName: 'Barclays',
        accountName: 'Global Industries Ltd',
        accountNumber: '20456789',
        routingNumber: '20-00-00',
        swiftCode: 'BARCGB22',
        currency: 'GBP',
      },
    ],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-4',
        date: '2024-11-20',
        action: 'submitted',
        description: 'KYC application submitted',
        performedBy: 'J. Chen',
      },
    ],
  },
  {
    id: 'corp-3',
    type: 'corporate',
    name: 'Pacific Trading Co',
    registrationNumber: 'SG-201912345D',
    jurisdiction: 'Singapore',
    kycStatus: 'expired',
    kycVerifiedAt: '2023-03-10',
    kycExpiresAt: '2024-03-10',
    createdAt: '2023-02-01',
    updatedAt: '2024-03-10',
    linkedContactIds: [],
    bankAccounts: [
      {
        id: 'bank-3',
        bankName: 'DBS Bank',
        accountName: 'Pacific Trading Co',
        accountNumber: '0012345678',
        swiftCode: 'DBSSSGSG',
        currency: 'SGD',
      },
    ],
    walletAddresses: [
      {
        id: 'wallet-2',
        label: 'Operations Wallet',
        address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        chain: 'Ethereum',
        addedAt: '2023-03-15',
      },
    ],
    kycHistory: [
      {
        id: 'kyc-5',
        date: '2024-03-10',
        action: 'expired',
        description: 'KYC verification expired',
        performedBy: 'System',
      },
      {
        id: 'kyc-6',
        date: '2023-03-10',
        action: 'verified',
        description: 'KYC verification completed',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2023-0310',
      },
    ],
  },
  {
    id: 'corp-4',
    type: 'corporate',
    name: 'Nordic Finance AB',
    displayName: 'Nordic Finance',
    registrationNumber: 'SE-5591234567',
    jurisdiction: 'Sweden',
    kycStatus: 'rejected',
    createdAt: '2024-09-01',
    updatedAt: '2024-09-15',
    linkedContactIds: ['ind-5'],
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-7',
        date: '2024-09-15',
        action: 'rejected',
        description: 'KYC rejected - insufficient documentation',
        performedBy: 'Compliance Team',
      },
      {
        id: 'kyc-8',
        date: '2024-09-01',
        action: 'submitted',
        description: 'KYC application submitted',
        performedBy: 'A. Kumar',
      },
    ],
  },
  {
    id: 'corp-5',
    type: 'corporate',
    name: 'Eastern Bank Holdings',
    registrationNumber: 'HK-2876543',
    jurisdiction: 'Hong Kong',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-08-20',
    kycExpiresAt: '2025-08-20',
    createdAt: '2024-07-15',
    updatedAt: '2024-08-20',
    linkedContactIds: ['ind-6'],
    bankAccounts: [
      {
        id: 'bank-4',
        bankName: 'HSBC Hong Kong',
        accountName: 'Eastern Bank Holdings',
        accountNumber: '808123456789',
        swiftCode: 'HSBCHKHH',
        currency: 'HKD',
      },
      {
        id: 'bank-5',
        bankName: 'HSBC Hong Kong',
        accountName: 'Eastern Bank Holdings USD',
        accountNumber: '808987654321',
        swiftCode: 'HSBCHKHH',
        currency: 'USD',
      },
    ],
    walletAddresses: [
      {
        id: 'wallet-3',
        label: 'Primary Wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chain: 'Ethereum',
        addedAt: '2024-08-01',
      },
      {
        id: 'wallet-4',
        label: 'USDC Wallet',
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        chain: 'Bitcoin',
        addedAt: '2024-08-15',
      },
    ],
    kycHistory: [
      {
        id: 'kyc-9',
        date: '2024-08-20',
        action: 'verified',
        description: 'KYC verification completed',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-0820',
      },
      {
        id: 'kyc-10',
        date: '2024-07-20',
        action: 'document_added',
        description: 'Business registration certificate uploaded',
        performedBy: 'S. Wilson',
        documentRef: 'DOC-2024-0720',
      },
      {
        id: 'kyc-11',
        date: '2024-07-15',
        action: 'submitted',
        description: 'KYC application submitted',
        performedBy: 'S. Wilson',
      },
    ],
  },

  // Individual identities
  {
    id: 'ind-1',
    type: 'individual',
    name: 'Michael Smith',
    role: 'Chief Financial Officer',
    email: 'm.smith@acme-corp.com',
    phone: '+49 30 12345678',
    linkedCorporateId: 'corp-1',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-06-15',
    kycExpiresAt: '2025-06-15',
    createdAt: '2024-01-10',
    updatedAt: '2024-06-15',
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-12',
        date: '2024-06-15',
        action: 'verified',
        description: 'Identity verified via passport',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-0615-IND',
      },
    ],
  },
  {
    id: 'ind-2',
    type: 'individual',
    name: 'Sarah Johnson',
    role: 'Treasury Manager',
    email: 's.johnson@acme-corp.com',
    phone: '+49 30 87654321',
    linkedCorporateId: 'corp-1',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-06-18',
    kycExpiresAt: '2025-06-18',
    createdAt: '2024-01-15',
    updatedAt: '2024-06-18',
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-13',
        date: '2024-06-18',
        action: 'verified',
        description: 'Identity verified via passport',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-0618-IND',
      },
    ],
  },
  {
    id: 'ind-3',
    type: 'individual',
    name: 'James Chen',
    role: 'Director',
    email: 'j.chen@global-industries.co.uk',
    phone: '+44 20 12345678',
    linkedCorporateId: 'corp-2',
    kycStatus: 'pending',
    createdAt: '2024-11-20',
    updatedAt: '2024-11-20',
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-14',
        date: '2024-11-20',
        action: 'submitted',
        description: 'Identity verification submitted',
        performedBy: 'J. Chen',
      },
    ],
  },
  {
    id: 'ind-4',
    type: 'individual',
    name: 'Emily Watson',
    role: 'Independent Trader',
    email: 'emily.watson@email.com',
    phone: '+1 555 123 4567',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-10-01',
    kycExpiresAt: '2025-10-01',
    createdAt: '2024-09-15',
    updatedAt: '2024-10-01',
    bankAccounts: [
      {
        id: 'bank-6',
        bankName: 'Chase Bank',
        accountName: 'Emily Watson',
        accountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD',
      },
    ],
    walletAddresses: [
      {
        id: 'wallet-5',
        label: 'Personal Wallet',
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        chain: 'Ethereum',
        addedAt: '2024-09-20',
      },
    ],
    kycHistory: [
      {
        id: 'kyc-15',
        date: '2024-10-01',
        action: 'verified',
        description: 'Identity verified via drivers license',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-1001-IND',
      },
      {
        id: 'kyc-16',
        date: '2024-09-15',
        action: 'submitted',
        description: 'KYC application submitted',
        performedBy: 'E. Watson',
      },
    ],
  },
  {
    id: 'ind-5',
    type: 'individual',
    name: 'Anders Lindqvist',
    role: 'Managing Director',
    email: 'a.lindqvist@nordic-finance.se',
    phone: '+46 8 123 456 78',
    linkedCorporateId: 'corp-4',
    kycStatus: 'rejected',
    createdAt: '2024-09-01',
    updatedAt: '2024-09-15',
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-17',
        date: '2024-09-15',
        action: 'rejected',
        description: 'Identity verification rejected - document unclear',
        performedBy: 'Compliance Team',
      },
      {
        id: 'kyc-18',
        date: '2024-09-01',
        action: 'submitted',
        description: 'Identity verification submitted',
        performedBy: 'A. Lindqvist',
      },
    ],
  },
  {
    id: 'ind-6',
    type: 'individual',
    name: 'Sophie Wilson',
    role: 'Head of Operations',
    email: 's.wilson@eastern-bank.hk',
    phone: '+852 1234 5678',
    linkedCorporateId: 'corp-5',
    kycStatus: 'verified',
    kycVerifiedAt: '2024-08-20',
    kycExpiresAt: '2025-08-20',
    createdAt: '2024-07-15',
    updatedAt: '2024-08-20',
    bankAccounts: [],
    walletAddresses: [],
    kycHistory: [
      {
        id: 'kyc-19',
        date: '2024-08-20',
        action: 'verified',
        description: 'Identity verified via HKID',
        performedBy: 'Compliance Team',
        documentRef: 'DOC-2024-0820-IND',
      },
      {
        id: 'kyc-20',
        date: '2024-07-15',
        action: 'submitted',
        description: 'Identity verification submitted',
        performedBy: 'S. Wilson',
      },
    ],
  },
];

// Helper functions
export const getIdentityById = (id: string): Identity | undefined => {
  return allIdentities.find((identity) => identity.id === id);
};

export const getLinkedContacts = (
  corporateId: string
): IndividualIdentity[] => {
  const corporate = allIdentities.find(
    (i) => i.id === corporateId && i.type === 'corporate'
  ) as CorporateIdentity | undefined;

  if (!corporate) return [];

  return corporate.linkedContactIds
    .map((id) => allIdentities.find((i) => i.id === id))
    .filter(
      (i): i is IndividualIdentity => i !== undefined && i.type === 'individual'
    );
};

export const getLinkedCorporate = (
  individualId: string
): CorporateIdentity | undefined => {
  const individual = allIdentities.find(
    (i) => i.id === individualId && i.type === 'individual'
  ) as IndividualIdentity | undefined;

  if (!individual?.linkedCorporateId) return undefined;

  return allIdentities.find(
    (i) => i.id === individual.linkedCorporateId && i.type === 'corporate'
  ) as CorporateIdentity | undefined;
};
