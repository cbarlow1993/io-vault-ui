import {
  ActivityIcon,
  ArrowRightLeftIcon,
  BadgePlusIcon,
  BookUserIcon,
  BuildingIcon,
  CoinsIcon,
  CreditCardIcon,
  FileTextIcon,
  FingerprintIcon,
  FoldersIcon,
  GlobeIcon,
  GridIcon,
  KeyIcon,
  ListChecksIcon,
  RocketIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  Users2Icon,
  UsersIcon,
  VaultIcon,
} from 'lucide-react';

import type { ModuleConfig, ModuleId } from './types';

export const moduleConfig: Record<ModuleId, ModuleConfig> = {
  treasury: {
    id: 'treasury',
    name: 'Treasury',
    icon: VaultIcon,
    accent: 'blue',
    requiresWorkspace: true,
    defaultPath: '/treasury/overview',
    navItems: [
      {
        label: 'Overview',
        path: '/treasury/overview',
        icon: GridIcon,
        testId: 'nav-treasury-overview',
      },
      {
        label: 'Vaults',
        path: '/treasury/vaults',
        icon: KeyIcon,
        testId: 'nav-treasury-vaults',
        children: [
          {
            label: 'Vaults',
            path: '/treasury/vaults',
            icon: KeyIcon,
            testId: 'nav-treasury-vaults-list',
          },
          {
            label: 'Signers',
            path: '/treasury/signers',
            icon: FingerprintIcon,
            testId: 'nav-treasury-signers',
          },
        ],
      },
      {
        label: 'Policies',
        path: '/treasury/policies',
        icon: ShieldCheckIcon,
        testId: 'nav-treasury-policies',
        children: [
          {
            label: 'Whitelists',
            path: '/treasury/policies/whitelists',
            icon: ListChecksIcon,
            testId: 'nav-treasury-whitelists',
          },
          {
            label: 'Transactions',
            path: '/treasury/policies/transactions',
            icon: ArrowRightLeftIcon,
            testId: 'nav-treasury-transactions',
          },
        ],
      },
      {
        label: 'Address Book',
        path: '/treasury/address-book',
        icon: BookUserIcon,
        testId: 'nav-treasury-address-book',
      },
      {
        label: 'Settings',
        path: '/treasury/settings',
        icon: SettingsIcon,
        testId: 'nav-treasury-settings',
      },
    ],
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance',
    icon: ShieldIcon,
    accent: 'emerald',
    requiresWorkspace: false,
    defaultPath: '/compliance/overview',
    navItems: [
      {
        label: 'Overview',
        path: '/compliance/overview',
        icon: GridIcon,
        testId: 'nav-compliance-overview',
      },
      {
        label: 'Monitoring',
        path: '/compliance/monitoring',
        icon: ActivityIcon,
        testId: 'nav-compliance-monitoring',
      },
      {
        label: 'Identities',
        path: '/compliance/identities',
        icon: UsersIcon,
        testId: 'nav-compliance-identities',
      },
      {
        label: 'Reports',
        path: '/compliance/reports',
        icon: FileTextIcon,
        testId: 'nav-compliance-reports',
      },
      {
        label: 'Settings',
        path: '/compliance/settings',
        icon: SettingsIcon,
        testId: 'nav-compliance-settings',
      },
    ],
  },
  global: {
    id: 'global',
    name: 'Global',
    icon: GlobeIcon,
    accent: 'violet',
    requiresWorkspace: false,
    defaultPath: '/global/users',
    navItems: [
      {
        label: 'Users',
        path: '/global/users',
        icon: UsersIcon,
        testId: 'nav-global-users',
      },
      {
        label: 'Roles',
        path: '/global/roles',
        icon: ShieldIcon,
        testId: 'nav-global-roles',
      },
      {
        label: 'Module Access',
        path: '/global/module-access',
        icon: ShieldCheckIcon,
        testId: 'nav-global-module-access',
      },
      {
        label: 'Teams',
        path: '/global/teams',
        icon: Users2Icon,
        testId: 'nav-global-teams',
      },
      {
        label: 'Workspaces',
        path: '/global/workspaces',
        icon: FoldersIcon,
        testId: 'nav-global-workspaces',
      },
      {
        label: 'Organization',
        path: '/global/organization',
        icon: BuildingIcon,
        testId: 'nav-global-organization',
      },
      {
        label: 'Billing',
        path: '/global/billing',
        icon: CreditCardIcon,
        testId: 'nav-global-billing',
      },
      {
        label: 'Audit Log',
        path: '/global/audit-log',
        icon: ScrollTextIcon,
        testId: 'nav-global-audit-log',
      },
    ],
  },
  tokenisation: {
    id: 'tokenisation',
    name: 'Tokenisation',
    icon: CoinsIcon,
    accent: 'cyan',
    requiresWorkspace: false,
    defaultPath: '/tokenisation/overview',
    navItems: [
      {
        label: 'Overview',
        path: '/tokenisation/overview',
        icon: GridIcon,
        testId: 'nav-tokenisation-overview',
      },
      {
        label: 'Tokens',
        path: '/tokenisation/tokens',
        icon: CoinsIcon,
        testId: 'nav-tokenisation-tokens',
      },
      {
        label: 'Deploy Token',
        path: '/tokenisation/deployment',
        icon: RocketIcon,
        testId: 'nav-tokenisation-deployment',
      },
      {
        label: 'Issuances',
        path: '/tokenisation/issuances',
        icon: BadgePlusIcon,
        testId: 'nav-tokenisation-issuances',
      },
      {
        label: 'Holders',
        path: '/tokenisation/holders',
        icon: UsersIcon,
        testId: 'nav-tokenisation-holders',
      },
    ],
  },
};

export const moduleIds: ModuleId[] = [
  'treasury',
  'compliance',
  'global',
  'tokenisation',
];

export function getModuleFromPath(pathname: string): ModuleId | null {
  for (const id of moduleIds) {
    // Match /{id} exactly or /{id}/ prefix
    if (pathname === `/${id}` || pathname.startsWith(`/${id}/`)) {
      return id;
    }
  }
  return null;
}
